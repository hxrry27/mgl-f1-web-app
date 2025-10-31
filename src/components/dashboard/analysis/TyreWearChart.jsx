'use client';

import React, { useEffect, useState } from 'react';
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

export default function TyreWearChart({
  className,
  isLoading,
  processedTyreWearData,
  tyreWearYRange,
  selectedDriver,
  drivers,
  driverTeams,
  driverColorMap,
  onDriverSelect,
  showRawLapData,
  setShowRawLapData,
  exportChartAsImage,
  fetchDriverTyreWearData = async (driver) => {
    console.log(`Fetch tyre wear for ${driver}`);
    return [];
  }
}) {
  const chartRef = React.useRef(null);
  const [isExporting, setIsExporting] = React.useState(false);
  
  const [additionalDrivers, setAdditionalDrivers] = useState([]);
  const [additionalTyreWearData, setAdditionalTyreWearData] = useState({});
  const [mergedData, setMergedData] = useState([]);

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

  const teamGroups = {};
  teamOrder.forEach(team => {
    teamGroups[team] = [];
  });
  
  drivers.forEach(driver => {
    const team = driverTeams[driver] || 'Unknown Team';
    if (teamGroups[team]) {
      teamGroups[team].push(driver);
    } else {
      teamGroups['Unknown Team'] = teamGroups['Unknown Team'] || [];
      teamGroups['Unknown Team'].push(driver);
    }
  });

  const addDriver = async (driver) => {
    if (additionalDrivers.includes(driver) || driver === selectedDriver) {
      return;
    }
    
    if (additionalDrivers.length >= 2) {
      console.log('Maximum of 3 drivers reached');
      return;
    }
    
    console.log(`Adding driver ${driver} to tyre wear comparison`);
    setAdditionalDrivers(prev => [...prev, driver]);
    
    try {
      const data = await fetchDriverTyreWearData(driver);
      console.log(`Received ${data?.length || 0} tyre wear data points for ${driver}`);
      
      setAdditionalTyreWearData(prev => ({
        ...prev,
        [driver]: data
      }));
    } catch (error) {
      console.error(`Error fetching tyre wear data for ${driver}:`, error);
    }
  };

  const removeDriver = (driver) => {
    setAdditionalDrivers(prev => prev.filter(d => d !== driver));
    setAdditionalTyreWearData(prev => {
      const newData = {...prev};
      delete newData[driver];
      return newData;
    });
  };

  const handleDownload = async () => {
    if (!chartRef.current || isLoading || !processedTyreWearData || processedTyreWearData.length === 0) {
      return;
    }

    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      let filename = `${selectedDriver}_tyre_wear`;
      if (additionalDrivers.length > 0) {
        filename = `tyre_wear_comparison_${selectedDriver}_and_others`;
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

  const getLineStyleForDriver = (driver) => {
    if (driver === selectedDriver) return "solid";
    const index = additionalDrivers.indexOf(driver);
    if (index === 0) return "dashed";
    if (index === 1) return "dotted";
    return "solid";
  };

  const getStrokeDashArray = (lineStyle) => {
    switch(lineStyle) {
      case "solid": return "0";
      case "dashed": return "5 5";
      case "dotted": return "2 2";
      default: return "0";
    }
  };

  useEffect(() => {
    if (!processedTyreWearData || processedTyreWearData.length === 0) {
      setMergedData([]);
      return;
    }
    
    let mergedPoints = [...processedTyreWearData];
    
    Object.entries(additionalTyreWearData).forEach(([driver, driverData]) => {
      if (!driverData || driverData.length === 0) return;
      
      driverData.forEach(driverPoint => {
        const sessionTime = driverPoint.session_time;
        let closestPoint = null;
        let closestDistance = Infinity;
        
        for (let i = 0; i < mergedPoints.length; i++) {
          const distance = Math.abs(mergedPoints[i].session_time - sessionTime);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestPoint = i;
          }
        }
        
        if (closestDistance < 0.5 && closestPoint !== null) {
          mergedPoints[closestPoint] = {
            ...mergedPoints[closestPoint],
            [`${driver}_front_left`]: driverPoint[`${driver}_front_left`],
            [`${driver}_front_right`]: driverPoint[`${driver}_front_right`],
            [`${driver}_rear_left`]: driverPoint[`${driver}_rear_left`],
            [`${driver}_rear_right`]: driverPoint[`${driver}_rear_right`]
          };
        } else {
          mergedPoints.push({
            session_time: sessionTime,
            [`${driver}_front_left`]: driverPoint[`${driver}_front_left`],
            [`${driver}_front_right`]: driverPoint[`${driver}_front_right`],
            [`${driver}_rear_left`]: driverPoint[`${driver}_rear_left`],
            [`${driver}_rear_right`]: driverPoint[`${driver}_rear_right`]
          });
        }
      });
    });
    
    mergedPoints.sort((a, b) => a.session_time - b.session_time);
    setMergedData(mergedPoints);
  }, [processedTyreWearData, additionalTyreWearData]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-neutral-900/50 backdrop-blur-xl rounded-3xl">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
        </div>
      );
    }
    
    if (!processedTyreWearData || processedTyreWearData.length === 0) {
      return (
        <div className="w-full h-full bg-neutral-900/60 backdrop-blur-xl border border-neutral-700/50 rounded-3xl flex flex-col items-center justify-center text-neutral-400">
          <AlertCircle className="w-10 h-10 mb-3 text-neutral-500" />
          <p className="font-bold text-white">No tyre wear data available</p>
          <p className="text-xs text-neutral-500 mt-1">
            No data found for {selectedDriver || 'selected driver'}
          </p>
        </div>
      );
    }
    
    const allDrivers = [selectedDriver, ...additionalDrivers].filter(Boolean);
    
    return (
      <div className="w-full h-full" style={{ minHeight: '280px' }}>
        <ResponsiveContainer width="100%" height={500}>
          <LineChart
            data={mergedData}
            margin={{ top: 0, right: 30, bottom: 50, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(64, 64, 64, 0.3)" />
            <XAxis 
              dataKey="session_time" 
              label={{ value: 'Session Time (s)', position: 'insideBottom', offset: -25, fill: '#a3a3a3' }}
              tick={{ fill: 'rgba(163, 163, 163, 0.9)', fontSize: 12 }}
              stroke="rgba(115, 115, 115, 0.5)"
              type="number"
            />
            <YAxis 
              label={{ value: 'Wear %', angle: -90, position: 'insideLeft', offset: -5, fill: '#a3a3a3' }}
              domain={tyreWearYRange}
              tick={{ fill: 'rgba(163, 163, 163, 0.9)', fontSize: 12 }}
              tickCount={5}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(value) => Math.round(value)}
              stroke="rgba(115, 115, 115, 0.5)"
            />
            <RechartsTooltip 
              formatter={(value, name) => {
                const parts = name.split('_');
                if (parts.length >= 3) {
                  const tyrePosition = `${parts[0]} ${parts[1]}`;
                  const driver = parts.slice(2).join('_');
                  return [`${value.toFixed(2)}%`, `${driver} - ${tyrePosition}`];
                }
                return [`${value.toFixed(2)}%`, name];
              }}
              labelFormatter={(time) => `Session Time: ${time.toFixed(2)}s`}
              contentStyle={{ 
                backgroundColor: 'rgba(23, 23, 23, 0.95)', 
                borderColor: 'rgba(64, 64, 64, 0.5)', 
                color: '#ffffff', 
                borderRadius: '16px', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(12px)'
              }}
              labelStyle={{ color: '#22d3ee', fontWeight: 'bold', marginBottom: '8px' }}
            />
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
                
                const driverGroups = {};
                payload.forEach(entry => {
                  const parts = entry.value.split('_');
                  if (parts.length >= 3) {
                    const tyrePosition = `${parts[0]}_${parts[1]}`;
                    const driver = parts.slice(2).join('_');
                    
                    if (!driverGroups[driver]) {
                      driverGroups[driver] = {};
                    }
                    driverGroups[driver][tyrePosition] = entry.color;
                  }
                });
                
                const tyrePositions = [
                  { key: 'front_left', label: 'Front Left', color: '#ef4444' },
                  { key: 'front_right', label: 'Front Right', color: '#22c55e' },
                  { key: 'rear_left', label: 'Rear Left', color: '#3b82f6' },
                  { key: 'rear_right', label: 'Rear Right', color: '#eab308' }
                ];
                
                return (
                  <div className="flex flex-col items-center justify-center mt-4 mb-2">
                    <div className="flex flex-wrap items-center justify-center mb-2">
                      {tyrePositions.map(pos => (
                        <div key={pos.key} className="flex items-center mx-3 my-1">
                          <div 
                            className="w-8 h-0 mr-2 border-t-2"
                            style={{ 
                              borderColor: pos.color,
                              borderStyle: "solid"
                            }} 
                          />
                          <span className="text-xs text-neutral-300 font-medium">{pos.label}</span>
                        </div>
                      ))}
                    </div>
                    
                    {Object.keys(driverGroups).length > 1 && (
                      <div className="flex flex-wrap items-center justify-center mt-2">
                        {Object.keys(driverGroups).map((driver, index) => {
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
            
            <Line 
              type="monotone" 
              dataKey="front_left" 
              name={`front_left_${selectedDriver}`}
              stroke="#ef4444" 
              strokeWidth={2.5} 
              dot={false}
              connectNulls={true}
              isAnimationActive={false}
            />
            <Line 
              type="monotone" 
              dataKey="front_right" 
              name={`front_right_${selectedDriver}`}
              stroke="#22c55e" 
              strokeWidth={2.5} 
              dot={false}
              connectNulls={true}
              isAnimationActive={false}
            />
            <Line 
              type="monotone" 
              dataKey="rear_left" 
              name={`rear_left_${selectedDriver}`}
              stroke="#3b82f6" 
              strokeWidth={2.5}
              dot={false}
              connectNulls={true}
              isAnimationActive={false}
            />
            <Line 
              type="monotone" 
              dataKey="rear_right" 
              name={`rear_right_${selectedDriver}`}
              stroke="#eab308" 
              strokeWidth={2.5} 
              dot={false}
              connectNulls={true}
              isAnimationActive={false}
            />
            
            {additionalDrivers.map((driver, driverIndex) => {
              const driverData = additionalTyreWearData[driver];
              if (!driverData || driverData.length === 0) return null;
              
              const lineStyle = getLineStyleForDriver(driver);
              const strokeDasharray = getStrokeDashArray(lineStyle);
              
              return [
                <Line 
                  key={`${driver}_fl`}
                  type="monotone" 
                  dataKey={`${driver}_front_left`}
                  name={`front_left_${driver}`}
                  stroke="#ef4444" 
                  strokeWidth={2.5} 
                  strokeDasharray={strokeDasharray}
                  dot={false}
                  connectNulls={true}
                  isAnimationActive={false}
                />,
                <Line 
                  key={`${driver}_fr`}
                  type="monotone" 
                  dataKey={`${driver}_front_right`}
                  name={`front_right_${driver}`}
                  stroke="#22c55e" 
                  strokeWidth={2.5} 
                  strokeDasharray={strokeDasharray}
                  dot={false}
                  connectNulls={true}
                  isAnimationActive={false}
                />,
                <Line 
                  key={`${driver}_rl`}
                  type="monotone" 
                  dataKey={`${driver}_rear_left`}
                  name={`rear_left_${driver}`}
                  stroke="#3b82f6" 
                  strokeWidth={2.5}
                  strokeDasharray={strokeDasharray}
                  dot={false}
                  connectNulls={true}
                  isAnimationActive={false}
                />,
                <Line 
                  key={`${driver}_rr`}
                  type="monotone" 
                  dataKey={`${driver}_rear_right`}
                  name={`rear_right_${driver}`}
                  stroke="#eab308" 
                  strokeWidth={2.5} 
                  strokeDasharray={strokeDasharray}
                  dot={false}
                  connectNulls={true}
                  isAnimationActive={false}
                />
              ];
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const driversList = [selectedDriver, ...additionalDrivers].filter(Boolean);
  const chartTitle = driversList.length > 1
    ? `Tyre Wear Comparison (${driversList.length} Drivers)`
    : `Tyre Wear % Over Session Time ${selectedDriver ? `- ${selectedDriver}` : '(No Driver Selected)'}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={cn("h-full", className)}
    >
      <Card 
        ref={chartRef} 
        className="relative bg-neutral-900/60 backdrop-blur-xl border border-neutral-700/50 rounded-3xl overflow-hidden h-full flex flex-col"
      >
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <CardTitle className="text-xl font-black tracking-tight text-white">{chartTitle}</CardTitle>
            {showRawLapData !== undefined && (
              <Button 
                variant="secondary"
                size="sm"
                onClick={() => setShowRawLapData(!showRawLapData)}
                className="h-9 px-4 bg-neutral-800/80 backdrop-blur-xl hover:bg-neutral-700/80 border border-neutral-700/50 text-white rounded-xl font-medium transition-all"
              >
                {showRawLapData ? 'Hide Raw Data' : 'Show Raw Data'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 flex-grow flex flex-col p-8">
          <div className="flex flex-wrap gap-3 mb-6">
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
          
          {showRawLapData && (
            <div className="max-h-[200px] overflow-y-auto mb-4 p-4 border border-neutral-700/50 rounded-2xl bg-neutral-900/50 backdrop-blur-xl">
              <p className="text-sm font-bold text-white mb-2">Debug Information</p>
              
              <p className="text-xs text-neutral-400 mb-1">
                Data points: {processedTyreWearData?.length || 0} after sampling
              </p>
              
              <p className="text-xs text-neutral-400 mb-1">
                Y-axis range: {tyreWearYRange ? `${tyreWearYRange[0].toFixed(4)}% to ${tyreWearYRange[1].toFixed(4)}%` : 'N/A'}
              </p>
              
              {processedTyreWearData && processedTyreWearData.length > 0 && (
                <>
                  <p className="text-xs text-neutral-400 mb-1">Sample Data Points:</p>
                  <pre className="text-xs text-neutral-500 bg-neutral-800/50 p-2 rounded-xl overflow-x-auto">
                    {JSON.stringify(processedTyreWearData.slice(0, 3), null, 2)}
                  </pre>
                </>
              )}
              
              {additionalDrivers.length > 0 && (
                <>
                  <p className="text-xs text-neutral-400 mt-3 mb-1">Additional Drivers:</p>
                  {additionalDrivers.map(driver => (
                    <p key={driver} className="text-xs text-neutral-400 mb-1">
                      {driver}: {additionalTyreWearData[driver]?.length || 0} data points
                    </p>
                  ))}
                </>
              )}
            </div>
          )}
          
          <div className="flex-grow" style={{ minHeight: '280px', height: 'calc(100% - 60px)' }}>
            {renderContent()}
          </div>
          
          {processedTyreWearData && processedTyreWearData.length > 0 && (
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