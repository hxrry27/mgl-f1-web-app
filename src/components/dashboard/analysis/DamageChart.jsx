import React, { useEffect, useRef, useState } from 'react';
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
  
  // Set default for driversWithDamage
  const driversWithDamage = props.driversWithDamage || [];
  
  const chartRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // State for additional drivers (limited to 2 more, for a total of 3)
  const [additionalDrivers, setAdditionalDrivers] = useState([]);
  // State to store damage data for additional drivers
  const [additionalDamageData, setAdditionalDamageData] = useState({});
  // State for merged data
  const [mergedData, setMergedData] = useState([]);
  // State to track drivers with damage

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
      <div className="bg-gray-900/90 text-gray-200 p-3 rounded border border-gray-700/80 shadow-lg">
        <p className="font-semibold mb-2">Lap {label}</p>
        
        {Object.entries(driverGroups).map(([driver, items], driverIndex) => (
          <div key={driver} className="mb-2">
            <p className="text-sm font-medium border-b border-gray-700 pb-1 mb-1">{driver}</p>
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
                <div key={index} className="flex items-center mb-1">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm">
                    {damageTypeName}: {Math.round(item.value)}%
                  </span>
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
        <div className="w-full h-full flex items-center justify-center bg-gray-900/50 rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    if (!processedDamageData || processedDamageData.length === 0) {
      return (
        <div className="w-full h-full bg-gray-900/80 border border-gray-700/50 rounded-lg flex flex-col items-center justify-center text-gray-400">
          <AlertCircle className="w-10 h-10 mb-2" />
          <p className="font-semibold">No damage data available</p>
          <p className="text-xs text-gray-500 mt-1">
            No data found for {selectedDriver || 'this session or driver'}
          </p>
        </div>
      );
    }
    
    // Get all drivers that will be displayed
    const allDrivers = [selectedDriver, ...additionalDrivers].filter(Boolean);
    
    // Damage component colors
    const damageColors = {
      frontWing: "#ff0000",
      rearWing: "#00ff00",
      diffuser: "#0088ff",
      floor: "#ff00ff",
      sidepod: "#ffff00"
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
              strokeWidth={2} 
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
              strokeWidth={2} 
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
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={mergedData.length > 0 ? mergedData : processedDamageData}
            margin={{ top: 10, right: 30, bottom: 50, left: 10 }} // Increased bottom margin
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.3)" />
            <XAxis 
              dataKey="lap" 
              label={{ value: 'Lap Number', position: 'insideBottom', offset: -25, fill: '#ccc' }}
              tick={{ fill: 'rgba(156, 163, 175, 0.9)', fontSize: 12 }}
              stroke="rgba(156, 163, 175, 0.7)"
              type="number"
              domain={['dataMin', 'dataMax']}
              ticks={Array.from({ length: maxLapNumber }, (_, i) => i + 1)}
            />
            <YAxis 
              label={{ value: 'Damage %', angle: -90, position: 'insideLeft', offset: -5, fill: '#ccc' }}
              domain={[0, 100]}
              tick={{ fill: 'rgba(156, 163, 175, 0.9)', fontSize: 12 }}
              stroke="rgba(156, 163, 175, 0.7)"
            />
            <RechartsTooltip content={<DamageTooltip />} />
            <Legend 
              wrapperStyle={{ 
                color: 'rgba(156, 163, 175, 0.9)',
                paddingTop: 20 // Add padding to push it down
              }} 
              verticalAlign="bottom"
              height={36}
              // Custom legend renderer to show different line styles
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
                    // Additional driver format: "Driver_componentType"
                    drivers.add(key.split('_')[0]);
                  } else {
                    // Main driver components are not prefixed
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
                          <span className="text-xs text-gray-300">{item.label}</span>
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
                              <span className="text-xs text-gray-300">{driver}</span>
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
    <Card 
      ref={chartRef} 
      className={cn("chart-container bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden h-full flex flex-col", className)}
    >
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold text-white">{chartTitle}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex-grow flex flex-col">
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Main driver selection */}
          <Select
            value={selectedDriver || ''}
            onValueChange={onDriverSelect}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full sm:w-[180px] bg-gray-800/80 border-gray-700 text-gray-200 text-sm h-9">
              <User className="w-4 h-4 mr-2 opacity-70"/>
              <SelectValue placeholder="Select Driver" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700 text-gray-200 max-h-[300px]">
              {Object.entries(teamGroups).map(([team, teamDrivers]) => (
                teamDrivers.length > 0 && (
                  <SelectGroup key={team}>
                    <SelectLabel className="text-xs text-gray-500">{team}</SelectLabel>
                    {teamDrivers.map(driver => (
                      <SelectItem key={driver} value={driver} className="text-sm">
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
                className="h-9 bg-gray-800/80 hover:bg-gray-700 text-gray-200 border border-gray-700"
                disabled={isLoading || additionalDrivers.length >= 2}
              >
                <Plus className="w-4 h-4 mr-2" />
                {additionalDrivers.length >= 2 ? 'Max Drivers' : 'Add Driver'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-900 border border-gray-700 text-gray-200">
              <DropdownMenuLabel className="text-xs text-gray-500">Add Driver to Comparison</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-700" />
              
              {/* Group by teams */}
              {Object.entries(teamGroups).map(([team, teamDrivers]) => (
                teamDrivers.length > 0 && (
                  <React.Fragment key={team}>
                    <DropdownMenuLabel className="text-xs text-gray-500">{team}</DropdownMenuLabel>
                    {teamDrivers.map(driver => (
                      // Only show drivers not already selected
                      !additionalDrivers.includes(driver) && driver !== selectedDriver && (
                        <DropdownMenuItem 
                          key={driver} 
                          onClick={() => addDriver(driver)}
                          className="cursor-pointer"
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
        
        {/* Additional drivers badges - show which drivers are being compared */}
        {additionalDrivers.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {additionalDrivers.map((driver, index) => {
              const lineStyle = getLineStyleForDriver(driver);
              return (
                <Badge 
                  key={driver}
                  className="bg-gray-800 hover:bg-gray-700 pl-2 pr-1 py-1 flex items-center gap-1"
                >
                  <div className="flex items-center">
                    <div 
                      className="w-2 h-2 rounded-full mr-1" 
                      style={{ backgroundColor: driverColorMap?.[driver] || '#888' }}
                    />
                    <span className="mr-1">{driver}</span>
                    <span className="mx-1 text-xs text-gray-400">
                      ({lineStyle === "dashed" ? "dashed" : "dotted"})
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 rounded-full hover:bg-gray-600"
                    onClick={() => removeDriver(driver)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              );
            })}
          </div>
        )}
        
        {/* Chart content */}
        <div className="flex-grow" style={{ minHeight: '280px', height: 'calc(100% - 60px)' }}>
          {renderContent()}
        </div>
        
        {/* Download button */}
        {processedDamageData && processedDamageData.length > 0 && (
          <div className="mt-4 flex justify-end">
            <Button 
              variant="secondary" 
              size="sm" 
              className="h-7 px-2.5 text-xs bg-gray-800 hover:bg-gray-700 text-white flex items-center gap-1.5 border border-gray-700"
              onClick={handleDownload}
              disabled={isExporting}
            >
              <Download className="h-3.5 w-3.5" />
              {isExporting ? "Exporting..." : "Download Chart"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}