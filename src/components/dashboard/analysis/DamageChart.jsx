'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer 
} from 'recharts';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, SelectContent, SelectGroup, SelectItem, 
  SelectLabel, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { User, Download, AlertCircle, Plus, X } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function DamageChart(props) {
  const {
    className,
    isLoading,
    processedDamageData,
    selectedDriver,
    maxLapNumber,
    drivers,
    driverTeams,
    driverColorMap,
    onDriverSelect,
    exportChartAsImage,
    fetchDriverDamageData
  } = props;
  
  const driversWithDamage = props.driversWithDamage || [];
  
  const chartRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // State for additional drivers (limited to 2 more, for a total of 3)
  const [additionalDrivers, setAdditionalDrivers] = useState([]);
  const [additionalDamageData, setAdditionalDamageData] = useState({});
  const [mergedData, setMergedData] = useState([]);

  const driversWithDamageList = driversWithDamage || [];

  // Team order for driver grouping
  const teamOrder = [
    'Racing Bulls', 
    'Aston Martin', 
    'Alpine', 
    'Red Bull', 
    'Mercedes', 
    'McLaren', 
    'Ferrari', 
    'Williams', 
    'Haas', 
    'Kick Sauber'
  ];

  // Determine if a driver has any damage (non-zero values)
  const hasAnyDamage = (damageData) => {
    if (!damageData || damageData.length === 0) return false;
    
    return damageData.some(point => {
      return (
        (point.frontWing && point.frontWing > 0) ||
        (point.rearWing && point.rearWing > 0) ||
        (point.diffuser && point.diffuser > 0) ||
        (point.floor && point.floor > 0) ||
        (point.sidepod && point.sidepod > 0)
      );
    });
  };

  // Group drivers by team for dropdown - only include drivers with damage
  const teamGroups = {};
  
  // Initialize teams in the correct order
  teamOrder.forEach(team => {
    teamGroups[team] = [];
  });
  
  // Populate driver groups - filter for drivers that have damage
  drivers.forEach(driver => {
    // Skip drivers without damage unless they're already selected
    if (!driversWithDamageList.includes(driver) && driver !== selectedDriver) {
      return;
    }
    
    const team = driverTeams[driver] || 'Unknown Team';
    if (teamGroups[team]) {
      teamGroups[team].push(driver);
    } else {
      teamGroups['Unknown Team'] = teamGroups['Unknown Team'] || [];
      teamGroups['Unknown Team'].push(driver);
    }
  });

  // Function to add a driver to the comparison
  const addDriver = async (driver) => {
    // Don't add if already in the list or if it's the main selected driver
    if (additionalDrivers.includes(driver) || driver === selectedDriver) {
      return;
    }
    
    // Don't add if we already have 2 additional drivers (3 total)
    if (additionalDrivers.length >= 2) {
      console.log('Maximum of 3 drivers reached');
      return;
    }
    
    console.log(`Adding driver ${driver} to damage comparison`);
    
    // Add to our list of additional drivers
    setAdditionalDrivers(prev => [...prev, driver]);
    
    // Fetch damage data for this driver
    try {
      const data = await fetchDriverDamageData(driver);
      console.log(`Received ${data?.length || 0} damage data points for ${driver}`);
      
      // Store the data
      setAdditionalDamageData(prev => ({
        ...prev,
        [driver]: data
      }));
    } catch (error) {
      console.error(`Error fetching damage data for ${driver}:`, error);
    }
  };

  // Function to remove a driver from the comparison
  const removeDriver = (driver) => {
    setAdditionalDrivers(prev => prev.filter(d => d !== driver));
    
    // Also remove their data from state
    setAdditionalDamageData(prev => {
      const newData = {...prev};
      delete newData[driver];
      return newData;
    });
  };

  // Merge data from main driver and additional drivers
  useEffect(() => {
    if (!processedDamageData || processedDamageData.length === 0) {
      setMergedData([]);
      return;
    }
    
    // Create a map of lap number to data points
    const lapMap = {};
    
    // Add main driver's data points to map
    processedDamageData.forEach(point => {
      if (!lapMap[point.lap]) {
        lapMap[point.lap] = { lap: point.lap };
      }
      
      // Add main driver's data
      lapMap[point.lap].frontWing = point.frontWing;
      lapMap[point.lap].rearWing = point.rearWing;
      lapMap[point.lap].diffuser = point.diffuser;
      lapMap[point.lap].floor = point.floor;
      lapMap[point.lap].sidepod = point.sidepod;
    });
    
    // Add each additional driver's data to the map
    Object.entries(additionalDamageData).forEach(([driver, damageData]) => {
      if (!damageData || damageData.length === 0) return;
      
      damageData.forEach(point => {
        if (!lapMap[point.lap]) {
          lapMap[point.lap] = { lap: point.lap };
        }
        
        // Add this driver's data with driver prefix
        lapMap[point.lap][`${driver}_frontWing`] = point.frontWing;
        lapMap[point.lap][`${driver}_rearWing`] = point.rearWing;
        lapMap[point.lap][`${driver}_diffuser`] = point.diffuser;
        lapMap[point.lap][`${driver}_floor`] = point.floor;
        lapMap[point.lap][`${driver}_sidepod`] = point.sidepod;
      });
    });
    
    // Convert the map to an array and sort by lap number
    const mergedArray = Object.values(lapMap).sort((a, b) => a.lap - b.lap);
    setMergedData(mergedArray);
  }, [processedDamageData, additionalDamageData]);

  // Determine line style based on driver index (0 = main driver, 1 = first additional, 2 = second additional)
  const getLineStyleForDriver = (driver) => {
    if (driver === selectedDriver) return "solid";
    const index = additionalDrivers.indexOf(driver);
    if (index === 0) return "dashed";
    if (index === 1) return "dotted";
    return "solid"; // fallback
  };

  // Convert line style to stroke-dasharray
  const getStrokeDashArray = (lineStyle) => {
    switch(lineStyle) {
      case "solid": return "0";
      case "dashed": return "5 5";
      case "dotted": return "2 2";
      default: return "0";
    }
  };

  // Custom tooltip component for damage data
  const DamageTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    
    // Group payload items by driver
    const driverGroups = {};
    
    payload.forEach(item => {
      const dataKey = item.dataKey;
      let driver = selectedDriver;
      let damageType = dataKey;
      
      // Check if this is an additional driver's data (format: "DriverName_damageType")
      if (dataKey.includes('_')) {
        const parts = dataKey.split('_');
        driver = parts[0];
        damageType = parts.slice(1).join('_');
      }
      
      if (!driverGroups[driver]) {
        driverGroups[driver] = [];
      }
      
      driverGroups[driver].push({
        ...item,
        damageType
      });
    });
    
    return (
      <div className="bg-neutral-900/95 backdrop-blur-xl text-white p-4 rounded-2xl border border-neutral-700/50 shadow-xl">
        <p className="font-black text-sm mb-3 text-cyan-400">Lap {label}</p>
        
        {Object.entries(driverGroups).map(([driver, items], driverIndex) => (
          <div key={driver} className={driverIndex > 0 ? "mt-3 pt-3 border-t border-neutral-700/50" : ""}>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">{driver}</p>
            {items.map((item, index) => {
              // Only show damage components that exist in the data
              if (item.value === undefined || item.value === null) return null;
              
              // Format the damage type name
              let damageTypeName = item.damageType;
              if (damageTypeName === 'frontWing') damageTypeName = 'Front Wing';
              if (damageTypeName === 'rearWing') damageTypeName = 'Rear Wing';
              if (damageTypeName === 'diffuser') damageTypeName = 'Diffuser';
              if (damageTypeName === 'floor') damageTypeName = 'Floor';
              if (damageTypeName === 'sidepod') damageTypeName = 'Sidepod';
              
              return (
                <div key={index} className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    <div 
                      className="w-2.5 h-2.5 rounded-full mr-2" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-neutral-300">
                      {damageTypeName}
                    </span>
                  </div>
                  <span className="text-sm font-bold ml-3">{Math.round(item.value)}%</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const handleDownload = async () => {
    if (!chartRef.current || isLoading || !processedDamageData || processedDamageData.length === 0) {
      return;
    }

    setIsExporting(true);
    try {
      // Brief delay to ensure chart is fully rendered
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Create a meaningful filename
      let filename = `${selectedDriver}_damage_chart`;
      if (additionalDrivers.length > 0) {
        filename = `damage_comparison_${selectedDriver}_and_others`;
      }
      
      if (typeof exportChartAsImage === 'function') {
        await exportChartAsImage(chartRef, filename);
      } else {
        console.log('Export chart function not available');
      }
    } catch (error) {
      console.error('Failed to export chart:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-neutral-900/50 backdrop-blur-xl rounded-3xl">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
        </div>
      );
    }
    
    if (!processedDamageData || processedDamageData.length === 0) {
      return (
        <div className="w-full h-full card-glass flex flex-col items-center justify-center text-neutral-400">
          <AlertCircle className="w-10 h-10 mb-3 text-neutral-500" />
          <p className="font-bold text-white">No damage data available</p>
          <p className="text-xs text-neutral-500 mt-1">
            No data found for {selectedDriver || 'this session or driver'}
          </p>
        </div>
      );
    }
    
    // Get all drivers that will be displayed
    const allDrivers = [selectedDriver, ...additionalDrivers].filter(Boolean);
    
    // Damage component colors - updated to match new design
    const damageColors = {
      frontWing: "#ef4444",  // Red
      rearWing: "#22c55e",   // Green
      diffuser: "#3b82f6",   // Blue
      floor: "#a855f7",      // Purple
      sidepod: "#eab308"     // Yellow
    };
    
    // Generate lines for all drivers
    const generateLines = () => {
      const lines = [];
      
      // For the main driver (solid lines)
      if (selectedDriver) {
        Object.entries(damageColors).forEach(([component, color]) => {
          lines.push(
            <Line 
              key={`${selectedDriver}_${component}`}
              type="monotone" 
              dataKey={component} 
              name={component} 
              stroke={color} 
              strokeWidth={2.5} 
              dot={false} 
              isAnimationActive={false}
              connectNulls={true}
            />
          );
        });
      }
      
      // For additional drivers (dashed/dotted lines)
      additionalDrivers.forEach(driver => {
        const lineStyle = getLineStyleForDriver(driver);
        const strokeDasharray = getStrokeDashArray(lineStyle);
        
        Object.entries(damageColors).forEach(([component, color]) => {
          lines.push(
            <Line 
              key={`${driver}_${component}`}
              type="monotone" 
              dataKey={`${driver}_${component}`} 
              name={`${driver}_${component}`} 
              stroke={color} 
              strokeWidth={2.5} 
              strokeDasharray={strokeDasharray}
              dot={false} 
              isAnimationActive={false}
              connectNulls={true}
            />
          );
        });
      });
      
      return lines;
    };
    
    return (
      <div className="w-full h-full" style={{ minHeight: '280px' }}>
        <ResponsiveContainer width="100%" height={500}>
          <LineChart
            data={mergedData.length > 0 ? mergedData : processedDamageData}
            margin={{ top: 10, right: 30, bottom: 50, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(64, 64, 64, 0.3)" />
            <XAxis 
              dataKey="lap" 
              label={{ value: 'Lap Number', position: 'insideBottom', offset: -25, fill: '#a3a3a3' }}
              tick={{ fill: 'rgba(163, 163, 163, 0.9)', fontSize: 12 }}
              stroke="rgba(115, 115, 115, 0.5)"
              type="number"
              domain={['dataMin', 'dataMax']}
              ticks={Array.from({ length: maxLapNumber }, (_, i) => i + 1)}
            />
            <YAxis 
              label={{ value: 'Damage %', angle: -90, position: 'insideLeft', offset: -5, fill: '#a3a3a3' }}
              domain={[0, 100]}
              tick={{ fill: 'rgba(163, 163, 163, 0.9)', fontSize: 12 }}
              stroke="rgba(115, 115, 115, 0.5)"
            />
            <RechartsTooltip content={<DamageTooltip />} />
            <Legend 
              wrapperStyle={{ 
                color: 'rgba(163, 163, 163, 0.9)',
                paddingTop: 20
              }} 
              verticalAlign="bottom"
              height={36}
              content={(props) => {
                const { payload } = props;
                if (!payload || payload.length === 0) return null;
                
                // Group by damage component type
                const componentGroups = {
                  frontWing: { label: 'Front Wing', color: damageColors.frontWing },
                  rearWing: { label: 'Rear Wing', color: damageColors.rearWing },
                  diffuser: { label: 'Diffuser', color: damageColors.diffuser },
                  floor: { label: 'Floor', color: damageColors.floor },
                  sidepod: { label: 'Sidepod', color: damageColors.sidepod }
                };
                
                // Extract unique drivers from payload
                const drivers = new Set();
                payload.forEach(entry => {
                  const key = entry.dataKey;
                  if (key.includes('_')) {
                    drivers.add(key.split('_')[0]);
                  } else {
                    drivers.add(selectedDriver);
                  }
                });
                
                return (
                  <div className="flex flex-col items-center justify-center mt-4 mb-2">
                    {/* Component legend */}
                    <div className="flex flex-wrap items-center justify-center mb-2">
                      {Object.entries(componentGroups).map(([key, item]) => (
                        <div key={key} className="flex items-center mx-3 my-1">
                          <div 
                            className="w-8 h-0 mr-2 border-t-2"
                            style={{ 
                              borderColor: item.color,
                              borderStyle: "solid"
                            }} 
                          />
                          <span className="text-xs text-neutral-300 font-medium">{item.label}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Driver legend (if multiple drivers) */}
                    {drivers.size > 1 && (
                      <div className="flex flex-wrap items-center justify-center mt-2">
                        {Array.from(drivers).map((driver) => {
                          const lineStyle = getLineStyleForDriver(driver);
                          return (
                            <div key={driver} className="flex items-center mx-3 my-1">
                              <div 
                                className="w-8 h-0 mr-2 border-t-2"
                                style={{ 
                                  borderColor: "#ffffff",
                                  borderStyle: lineStyle
                                }} 
                              />
                              <span className="text-xs text-neutral-300 font-medium">{driver}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }}
            />
            
            {/* Generate all lines for all drivers */}
            {generateLines()}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Update chart title based on displayed drivers
  const driversList = [selectedDriver, ...additionalDrivers].filter(Boolean);
  const chartTitle = driversList.length > 1
    ? `Car Damage Comparison (${driversList.length} Drivers)`
    : `Car Damage % Over Race Distance ${selectedDriver ? `- ${selectedDriver}` : ''}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={cn("h-full", className)}
    >
      <Card 
        ref={chartRef} 
        className="relative card-glass overflow-hidden h-full flex flex-col"
      >
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <CardTitle className="text-xl font-black tracking-tight text-white">
              {chartTitle}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0 flex-grow flex flex-col p-8">
          <div className="flex flex-wrap gap-3 mb-6">
            {/* Main driver selection */}
            <Select
              value={selectedDriver || ''}
              onValueChange={onDriverSelect}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full sm:w-[200px] bg-neutral-800/80 backdrop-blur-xl hover:bg-neutral-700/80 border-neutral-700/50 text-white font-medium rounded-xl h-10 transition-all">
                <User className="w-4 h-4 mr-2 text-neutral-400"/>
                <SelectValue placeholder="Select Driver" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 backdrop-blur-xl border-neutral-700/50 text-white rounded-xl max-h-[300px]">
                {Object.entries(teamGroups).map(([team, teamDrivers]) => (
                  teamDrivers.length > 0 && (
                    <SelectGroup key={team}>
                      <SelectLabel className="text-xs text-neutral-500 uppercase tracking-wider font-bold">{team}</SelectLabel>
                      {teamDrivers.map(driver => (
                        <SelectItem 
                          key={driver} 
                          value={driver} 
                          className="text-sm font-medium hover:bg-neutral-800 cursor-pointer rounded-lg"
                        >
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: driverColorMap?.[driver] || '#888' }}
                            />
                            {driver}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )
                ))}
              </SelectContent>
            </Select>
            
            {/* Add driver dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-10 px-4 bg-neutral-800/80 backdrop-blur-xl hover:bg-neutral-700/80 text-white border border-neutral-700/50 rounded-xl font-medium transition-all"
                  disabled={isLoading || additionalDrivers.length >= 2}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {additionalDrivers.length >= 2 ? 'Max Drivers' : 'Add Driver'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-neutral-900 backdrop-blur-xl border border-neutral-700/50 text-white rounded-xl">
                <DropdownMenuLabel className="text-xs text-neutral-500 uppercase tracking-wider font-bold">
                  Add Driver to Comparison
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-neutral-700/50" />
                
                {/* Group by teams */}
                {Object.entries(teamGroups).map(([team, teamDrivers]) => (
                  teamDrivers.length > 0 && (
                    <React.Fragment key={team}>
                      <DropdownMenuLabel className="text-xs text-neutral-500 uppercase tracking-wider font-bold">
                        {team}
                      </DropdownMenuLabel>
                      {teamDrivers.map(driver => (
                        !additionalDrivers.includes(driver) && driver !== selectedDriver && (
                          <DropdownMenuItem 
                            key={driver} 
                            onClick={() => addDriver(driver)}
                            className="cursor-pointer hover:bg-neutral-800 rounded-lg font-medium"
                          >
                            <div className="flex items-center">
                              <div 
                                className="w-3 h-3 rounded-full mr-2" 
                                style={{ backgroundColor: driverColorMap?.[driver] || '#888' }}
                              />
                              {driver}
                            </div>
                          </DropdownMenuItem>
                        )
                      ))}
                    </React.Fragment>
                  )
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Additional drivers badges */}
          {additionalDrivers.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-2 mb-6"
            >
              {additionalDrivers.map((driver, index) => {
                const lineStyle = getLineStyleForDriver(driver);
                return (
                  <Badge 
                    key={driver}
                    className="bg-neutral-800/80 backdrop-blur-xl hover:bg-neutral-700/80 border border-neutral-700/50 text-white pl-3 pr-2 py-2 flex items-center gap-2 rounded-full font-medium"
                  >
                    <div className="flex items-center">
                      <div 
                        className="w-2 h-2 rounded-full mr-2" 
                        style={{ backgroundColor: driverColorMap?.[driver] || '#888' }}
                      />
                      <span className="mr-1">{driver}</span>
                      <span className="mx-1 text-xs text-neutral-400">
                        ({lineStyle === "dashed" ? "dashed" : "dotted"})
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 rounded-full hover:bg-neutral-600"
                      onClick={() => removeDriver(driver)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                );
              })}
            </motion.div>
          )}
          
          {/* Chart content */}
          <div className="flex-grow" style={{ minHeight: '280px', height: 'calc(100% - 60px)' }}>
            {renderContent()}
          </div>
          
          {/* Download button */}
          {processedDamageData && processedDamageData.length > 0 && (
            <div className="mt-6 flex justify-end">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="h-10 px-6 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-black font-bold rounded-2xl flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
                  onClick={handleDownload}
                  disabled={isExporting}
                >
                  <Download className="h-4 w-4" />
                  {isExporting ? "Exporting..." : "Download Chart"}
                </Button>
              </motion.div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}