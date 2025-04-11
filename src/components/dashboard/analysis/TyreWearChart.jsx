import React, { useEffect, useState } from 'react';
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
  // Added props for fetching additional driver data
  fetchDriverTyreWearData = async (driver) => {
    console.log(`Fetch tyre wear for ${driver}`);
    return []; // Return empty array by default
  }
}) {
  const chartRef = React.useRef(null);
  const [isExporting, setIsExporting] = React.useState(false);
  
  // State for additional drivers (limited to 2 more, for a total of 3)
  const [additionalDrivers, setAdditionalDrivers] = useState([]);
  // State to store tyre wear data for additional drivers
  const [additionalTyreWearData, setAdditionalTyreWearData] = useState({});

  const [mergedData, setMergedData] = useState([]);

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
    
    console.log(`Adding driver ${driver} to tyre wear comparison`);
    
    // Add to our list of additional drivers
    setAdditionalDrivers(prev => [...prev, driver]);
    
    // Fetch tyre wear data for this driver
    try {
      const data = await fetchDriverTyreWearData(driver);
      console.log(`Received ${data?.length || 0} tyre wear data points for ${driver}`);
      
      // Store the data
      setAdditionalTyreWearData(prev => ({
        ...prev,
        [driver]: data
      }));
    } catch (error) {
      console.error(`Error fetching tyre wear data for ${driver}:`, error);
    }
  };

  // Function to remove a driver from the comparison
  const removeDriver = (driver) => {
    setAdditionalDrivers(prev => prev.filter(d => d !== driver));
    
    // Also remove their data from state
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
      // Brief delay to ensure chart is fully rendered
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Create a meaningful filename
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

  useEffect(() => {
    if (!processedTyreWearData || processedTyreWearData.length === 0) {
      setMergedData([]);
      return;
    }
    
    // Start with the main driver's data
    let mergedPoints = [...processedTyreWearData];
    
    // For each additional driver, merge their data
    Object.entries(additionalTyreWearData).forEach(([driver, driverData]) => {
      if (!driverData || driverData.length === 0) return;
      
      // For each data point from additional driver
      driverData.forEach(driverPoint => {
        // Find the closest time point in the main data
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
        
        // If we found a close enough point, merge the data
        if (closestDistance < 0.5 && closestPoint !== null) {
          mergedPoints[closestPoint] = {
            ...mergedPoints[closestPoint],
            [`${driver}_front_left`]: driverPoint[`${driver}_front_left`],
            [`${driver}_front_right`]: driverPoint[`${driver}_front_right`],
            [`${driver}_rear_left`]: driverPoint[`${driver}_rear_left`],
            [`${driver}_rear_right`]: driverPoint[`${driver}_rear_right`]
          };
        } else {
          // Add as a new point if no close match
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
    
    // Sort by session time
    mergedPoints.sort((a, b) => a.session_time - b.session_time);
    setMergedData(mergedPoints);
  }, [processedTyreWearData, additionalTyreWearData]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-900/50 rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    if (!processedTyreWearData || processedTyreWearData.length === 0) {
      return (
        <div className="w-full h-full bg-gray-900/80 border border-gray-700/50 rounded-lg flex flex-col items-center justify-center text-gray-400">
          <AlertCircle className="w-10 h-10 mb-2" />
          <p className="font-semibold">No tyre wear data available</p>
          <p className="text-xs text-gray-500 mt-1">
            No data found for {selectedDriver || 'selected driver'}
          </p>
        </div>
      );
    }
    
    // All drivers that will be displayed on the chart
    const allDrivers = [selectedDriver, ...additionalDrivers].filter(Boolean);
    
    return (
      <div className="w-full h-full" style={{ minHeight: '280px' }}>
        <ResponsiveContainer width="100%" height={500}>
          <LineChart
            data={mergedData}
            margin={{ top: 0, right: 30, bottom: 50, left: 10 }} // Increased bottom margin
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.3)" />
            <XAxis 
              dataKey="session_time" 
              label={{ value: 'Session Time (s)', position: 'insideBottom', offset: -25, fill: '#ccc' }}
              tick={{ fill: 'rgba(156, 163, 175, 0.9)', fontSize: 12 }}
              stroke="rgba(156, 163, 175, 0.7)"
              type="number"
            />
            <YAxis 
              label={{ value: 'Wear %', angle: -90, position: 'insideLeft', offset: -5, fill: '#ccc' }}
              domain={tyreWearYRange}
              tick={{ fill: 'rgba(156, 163, 175, 0.9)', fontSize: 12 }}
              tickCount={5}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(value) => Math.round(value)}
              stroke="rgba(156, 163, 175, 0.7)"
            />
            <RechartsTooltip 
              formatter={(value, name) => {
                // Extract tyre position and driver from name (format: "front_left_DriverName")
                const parts = name.split('_');
                if (parts.length >= 3) {
                  const tyrePosition = `${parts[0]} ${parts[1]}`;
                  const driver = parts.slice(2).join('_'); // Handle driver names with underscore
                  return [`${value.toFixed(2)}%`, `${driver} - ${tyrePosition}`];
                }
                return [`${value.toFixed(2)}%`, name];
              }}
              labelFormatter={(time) => `Session Time: ${time.toFixed(2)}s`}
              contentStyle={{ 
                backgroundColor: 'rgba(31, 41, 55, 0.9)', 
                borderColor: 'rgba(100, 116, 139, 0.5)', 
                color: '#E5E7EB', 
                borderRadius: '6px', 
                boxShadow: '0 2px 10px rgba(0,0,0,0.5)' 
              }}
              labelStyle={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '5px' }}
            />
            <Legend 
              wrapperStyle={{ 
                color: 'rgba(156, 163, 175, 0.9)',
                paddingTop: 20  // Add padding to push it down
              }} 
              verticalAlign="bottom"
              height={36}
              // Custom renderer to show different line styles
              content={(props) => {
                const { payload } = props;
                if (!payload || payload.length === 0) return null;
                
                // Group by driver
                const driverGroups = {};
                payload.forEach(entry => {
                  // Extract driver name from entry value (format: "front_left_DriverName")
                  const parts = entry.value.split('_');
                  if (parts.length >= 3) {
                    const tyrePosition = `${parts[0]}_${parts[1]}`;
                    const driver = parts.slice(2).join('_'); // Handle driver names with underscore
                    
                    if (!driverGroups[driver]) {
                      driverGroups[driver] = {};
                    }
                    driverGroups[driver][tyrePosition] = entry.color;
                  }
                });
                
                // First create legend for tyre positions
                const tyrePositions = [
                  { key: 'front_left', label: 'Front Left', color: '#ff4444' },
                  { key: 'front_right', label: 'Front Right', color: '#44ff44' },
                  { key: 'rear_left', label: 'Rear Left', color: '#4444ff' },
                  { key: 'rear_right', label: 'Rear Right', color: '#ffff44' }
                ];
                
                return (
                  <div className="flex flex-col items-center justify-center mt-4 mb-2">
                    {/* Tyre position legend */}
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
                          <span className="text-xs text-gray-300">{pos.label}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Driver legend (if multiple drivers) */}
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
            
            {/* Main driver's tyre lines */}
            <Line 
              type="monotone" 
              dataKey="front_left" 
              name={`front_left_${selectedDriver}`}  // Include driver name in the key
              stroke="#ff4444" 
              strokeWidth={2} 
              dot={false}
              connectNulls={true}
              isAnimationActive={false}
            />
            <Line 
              type="monotone" 
              dataKey="front_right" 
              name={`front_right_${selectedDriver}`}
              stroke="#44ff44" 
              strokeWidth={2} 
              dot={false}
              connectNulls={true}
              isAnimationActive={false}
            />
            <Line 
              type="monotone" 
              dataKey="rear_left" 
              name={`rear_left_${selectedDriver}`}
              stroke="#4444ff" 
              strokeWidth={2}
              dot={false}
              connectNulls={true}
              isAnimationActive={false}
            />
            <Line 
              type="monotone" 
              dataKey="rear_right" 
              name={`rear_right_${selectedDriver}`}
              stroke="#ffff44" 
              strokeWidth={2} 
              dot={false}
              connectNulls={true}
              isAnimationActive={false}
            />
            
            {/* Additional drivers' tyre lines */}
            {additionalDrivers.map((driver, driverIndex) => {
              const driverData = additionalTyreWearData[driver];
              if (!driverData || driverData.length === 0) return null;
              
              // Get line style based on driver order
              const lineStyle = getLineStyleForDriver(driver);
              const strokeDasharray = getStrokeDashArray(lineStyle);
              
              // Return all four tyre lines for this driver
              return [
                <Line 
                  key={`${driver}_fl`}
                  type="monotone" 
                  dataKey={`${driver}_front_left`}
                  name={`front_left_${driver}`}
                  stroke="#ff4444" 
                  strokeWidth={2} 
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
                  stroke="#44ff44" 
                  strokeWidth={2} 
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
                  stroke="#4444ff" 
                  strokeWidth={2}
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
                  stroke="#ffff44" 
                  strokeWidth={2} 
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

  // Updated chart title to reflect multiple drivers
  const driversList = [selectedDriver, ...additionalDrivers].filter(Boolean);
  const chartTitle = driversList.length > 1
    ? `Tyre Wear Comparison (${driversList.length} Drivers)`
    : `Tyre Wear % Over Session Time ${selectedDriver ? `- ${selectedDriver}` : '(No Driver Selected)'}`;

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
          <div className="flex flex-wrap gap-2">
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
        
        {/* Debug panel for raw data */}
        {showRawLapData && (
          <div className="max-h-[200px] overflow-y-auto mb-4 p-4 border border-gray-700/80 rounded bg-gray-900/50">
            <p className="text-sm font-medium text-white mb-2">Debug Information</p>
            
            <p className="text-xs text-gray-400 mb-1">
              Data points: {processedTyreWearData?.length || 0} after sampling
            </p>
            
            <p className="text-xs text-gray-400 mb-1">
              Y-axis range: {tyreWearYRange ? `${tyreWearYRange[0].toFixed(4)}% to ${tyreWearYRange[1].toFixed(4)}%` : 'N/A'}
            </p>
            
            {processedTyreWearData && processedTyreWearData.length > 0 && (
              <>
                <p className="text-xs text-gray-400 mb-1">Sample Data Points:</p>
                <pre className="text-xs text-gray-500 bg-gray-800/50 p-2 rounded overflow-x-auto">
                  {JSON.stringify(processedTyreWearData.slice(0, 3), null, 2)}
                </pre>
              </>
            )}
            
            {/* Additional drivers data */}
            {additionalDrivers.length > 0 && (
              <>
                <p className="text-xs text-gray-400 mt-3 mb-1">Additional Drivers:</p>
                {additionalDrivers.map(driver => (
                  <p key={driver} className="text-xs text-gray-400 mb-1">
                    {driver}: {additionalTyreWearData[driver]?.length || 0} data points
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
        {processedTyreWearData && processedTyreWearData.length > 0 && (
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