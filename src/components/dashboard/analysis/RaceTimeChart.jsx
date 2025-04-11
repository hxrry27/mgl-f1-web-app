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
    // If no specific line is hovered, just use the first entry
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
    <div className="bg-gray-900/90 text-gray-200 p-3 rounded border border-gray-700/80 shadow-lg">
      <p className="font-semibold mb-2">Lap {label}</p>
      
      <div className="mb-1">
        <div className="flex items-center gap-1.5 mb-1">
          <p className="text-sm font-medium">{driver}</p>
          <span className="text-xs text-gray-400">({team})</span>
        </div>
        
        <div className="flex items-center mb-1 pl-2">
          <div 
            className="w-3 h-3 rounded-full mr-2" 
            style={{ backgroundColor: hoveredEntry.color }}
          />
          <span className="text-sm">
            <span className="text-gray-400">Stint {stintNumber} ({compound}): </span>
            <span className="font-medium">{formatLapTime(hoveredEntry.value)}</span>
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
    
    const ticks = [1]; // Always include the first lap
    
    // Determine interval based on total laps
    let interval = 1;
    if (maxLapNumber > 70) interval = 5;
    else if (maxLapNumber > 40) interval = 3;
    else if (maxLapNumber > 20) interval = 2;
    
    // Add ticks at intervals
    for (let i = interval + 1; i < maxLapNumber; i += interval) {
      ticks.push(i);
    }
    
    // Always include the last lap if not already included
    if (ticks[ticks.length - 1] !== maxLapNumber) {
      ticks.push(maxLapNumber);
    }
    
    return ticks;
  }, [maxLapNumber]);

  // Determine which lines should be dotted (teammates of selected drivers)
  const getLineStyle = (config) => {
    const driver = config.driver;
    const team = driverTeams[driver] || 'Unknown Team';
    
    // Get all selected drivers from this team
    const teamDrivers = Object.entries(selectedDrivers)
      .filter(([d, isSelected]) => isSelected && driverTeams[d] === team)
      .map(([d]) => d);
    
    // The first selected driver from a team gets solid lines
    const isFirstSelected = teamDrivers[0] === driver;
    
    if (isFirstSelected) {
      return "0"; // Solid line
    } else {
      return "5 5"; // Dashed line for teammates
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
        <div className="w-full h-full flex items-center justify-center bg-gray-900/50 rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    if (!chartData || chartData.length === 0 || maxLapNumber <= 0) {
      return (
        <div className="w-full h-full bg-gray-900/80 border border-gray-700/50 rounded-lg flex flex-col items-center justify-center text-gray-400">
          <AlertCircle className="w-10 h-10 mb-2" />
          <p className="font-semibold">No lap data available</p>
          <p className="text-xs text-gray-500 mt-1">
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
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.3)" />
            <XAxis 
              dataKey="lap" 
              label={{ value: 'Lap Number', position: 'insideBottom', offset: -10, fill: '#ccc' }}
              tick={{ fill: 'rgba(156, 163, 175, 0.9)', fontSize: 12 }}
              stroke="rgba(156, 163, 175, 0.7)"
              domain={[1, maxLapNumber]}
              type="number"
              allowDataOverflow={false}
              ticks={xAxisTicks}
            />
            <YAxis 
              label={{ value: 'Lap Time', angle: -90, position: 'insideLeft', offset: -30, fill: '#ccc' }}
              tickFormatter={formatAxisTime}
              domain={yDomain}
              tick={{ fill: 'rgba(156, 163, 175, 0.9)', fontSize: 12 }}
              stroke="rgba(156, 163, 175, 0.7)"
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
              // Only render lines for selected drivers
              if (!selectedDrivers[config.driver]) {
                return null;
              }
              
              // Choose color based on display mode
              const lineColor = displayMode === 'team' ? config.teamColor : config.compoundColor;
              
              const isHighlighted = hoveredLine === config.key || 
                                   (!hoveredLine && (!hoveredDriver || hoveredDriver === config.driver));
              
              // Determine line style (solid or dashed for teammates)
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
            
            {/* Add a legend to show line styles */}
            <Legend 
              content={() => (
                <div className="flex flex-wrap items-center justify-center mt-2 mb-2 text-xs text-gray-400">
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
      className={cn("chart-container bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden h-full flex flex-col", className)}
    >
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold text-white">Lap Time Comparison</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex-grow flex flex-col">
        {/* Controls */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Driver Selection Dropdown */}
          <DropdownMenu open={driverDropdownOpen} onOpenChange={setDriverDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="h-9 bg-gray-800/80 hover:bg-gray-700 text-gray-200 border border-gray-700 flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                <span>{getDriverSelectionText()}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              className="bg-gray-900 border border-gray-700 text-gray-200 max-h-[70vh] overflow-y-auto w-[300px]"
            >
              <DropdownMenuLabel className="text-xs text-gray-500 flex justify-between items-center">
                <span>Select Drivers</span>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="xs" 
                    className="h-6 px-2 text-xs hover:bg-gray-800"
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
                    className="h-6 px-2 text-xs hover:bg-gray-800"
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
              <DropdownMenuSeparator className="bg-gray-700" />
              
              {/* Group by team */}
              {Object.entries(teamGroups).map(([team, teamDrivers]) => (
                teamDrivers.length > 0 && (
                  <DropdownMenuGroup key={team}>
                    <DropdownMenuLabel className="text-xs text-gray-500">{team}</DropdownMenuLabel>
                    
                    {teamDrivers.map(driver => {
                      const driverConfig = lineConfigs.find(config => config.driver === driver);
                      const driverCompoundSet = driverCompounds[driver] || new Set();
                      const compounds = Array.from(driverCompoundSet);
                      
                      return (
                        <DropdownMenuSub key={driver}>
                          <DropdownMenuSubTrigger 
                            className={`flex items-center ${!selectedDrivers[driver] ? 'opacity-60' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDriverToggle(driver);
                            }}
                          >
                            <div className="flex items-center flex-1">
                              <Checkbox 
                                checked={!!selectedDrivers[driver]} 
                                className="mr-2 data-[state=checked]:bg-blue-500"
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
                              <span className={!selectedDrivers[driver] ? 'line-through' : ''}>{driver}</span>
                            </div>
                            {compounds.length > 0 && (
                              <ChevronRight className="w-4 h-4 opacity-60" />
                            )}
                          </DropdownMenuSubTrigger>
                          
                          {compounds.length > 0 && (
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent 
                                className="bg-gray-900 border border-gray-700 text-gray-200"
                              >
                                <DropdownMenuLabel className="text-xs text-gray-500">Compounds Used</DropdownMenuLabel>
                                
                                {compounds.map(compound => {
                                  // Get all stints for this compound
                                  const compoundStints = lineConfigs.filter(
                                    config => config.driver === driver && config.compound === compound
                                  );
                                  
                                  return (
                                    <div key={`${driver}-${compound}`} className="px-2 py-1.5">
                                      <div className="flex items-center">
                                        <div 
                                          className="w-3 h-3 rounded-full mr-2" 
                                          style={{ 
                                            backgroundColor: compoundColors[compound] || '#888' 
                                          }} 
                                        />
                                        <span className="text-sm">
                                          {compound} ({compoundStints.length} {compoundStints.length === 1 ? 'stint' : 'stints'})
                                        </span>
                                      </div>
                                      
                                      {/* Show stint ranges */}
                                      {compoundStints.length > 0 && (
                                        <div className="ml-4 mt-1">
                                          {compoundStints.map((stint, idx) => (
                                            <div 
                                              key={idx} 
                                              className="text-xs text-gray-400 mb-0.5"
                                            >
                                              Stint {stint.stintNumber}: Laps {stint.startLap}-{stint.endLap}
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
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuLabel className="text-xs text-gray-500">Compounds Reference</DropdownMenuLabel>
              {Object.entries(compoundColors).map(([compound, color]) => (
                <div key={compound} className="flex items-center px-2 py-1.5">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: color }} 
                  />
                  <span className="text-sm">{compound}</span>
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
                  className="h-9 bg-gray-800/80 hover:bg-gray-700 text-gray-200 border border-gray-700 flex items-center gap-2"
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
              <TooltipContent>
                <p>Toggle between team colors and tyre compound colors</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Filter Options */}
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-2">
              <Switch
                id="filter-outlaps"
                checked={filterOutlaps}
                onCheckedChange={setFilterOutlaps}
              />
              <Label htmlFor="filter-outlaps" className="text-sm text-gray-300">
                Filter Outlaps
              </Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                id="filter-inlaps"
                checked={filterInlaps}
                onCheckedChange={setFilterInlaps}
              />
              <Label htmlFor="filter-inlaps" className="text-sm text-gray-300">
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