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
import { User, Clock, Download, BarChart3, AlertCircle, Plus, X, Loader2 } from 'lucide-react';
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
  fetchDriverTelemetry = async (driver, lap) => {
    console.log(`Fetch telemetry for ${driver}, lap ${lap}`);
    return [];
  }
}) {
  const chartRef = useRef(null);
  const [chartType, setChartType] = useState('speed');
  const [isExporting, setIsExporting] = useState(false);
  const [additionalDrivers, setAdditionalDrivers] = useState([]);
  const [additionalTelemetryData, setAdditionalTelemetryData] = useState({});

  const teamOrder = [
    'Racing Bulls', 'Aston Martin', 'Alpine', 'Red Bull', 'Mercedes', 
    'McLaren', 'Ferrari', 'Williams', 'Haas', 'Kick Sauber'
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
    
    return closestDistance <= 50 ? closestPoint : null;
  };

  const addDriver = async (driver) => {
    if (additionalDrivers.includes(driver) || driver === selectedDriver) {
      return;
    }
    
    console.log(`Adding driver ${driver} to comparison`);
    setAdditionalDrivers(prev => [...prev, driver]);
    
    try {
      const data = await fetchDriverTelemetry(driver, 1);
      console.log(`Received ${data?.length || 0} data points for ${driver}`);
      
      setAdditionalTelemetryData(prev => ({
        ...prev,
        [driver]: { lap: 1, data: data }
      }));
    } catch (error) {
      console.error(`Error fetching data for ${driver}:`, error);
    }
  };

  const removeDriver = (driver) => {
    setAdditionalDrivers(prev => prev.filter(d => d !== driver));
    setAdditionalTelemetryData(prev => {
      const newData = {...prev};
      delete newData[driver];
      return newData;
    });
  };

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
      case 'speed': return driverColorMap?.[selectedDriver] || '#06b6d4';
      case 'throttle': return '#4ade80';
      case 'brake': return '#ef4444';
      default: return '#06b6d4';
    }
  };

  const getChartData = () => {
    if (!lapTelemetryData || lapTelemetryData.length === 0) {
      return [];
    }
    
    try {
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
        } else {
          value = point.brake !== undefined 
            ? (point.brake > 1 ? point.brake : point.brake * 100)
            : 0;
        }
        
        return {
          Distance: distance,
          [`${selectedDriver}_${chartType}`]: value
        };
      });
      
      const sortedData = rawData.sort((a, b) => a.Distance - b.Distance);
      
      additionalDrivers.forEach(driver => {
        const driverDataArray = additionalTelemetryData[driver]?.data;
        
        if (driverDataArray && driverDataArray.length > 0) {
          console.log(`Processing ${driverDataArray.length} data points for ${driver}`);
          
          sortedData.forEach((dataPoint, index) => {
            const closestPoint = findClosestPoint(driverDataArray, dataPoint.Distance);
            
            if (closestPoint) {
              let value = 0;
              if (chartType === 'speed') {
                value = closestPoint.speed !== undefined ? closestPoint.speed : 0;
              } else if (chartType === 'throttle') {
                value = closestPoint.throttle !== undefined 
                  ? (closestPoint.throttle > 1 ? closestPoint.throttle : closestPoint.throttle * 100)
                  : 0;
              } else {
                value = closestPoint.brake !== undefined 
                  ? (closestPoint.brake > 1 ? closestPoint.brake : closestPoint.brake * 100)
                  : 0;
              }
              
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
          label: { value: 'Speed (km/h)', angle: -90, position: 'insideLeft', offset: -5, fill: '#a3a3a3' }
        };
      case 'throttle':
        return {
          domain: [0, 100],
          tickFormatter: (value) => `${value}%`,
          label: { value: 'Throttle %', angle: -90, position: 'insideLeft', offset: -5, fill: '#a3a3a3' }
        };
      case 'brake':
        return {
          domain: [0, 100],
          tickFormatter: (value) => `${value}%`,
          label: { value: 'Brake %', angle: -90, position: 'insideLeft', offset: -5, fill: '#a3a3a3' }
        };
      default:
        return {
          domain: [0, 'auto'],
          tickFormatter: (value) => `${value} km/h`,
          label: { value: 'Speed (km/h)', angle: -90, position: 'insideLeft', offset: -5, fill: '#a3a3a3' }
        };
    }
  };

  const handleDownload = async () => {
    if (!chartRef.current || isLoading || !lapTelemetryData || lapTelemetryData.length === 0) {
      return;
    }

    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      
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

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-neutral-900/50 rounded-3xl">
          <Loader2 className="h-12 w-12 text-cyan-500 animate-spin" />
        </div>
      );
    }
    
    if (!lapTelemetryData || lapTelemetryData.length === 0) {
      return (
        <div className="w-full h-full bg-neutral-900/80 border border-red-500/30 rounded-3xl flex flex-col items-center justify-center text-red-400">
          <AlertCircle className="w-10 h-10 mb-2" />
          <p className="font-bold text-white">No telemetry data available</p>
          <p className="text-xs text-neutral-500 mt-1">
            No {chartType} data found for {selectedDriver} lap {selectedLap}
          </p>
        </div>
      );
    }
  
    let chartData = getChartData();
    
    if (chartData.length === 0) {
      return (
        <div className="w-full h-full bg-neutral-900/80 border border-red-500/30 rounded-3xl flex flex-col items-center justify-center text-red-400">
          <AlertCircle className="w-10 h-10 mb-2" />
          <p className="font-bold text-white">Error processing telemetry data</p>
          <p className="text-xs text-neutral-500 mt-1">Could not generate chart data</p>
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
            margin={{ top: 0, right: 10, left: -15, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(115, 115, 115, 0.2)" />
            <XAxis 
              type="number" 
              dataKey="Distance" 
              stroke="rgba(163, 163, 163, 0.5)" 
              tick={{ fill: 'rgba(163, 163, 163, 0.9)', fontSize: 12 }} 
              tickFormatter={(value) => `${Math.round(value)}m`}
              domain={[0, trackData?.length_meters || 5000]} 
              label={{ value: 'Distance (m)', position: 'insideBottom', offset: -15, fill: '#a3a3a3' }}
              allowDecimals={false}
            />
            <YAxis 
              {...yAxisProps}
              stroke="rgba(163, 163, 163, 0.5)" 
              tick={{ fill: 'rgba(163, 163, 163, 0.9)', fontSize: 12 }}
              width={50}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(23, 23, 23, 0.95)', 
                borderColor: 'rgba(64, 64, 64, 0.5)', 
                color: '#ffffff', 
                borderRadius: '16px', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(12px)'
              }} 
              labelStyle={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '8px' }} 
              formatter={(value, name) => {
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

            <Legend 
              wrapperStyle={{ paddingTop: 10 }}
              iconType="plainline"
              iconSize={30}
              content={(props) => {
                const { payload } = props;
                
                const teamDrivers = {};
                payload.forEach(entry => {
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
                          <span className="text-xs text-neutral-300 font-medium">{driver}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              }}
            />
            
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={driverColorMap?.[selectedDriver] || '#06b6d4'} 
              strokeWidth={2} 
              dot={false} 
              isAnimationActive={false}
              activeDot={{ 
                r: 4, 
                strokeWidth: 1, 
                stroke: 'rgba(255,255,255,0.5)', 
                fill: driverColorMap?.[selectedDriver] || '#06b6d4'
              }} 
              connectNulls={true} 
            />
            
            {additionalDrivers.map((driver, index) => {
              const mainDriverTeam = driverTeams[selectedDriver];
              const thisDriverTeam = driverTeams[driver];
              const sameTeamAsMain = mainDriverTeam === thisDriverTeam;
              
              const sameTeamAsPrevious = additionalDrivers
                .slice(0, index)
                .some(prevDriver => driverTeams[prevDriver] === thisDriverTeam);
              
              const useDashedLine = sameTeamAsMain || sameTeamAsPrevious;
              
              return (
                <Line 
                  key={driver}
                  type="monotone" 
                  dataKey={`${driver}_${chartType}`} 
                  stroke={driverColorMap?.[driver] || '#888888'} 
                  strokeWidth={2} 
                  strokeDasharray={useDashedLine ? "3 3" : "0"}
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
      className={cn("bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50 rounded-3xl overflow-hidden h-[600px]", className)}
    >
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-cyan-400" />
            <CardTitle className="text-xl font-black text-white">{chartTitle}</CardTitle>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={chartType} onValueChange={setChartType}>
              <SelectTrigger className="w-full sm:w-[140px] bg-neutral-800/80 border-neutral-700 text-white rounded-xl h-10 font-bold">
                <BarChart3 className="w-4 h-4 mr-2 text-neutral-500"/>
                <SelectValue placeholder="Chart Type" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 backdrop-blur-xl border-neutral-700 rounded-2xl text-white">
                <SelectGroup>
                  <SelectLabel className="text-xs text-neutral-400 uppercase tracking-wider font-bold">Chart Type</SelectLabel>
                  <SelectItem value="speed" className="rounded-xl cursor-pointer font-medium">Speed</SelectItem>
                  <SelectItem value="throttle" className="rounded-xl cursor-pointer font-medium">Throttle</SelectItem>
                  <SelectItem value="brake" className="rounded-xl cursor-pointer font-medium">Brake</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex-grow flex flex-col">
        <div className="flex flex-wrap gap-2 mb-4">
          <Select value={selectedDriver} onValueChange={onDriverSelect} disabled={isLoading}>
            <SelectTrigger className="w-full sm:w-[180px] bg-neutral-800/80 border-neutral-700 text-white rounded-xl h-10 font-bold">
              <User className="w-4 h-4 mr-2 text-neutral-500"/>
              <SelectValue placeholder="Select Driver" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-900 backdrop-blur-xl border-neutral-700 rounded-2xl text-white max-h-[300px]">
              {Object.entries(teamGroups).map(([team, teamDrivers]) => (
                teamDrivers.length > 0 && (
                  <SelectGroup key={team}>
                    <SelectLabel className="text-xs text-neutral-400 uppercase tracking-wider font-bold">{team}</SelectLabel>
                    {teamDrivers.map(driver => (
                      <SelectItem key={driver} value={driver} className="rounded-xl cursor-pointer">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: driverColorMap?.[driver] || '#888' }}
                          />
                          <span className="font-medium">{driver}</span>
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
            <SelectTrigger className="w-full sm:w-[140px] bg-neutral-800/80 border-neutral-700 text-white rounded-xl h-10 font-bold">
              <Clock className="w-4 h-4 mr-2 text-neutral-500"/>
              <SelectValue placeholder="Lap" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-900 backdrop-blur-xl border-neutral-700 rounded-2xl text-white">
              <SelectGroup>
                <SelectLabel className="text-xs text-neutral-400 uppercase tracking-wider font-bold">Lap</SelectLabel>
                {maxLapNumber > 0 && (
                  <SelectItem value="fastest" className="rounded-xl cursor-pointer font-medium">Fastest</SelectItem>
                )}
                {Array.from({ length: maxLapNumber }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()} className="rounded-xl cursor-pointer font-medium">
                    {i + 1}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="h-10 px-4 bg-neutral-800/80 hover:bg-neutral-700 text-white border-neutral-700 rounded-xl font-bold"
                disabled={isLoading}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Driver
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-neutral-900 backdrop-blur-xl border-neutral-700 rounded-2xl text-white">
              <DropdownMenuLabel className="text-xs text-neutral-400 uppercase tracking-wider font-bold">Add Driver to Comparison</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-neutral-700/50" />
              
              {Object.entries(teamGroups).map(([team, teamDrivers]) => (
                teamDrivers.length > 0 && (
                  <React.Fragment key={team}>
                    <DropdownMenuLabel className="text-xs text-neutral-500 uppercase tracking-wider font-bold">{team}</DropdownMenuLabel>
                    {teamDrivers.map(driver => (
                      !additionalDrivers.includes(driver) && driver !== selectedDriver && (
                        <DropdownMenuItem 
                          key={driver} 
                          onClick={() => addDriver(driver)}
                          className="cursor-pointer hover:bg-neutral-800 rounded-xl"
                        >
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: driverColorMap?.[driver] || '#888' }}
                            />
                            <span className="font-medium">{driver}</span>
                          </div>
                        </DropdownMenuItem>
                      )
                    ))}
                  </React.Fragment>
                )
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {showRawLapData !== undefined && (
            <Button 
              variant="secondary"
              size="sm"
              onClick={() => setShowRawLapData(!showRawLapData)}
              className="h-10 px-4 bg-neutral-800/80 hover:bg-neutral-700 text-white border-neutral-700 rounded-xl font-bold"
            >
              {showRawLapData ? 'Hide Raw Data' : 'Show Raw Data'}
            </Button>
          )}
        </div>
        
        {additionalDrivers.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {additionalDrivers.map(driver => (
              <Badge 
                key={driver}
                className="bg-neutral-800 hover:bg-neutral-700 pl-3 pr-1 py-1.5 flex items-center gap-2 rounded-xl border border-neutral-700"
              >
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: driverColorMap?.[driver] || '#888' }}
                />
                <span className="font-medium">{driver}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 rounded-full hover:bg-neutral-600"
                  onClick={() => removeDriver(driver)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}

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
                <SelectTrigger className="w-auto bg-neutral-800/80 border-neutral-700 text-white rounded-xl h-9 px-3">
                  <div className="flex items-center gap-1">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: driverColorMap?.[driver] || '#888' }}
                    />
                    <span className="font-medium">{driver}</span>
                    <Clock className="w-3 h-3 mx-1 text-neutral-500"/>
                    <SelectValue placeholder="Lap" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 backdrop-blur-xl border-neutral-700 rounded-2xl text-white">
                  <SelectGroup>
                    <SelectLabel className="text-xs text-neutral-400 uppercase tracking-wider font-bold">Lap for {driver}</SelectLabel>
                    {Array.from({ length: maxLapNumber }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()} className="rounded-xl cursor-pointer font-medium">
                        {i + 1}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ))}
          </div>
        )}
        
        {showRawLapData && (
          <div className="max-h-[300px] overflow-y-auto mb-4 p-4 border border-neutral-700/50 rounded-2xl bg-neutral-900/50 backdrop-blur-sm">
            <p className="text-sm font-black text-white mb-3">Debug Information</p>
            
            <p className="text-xs text-neutral-400 mb-2">
              Selected Driver: {selectedDriver}, Lap: {selectedLap}, Max Laps: {maxLapNumber}
            </p>
            
            <p className="text-xs text-neutral-400 mb-2">
              Telemetry Points: {lapTelemetryData?.length || 0} 
            </p>
            
            {lapTelemetryData && lapTelemetryData.length > 0 && (
              <>
                <p className="text-xs text-neutral-400 mb-2">Sample Data Point:</p>
                <pre className="text-xs text-neutral-500 bg-neutral-800/50 p-3 rounded-xl overflow-x-auto">
                  {JSON.stringify(lapTelemetryData[0], null, 2)}
                </pre>
              </>
            )}
            
            {additionalDrivers.length > 0 && (
              <>
                <p className="text-xs text-neutral-400 mt-3 mb-2 font-bold">Additional Drivers:</p>
                {additionalDrivers.map(driver => (
                  <p key={driver} className="text-xs text-neutral-400 mb-1">
                    {driver}: {additionalTelemetryData[driver]?.data?.length || 0} data points
                  </p>
                ))}
              </>
            )}
          </div>
        )}
        
        <div className="flex-grow" style={{ minHeight: '280px', height: 'calc(100% - 60px)' }}>
          {renderContent()}
        </div>
        
        {lapTelemetryData && lapTelemetryData.length > 0 && (
          <div className="mt-4 flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 px-4 bg-neutral-800/80 hover:bg-neutral-700 text-white border-neutral-700 rounded-xl font-bold"
              onClick={handleDownload}
              disabled={isExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Exporting..." : "Download Chart"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}