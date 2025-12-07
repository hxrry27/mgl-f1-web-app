"use client";

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Box, Users, User } from 'lucide-react';

// Helper function to format time
const formatTime = (timeInSeconds) => {
  if (!timeInSeconds || timeInSeconds <= 0) return "N/A";
  
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  
  if (minutes > 0) {
    return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
  } else {
    return `${seconds.toFixed(3)}s`;
  }
};

// Box Plot SVG Component
const BoxPlot = ({ data, x, width, height, yScale }) => {
  const q1Y = yScale(data.q1);
  const q3Y = yScale(data.q3);
  const medianY = yScale(data.median);
  const minY = yScale(data.min);
  const maxY = yScale(data.max);
  
  return (
    <g>
      {/* Whiskers */}
      <line 
        x1={x + width/2} 
        y1={minY} 
        x2={x + width/2} 
        y2={q1Y} 
        stroke={data.color || '#737373'} 
        strokeWidth="2"
      />
      <line 
        x1={x + width/2} 
        y1={q3Y} 
        x2={x + width/2} 
        y2={maxY} 
        stroke={data.color || '#737373'} 
        strokeWidth="2"
      />
      
      {/* Whisker caps */}
      <line 
        x1={x + width*0.25} 
        y1={minY} 
        x2={x + width*0.75} 
        y2={minY} 
        stroke={data.color || '#737373'} 
        strokeWidth="2"
      />
      <line 
        x1={x + width*0.25} 
        y1={maxY} 
        x2={x + width*0.75} 
        y2={maxY} 
        stroke={data.color || '#737373'} 
        strokeWidth="2"
      />
      
      {/* Box */}
      <rect
        x={x}
        y={Math.min(q1Y, q3Y)}
        width={width}
        height={Math.abs(q3Y - q1Y)}
        fill={data.color || '#737373'}
        fillOpacity="0.3"
        stroke={data.color || '#737373'}
        strokeWidth="2"
      />
      
      {/* Median line */}
      <line 
        x1={x} 
        y1={medianY} 
        x2={x + width} 
        y2={medianY} 
        stroke={data.color || '#737373'} 
        strokeWidth="3"
      />
      
      {/* Outliers */}
      {data.outliers && data.outliers.map((outlier, idx) => (
        <circle
          key={idx}
          cx={x + width/2}
          cy={yScale(outlier)}
          r="3"
          fill={data.color || '#737373'}
          opacity="0.9"
          stroke="#FFFFFF"
          strokeWidth="1"
        />
      ))}
    </g>
  );
};

export default function TeamPaceRankingChart({
  className,
  isLoading,
  chartData,
  lineConfigs,
  driverColorMap,
  drivers,
  driverTeams,
  selectedDrivers
}) {
  const [sortBy, setSortBy] = useState('median');
  const [showOutliers] = useState(true);
  const [filterOutlaps] = useState(true);
  const [filterInlaps] = useState(true);
  const [selectedTeams, setSelectedTeams] = useState({});
  const [selectedDriversLocal, setSelectedDriversLocal] = useState({});
  const [hoveredItem, setHoveredItem] = useState(null);
  const [viewMode, setViewMode] = useState('team');
  const [outlierThreshold, setOutlierThreshold] = useState(10);

  // Initialize selected teams and drivers
  React.useEffect(() => {
    const initialTeams = {};
    const initialDrivers = {};
    
    drivers.forEach(driver => {
      const team = driverTeams[driver];
      if (team && selectedDrivers[driver]) {
        initialTeams[team] = true;
        initialDrivers[driver] = true;
      }
    });
    
    setSelectedTeams(initialTeams);
    setSelectedDriversLocal(initialDrivers);
  }, [drivers, selectedDrivers, driverTeams, viewMode]);

  // Get unique teams and their colors
  const teams = useMemo(() => {
    const teamSet = new Set();
    const colors = {};
    drivers.forEach(driver => {
      const team = driverTeams[driver];
      if (team) {
        teamSet.add(team);
        if (!colors[team] && driverColorMap[driver]) {
          colors[team] = driverColorMap[driver];
        }
      }
    });
    return { teamList: Array.from(teamSet).sort(), teamColors: colors };
  }, [drivers, driverColorMap, driverTeams]);

  // Handle team toggle
  const handleTeamToggle = (team) => {
    setSelectedTeams(prev => ({
      ...prev,
      [team]: !prev[team]
    }));
  };

  // Handle driver toggle
  const handleDriverToggle = (driver) => {
    setSelectedDriversLocal(prev => ({
      ...prev,
      [driver]: !prev[driver]
    }));
  };

  // Helper function to calculate statistics
  const calculateStatistics = (name, laps, color) => {
    if (laps.length === 0) return null;

    const sorted = [...laps].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    
    const filtered = sorted.filter(t => Math.abs(t - median) <= outlierThreshold);
    if (filtered.length === 0) return null;

    const sortedF = [...filtered].sort((a, b) => a - b);
    
    const q1Index = Math.floor(sortedF.length * 0.25);
    const medianIndex = Math.floor(sortedF.length * 0.5);
    const q3Index = Math.floor(sortedF.length * 0.75);
    
    const q1 = sortedF[q1Index];
    const medianF = sortedF[medianIndex];
    const q3 = sortedF[q3Index];
    
    const iqr = q3 - q1;
    const lowerFence = q1 - 1.5 * iqr;
    const upperFence = q3 + 1.5 * iqr;
    
    const lowerExtreme = sortedF.filter(v => v < q1 && v >= lowerFence);
    const min = lowerExtreme.length > 0 ? Math.min(...lowerExtreme) : q1;
    
    const upperExtreme = sortedF.filter(v => v > q3 && v <= upperFence);
    const max = upperExtreme.length > 0 ? Math.max(...upperExtreme) : q3;

    const avg = filtered.reduce((s, t) => s + t, 0) / filtered.length;
    const std = Math.sqrt(filtered.reduce((s, t) => s + Math.pow(t - avg, 2), 0) / filtered.length);

    if (process.env.NODE_ENV === 'development') {
      console.log(`Stats for ${name}:`, {
        q1: q1.toFixed(3), 
        median: medianF.toFixed(3), 
        q3: q3.toFixed(3),
        whiskerMin: min.toFixed(3),
        whiskerMax: max.toFixed(3),
        relationship: `min(${min.toFixed(2)}) <= q1(${q1.toFixed(2)}) < median(${medianF.toFixed(2)}) < q3(${q3.toFixed(2)}) <= max(${max.toFixed(2)})`,
        isValidBoxPlot: min <= q1 && q1 < medianF && medianF < q3 && q3 <= max,
        whiskerIssue: min > q1 || max < q3 ? 'WHISKERS INSIDE BOX!' : 'whiskers ok',
        whiskerExtension: `lower extends ${(q1 - min).toFixed(3)}s, upper extends ${(max - q3).toFixed(3)}s`
      });
    }

    return {
      name,
      min,
      max,
      q1,
      q3,
      median: medianF,
      average: avg,
      consistency: std,
      iqrConsistency: q3 - q1,
      spread: max - min,
      count: filtered.length,
      color: color || '#737373',
      outliers: showOutliers ? sorted.filter(t => t < lowerFence || t > upperFence) : [],
      rawMin: sorted[0],
      rawMax: sorted[sorted.length - 1],
      filteredLaps: laps.length - filtered.length
    };
  };

  // Calculate statistical data for each team
  const teamData = useMemo(() => {
    if (!chartData || !lineConfigs) return [];

    const lapMap = {};
    lineConfigs.forEach(cfg => {
      const team = driverTeams[cfg.driver];
      if (!team || !selectedDrivers[cfg.driver] || !selectedTeams[team]) return;

      chartData.forEach((lap, idx) => {
        if (filterOutlaps && idx === 0) return;
        if (filterInlaps && idx === chartData.length - 1) return;

        const time = lap[cfg.key];
        if (time > 0 && time < 200) {
          if (!lapMap[team]) lapMap[team] = [];
          lapMap[team].push(time);
        }
      });
    });

    return Object.entries(lapMap).map(([team, laps]) => {
      return calculateStatistics(team, laps, teams.teamColors[team]);
    }).filter(Boolean).sort((a, b) => {
      switch (sortBy) {
        case 'fastest': return a.min - b.min;
        case 'consistency': return a.iqrConsistency - b.iqrConsistency;
        default: return a.median - b.median;
      }
    });
  }, [chartData, lineConfigs, driverTeams, selectedDrivers, selectedTeams, filterInlaps, filterOutlaps, showOutliers, sortBy, teams.teamColors, outlierThreshold]);

  // Calculate statistical data for each driver
  const driverData = useMemo(() => {
    if (!chartData || !lineConfigs) return [];

    const lapMap = {};
    lineConfigs.forEach(cfg => {
      if (!selectedDrivers[cfg.driver]) return;

      const laps = [];
      chartData.forEach((lap, idx) => {
        if (filterOutlaps && idx === 0) return;
        if (filterInlaps && idx === chartData.length - 1) return;

        const time = lap[cfg.key];
        if (time > 0 && time < 200) {
          laps.push(time);
        }
      });

      if (laps.length > 0) {
        if (!lapMap[cfg.driver]) {
          lapMap[cfg.driver] = [];
        }
        lapMap[cfg.driver].push(...laps);
      }
    });

    const filteredLapMap = {};
    Object.entries(lapMap).forEach(([driver, laps]) => {
      if (selectedDriversLocal[driver]) {
        filteredLapMap[driver] = laps;
      }
    });

    return Object.entries(filteredLapMap).map(([driver, laps]) => {
      return calculateStatistics(driver, laps, driverColorMap[driver]);
    }).filter(Boolean).sort((a, b) => {
      switch (sortBy) {
        case 'fastest': return a.min - b.min;
        case 'consistency': return a.iqrConsistency - b.iqrConsistency;
        default: return a.median - b.median;
      }
    });
  }, [chartData, lineConfigs, selectedDrivers, selectedDriversLocal, filterInlaps, filterOutlaps, showOutliers, sortBy, driverColorMap, outlierThreshold]);

  // Get current data based on view mode
  const currentData = viewMode === 'team' ? teamData : driverData;

  // Calculate axis range
  const { minTime, maxTime } = useMemo(() => {
    if (currentData.length === 0) return { minTime: 60, maxTime: 120 };
    
    const allValues = currentData.flatMap(d => [d.min, d.max]).filter(v => v > 0);
    if (allValues.length === 0) return { minTime: 60, maxTime: 120 };

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const pad = (max - min) * 0.05;

    return { minTime: min - pad, maxTime: max + pad };
  }, [currentData]);

  if (isLoading) {
    return (
      <Card className={cn("bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50 rounded-3xl", className)}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50 rounded-3xl overflow-hidden", className)}>
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex gap-2 items-center">
            <Box className="text-cyan-400 h-5 w-5" />
            <CardTitle className="text-xl font-black text-white">
              {viewMode === 'team' ? 'Team' : 'Driver'} Pace Distribution
            </CardTitle>
            <span className="text-xs text-neutral-400 bg-neutral-800/60 px-3 py-1 rounded-full font-medium">
              Filtering: over {outlierThreshold}s from median
            </span>
          </div>
          <div className="flex gap-3 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex gap-2 bg-neutral-800/60 p-1 rounded-xl">
              <Button 
                onClick={() => setViewMode('team')} 
                variant={viewMode === 'team' ? 'default' : 'ghost'} 
                size="sm"
                className={cn(
                  "h-9 px-4 rounded-lg font-bold transition-all",
                  viewMode === 'team' 
                    ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-black" 
                    : "text-neutral-400 hover:text-white hover:bg-neutral-700"
                )}
              >
                <Users className="w-4 h-4 mr-2" />
                Teams
              </Button>
              <Button 
                onClick={() => setViewMode('driver')} 
                variant={viewMode === 'driver' ? 'default' : 'ghost'} 
                size="sm"
                className={cn(
                  "h-9 px-4 rounded-lg font-bold transition-all",
                  viewMode === 'driver' 
                    ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-black" 
                    : "text-neutral-400 hover:text-white hover:bg-neutral-700"
                )}
              >
                <User className="w-4 h-4 mr-2" />
                Drivers
              </Button>
            </div>
            
            {/* Sort Options */}
            <div className="flex gap-2 bg-neutral-800/60 p-1 rounded-xl">
              <Button 
                onClick={() => setSortBy('median')} 
                variant="ghost"
                size="sm"
                className={cn(
                  "h-9 px-4 rounded-lg font-bold transition-all",
                  sortBy === 'median' 
                    ? "bg-neutral-700 text-white" 
                    : "text-neutral-400 hover:text-white"
                )}
              >
                Median
              </Button>
              <Button 
                onClick={() => setSortBy('fastest')} 
                variant="ghost"
                size="sm"
                className={cn(
                  "h-9 px-4 rounded-lg font-bold transition-all",
                  sortBy === 'fastest' 
                    ? "bg-neutral-700 text-white" 
                    : "text-neutral-400 hover:text-white"
                )}
              >
                Fastest
              </Button>
              <Button 
                onClick={() => setSortBy('consistency')} 
                variant="ghost"
                size="sm"
                className={cn(
                  "h-9 px-4 rounded-lg font-bold transition-all",
                  sortBy === 'consistency' 
                    ? "bg-neutral-700 text-white" 
                    : "text-neutral-400 hover:text-white"
                )}
              >
                Consistency
              </Button>
            </div>
            
            {/* Outlier Threshold Slider */}
            <div className="flex items-center gap-3 bg-neutral-800/60 px-4 py-2 rounded-xl">
              <label htmlFor="threshold-slider" className="text-sm text-neutral-400 font-medium">
                Outlier threshold:
              </label>
              
              <input
                id="threshold-slider"
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={outlierThreshold}
                onChange={(e) => setOutlierThreshold(parseFloat(e.target.value))}
                className="w-24 h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${((outlierThreshold - 1) / 19) * 100}%, #404040 ${((outlierThreshold - 1) / 19) * 100}%, #404040 100%)`
                }}
              />
              <span className="text-white font-bold min-w-[3rem]">
                {outlierThreshold}s
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 flex-grow flex flex-col">
        {/* Selection controls */}
        <div className="flex flex-wrap gap-2 mb-6">
          {viewMode === 'team' ? (
            teams.teamList.map(team => (
              <Button
                key={team}
                variant={selectedTeams[team] ? "default" : "outline"}
                size="sm"
                onClick={() => handleTeamToggle(team)}
                className="h-9 px-4 rounded-xl font-bold transition-all"
                style={{
                  backgroundColor: selectedTeams[team] ? teams.teamColors[team] : 'transparent',
                  borderColor: teams.teamColors[team],
                  color: selectedTeams[team] ? '#fff' : teams.teamColors[team]
                }}
              >
                {team}
              </Button>
            ))
          ) : (
            drivers.filter(driver => selectedDrivers[driver]).map(driver => (
              <Button
                key={driver}
                variant={selectedDriversLocal[driver] ? "default" : "outline"}
                size="sm"
                onClick={() => handleDriverToggle(driver)}
                className="h-9 px-4 rounded-xl font-bold transition-all"
                style={{
                  backgroundColor: selectedDriversLocal[driver] ? driverColorMap[driver] : 'transparent',
                  borderColor: driverColorMap[driver],
                  color: selectedDriversLocal[driver] ? '#fff' : driverColorMap[driver]
                }}
              >
                {driver}
              </Button>
            ))
          )}
        </div>

        <Tabs defaultValue="boxplot" className="flex-grow flex flex-col">
          <TabsList className="bg-neutral-800/60 border border-neutral-700/50 mb-6 rounded-xl">
            <TabsTrigger 
              value="boxplot" 
              className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white rounded-lg font-bold"
            >
              Box Plot
            </TabsTrigger>
            <TabsTrigger 
              value="stats" 
              className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white rounded-lg font-bold"
            >
              Statistics
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="boxplot" className="flex-grow">
            <div className="flex-grow" style={{ minHeight: '400px' }}>
              {currentData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-neutral-400">
                  <div className="text-center">
                    <Box className="w-12 h-12 mx-auto mb-3 text-cyan-400 opacity-50" />
                    <p className="font-bold text-white text-lg">No data available</p>
                    <p className="text-sm text-neutral-500 mt-2">
                      Select {viewMode === 'team' ? 'teams' : 'drivers'} above to see their pace distribution
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative h-full">
                  {/* SVG Box Plot */}
                  <svg width="100%" height="100%" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet">
                    {/* Grid lines */}
                    <g>
                      {(() => {
                        const range = maxTime - minTime;
                        let interval;
                        
                        if (range < 5) interval = 1;
                        else if (range < 10) interval = 2;
                        else if (range < 20) interval = 5;
                        else interval = 10;
                        
                        const startTime = Math.ceil(minTime / interval) * interval;
                        const endTime = Math.floor(maxTime / interval) * interval;
                        
                        const gridLines = [];
                        for (let time = startTime; time <= endTime; time += interval) {
                          const ratio = (time - minTime) / (maxTime - minTime);
                          const y = 350 - ratio * 300;
                          
                          gridLines.push(
                            <g key={time}>
                              <line x1={70} y1={y} x2={750} y2={y} stroke="#404040" strokeDasharray="3 3" opacity={0.5} />
                              <text x={60} y={y + 5} textAnchor="end" fill="#a3a3a3" fontSize="12">
                                {formatTime(time).replace('s', '')}
                              </text>
                            </g>
                          );
                        }
                        
                        return gridLines;
                      })()}
                    </g>
                    
                    {/* Y-axis label */}
                    <text x={20} y={200} textAnchor="middle" fill="#a3a3a3" fontSize="14" transform="rotate(-90 20 200)">
                      Lap Time
                    </text>
                    
                    {/* Performance direction indicators */}
                    <g>
                      <text x={760} y={60} textAnchor="end" fill="#ef4444" fontSize="10" fontWeight="600">
                        ↑ Slower
                      </text>
                      <text x={760} y={340} textAnchor="end" fill="#10b981" fontSize="10" fontWeight="600">
                        ↓ Faster
                      </text>
                    </g>
                    
                    {/* Box plots */}
                    {currentData.map((item, index) => {
                      const boxWidth = Math.min(60, (680 / currentData.length) * 0.8);
                      const x = 70 + (index + 0.5) * (680 / currentData.length) - boxWidth / 2;
                      
                      const yScale = (value) => {
                        const ratio = (value - minTime) / (maxTime - minTime);
                        return 350 - ratio * 300;
                      };
                      
                      return (
                        <g 
                          key={item.name}
                          onMouseEnter={() => setHoveredItem(item)}
                          onMouseLeave={() => setHoveredItem(null)}
                          style={{ cursor: 'pointer' }}
                        >
                          <BoxPlot
                            data={item}
                            x={x}
                            width={boxWidth}
                            height={300}
                            yScale={yScale}
                          />
                          {/* Name label */}
                          <text
                            x={x + boxWidth / 2}
                            y={370}
                            textAnchor="middle"
                            fill="#a3a3a3"
                            fontSize="11"
                            fontWeight="500"
                            transform={`rotate(-45 ${x + boxWidth / 2} 370)`}
                          >
                            {item.name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                  
                  {/* Hover tooltip */}
                  {hoveredItem && (
                    <div className="absolute top-4 right-4 bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/50 rounded-2xl p-4 shadow-xl z-10">
                      <p className="text-white font-black mb-3">{hoveredItem.name}</p>
                      <div className="space-y-1.5 text-sm">
                        <p className="text-neutral-300"><span className="text-neutral-500">Fastest:</span> <span className="font-bold text-cyan-400">{formatTime(hoveredItem.min)}</span></p>
                        <p className="text-neutral-300"><span className="text-neutral-500">Q1:</span> <span className="font-bold">{formatTime(hoveredItem.q1)}</span></p>
                        <p className="text-neutral-300"><span className="text-neutral-500">Median:</span> <span className="font-bold">{formatTime(hoveredItem.median)}</span></p>
                        <p className="text-neutral-300"><span className="text-neutral-500">Q3:</span> <span className="font-bold">{formatTime(hoveredItem.q3)}</span></p>
                        <p className="text-neutral-300"><span className="text-neutral-500">Slowest:</span> <span className="font-bold">{formatTime(hoveredItem.max)}</span></p>
                        <p className="text-neutral-400 mt-3 pt-3 border-t border-neutral-700">Laps analyzed: <span className="font-bold text-white">{hoveredItem.count}</span></p>
                        {hoveredItem.filteredLaps > 0 && (
                          <p className="text-yellow-400 text-xs">({hoveredItem.filteredLaps} extreme laps filtered, over {outlierThreshold}s from median)</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="stats" className="flex-grow">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-700">
                    <th className="text-left py-3 px-4 text-neutral-400 font-bold uppercase text-xs tracking-wider">{viewMode === 'team' ? 'Team' : 'Driver'}</th>
                    <th className="text-right py-3 px-4 text-neutral-400 font-bold uppercase text-xs tracking-wider">Fastest</th>
                    <th className="text-right py-3 px-4 text-neutral-400 font-bold uppercase text-xs tracking-wider">Median</th>
                    <th className="text-right py-3 px-4 text-neutral-400 font-bold uppercase text-xs tracking-wider">Consistency</th>
                    <th className="text-right py-3 px-4 text-neutral-400 font-bold uppercase text-xs tracking-wider">Laps</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.map((item, idx) => (
                    <tr key={item.name} className="border-b border-neutral-800 hover:bg-neutral-800/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: item.color }} 
                          />
                          <span className="text-white font-bold">{item.name}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 text-cyan-400 font-bold">{formatTime(item.min)}</td>
                      <td className="text-right py-3 px-4 text-white font-medium">{formatTime(item.median)}</td>
                      <td className="text-right py-3 px-4 text-neutral-300 font-medium" title="Box size (IQR) - smaller = more consistent">{item.iqrConsistency.toFixed(3)}s</td>
                      <td className="text-right py-3 px-4 text-neutral-400">
                        <span className="font-bold text-white">{item.count}</span>
                        {item.filteredLaps > 0 && (
                          <span 
                            className="text-xs text-yellow-400 cursor-help ml-1" 
                            title={`${item.filteredLaps} laps filtered (more than ${outlierThreshold}s from median)`}
                          > 
                            (-{item.filteredLaps})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Statistics explanation */}
              <div className="mt-6 p-4 bg-neutral-800/50 backdrop-blur-sm rounded-2xl text-xs text-neutral-400 space-y-2">
                <p>
                  <strong className="text-white">Understanding the statistics:</strong> Values shown are calculated after filtering extreme outliers (laps more than {outlierThreshold}s from median). 
                  Out-laps and in-laps are automatically excluded. Outlier dots show the filtered extreme laps.
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <span><strong className="text-white">Fastest:</strong> Best lap time achieved</span>
                  <span><strong className="text-white">Median:</strong> Middle lap time (50% faster, 50% slower)</span>
                  <span><strong className="text-white">Consistency:</strong> Box size (Q3-Q1) - smaller = more consistent</span>
                  <span><strong className="text-white">Threshold:</strong> Currently filtering laps over {outlierThreshold}s from median</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {/* Explanatory Note Section */}
      {currentData.length > 0 && (
        <div className="border-t border-neutral-700/50 p-6 bg-neutral-900/40">
          <div className="text-sm text-neutral-400 space-y-3">
            <p>
              <strong className="text-white">How to read this chart:</strong> Box plots visualize the distribution and consistency of each {viewMode}'s race pace. 
              Out-laps and in-laps are automatically filtered out, and extreme outliers are shown as dots.
            </p>
            <p>
              <strong className="text-white">Consistency sorting:</strong> Sorts by inter quartile range (smaller boxes = more consistent pace) which matches what you see visually with the boxes.
            </p>
            <p>
              <strong className="text-white">Outlier threshold:</strong> Use the slider above to adjust how strictly outliers are filtered. 
              Lower values (1-5s) show only the most consistent laps, while higher values (10-20s) include more variation. I recommend sticking to a 10s outlier, unless you want to be super critical and rule out a large proportion of laps.
            </p>
            <p>
              <strong className="text-white">Box elements:</strong> The box represents where 50% of the {viewMode}'s lap times fall (between Q1 and Q3). 
              A smaller box indicates more consistent pace. The horizontal line inside the box shows the median lap time.
            </p>
            <p>
              <strong className="text-white">Whiskers:</strong> The vertical lines extending from the box show the range from fastest to slowest laps. 
              Shorter whiskers indicate more consistent overall performance throughout the race. These whiskers will show the fastest / slowest WITHIN the range of your chosen outlier threshold.
            </p>
            <p>
              <strong className="text-white">Note:</strong> {viewMode === 'team' ? 'Teams' : 'Drivers'} positioned lower on the chart had faster lap times. 
              The best performing {viewMode === 'team' ? 'teams' : 'drivers'} typically combine low position (fast pace) with small boxes (consistency) and short whiskers (limited variation between fastest and slowest). 
              Outliers (dots) show laps that deviate significantly from typical pace. 
              Current outlier threshold: {outlierThreshold}s from median.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}