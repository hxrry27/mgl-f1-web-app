import React, { useState, useRef, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
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
import { User, Clock, Download, BarChart2, AlertCircle, Plus, X } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function IndividualLapChart({
  className,
  isLoading,
  lapTelemetryData,
  selectedDriver,
  selectedLap,
  maxLapNumber,
  drivers,
  driverTeams,
  driverColorMap,
  onDriverSelect,
  onLapSelect,
  showRawLapData,
  setShowRawLapData,
  trackData,
  exportChartAsImage,
  // New prop for fetching additional driver data
  fetchDriverTelemetry = async (driver, lap) => {
    console.log(`Fetch telemetry for ${driver}, lap ${lap}`);
    return []; // Return empty array by default
  }
}) {
  const chartRef = useRef(null);
  const [chartType, setChartType] = useState('speed'); // 'speed', 'throttle', 'brake'
  const [isExporting, setIsExporting] = useState(false);
  
  // State for additional drivers (beyond the main selected driver)
  const [additionalDrivers, setAdditionalDrivers] = useState([]);
  // State to store telemetry data for additional drivers
  const [additionalTelemetryData, setAdditionalTelemetryData] = useState({});

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

  // Group drivers by team for dropdown
  const teamGroups = {};
  
  // Initialize teams in the correct order
  teamOrder.forEach(team => {
    teamGroups[team] = [];
  });
  
  // Populate driver groups
  drivers.forEach(driver => {
    const team = driverTeams[driver] || 'Unknown Team';
    if (teamGroups[team]) {
      teamGroups[team].push(driver);
    } else {
      teamGroups['Unknown Team'] = teamGroups['Unknown Team'] || [];
      teamGroups['Unknown Team'].push(driver);
    }
  });

  // Helper function for finding closest data point by distance
  const findClosestPoint = (dataArray, targetDistance) => {
    if (!dataArray || dataArray.length === 0) return null;
    
    let closestPoint = dataArray[0];
    let closestDistance = Math.abs((dataArray[0].distance || 0) - targetDistance);
    
    for (let i = 1; i < dataArray.length; i++) {
      const distance = Math.abs((dataArray[i].distance || 0) - targetDistance);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPoint = dataArray[i];
      }
    }
    
    // Only return if we found a reasonably close point (within 50m)
    return closestDistance <= 50 ? closestPoint : null;
  };

  // Function to add a driver to the comparison
  const addDriver = async (driver) => {
    // Don't add if already in the list or if it's the main selected driver
    if (additionalDrivers.includes(driver) || driver === selectedDriver) {
      return;
    }
    
    console.log(`Adding driver ${driver} to comparison`);
    
    // Add to our list of additional drivers
    setAdditionalDrivers(prev => [...prev, driver]);
    
    // Fetch telemetry data for this driver
    try {
      const data = await fetchDriverTelemetry(driver, 1);
      console.log(`Received ${data?.length || 0} data points for ${driver}`);
      
      // Store the complete data array
      setAdditionalTelemetryData(prev => ({
        ...prev,
        [driver]: { 
          lap: 1, 
          data: data // Make sure this is the complete telemetry data array
        }
      }));
    } catch (error) {
      console.error(`Error fetching data for ${driver}:`, error);
    }
  };

  // Function to remove a driver from the comparison
  const removeDriver = (driver) => {
    setAdditionalDrivers(prev => prev.filter(d => d !== driver));
    
    // Also remove their data from state
    setAdditionalTelemetryData(prev => {
      const newData = {...prev};
      delete newData[driver];
      return newData;
    });
  };

  // Function to change a lap for an additional driver
  const changeDriverLap = async (driver, lap) => {
    try {
      const data = await fetchDriverTelemetry(driver, lap);
      setAdditionalTelemetryData(prev => ({
        ...prev,
        [driver]: { lap, data }
      }));
    } catch (error) {
      console.error(`Error fetching data for ${driver} lap ${lap}:`, error);
    }
  };

  const getChartColor = () => {
    switch(chartType) {
      case 'speed': return driverColorMap?.[selectedDriver] || '#1e88e5';
      case 'throttle': return '#4ade80'; // Green
      case 'brake': return '#ef4444'; // Red
      default: return '#1e88e5'; // Blue
    }
  };

  const getChartData = () => {
    if (!lapTelemetryData || lapTelemetryData.length === 0) {
      return [];
    }
    
    try {
      // Process the main driver's data
      const rawData = lapTelemetryData.map((point, index) => {
        const distance = point.distance !== undefined 
          ? point.distance 
          : (index / lapTelemetryData.length) * (trackData?.length_meters || 5000);
        
        let value;
        if (chartType === 'speed') {
          value = point.speed !== undefined ? point.speed : 0;
        } else if (chartType === 'throttle') {
          value = point.throttle !== undefined 
            ? (point.throttle > 1 ? point.throttle : point.throttle * 100)
            : 0;
        } else { // brake
          value = point.brake !== undefined 
            ? (point.brake > 1 ? point.brake : point.brake * 100)
            : 0;
        }
        
        // Create an object with main driver data
        return {
          Distance: distance,
          [`${selectedDriver}_${chartType}`]: value
        };
      });
      
      // Sort by distance
      const sortedData = rawData.sort((a, b) => a.Distance - b.Distance);
      
      // Now add data for each additional driver
      additionalDrivers.forEach(driver => {
        // Check if we have data for this driver
        const driverDataArray = additionalTelemetryData[driver]?.data;
        
        if (driverDataArray && driverDataArray.length > 0) {
          console.log(`Processing ${driverDataArray.length} data points for ${driver}`);
          
          // For each distance point in our main data
          sortedData.forEach((dataPoint, index) => {
            // Find the closest point in the additional driver's data
            const closestPoint = findClosestPoint(driverDataArray, dataPoint.Distance);
            
            if (closestPoint) {
              // Extract the value based on the chartType
              let value = 0;
              if (chartType === 'speed') {
                value = closestPoint.speed !== undefined ? closestPoint.speed : 0;
              } else if (chartType === 'throttle') {
                value = closestPoint.throttle !== undefined 
                  ? (closestPoint.throttle > 1 ? closestPoint.throttle : closestPoint.throttle * 100)
                  : 0;
              } else { // brake
                value = closestPoint.brake !== undefined 
                  ? (closestPoint.brake > 1 ? closestPoint.brake : closestPoint.brake * 100)
                  : 0;
              }
              
              // Add this driver's data to the point
              dataPoint[`${driver}_${chartType}`] = value;
            }
          });
        } else {
          console.log(`No data available for additional driver ${driver}`);
        }
      });
      
      return sortedData;
    } catch (error) {
      console.error("Error processing chart data:", error);
      return [];
    }
  };

  const getYAxisProps = () => {
    switch(chartType) {
      case 'speed':
        return {
          domain: [0, 'auto'],
          tickFormatter: (value) => `${value} km/h`,
          label: { value: 'Speed (km/h)', angle: -90, position: 'insideLeft', offset: -5, fill: '#ccc' }
        };
      case 'throttle':
        return {
          domain: [0, 100],
          tickFormatter: (value) => `${value}%`,
          label: { value: 'Throttle %', angle: -90, position: 'insideLeft', offset: -5, fill: '#ccc' }
        };
      case 'brake':
        return {
          domain: [0, 100],
          tickFormatter: (value) => `${value}%`,
          label: { value: 'Brake %', angle: -90, position: 'insideLeft', offset: -5, fill: '#ccc' }
        };
      default:
        return {
          domain: [0, 'auto'],
          tickFormatter: (value) => `${value} km/h`,
          label: { value: 'Speed (km/h)', angle: -90, position: 'insideLeft', offset: -5, fill: '#ccc' }
        };
    }
  };

  const handleDownload = async () => {
    if (!chartRef.current || isLoading || !lapTelemetryData || lapTelemetryData.length === 0) {
      return;
    }

    setIsExporting(true);
    try {
      // Brief delay to ensure chart is fully rendered
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Create a meaningful filename
      let filename = `${selectedDriver}_lap${selectedLap}_${chartType}`;
      if (additionalDrivers.length > 0) {
        filename = `${chartType}_comparison_${selectedDriver}_and_others`;
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

  const getCombinedChartData = () => {
    // Get primary driver data
    const mainData = getChartData();
    
    if (mainData.length === 0 || additionalDrivers.length === 0) {
      return mainData;
    }
    
    // Create a copy of the main data
    const combinedData = [...mainData];
    
    // Add data for each additional driver
    additionalDrivers.forEach(driver => {
      const driverData = additionalTelemetryData[driver]?.data;
      
      if (!driverData || driverData.length === 0) {
        return;
      }
      
      // Process this driver's data points
      const processedPoints = driverData.map((point, index) => {
        const distance = point.distance !== undefined 
          ? point.distance 
          : (index / driverData.length) * (trackData?.length_meters || 5000);
        
        let value;
        if (chartType === 'speed') {
          value = point.speed !== undefined ? point.speed : 0;
        } else if (chartType === 'throttle') {
          value = point.throttle !== undefined 
            ? (point.throttle > 1 ? point.throttle : point.throttle * 100)
            : 0;
        } else { // brake
          value = point.brake !== undefined 
            ? (point.brake > 1 ? point.brake : point.brake * 100)
            : 0;
        }
        
        return { Distance: distance, value };
      });
      
      // Add this driver's data to each matching distance point in combined data
      combinedData.forEach((dataPoint, index) => {
        // Find the closest point in this driver's data
        const nearestPoint = processedPoints.reduce((nearest, current) => {
          return Math.abs(current.Distance - dataPoint.Distance) < 
                 Math.abs(nearest.Distance - dataPoint.Distance) 
                 ? current : nearest;
        }, processedPoints[0]);
        
        // Only add if the point is reasonably close (within 5m)
        if (nearestPoint && Math.abs(nearestPoint.Distance - dataPoint.Distance) <= 5) {
          dataPoint[`${driver}_${chartType}`] = nearestPoint.value;
        }
      });
    });
    
    return combinedData;
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-900/50 rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    if (!lapTelemetryData || lapTelemetryData.length === 0) {
      return (
        <div className="w-full h-full bg-gray-900/80 border border-red-500/30 rounded-lg flex flex-col items-center justify-center text-red-400">
          <AlertCircle className="w-10 h-10 mb-2" />
          <p className="font-semibold">No telemetry data available</p>
          <p className="text-xs text-gray-500 mt-1">
            No {chartType} data found for {selectedDriver} lap {selectedLap}
          </p>
        </div>
      );
    }
  
    // Get the main driver's data
    let chartData = getChartData();
    
    if (chartData.length === 0) {
      return (
        <div className="w-full h-full bg-gray-900/80 border border-red-500/30 rounded-lg flex flex-col items-center justify-center text-red-400">
          <AlertCircle className="w-10 h-10 mb-2" />
          <p className="font-semibold">Error processing telemetry data</p>
          <p className="text-xs text-gray-500 mt-1">Could not generate chart data</p>
        </div>
      );
    }
    
    const yAxisProps = getYAxisProps();
    const dataKey = `${selectedDriver}_${chartType}`;
    
    return (
      <div className="w-full h-full" style={{ minHeight: '280px' }}>
        <ResponsiveContainer width="100%" height={500}>
          <LineChart 
              data={chartData} 
              margin={{ top: 0, right: 10, left: -15, bottom: 40 }} // Increase bottom from 5 to 40
            >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(100, 116, 139, 0.3)" />
            <XAxis 
              type="number" 
              dataKey="Distance" 
              stroke="rgba(156, 163, 175, 0.7)" 
              tick={{ fill: 'rgba(156, 163, 175, 0.9)', fontSize: 12 }} 
              tickFormatter={(value) => `${Math.round(value)}m`}
              domain={[0, trackData?.length_meters || 5000]} 
              label={{ value: 'Distance (m)', position: 'insideBottom', offset: -15, fill: '#ccc' }}
              allowDecimals={false}
            />
            <YAxis 
              {...yAxisProps}
              stroke="rgba(156, 163, 175, 0.7)" 
              tick={{ fill: 'rgba(156, 163, 175, 0.9)', fontSize: 12 }}
              width={50}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(31, 41, 55, 0.9)', 
                borderColor: 'rgba(100, 116, 139, 0.5)', 
                color: '#E5E7EB', 
                borderRadius: '6px', 
                boxShadow: '0 2px 10px rgba(0,0,0,0.5)' 
              }} 
              labelStyle={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '5px' }} 
              formatter={(value, name) => {
                // Extract driver by taking everything before the LAST underscore
                const lastUnderscoreIndex = name.lastIndexOf('_');
                const driver = lastUnderscoreIndex > 0 ? name.substring(0, lastUnderscoreIndex) : name;
                
                if (chartType === 'speed') {
                  return [`${value} km/h`, `${driver} Speed`];
                } else if (chartType === 'throttle') {
                  return [`${value}%`, `${driver} Throttle`];
                } else {
                  return [`${value}%`, `${driver} Brake`];
                }
              }}
              labelFormatter={(label) => `Distance: ${label.toFixed(2)}m`}
              isAnimationActive={false}
              cursor={{ strokeDasharray: '3 3' }}
            />

            {/* Legend Component (the key) */}
            <Legend 
              wrapperStyle={{ paddingTop: 10 }}
              iconType="plainline"
              iconSize={30}
              content={(props) => {
                const { payload } = props;
                
                // First, find all team groups
                const teamDrivers = {};
                payload.forEach(entry => {
                  // Extract driver name more carefully - taking everything before the LAST underscore
                  const fullKey = entry.value;
                  const lastUnderscoreIndex = fullKey.lastIndexOf('_');
                  const driver = lastUnderscoreIndex > 0 ? fullKey.substring(0, lastUnderscoreIndex) : fullKey;
                  
                  const team = driverTeams[driver] || 'Unknown';
                  if (!teamDrivers[team]) teamDrivers[team] = [];
                  teamDrivers[team].push(driver);
                });
                
                return (
                  <div className="flex flex-wrap items-center justify-center mt-4 mb-2">
                    {payload.map((entry, index) => {
                      // Extract driver name the same way
                      const fullKey = entry.value;
                      const lastUnderscoreIndex = fullKey.lastIndexOf('_');
                      const driver = lastUnderscoreIndex > 0 ? fullKey.substring(0, lastUnderscoreIndex) : fullKey;
                      
                      const team = driverTeams[driver] || 'Unknown';
                      
                      const isMainSelectedDriver = driver === selectedDriver;
                      const teamDriversList = teamDrivers[team];
                      const isFirstTeamDriver = teamDriversList[0] === driver || isMainSelectedDriver;
                      
                      const useDashedLine = !isFirstTeamDriver;
                      
                      return (
                        <div key={`item-${index}`} className="flex items-center mx-2 my-1">
                          <div 
                            className="w-8 h-0 mr-2 border-t-2"
                            style={{ 
                              borderColor: entry.color,
                              borderStyle: useDashedLine ? 'dashed' : 'solid'
                            }} 
                          />
                          <span className="text-xs text-gray-300">{driver}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              }}
            />
            
            {/* Main driver line */}
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={driverColorMap?.[selectedDriver] || '#1e88e5'} 
              strokeWidth={2} 
              dot={false} 
              isAnimationActive={false}
              activeDot={{ 
                r: 4, 
                strokeWidth: 1, 
                stroke: 'rgba(255,255,255,0.5)', 
                fill: driverColorMap?.[selectedDriver] || '#1e88e5'
              }} 
              connectNulls={true} 
            />
            
            {/* Add lines for additional drivers */}
            {additionalDrivers.map((driver, index) => {
              // Check if this driver is from the same team as the main driver
              const mainDriverTeam = driverTeams[selectedDriver];
              const thisDriverTeam = driverTeams[driver];
              const sameTeamAsMain = mainDriverTeam === thisDriverTeam;
              
              // Also check if this driver has the same team as any previous additional driver
              // This handles cases where you add multiple drivers from the same team
              const sameTeamAsPrevious = additionalDrivers
                .slice(0, index)
                .some(prevDriver => driverTeams[prevDriver] === thisDriverTeam);
              
              // Apply dashed line if this driver is from the same team as main or any previous driver
              const useDashedLine = sameTeamAsMain || sameTeamAsPrevious;
              
              return (
                <Line 
                  key={driver}
                  type="monotone" 
                  dataKey={`${driver}_${chartType}`} 
                  stroke={driverColorMap?.[driver] || '#888888'} 
                  strokeWidth={2} 
                  strokeDasharray={useDashedLine ? "3 3" : "0"} // Add dashes for same team
                  dot={false} 
                  isAnimationActive={false}
                  activeDot={{ 
                    r: 4, 
                    strokeWidth: 1, 
                    stroke: 'rgba(255,255,255,0.5)', 
                    fill: driverColorMap?.[driver] || '#888888'
                  }} 
                  connectNulls={true} 
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const chartTitle = additionalDrivers.length > 0
    ? `Driver ${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Comparison`
    : `${selectedDriver ? `${selectedDriver}'s ` : ''}${
      selectedLap === 'fastest' ? 'Fastest Lap' : `Lap ${selectedLap}`
    } ${chartType.charAt(0).toUpperCase() + chartType.slice(1)}`;

  return (
    <Card 
      ref={chartRef} 
      className={cn("chart-container bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden h-[600px]", className)}
    >
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold text-white">{chartTitle}</CardTitle>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={chartType}
              onValueChange={setChartType}
            >
              <SelectTrigger className="w-full sm:w-[120px] bg-gray-800/80 border-gray-700 text-gray-200 text-sm h-9">
                <BarChart2 className="w-4 h-4 mr-2 opacity-70"/>
                <SelectValue placeholder="Chart Type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700 text-gray-200">
                <SelectGroup>
                  <SelectLabel className="text-xs text-gray-500">Chart Type</SelectLabel>
                  <SelectItem value="speed" className="text-sm">Speed</SelectItem>
                  <SelectItem value="throttle" className="text-sm">Throttle</SelectItem>
                  <SelectItem value="brake" className="text-sm">Brake</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex-grow flex flex-col">
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Main driver selection */}
          <Select
            value={selectedDriver}
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
          
          <Select
            value={selectedLap?.toString() || ''}
            onValueChange={(value) => onLapSelect(value === 'fastest' ? 'fastest' : parseInt(value, 10))}
            disabled={isLoading || maxLapNumber <= 0}
          >
            <SelectTrigger className="w-full sm:w-[120px] bg-gray-800/80 border-gray-700 text-gray-200 text-sm h-9">
              <Clock className="w-4 h-4 mr-2 opacity-70"/>
              <SelectValue placeholder="Lap" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700 text-gray-200">
              <SelectGroup>
                <SelectLabel className="text-xs text-gray-500">Lap</SelectLabel>
                {maxLapNumber > 0 && (
                  <SelectItem value="fastest" className="text-sm">Fastest</SelectItem>
                )}
                {Array.from({ length: maxLapNumber }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()} className="text-sm">
                    {i + 1}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          
          {/* Add driver dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="h-9 bg-gray-800/80 hover:bg-gray-700 text-gray-200 border border-gray-700"
                disabled={isLoading}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Driver
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
          
          {/* Toggle Raw Data button (if needed) */}
          {showRawLapData !== undefined && (
            <Button 
              variant="secondary"
              size="sm"
              onClick={() => setShowRawLapData(!showRawLapData)}
              className="h-9 bg-gray-800/80 hover:bg-gray-700 text-gray-200 border border-gray-700"
            >
              {showRawLapData ? 'Hide Raw Data' : 'Show Raw Data'}
            </Button>
          )}
        </div>
        
        {/* Additional drivers badges - show which drivers are being compared */}
        {additionalDrivers.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {additionalDrivers.map(driver => (
              <Badge 
                key={driver}
                className="bg-gray-800 hover:bg-gray-700 pl-2 pr-1 py-1 flex items-center gap-1"
              >
                <div 
                  className="w-2 h-2 rounded-full mr-1" 
                  style={{ backgroundColor: driverColorMap?.[driver] || '#888' }}
                />
                <span className="mr-1">{driver}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 rounded-full hover:bg-gray-600"
                  onClick={() => removeDriver(driver)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}

        {/* Lap Selection for additional drivers */}
        {additionalDrivers.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {additionalDrivers.map(driver => (
              <Select
                key={driver}
                value={(additionalTelemetryData[driver]?.lap || 1).toString()}
                onValueChange={(value) => {
                  const lapValue = parseInt(value, 10);
                  changeDriverLap(driver, lapValue);
                }}
                disabled={isLoading}
              >
                <SelectTrigger className="w-auto bg-gray-800/80 border-gray-700 text-gray-200 text-sm h-8">
                  <div className="flex items-center">
                    <div 
                      className="w-2 h-2 rounded-full mr-1" 
                      style={{ backgroundColor: driverColorMap?.[driver] || '#888' }}
                    />
                    <span className="mr-1">{driver}</span>
                    <Clock className="w-3 h-3 mx-1 opacity-70"/>
                    <SelectValue placeholder="Lap" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700 text-gray-200">
                  <SelectGroup>
                    <SelectLabel className="text-xs text-gray-500">Lap for {driver}</SelectLabel>
                    {Array.from({ length: maxLapNumber }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()} className="text-sm">
                        {i + 1}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ))}
          </div>
        )}
        
        {/* Debug panel for raw data */}
        {showRawLapData && (
          <div className="max-h-[300px] overflow-y-auto mb-4 p-4 border border-gray-700/80 rounded bg-gray-900/50">
            <p className="text-sm font-medium text-white mb-2">Debug Information</p>
            
            <p className="text-xs text-gray-400 mb-1">
              Selected Driver: {selectedDriver}, Lap: {selectedLap}, Max Laps: {maxLapNumber}
            </p>
            
            <p className="text-xs text-gray-400 mb-1">
              Telemetry Points: {lapTelemetryData?.length || 0} 
            </p>
            
            {lapTelemetryData && lapTelemetryData.length > 0 && (
              <>
                <p className="text-xs text-gray-400 mb-1">Sample Data Point:</p>
                <pre className="text-xs text-gray-500 bg-gray-800/50 p-2 rounded overflow-x-auto">
                  {JSON.stringify(lapTelemetryData[0], null, 2)}
                </pre>
              </>
            )}
            
            {/* Show additional drivers data if available */}
            {additionalDrivers.length > 0 && (
              <>
                <p className="text-xs text-gray-400 mt-3 mb-1">Additional Drivers:</p>
                {additionalDrivers.map(driver => (
                  <p key={driver} className="text-xs text-gray-400 mb-1">
                    {driver}: {additionalTelemetryData[driver]?.data?.length || 0} data points
                  </p>
                ))}
              </>
            )}
          </div>
        )}
        
        {/* Chart content */}
        <div className="flex-grow" style={{ minHeight: '280px', height: 'calc(100% - 60px)' }}>
          {renderContent()}
        </div>
        
        {/* Download button */}
        {lapTelemetryData && lapTelemetryData.length > 0 && (
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