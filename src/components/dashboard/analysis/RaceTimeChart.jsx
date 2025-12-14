import React, { useState, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer 
} from 'recharts';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuCheckboxItem, DropdownMenuGroup, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuPortal
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { 
  Users, User, Download, AlertCircle, BarChart3, PaintBucket, CircleDot, 
  CheckSquare, Square, ChevronRight
} from 'lucide-react';

// Custom dot component for the chart
const CustomDot = (props) => {
  const { cx, cy, stroke, payload, value, dataKey } = props;
  
  if (!value) return null;
  
  return (
    <circle 
      cx={cx} 
      cy={cy} 
      r={3}
      stroke="#fff"
      strokeWidth={1}
      fill={stroke}
      style={{ opacity: 0.8 }}
    />
  );
};

// Simplified tooltip component to only show the hovered line
const LapTimeTooltip = ({ active, payload, label, displayMode, driverTeams, hoveredLine }) => {
  if (!active || !payload || !payload.length) return null;
  
  // Find the entry that matches the hovered line
  let hoveredEntry = null;
  if (hoveredLine) {
    hoveredEntry = payload.find(entry => entry.name === hoveredLine);
  } else {
    hoveredEntry = payload[0];
  }
  
  if (!hoveredEntry || hoveredEntry.value === null || hoveredEntry.value === undefined) {
    return null;
  }
  
  // Parse driver and compound from the entry name (format: "Driver|Compound|StintNumber")
  const [driver, compound, stintNumber] = hoveredEntry.name.split('|');
  const team = driverTeams[driver] || 'Unknown Team';
  
  // Format lap time
  const formatLapTime = (timeInSec) => {
    const minutes = Math.floor(timeInSec / 60);
    const seconds = (timeInSec % 60).toFixed(3);
    return `${minutes}:${seconds.padStart(6, '0')}`;
  };
  
  return (
    <div className="bg-neutral-900/95 backdrop-blur-xl text-white p-4 rounded-2xl border border-neutral-700/50 shadow-xl">
      <p className="font-bold mb-3 text-cyan-400">Lap {label}</p>
      
      <div className="mb-1">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-sm font-bold">{driver}</p>
          <span className="text-xs text-neutral-400">({team})</span>
        </div>
        
        <div className="flex items-center pl-2">
          <div 
            className="w-3 h-3 rounded-full mr-2" 
            style={{ backgroundColor: hoveredEntry.color }}
          />
          <span className="text-sm">
            <span className="text-neutral-400">Stint {stintNumber} ({compound}): </span>
            <span className="font-bold text-cyan-400">{formatLapTime(hoveredEntry.value)}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default function RaceTimeChart({
  className,
  isLoading,
  filterOutlaps,
  filterInlaps,
  maxLapNumber,
  chartData,
  lineConfigs,
  yDomain,
  driverColorMap,
  displayMode,
  selectedDrivers,
  drivers,
  driverTeams,
  hoveredDriver,
  hoveredLine,
  setHoveredDriver,
  setHoveredLine,
  handleDriverToggle,
  handleSelectAll,
  handleDeselectAll,
  setFilterInlaps,
  setFilterOutlaps,
  handleDisplayModeToggle
}) {
  // State to track the dropdown open state
  const [driverDropdownOpen, setDriverDropdownOpen] = useState(false);
  
  // Helper function to format lap time for axis
  const formatAxisTime = (timeInSec) => {
    if (timeInSec === undefined || timeInSec === null) return '';
    const minutes = Math.floor(timeInSec / 60);
    const seconds = (timeInSec % 60).toFixed(1);
    return `${minutes}:${seconds.padStart(4, '0')}`;
  };
  
  // Group drivers by team for the dropdown
  const teamGroups = {};
  drivers.forEach(driver => {
    const team = driverTeams[driver] || 'Unknown Team';
    if (!teamGroups[team]) {
      teamGroups[team] = [];
    }
    teamGroups[team].push(driver);
  });
  
  // Get compound info for each driver
  const driverCompounds = {};
  lineConfigs.forEach(config => {
    if (!driverCompounds[config.driver]) {
      driverCompounds[config.driver] = new Set();
    }
    driverCompounds[config.driver].add(config.compound);
  });
  
  // Count selected drivers
  const selectedCount = Object.values(selectedDrivers).filter(Boolean).length;
  
  // Get colors for compound types
  const compoundColors = {};
  lineConfigs.forEach(config => {
    if (!compoundColors[config.compound]) {
      compoundColors[config.compound] = config.compoundColor;
    }
  });

  // Calculate X-axis ticks to show at reasonable intervals
  const xAxisTicks = useMemo(() => {
    if (!maxLapNumber) return [];
    
    const ticks = [1];
    
    let interval = 1;
    if (maxLapNumber > 70) interval = 5;
    else if (maxLapNumber > 40) interval = 3;
    else if (maxLapNumber > 20) interval = 2;
    
    for (let i = interval + 1; i < maxLapNumber; i += interval) {
      ticks.push(i);
    }
    
    if (ticks[ticks.length - 1] !== maxLapNumber) {
      ticks.push(maxLapNumber);
    }
    
    return ticks;
  }, [maxLapNumber]);

  // Determine which lines should be dotted (teammates of selected drivers)
  const getLineStyle = (config) => {
    const driver = config.driver;
    const team = driverTeams[driver] || 'Unknown Team';
    
    const teamDrivers = Object.entries(selectedDrivers)
      .filter(([d, isSelected]) => isSelected && driverTeams[d] === team)
      .map(([d]) => d);
    
    const isFirstSelected = teamDrivers[0] === driver;
    
    if (isFirstSelected) {
      return "0";
    } else {
      return "5 5";
    }
  };

  // Helper to get driver selection status text
  const getDriverSelectionText = () => {
    if (selectedCount === 0) return "No drivers selected";
    if (selectedCount === drivers.length) return "All drivers";
    return `${selectedCount} drivers selected`;
  };

  const renderChart = () => {
    if (isLoading) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-neutral-900/50 rounded-3xl">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
        </div>
      );
    }
    
    if (!chartData || chartData.length === 0 || maxLapNumber <= 0) {
      return (
        <div className="w-full h-full bg-neutral-900/80 border border-neutral-700/50 rounded-3xl flex flex-col items-center justify-center text-neutral-400">
          <AlertCircle className="w-10 h-10 mb-2 text-cyan-400" />
          <p className="font-bold text-white">No lap data available</p>
          <p className="text-xs text-neutral-500 mt-1">
            No data found for this race
          </p>
        </div>
      );
    }
    
    return (
      <div className="w-full h-full" style={{ minHeight: '280px' }}>
        <ResponsiveContainer width="100%" height={500}>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, bottom: 40, left: 50 }}
            onMouseLeave={() => setHoveredLine(null)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(115, 115, 115, 0.2)" />
            <XAxis 
              dataKey="lap" 
              label={{ value: 'Lap Number', position: 'insideBottom', offset: -10, fill: '#a3a3a3' }}
              tick={{ fill: 'rgba(163, 163, 163, 0.9)', fontSize: 12 }}
              stroke="rgba(163, 163, 163, 0.5)"
              domain={[1, maxLapNumber]}
              type="number"
              allowDataOverflow={false}
              ticks={xAxisTicks}
            />
            <YAxis 
              label={{ value: 'Lap Time', angle: -90, position: 'insideLeft', offset: -30, fill: '#a3a3a3' }}
              tickFormatter={formatAxisTime}
              domain={yDomain}
              tick={{ fill: 'rgba(163, 163, 163, 0.9)', fontSize: 12 }}
              stroke="rgba(163, 163, 163, 0.5)"
            />
            <RechartsTooltip 
              content={
                <LapTimeTooltip 
                  displayMode={displayMode} 
                  driverTeams={driverTeams} 
                  hoveredLine={hoveredLine} 
                />
              } 
            />
            
            {lineConfigs.map(config => {
              if (!selectedDrivers[config.driver]) {
                return null;
              }
              
              const lineColor = displayMode === 'team' ? config.teamColor : config.compoundColor;
              
              const isHighlighted = hoveredLine === config.key || 
                                   (!hoveredLine && (!hoveredDriver || hoveredDriver === config.driver));
              
              const strokeDasharray = getLineStyle(config);
              
              return (
                <Line
                  key={config.key}
                  type="monotone"
                  dataKey={config.key}
                  name={config.key}
                  stroke={lineColor}
                  strokeWidth={isHighlighted ? 3 : 2}
                  strokeOpacity={isHighlighted ? 1 : 0.7}
                  dot={<CustomDot />}
                  activeDot={{ r: 6, fill: lineColor, stroke: '#fff' }}
                  connectNulls={false}
                  isAnimationActive={false}
                  onMouseEnter={() => setHoveredLine(config.key)}
                  strokeDasharray={strokeDasharray}
                />
              );
            })}
            
            <Legend 
              content={() => (
                <div className="flex flex-wrap items-center justify-center mt-2 mb-2 text-xs text-neutral-400">
                  <div className="flex items-center mx-3">
                    <div className="w-8 h-0 mr-2 border-t-2 border-white"></div>
                    <span>Primary Driver</span>
                  </div>
                  <div className="flex items-center mx-3">
                    <div className="w-8 h-0 mr-2 border-t-2 border-white border-dashed"></div>
                    <span>Teammate</span>
                  </div>
                </div>
              )}
              verticalAlign="bottom"
              height={36}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <Card 
      className={cn("bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50 rounded-3xl overflow-hidden h-full flex flex-col", className)}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-cyan-400" />
          <CardTitle className="text-xl font-black text-white">Lap Time Comparison</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex-grow flex flex-col">
        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Driver Selection Dropdown */}
          <DropdownMenu open={driverDropdownOpen} onOpenChange={setDriverDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="h-10 px-4 bg-neutral-800/80 hover:bg-neutral-700 text-white border-neutral-700 rounded-xl font-bold flex items-center gap-2 transition-all"
              >
                <Users className="w-4 h-4" />
                <span>{getDriverSelectionText()}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              className="bg-neutral-900 backdrop-blur-xl border-neutral-700 rounded-2xl text-white max-h-200h overflow-y-auto w-[320px]"
            >
              <DropdownMenuLabel className="text-xs text-neutral-400 flex justify-between items-center px-3 py-2">
                <span className="uppercase tracking-wider font-bold">Select Drivers</span>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="xs" 
                    className="h-7 px-3 text-xs hover:bg-neutral-800 rounded-lg font-bold"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectAll();
                    }}
                  >
                    <CheckSquare className="w-3.5 h-3.5 mr-1" />
                    All
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="xs" 
                    className="h-7 px-3 text-xs hover:bg-neutral-800 rounded-lg font-bold"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeselectAll();
                    }}
                  >
                    <Square className="w-3.5 h-3.5 mr-1" />
                    None
                  </Button>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-neutral-700/50" />
              
              {/* Group by team */}
              {Object.entries(teamGroups).map(([team, teamDrivers]) => (
                teamDrivers.length > 0 && (
                  <DropdownMenuGroup key={team}>
                    <DropdownMenuLabel className="text-xs text-neutral-500 uppercase tracking-wider font-bold px-3 py-2">{team}</DropdownMenuLabel>
                    
                    {teamDrivers.map(driver => {
                      const driverConfig = lineConfigs.find(config => config.driver === driver);
                      const driverCompoundSet = driverCompounds[driver] || new Set();
                      const compounds = Array.from(driverCompoundSet);
                      
                      return (
                        <DropdownMenuSub key={driver}>
                          <DropdownMenuSubTrigger 
                            className={`flex items-center hover:bg-neutral-800 rounded-xl mx-1 ${!selectedDrivers[driver] ? 'opacity-60' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDriverToggle(driver);
                            }}
                          >
                            <div className="flex items-center flex-1">
                              <Checkbox 
                                checked={!!selectedDrivers[driver]} 
                                className="mr-2 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDriverToggle(driver);
                                }}
                              />
                              <div 
                                className="w-3 h-3 rounded-full mr-2" 
                                style={{ 
                                  backgroundColor: driverConfig?.teamColor || driverColorMap[driver] || '#888' 
                                }} 
                              />
                              <span className={`font-medium ${!selectedDrivers[driver] ? 'line-through' : ''}`}>{driver}</span>
                            </div>
                            {compounds.length > 0 && (
                              <ChevronRight className="w-4 h-4 text-neutral-500" />
                            )}
                          </DropdownMenuSubTrigger>
                          
                          {compounds.length > 0 && (
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent 
                                className="bg-neutral-900 backdrop-blur-xl border-neutral-700 rounded-2xl text-white max-h-[100px] overflow-y-auto"
                              >
                                <DropdownMenuLabel className="text-xs text-neutral-400 uppercase tracking-wider font-bold">Compounds Used</DropdownMenuLabel>
                                
                                {compounds.map(compound => {
                                  const compoundStints = lineConfigs.filter(
                                    config => config.driver === driver && config.compound === compound
                                  );
                                  
                                  return (
                                    <div key={`${driver}-${compound}`} className="px-3 py-2">
                                      <div className="flex items-center">
                                        <div 
                                          className="w-3 h-3 rounded-full mr-2" 
                                          style={{ 
                                            backgroundColor: compoundColors[compound] || '#888' 
                                          }} 
                                        />
                                        <span className="text-sm font-bold">
                                          {compound} <span className="text-neutral-400 font-normal">({compoundStints.length} {compoundStints.length === 1 ? 'stint' : 'stints'})</span>
                                        </span>
                                      </div>
                                      
                                      {compoundStints.length > 0 && (
                                        <div className="ml-5 mt-2 space-y-1">
                                          {compoundStints.map((stint, idx) => (
                                            <div 
                                              key={idx} 
                                              className="text-xs text-neutral-400"
                                            >
                                              Stint {stint.stintNumber}: <span className="text-cyan-400">Laps {stint.startLap}-{stint.endLap}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          )}
                        </DropdownMenuSub>
                      );
                    })}
                  </DropdownMenuGroup>
                )
              ))}
              
              {/* Display mode and compounds reference */}
              <DropdownMenuSeparator className="bg-neutral-700/50" />
              <DropdownMenuLabel className="text-xs text-neutral-400 uppercase tracking-wider font-bold px-3 py-2">Compounds Reference</DropdownMenuLabel>
              {Object.entries(compoundColors).map(([compound, color]) => (
                <div key={compound} className="flex items-center px-3 py-2 hover:bg-neutral-800 rounded-xl mx-1">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: color }} 
                  />
                  <span className="text-sm font-medium">{compound}</span>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Display Mode Toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-10 px-4 bg-neutral-800/80 hover:bg-neutral-700 text-white border-neutral-700 rounded-xl font-bold flex items-center gap-2 transition-all"
                  onClick={handleDisplayModeToggle}
                >
                  {displayMode === 'compound' ? (
                    <CircleDot className="w-4 h-4" />
                  ) : (
                    <PaintBucket className="w-4 h-4" />
                  )}
                  <span>
                    {displayMode === 'compound' ? "Compound Colors" : "Team Colors"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-neutral-900 border-neutral-700 text-white rounded-xl">
                <p>Toggle between team colors and tyre compound colors</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Filter Options */}
          <div className="flex items-center gap-6 ml-auto">
            <div className="flex items-center gap-3">
              <Switch
                id="filter-outlaps"
                checked={filterOutlaps}
                onCheckedChange={setFilterOutlaps}
                className="data-[state=checked]:bg-cyan-500"
              />
              <Label htmlFor="filter-outlaps" className="text-sm text-neutral-300 font-medium cursor-pointer">
                Filter Outlaps
              </Label>
            </div>
            
            <div className="flex items-center gap-3">
              <Switch
                id="filter-inlaps"
                checked={filterInlaps}
                onCheckedChange={setFilterInlaps}
                className="data-[state=checked]:bg-cyan-500"
              />
              <Label htmlFor="filter-inlaps" className="text-sm text-neutral-300 font-medium cursor-pointer">
                Filter Inlaps
              </Label>
            </div>
          </div>
        </div>
        
        {/* Chart content */}
        <div className="flex-grow" style={{ minHeight: '280px', height: 'calc(100% - 60px)' }}>
          {renderChart()}
        </div>
      </CardContent>
    </Card>
  );
}