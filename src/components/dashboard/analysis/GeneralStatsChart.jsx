"use client";

import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Cell
} from 'recharts';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { 
  Battery, Zap, Gauge, GitBranch, Activity,
  Timer, BarChart2, Car, Clock, 
  TrendingDown, AlertTriangle, ThermometerSun, 
  Download, Flame, Users, Navigation
} from 'lucide-react';

// Helper for formatting large numbers
const formatNumber = (num) => {
  return new Intl.NumberFormat().format(num);
};

// Helper for formatting ERS values as MJ
const formatTotals = (value) => {
  if (value === undefined || value === null) return 'Unavailable for this race';
  return `${parseFloat(value).toFixed(1)} MJ`;
};

// Helper for formatting percentages
const formatPercent = (num) => {
  return `${num.toFixed(1)}%`;
};

// Helper for formatting time (MM:SS.mmm)
const formatTime = (timeInSec) => {
  const minutes = Math.floor(timeInSec / 60);
  const seconds = (timeInSec % 60).toFixed(3);
  return `${minutes}:${seconds.padStart(6, '0')}`;
};

// Helper to format speeds (in km/h)
const formatSpeed = (speed) => {
  return `${speed} km/h`;
};

// Helper to format temperature
const formatTemperature = (temp) => {
  return `${temp}°C`;
};

// Helper to format G-forces
const formatGForce = (g) => {
  return `${g.toFixed(2)}G`;
};

// Simple stat card component
const StatCard = ({ title, value, icon: Icon, color = "text-blue-500", tooltip, className }) => {
  return (
    <Card className={cn("bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-1">{title}</p>
            <p className="text-2xl font-semibold text-white">{value}</p>
          </div>
          <div className={cn("rounded-full p-2", color.replace("text-", "bg-").replace("500", "500/20"))}>
            <Icon className={cn("w-5 h-5", color)} />
          </div>
        </div>
        {tooltip && (
          <p className="text-xs text-gray-500 mt-2">{tooltip}</p>
        )}
      </CardContent>
    </Card>
  );
};

// Driver stat card with driver photo
const DriverStatCard = ({ driver, team, value, title, icon: Icon, color = "text-blue-500", tooltip, className }) => {
  return (
    <Card className={cn("bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-center mb-3">
          <div className="w-8 h-8 rounded-full overflow-hidden mr-3 bg-gray-800 flex items-center justify-center">
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p className="font-medium text-white">{driver}</p>
            <p className="text-xs text-gray-400">{team}</p>
          </div>
          <div className={cn("ml-auto rounded-full p-2", color.replace("text-", "bg-").replace("500", "500/20"))}>
            <Icon className={cn("w-5 h-5", color)} />
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">{title}</p>
          <p className="text-xl font-semibold text-white">{value}</p>
          {tooltip && (
            <p className="text-xs text-gray-500 mt-2">{tooltip}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Chart card component for horizontal bar charts
const ChartCard = ({ title, data, dataKey, nameKey, color = "#3b82f6", icon: Icon, tooltip, className }) => {
  return (
    <Card className={cn("bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden h-auto", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-5 h-5", `text-${color}-500`)} />
          <CardTitle className="text-md font-semibold text-white">{title}</CardTitle>
        </div>
        {tooltip && (
          <p className="text-xs text-gray-500 mt-1">{tooltip}</p>
        )}
      </CardHeader>
      <CardContent className="pt-0 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 10, right: 30, left: 30, bottom: 5 }}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.3)" />
            <XAxis type="number" tick={{ fill: 'rgba(156, 163, 175, 0.9)', fontSize: 12 }} />
            <YAxis 
              dataKey={nameKey} 
              type="category" 
              tick={{ fill: 'rgba(156, 163, 175, 0.9)', fontSize: 12 }} 
              width={60}
            />
            <RechartsTooltip
              contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', borderColor: 'rgba(75, 85, 99, 0.5)' }}
              labelStyle={{ color: 'rgba(209, 213, 219, 0.9)' }}
            />
            <Bar dataKey={dataKey} fill={color}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={color} fillOpacity={0.8 - (index * 0.05)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Surface group card component
const SurfaceGroupCard = ({ surfaceType, data, className }) => {
  return (
    <Card className={cn("bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-blue-500" />
          <CardTitle className="text-md font-semibold text-white">Most Time on {surfaceType}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-3">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between border-b border-gray-800 pb-2 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-300">{idx + 1}</span>
                </div>
                <div>
                  <p className="font-medium text-white">{item.driver}</p>
                  <p className="text-xs text-gray-400">{item.team}</p>
                </div>
              </div>
              <div>
                <p className="text-lg font-semibold text-white">{item.time.toFixed(1)}s</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default function GeneralStatsChart({
  className,
  isLoading,
  generalStats,
  drivers,
  driverTeams,
  selectedStat,
  setSelectedStat
}) {
  // Use a placeholder object if stats aren't loaded yet
  const stats = generalStats || {
    ers: {
      mostDeployed: { driver: "Lewis Hamilton", team: "Mercedes", value: 46.2 },
      leastDeployed: { driver: "Logan Sargeant", team: "Williams", value: 28.5 },
      mostHarvested: { driver: "Max Verstappen", team: "Red Bull Racing", value: 52.7 },
      leastHarvested: { driver: "Zhou Guanyu", team: "Kick Sauber", value: 36.9 },
      mostTotalDeployed: { driver: "Lewis Hamilton", team: "Mercedes", value: 142.5 },
      leastTotalDeployed: { driver: "Logan Sargeant", team: "Williams", value: 89.3 },
      mostTotalHarvested: { driver: "Max Verstappen", team: "Red Bull Racing", value: 156.2 },
      leastTotalHarvested: { driver: "Zhou Guanyu", team: "Kick Sauber", value: 103.7 }
    },
    stints: {
      fastest: { driver: "Charles Leclerc", team: "Ferrari", value: 95.462, compound: "Soft" },
      slowest: { driver: "Valtteri Bottas", team: "Kick Sauber", value: 104.723, compound: "Hard" }
    },
    speed: {
      topSpeed: { driver: "Carlos Sainz", team: "Ferrari", value: 331 },
      mostGearShifts: { driver: "Fernando Alonso", team: "Aston Martin", value: 2845 },
      leastGearShifts: { driver: "Yuki Tsunoda", team: "RB", value: 2234 }
    },
    forces: {
      highestG: { driver: "Lando Norris", team: "McLaren", value: 5.68, corner: "Turn 7" }
    },
    tyres: {
      highestWear: { driver: "George Russell", team: "Mercedes", value: 78.4, tyre: "Front Left" }
    },
    events: {
      totalOvertakes: 42,
      mostOvertakes: { driver: "Daniel Ricciardo", team: "RB", value: 8 },
      bestReaction: { driver: "Oscar Piastri", team: "McLaren", value: 0.212 },
      mostCollisions: { driver: "Kevin Magnussen", team: "Haas F1 Team", value: 3 },
      fastestLapsSet: 6
    },
    temperatures: {
      highestBrakeTemp: { driver: "Sergio Perez", team: "Red Bull Racing", value: 846, location: "Front Left" },
      lowestBrakeTemp: { driver: "Nico Hulkenberg", team: "Haas F1 Team", value: 264, location: "Rear Right" },
      highestTyreTemp: { driver: "Alex Albon", team: "Williams", value: 124, location: "Rear Left" },
      lowestTyreTemp: { driver: "Esteban Ocon", team: "Alpine", value: 63, location: "Front Right" }
    },
    surfaces: {
      timeBySurface: [
        { driver: "Pierre Gasly", team: "Alpine", surface: "Grass", time: 14.2 },
        { driver: "Lance Stroll", team: "Aston Martin", surface: "Gravel", time: 8.7 },
        { driver: "Fernando Alonso", team: "Aston Martin", surface: "Rumble Strips", time: 35.4 },
        { driver: "Max Verstappen", team: "Red Bull Racing", surface: "Sand", time: 6.3 },
        { driver: "Lewis Hamilton", team: "Mercedes", surface: "Grass", time: 12.5 },
        { driver: "Charles Leclerc", team: "Ferrari", surface: "Gravel", time: 7.9 },
        { driver: "Lando Norris", team: "McLaren", surface: "Rumble Strips", time: 29.8 },
        { driver: "Carlos Sainz", team: "Ferrari", surface: "Sand", time: 5.7 },
        { driver: "Oscar Piastri", team: "McLaren", surface: "Grass", time: 11.1 },
        { driver: "Sergio Perez", team: "Red Bull Racing", surface: "Gravel", time: 7.2 }
      ]
    },
    delta: {
      lowestAvgDelta: { driver: "Max Verstappen", team: "Red Bull Racing", value: 0.782 },
      highestAvgDelta: { driver: "Logan Sargeant", team: "Williams", value: 2.467 }
    }
  };
  
  // State for active tab
  const [activeTab, setActiveTab] = useState("overview");
  
  // State for derived data from API response
  const [derivedData, setDerivedData] = useState({
    topSpeeds: [],
    ersDeployment: [],
    ersHarvesting: [],
    deltaToNext: [],
    gearShifts: [],
    maxBrakeTemps: [],
    maxTyreTemps: []
  });
  
  // State for processed surface data
  const [surfaceGroups, setSurfaceGroups] = useState({});
  
  // Prepare data from API for charts
  useEffect(() => {
    if (generalStats) {
      const chartData = {
        // Map API data directly to chart format
        topSpeeds: generalStats.speed?.allDriversTopSpeeds || [],
        ersDeployment: generalStats.ers?.allDriversDeployment || [],
        ersHarvesting: generalStats.ers?.allDriversHarvesting || [],
        deltaToNext: generalStats.delta?.allDriversDeltas || [],
        gearShifts: generalStats.speed?.allDriversGearShifts || [],
        maxBrakeTemps: generalStats.temperatures?.allDriversBrakeTemps || [],
        maxTyreTemps: generalStats.temperatures?.allDriversTyreTemps || []
      };
      
      // Process data for charts - format for display
      for (const key in chartData) {
        // Make sure each driver entry has a name property for the chart
        chartData[key] = chartData[key].map(item => ({
          name: item.driver || "Unknown",
          value: item.value || 0,
          team: item.team || "Unknown Team",
          ...item // Keep any other properties
        }));
      }
      
      // Set chart data
      setDerivedData(chartData);
      
      // Process surface data
      processSurfaceData(generalStats.surfaces?.timeBySurface || stats.surfaces.timeBySurface);
    } else {
      processSurfaceData(stats.surfaces.timeBySurface);
    }
  }, [generalStats]);
  
  // Process surface data to group by surface type and get top 3 for each
  const processSurfaceData = (surfaceData) => {
    // Group by surface type
    const groupedBySurface = {};
    
    surfaceData.forEach(item => {
      if (!groupedBySurface[item.surface]) {
        groupedBySurface[item.surface] = [];
      }
      groupedBySurface[item.surface].push(item);
    });
    
    // Sort each group by time (descending) and take top 3
    const result = {};
    for (const surface in groupedBySurface) {
      result[surface] = groupedBySurface[surface]
        .sort((a, b) => b.time - a.time)
        .slice(0, 3);
    }
    
    setSurfaceGroups(result);
  };
  
  // Function to render loading state
  const renderLoading = () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-900/50 rounded-lg p-10">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
  
  // Prepare surface time data for chart from API (for overview tab)
  const surfaceTimeData = stats.surfaces.timeBySurface.map(item => ({
    name: `${item.driver} (${item.surface})`,
    value: item.time,
    driver: item.driver,
    team: item.team,
    surface: item.surface
  })).sort((a, b) => b.value - a.value).slice(0, 8);
  
  return (
    <Card 
      className={cn("chart-container bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden h-full flex flex-col", className)}
    >
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold text-white">Race Statistics</CardTitle>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-9 bg-gray-800/80 hover:bg-gray-700 text-gray-200 border border-gray-700 flex items-center gap-2"
                    onClick={() => {/* Add download functionality */}}
                  >
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export statistics as CSV</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex-grow overflow-auto">
        {isLoading ? (
          renderLoading()
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-gray-800/60 border border-gray-700/60 mb-4">
              <TabsTrigger value="overview" className="data-[state=active]:bg-gray-700">Overview</TabsTrigger>
              <TabsTrigger value="ers" className="data-[state=active]:bg-gray-700">ERS</TabsTrigger>
              <TabsTrigger value="performance" className="data-[state=active]:bg-gray-700">Performance</TabsTrigger>
              <TabsTrigger value="temperature" className="data-[state=active]:bg-gray-700">Temperature</TabsTrigger>
              <TabsTrigger value="surfaces" className="data-[state=active]:bg-gray-700">Surfaces</TabsTrigger>
            </TabsList>
            
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <DriverStatCard 
                  driver={stats.ers.mostDeployed.driver}
                  team={stats.ers.mostDeployed.team}
                  title="Most ERS Deployed"
                  value={`${stats.ers.mostDeployed.value} MJ`}
                  icon={Battery}
                  color="text-green-500"
                />
                <DriverStatCard 
                  driver={stats.speed.topSpeed.driver}
                  team={stats.speed.topSpeed.team}
                  title="Highest Top Speed"
                  value={formatSpeed(stats.speed.topSpeed.value)}
                  icon={Gauge}
                  color="text-red-500"
                />
                <DriverStatCard 
                  driver={stats.forces.highestG.driver}
                  team={stats.forces.highestG.team}
                  title="Highest G-Force"
                  value={formatGForce(stats.forces.highestG.value)}
                  icon={Activity}
                  color="text-purple-500"
                  tooltip={`Recorded at ${stats.forces.highestG.corner}`}
                />
                <DriverStatCard 
                  driver={stats.events.mostOvertakes.driver}
                  team={stats.events.mostOvertakes.team}
                  title="Most Overtakes"
                  value={stats.events.mostOvertakes.value}
                  icon={GitBranch}
                  color="text-blue-500"
                />
                <StatCard 
                  title="Total Overtakes"
                  value={stats.events.totalOvertakes}
                  icon={Car}
                  color="text-cyan-500"
                />
                <StatCard 
                  title="Fastest Laps Set"
                  value={stats.events.fastestLapsSet}
                  icon={Timer}
                  color="text-amber-500"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ChartCard 
                  title="Surface Time Leaders"
                  data={surfaceTimeData}
                  dataKey="value"
                  nameKey="name"
                  color="#2563eb"
                  icon={Navigation}
                  tooltip="Time spent (seconds) on non-track surfaces"
                />
                <ChartCard 
                  title="Top Speeds"
                  data={derivedData.topSpeeds}
                  dataKey="value"
                  nameKey="name"
                  color="#ef4444"
                  icon={Gauge}
                  tooltip="Maximum speed recorded (km/h)"
                />
              </div>
            </TabsContent>
            
            {/* ERS Tab */}
            <TabsContent value="ers" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <DriverStatCard 
                  driver={stats.ers.mostDeployed?.driver || "No Data"}
                  team={stats.ers.mostDeployed?.team || "No Team"}
                  title="Highest Single-Lap ERS Deploy"
                  value={formatTotals(stats.ers.mostDeployed?.value)}
                  icon={Battery}
                  color="text-green-500"
                />
                <DriverStatCard 
                  driver={stats.ers.mostHarvested?.driver || "No Data"}
                  team={stats.ers.mostHarvested?.team || "No Team"}
                  title="Highest Single-Lap ERS Harvest"
                  value={formatTotals(stats.ers.mostHarvested?.value)}
                  icon={Zap}
                  color="text-blue-500"
                />
                <DriverStatCard 
                  driver={stats.ers.mostTotalDeployed?.driver || "No Data"}
                  team={stats.ers.mostTotalDeployed?.team || "No Team"}
                  title="Most Race Total ERS Deploy"
                  value={formatTotals(stats.ers.mostTotalDeployed?.value)}
                  icon={Battery}
                  color="text-emerald-500"
                  tooltip="Total amount deployed during the race"
                />
                <DriverStatCard 
                  driver={stats.ers.mostTotalHarvested?.driver || "No Data"}
                  team={stats.ers.mostTotalHarvested?.team || "No Team"}
                  title="Most Race Total ERS Harvest"
                  value={formatTotals(stats.ers.mostTotalHarvested?.value)}
                  icon={Zap}
                  color="text-indigo-500"
                  tooltip="Total amount harvested during the race"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ChartCard 
                  title="ERS Deployment"
                  data={derivedData.ersDeployment}
                  dataKey="value"
                  nameKey="name"
                  color="#22c55e"
                  icon={Battery}
                  tooltip="ERS deployed per lap (MJ)"
                />
                <ChartCard 
                  title="ERS Harvesting"
                  data={derivedData.ersHarvesting}
                  dataKey="value"
                  nameKey="name"
                  color="#3b82f6"
                  icon={Zap}
                  tooltip="ERS harvested per lap (MJ)"
                />
              </div>
            </TabsContent>
            
            {/* Performance Tab */}
            <TabsContent value="performance" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <DriverStatCard 
                  driver={stats.speed.topSpeed.driver}
                  team={stats.speed.topSpeed.team}
                  title="Highest Top Speed"
                  value={formatSpeed(stats.speed.topSpeed.value)}
                  icon={Gauge}
                  color="text-red-500"
                />
                <DriverStatCard 
                  driver={stats.speed.mostGearShifts.driver}
                  team={stats.speed.mostGearShifts.team}
                  title="Most Gear Shifts"
                  value={formatNumber(stats.speed.mostGearShifts.value)}
                  icon={GitBranch}
                  color="text-indigo-500"
                />
                <DriverStatCard 
                  driver={stats.speed.leastGearShifts.driver}
                  team={stats.speed.leastGearShifts.team}
                  title="Least Gear Shifts"
                  value={formatNumber(stats.speed.leastGearShifts.value)}
                  icon={GitBranch}
                  color="text-teal-500"
                />
                <DriverStatCard 
                  driver={stats.stints.fastest.driver}
                  team={stats.stints.fastest.team}
                  title="Fastest Stint Pace"
                  value={formatTime(stats.stints.fastest.value)}
                  icon={Clock}
                  color="text-emerald-500"
                  tooltip={`On ${stats.stints.fastest.compound} tyres`}
                />
                <DriverStatCard 
                  driver={stats.stints.slowest.driver}
                  team={stats.stints.slowest.team}
                  title="Slowest Stint Pace"
                  value={formatTime(stats.stints.slowest.value)}
                  icon={Clock}
                  color="text-amber-500"
                  tooltip={`On ${stats.stints.slowest.compound} tyres`}
                />
                <DriverStatCard 
                  driver={stats.forces.highestG.driver}
                  team={stats.forces.highestG.team}
                  title="Highest G-Force"
                  value={formatGForce(stats.forces.highestG.value)}
                  icon={Activity}
                  color="text-purple-500"
                  tooltip={`Recorded at ${stats.forces.highestG.corner}`}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ChartCard 
                  title="Delta to Next Car"
                  data={derivedData.deltaToNext}
                  dataKey="value"
                  nameKey="name"
                  color="#8b5cf6"
                  icon={TrendingDown}
                  tooltip="Average delta time to car ahead (seconds)"
                />
                <ChartCard 
                  title="Gear Shifts Distribution"
                  data={derivedData.gearShifts}
                  dataKey="value"
                  nameKey="name"
                  color="#6366f1"
                  icon={GitBranch}
                  tooltip="Total number of gear shifts during race"
                />
              </div>
            </TabsContent>
            
            {/* Temperature Tab */}
            <TabsContent value="temperature" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <DriverStatCard 
                  driver={stats.temperatures.highestBrakeTemp.driver}
                  team={stats.temperatures.highestBrakeTemp.team}
                  title="Highest Brake Temp"
                  value={formatTemperature(stats.temperatures.highestBrakeTemp.value)}
                  icon={Flame}
                  color="text-red-500"
                  tooltip={`${stats.temperatures.highestBrakeTemp.location} brake`}
                />
                <DriverStatCard 
                  driver={stats.temperatures.lowestBrakeTemp.driver}
                  team={stats.temperatures.lowestBrakeTemp.team}
                  title="Lowest Brake Temp"
                  value={formatTemperature(stats.temperatures.lowestBrakeTemp.value)}
                  icon={Flame}
                  color="text-cyan-500"
                  tooltip={`${stats.temperatures.lowestBrakeTemp.location} brake`}
                />
                <DriverStatCard 
                  driver={stats.temperatures.highestTyreTemp.driver}
                  team={stats.temperatures.highestTyreTemp.team}
                  title="Highest Tyre Temp"
                  value={formatTemperature(stats.temperatures.highestTyreTemp.value)}
                  icon={ThermometerSun}
                  color="text-orange-500"
                  tooltip={`${stats.temperatures.highestTyreTemp.location} tyre`}
                />
                <DriverStatCard 
                  driver={stats.temperatures.lowestTyreTemp.driver}
                  team={stats.temperatures.lowestTyreTemp.team}
                  title="Lowest Tyre Temp"
                  value={formatTemperature(stats.temperatures.lowestTyreTemp.value)}
                  icon={ThermometerSun}
                  color="text-blue-500"
                  tooltip={`${stats.temperatures.lowestTyreTemp.location} tyre`}
                />
                <DriverStatCard 
                  driver={stats.tyres.highestWear.driver}
                  team={stats.tyres.highestWear.team}
                  title="Highest Tyre Wear"
                  value={formatPercent(stats.tyres.highestWear.value / 100)}
                  icon={AlertTriangle}
                  color="text-yellow-500"
                  tooltip={`${stats.tyres.highestWear.tyre} tyre`}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ChartCard 
                  title="Maximum Brake Temperatures"
                  data={derivedData.maxBrakeTemps}
                  dataKey="value"
                  nameKey="name"
                  color="#ef4444"
                  icon={Flame}
                  tooltip="Maximum brake temperature recorded (°C)"
                />
                <ChartCard 
                  title="Maximum Tyre Temperatures"
                  data={derivedData.maxTyreTemps}
                  dataKey="value"
                  nameKey="name"
                  color="#f97316"
                  icon={ThermometerSun}
                  tooltip="Maximum tyre temperature recorded (°C)"
                />
              </div>
            </TabsContent>
            
            {/* Surfaces Tab */}
            <TabsContent value="surfaces" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(surfaceGroups).map(([surfaceType, data], index) => (
                  <SurfaceGroupCard 
                    key={surfaceType}
                    surfaceType={surfaceType}
                    data={data}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}