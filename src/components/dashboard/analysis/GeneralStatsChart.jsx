"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Cell
} from 'recharts';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { 
  Battery, Zap, Gauge, GitBranch, Activity,
  Timer, BarChart2, Car, Clock, 
  TrendingDown, AlertTriangle, ThermometerSun, 
  Download, Flame, Users, Navigation, 
  MousePointer2, X
} from 'lucide-react';

// Helper functions
const formatNumber = (num) => new Intl.NumberFormat().format(num);
const formatTotals = (value) => value === undefined || value === null ? 'Unavailable for this race' : `${parseFloat(value).toFixed(1)} MJ`;
const formatPercent = (num) => `${num.toFixed(1)}%`;
const formatTime = (timeInSec) => {
  const minutes = Math.floor(timeInSec / 60);
  const seconds = (timeInSec % 60).toFixed(3);
  return `${minutes}:${seconds.padStart(6, '0')}`;
};
const formatSpeed = (speed) => `${speed} km/h`;
const formatTemperature = (temp) => `${temp}°C`;
const formatGForce = (g) => `${g.toFixed(2)}G`;

const getTeamColor = (teamName) => {
  if (!teamName) return '#22d3ee';
  
  if (teamColors[teamName]) return teamColors[teamName];
  
  const normalizedTeamName = teamName.toLowerCase();
  
  if (normalizedTeamName.includes('mercedes')) return '#00D2BE';
  if (normalizedTeamName.includes('red bull')) return '#0600EF';
  if (normalizedTeamName.includes('ferrari')) return '#DC0000';
  if (normalizedTeamName.includes('mclaren')) return '#FF8700';
  if (normalizedTeamName.includes('alpine')) return '#0090FF';
  if (normalizedTeamName.includes('aston martin')) return '#006F62';
  if (normalizedTeamName.includes('sauber') || normalizedTeamName.includes('alfa romeo') || normalizedTeamName.includes('kick')) return '#900000';
  if (normalizedTeamName.includes('haas')) return '#FFFFFF';
  if (normalizedTeamName.includes('williams')) return '#005AFF';
  if (normalizedTeamName.includes('alphatauri') || normalizedTeamName.includes('racing bulls') || teamName === 'RB') return '#2B4562';
  
  return '#22d3ee';
};

const teamColors = {
  'Mercedes': '#00D2BE', 'Mercedes-AMG PETRONAS F1 Team': '#00D2BE', 'Mercedes-AMG': '#00D2BE',
  'Red Bull Racing': '#0600EF', 'Red Bull Racing Honda RBPT': '#0600EF', 'Red Bull': '#0600EF', 'Oracle Red Bull Racing': '#0600EF',
  'Ferrari': '#DC0000', 'Scuderia Ferrari': '#DC0000', 'Scuderia Ferrari HP': '#DC0000',
  'McLaren': '#FF8700', 'McLaren F1 Team': '#FF8700', 'Papaya United McLaren F1 Team': '#FF8700',
  'Alpine': '#0090FF', 'BWT Alpine F1 Team': '#0090FF', 'Alpine F1 Team': '#0090FF',
  'Aston Martin': '#006F62', 'Aston Martin Aramco Cognizant F1 Team': '#006F62', 'Aston Martin F1 Team': '#006F62',
  'Kick Sauber': '#900000', 'Sauber': '#900000', 'Alfa Romeo': '#900000', 'Alfa Romeo F1 Team ORLEN': '#900000', 'Stake F1 Team Kick Sauber': '#900000',
  'RB': '#2B4562', 'AlphaTauri': '#2B4562', 'Scuderia AlphaTauri': '#2B4562', 'Racing Bulls': '#2B4562', 'Visa Cash App RB F1 Team': '#2B4562',
  'Haas F1 Team': '#FFFFFF', 'Haas': '#FFFFFF', 'MoneyGram Haas F1 Team': '#FFFFFF',
  'Williams': '#005AFF', 'Williams Racing': '#005AFF', 'Williams F1 Team': '#005AFF',
};

const ClickableStatCard = ({ 
  title, value, icon: Icon, color = "text-cyan-500", tooltip, className,
  onClick, chartData = [], chartTitle, dataKey = "value", formatValue
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <motion.div whileHover={{ scale: 1.03, y: -4 }} whileTap={{ scale: 0.98 }}>
        <Card 
          className={cn(
            "bg-neutral-900/60 backdrop-blur-xl border border-neutral-700/50 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/10",
            className
          )}
          onClick={() => chartData?.length > 0 && setIsOpen(true)}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 uppercase tracking-wider font-bold mb-2">{title}</p>
                <p className="text-3xl font-black text-white">{value}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn("rounded-full p-3", color.replace("text-", "bg-").replace("500", "500/20"))}>
                  <Icon className={cn("w-6 h-6", color)} />
                </div>
                {chartData?.length > 0 && (
                  <MousePointer2 className="w-4 h-4 text-neutral-500" />
                )}
              </div>
            </div>
            {tooltip && (
              <p className="text-xs text-neutral-500 mt-3">{tooltip}</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {chartData?.length > 0 && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-4xl bg-neutral-900/95 backdrop-blur-xl border-neutral-700/50 text-white rounded-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-2xl font-black">
                <Icon className={cn("w-6 h-6", color)} />
                {chartTitle || title}
              </DialogTitle>
            </DialogHeader>
            <div className="h-96 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(64, 64, 64, 0.3)" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: 'rgba(163, 163, 163, 0.9)', fontSize: 12 }} 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    stroke="rgba(115, 115, 115, 0.5)"
                  />
                  <YAxis 
                    tick={{ fill: 'rgba(163, 163, 163, 0.9)', fontSize: 12 }} 
                    tickFormatter={formatValue}
                    stroke="rgba(115, 115, 115, 0.5)"
                  />
                  <RechartsTooltip
                    contentStyle={{ 
                      backgroundColor: 'rgba(23, 23, 23, 0.95)', 
                      borderColor: 'rgba(64, 64, 64, 0.5)',
                      borderRadius: '16px',
                      color: 'white',
                      backdropFilter: 'blur(12px)'
                    }}
                    labelStyle={{ color: '#22d3ee', fontWeight: 'bold' }}
                    itemStyle={{ color: 'white' }}
                    formatter={(value, name, props) => [
                      formatValue ? formatValue(value) : value,
                      title
                    ]}
                    labelFormatter={(label) => `${label} (${chartData.find(d => d.name === label)?.team || 'Unknown Team'})`}
                  />
                  <Bar dataKey={dataKey} radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={getTeamColor(entry.team)}
                        fillOpacity={0.9}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

const ClickableDriverStatCard = ({ 
  driver, team, value, title, icon: Icon, color = "text-cyan-500", tooltip, className,
  chartData = [], chartTitle, dataKey = "value", formatValue
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <motion.div whileHover={{ scale: 1.03, y: -4 }} whileTap={{ scale: 0.98 }}>
        <Card 
          className={cn(
            "bg-neutral-900/60 backdrop-blur-xl border border-neutral-700/50 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/10",
            className
          )}
          onClick={() => chartData?.length > 0 && setIsOpen(true)}
        >
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full overflow-hidden mr-3 bg-neutral-800 flex items-center justify-center">
                <Users className="w-6 h-6 text-neutral-400" />
              </div>
              <div className="flex-grow">
                <p className="font-bold text-white">{driver}</p>
                <p className="text-xs text-neutral-400">{team}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn("rounded-full p-2", color.replace("text-", "bg-").replace("500", "500/20"))}>
                  <Icon className={cn("w-5 h-5", color)} />
                </div>
                {chartData?.length > 0 && (
                  <MousePointer2 className="w-4 h-4 text-neutral-500" />
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-neutral-400 uppercase tracking-wider font-bold mb-1">{title}</p>
              <p className="text-2xl font-black text-white">{value}</p>
              {tooltip && (
                <p className="text-xs text-neutral-500 mt-2">{tooltip}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {chartData?.length > 0 && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-4xl bg-neutral-900/95 backdrop-blur-xl border-neutral-700/50 text-white rounded-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-2xl font-black">
                <Icon className={cn("w-6 h-6", color)} />
                {chartTitle || title}
              </DialogTitle>
            </DialogHeader>
            <div className="h-96 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(64, 64, 64, 0.3)" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: 'rgba(163, 163, 163, 0.9)', fontSize: 12 }} 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    stroke="rgba(115, 115, 115, 0.5)"
                  />
                  <YAxis 
                    tick={{ fill: 'rgba(163, 163, 163, 0.9)', fontSize: 12 }} 
                    tickFormatter={formatValue}
                    stroke="rgba(115, 115, 115, 0.5)"
                  />
                  <RechartsTooltip
                    contentStyle={{ 
                      backgroundColor: 'rgba(23, 23, 23, 0.95)', 
                      borderColor: 'rgba(64, 64, 64, 0.5)',
                      borderRadius: '16px',
                      color: 'white',
                      backdropFilter: 'blur(12px)'
                    }}
                    labelStyle={{ color: '#22d3ee', fontWeight: 'bold' }}
                    itemStyle={{ color: 'white' }}
                    formatter={(value, name, props) => [
                      formatValue ? formatValue(value) : value,
                      title
                    ]}
                    labelFormatter={(label) => `${label} (${chartData.find(d => d.name === label)?.team || 'Unknown Team'})`}
                  />
                  <Bar dataKey={dataKey} radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={getTeamColor(entry.team)}
                        fillOpacity={0.9}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

const SurfaceGroupCard = ({ surfaceType, data, className }) => {
  return (
    <Card className={cn("bg-neutral-900/60 backdrop-blur-xl border border-neutral-700/50 rounded-2xl overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-cyan-400" />
          <CardTitle className="text-lg font-black text-white">Most Time on {surfaceType}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-3">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between border-b border-neutral-800 pb-3 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center">
                  <span className="text-xs font-black text-cyan-400">{idx + 1}</span>
                </div>
                <div>
                  <p className="font-bold text-white">{item.driver}</p>
                  <p className="text-xs text-neutral-400">{item.team}</p>
                </div>
              </div>
              <div>
                <p className="text-xl font-black text-white">{item.time.toFixed(1)}s</p>
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
  
  const [activeTab, setActiveTab] = useState("overview");
  const [derivedData, setDerivedData] = useState({
    topSpeeds: [], ersDeployment: [], ersHarvesting: [], totalErsDeployment: [], totalErsHarvesting: [],
    deltaToNext: [], gearShifts: [], maxBrakeTemps: [], minBrakeTemps: [], maxTyreTemps: [], minTyreTemps: [],
    gForces: [], tyreWear: []
  });
  const [surfaceGroups, setSurfaceGroups] = useState({});
  
  useEffect(() => {
    if (generalStats) {
      const chartData = {
        topSpeeds: generalStats.speed?.allDriversTopSpeeds || [],
        ersDeployment: generalStats.ers?.allDriversDeployment || [],
        ersHarvesting: generalStats.ers?.allDriversHarvesting || [],
        totalErsDeployment: generalStats.ers?.allDriversTotalDeployment || [],
        totalErsHarvesting: generalStats.ers?.allDriversTotalHarvesting || [],
        deltaToNext: generalStats.delta?.allDriversDeltas || [],
        gearShifts: generalStats.speed?.allDriversGearShifts || [],
        maxBrakeTemps: generalStats.temperatures?.allDriversBrakeTemps || [],
        minBrakeTemps: generalStats.temperatures?.allDriversMinBrakeTemps || [],
        maxTyreTemps: generalStats.temperatures?.allDriversTyreTemps || [],
        minTyreTemps: generalStats.temperatures?.allDriversMinTyreTemps || [],
        gForces: generalStats.forces?.allDriversGForce || [],
        tyreWear: generalStats.tyres?.allDriversTyreWear || []
      };
      
      for (const key in chartData) {
        chartData[key] = chartData[key].map(item => ({
          name: item.driver || "Unknown",
          value: item.value || 0,
          team: item.team || "Unknown Team",
          ...item
        }));
      }
      
      setDerivedData(chartData);
      processSurfaceData(generalStats.surfaces?.timeBySurface || stats.surfaces.timeBySurface);
    } else {
      processSurfaceData(stats.surfaces.timeBySurface);
    }
  }, [generalStats]);
  
  const processSurfaceData = (surfaceData) => {
    const groupedBySurface = {};
    
    surfaceData.forEach(item => {
      if (!groupedBySurface[item.surface]) {
        groupedBySurface[item.surface] = [];
      }
      groupedBySurface[item.surface].push(item);
    });
    
    const result = {};
    for (const surface in groupedBySurface) {
      result[surface] = groupedBySurface[surface]
        .sort((a, b) => b.time - a.time)
        .slice(0, 3);
    }
    
    setSurfaceGroups(result);
  };
  
  const renderLoading = () => (
    <div className="w-full h-full flex items-center justify-center bg-neutral-900/50 backdrop-blur-xl rounded-3xl p-10">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
    </div>
  );
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={cn("h-full", className)}
    >
      <Card className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-700/50 rounded-3xl overflow-hidden h-full flex flex-col">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <CardTitle className="text-2xl font-black text-white tracking-tight">Race Statistics</CardTitle>
              <div className="text-xs text-neutral-400 bg-neutral-800/60 backdrop-blur-xl px-3 py-1.5 rounded-full font-medium">
                Click cards to view charts
              </div>
            </div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-10 px-6 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-black font-bold rounded-2xl flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all border-0"
                      onClick={() => {}}
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </Button>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent className="bg-neutral-900 border-neutral-700/50 text-white rounded-xl">
                  <p>Export statistics as CSV</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="pt-0 flex-grow overflow-auto p-8">
          {isLoading ? (
            renderLoading()
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-neutral-800/60 backdrop-blur-xl border border-neutral-700/50 rounded-2xl mb-6 p-1">
                <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-teal-500 data-[state=active]:text-black font-bold rounded-xl">Overview</TabsTrigger>
                <TabsTrigger value="ers" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-teal-500 data-[state=active]:text-black font-bold rounded-xl">ERS</TabsTrigger>
                <TabsTrigger value="performance" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-teal-500 data-[state=active]:text-black font-bold rounded-xl">Performance</TabsTrigger>
                <TabsTrigger value="temperature" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-teal-500 data-[state=active]:text-black font-bold rounded-xl">Temperature</TabsTrigger>
                <TabsTrigger value="surfaces" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-teal-500 data-[state=active]:text-black font-bold rounded-xl">Surfaces</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <ClickableDriverStatCard 
                    driver={stats.ers.mostDeployed.driver}
                    team={stats.ers.mostDeployed.team}
                    title="Most ERS Deployed"
                    value={`${stats.ers.mostDeployed.value} MJ`}
                    icon={Battery}
                    color="text-emerald-400"
                    chartData={derivedData.ersDeployment}
                    chartTitle="ERS Deployment - All Drivers"
                    formatValue={(val) => `${val.toFixed(1)} MJ`}
                  />
                  <ClickableDriverStatCard 
                    driver={stats.speed.topSpeed.driver}
                    team={stats.speed.topSpeed.team}
                    title="Highest Top Speed"
                    value={formatSpeed(stats.speed.topSpeed.value)}
                    icon={Gauge}
                    color="text-red-400"
                    chartData={derivedData.topSpeeds}
                    chartTitle="Top Speeds - All Drivers"
                    formatValue={(val) => `${val} km/h`}
                  />
                  <ClickableDriverStatCard 
                    driver={stats.forces.highestG.driver}
                    team={stats.forces.highestG.team}
                    title="Highest G-Force"
                    value={formatGForce(stats.forces.highestG.value)}
                    icon={Activity}
                    color="text-purple-400"
                    tooltip={`Recorded at ${stats.forces.highestG.corner}`}
                    chartData={derivedData.gForces}
                    chartTitle="G-Forces - All Drivers"
                    formatValue={(val) => `${val.toFixed(2)}G`}
                  />
                  <ClickableDriverStatCard 
                    driver={stats.events.mostOvertakes.driver}
                    team={stats.events.mostOvertakes.team}
                    title="Most Overtakes"
                    value={stats.events.mostOvertakes.value}
                    icon={GitBranch}
                    color="text-cyan-400"
                  />
                  <ClickableStatCard 
                    title="Total Overtakes"
                    value={stats.events.totalOvertakes}
                    icon={Car}
                    color="text-teal-400"
                  />
                  <ClickableStatCard 
                    title="Fastest Laps Set"
                    value={stats.events.fastestLapsSet}
                    icon={Timer}
                    color="text-amber-400"
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="ers" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <ClickableDriverStatCard 
                    driver={stats.ers.mostDeployed?.driver || "No Data"}
                    team={stats.ers.mostDeployed?.team || "No Team"}
                    title="Highest Single-Lap ERS Deploy"
                    value={formatTotals(stats.ers.mostDeployed?.value)}
                    icon={Battery}
                    color="text-emerald-400"
                    chartData={derivedData.ersDeployment}
                    chartTitle="ERS Deployment - All Drivers"
                    formatValue={(val) => `${val.toFixed(1)} MJ`}
                  />
                  <ClickableDriverStatCard 
                    driver={stats.ers.mostHarvested?.driver || "No Data"}
                    team={stats.ers.mostHarvested?.team || "No Team"}
                    title="Highest Single-Lap ERS Harvest"
                    value={formatTotals(stats.ers.mostHarvested?.value)}
                    icon={Zap}
                    color="text-cyan-400"
                    chartData={derivedData.ersHarvesting}
                    chartTitle="ERS Harvesting - All Drivers"
                    formatValue={(val) => `${val.toFixed(1)} MJ`}
                  />
                  <ClickableDriverStatCard 
                    driver={stats.ers.mostTotalDeployed?.driver || "No Data"}
                    team={stats.ers.mostTotalDeployed?.team || "No Team"}
                    title="Most Race Total ERS Deploy"
                    value={formatTotals(stats.ers.mostTotalDeployed?.value)}
                    icon={Battery}
                    color="text-teal-400"
                    tooltip="Total amount deployed during the race"
                    chartData={derivedData.totalErsDeployment}
                    chartTitle="Total ERS Deployment - All Drivers"
                    formatValue={(val) => `${val.toFixed(1)} MJ`}
                  />
                  <ClickableDriverStatCard 
                    driver={stats.ers.mostTotalHarvested?.driver || "No Data"}
                    team={stats.ers.mostTotalHarvested?.team || "No Team"}
                    title="Most Race Total ERS Harvest"
                    value={formatTotals(stats.ers.mostTotalHarvested?.value)}
                    icon={Zap}
                    color="text-blue-400"
                    tooltip="Total amount harvested during the race"
                    chartData={derivedData.totalErsHarvesting}
                    chartTitle="Total ERS Harvesting - All Drivers"
                    formatValue={(val) => `${val.toFixed(1)} MJ`}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="performance" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <ClickableDriverStatCard 
                    driver={stats.speed.topSpeed.driver}
                    team={stats.speed.topSpeed.team}
                    title="Highest Top Speed"
                    value={formatSpeed(stats.speed.topSpeed.value)}
                    icon={Gauge}
                    color="text-red-400"
                    chartData={derivedData.topSpeeds}
                    chartTitle="Top Speeds - All Drivers"
                    formatValue={(val) => `${val} km/h`}
                  />
                  <ClickableDriverStatCard 
                    driver={stats.speed.mostGearShifts.driver}
                    team={stats.speed.mostGearShifts.team}
                    title="Most Gear Shifts"
                    value={formatNumber(stats.speed.mostGearShifts.value)}
                    icon={GitBranch}
                    color="text-blue-400"
                    chartData={derivedData.gearShifts}
                    chartTitle="Gear Shifts - All Drivers"
                    formatValue={(val) => formatNumber(val)}
                  />
                  <ClickableDriverStatCard 
                    driver={stats.speed.leastGearShifts.driver}
                    team={stats.speed.leastGearShifts.team}
                    title="Least Gear Shifts"
                    value={formatNumber(stats.speed.leastGearShifts.value)}
                    icon={GitBranch}
                    color="text-teal-400"
                    chartData={derivedData.gearShifts}
                    chartTitle="Gear Shifts - All Drivers"
                    formatValue={(val) => formatNumber(val)}
                  />
                  <ClickableDriverStatCard 
                    driver={stats.stints.fastest.driver}
                    team={stats.stints.fastest.team}
                    title="Fastest Stint Pace"
                    value={formatTime(stats.stints.fastest.value)}
                    icon={Clock}
                    color="text-emerald-400"
                    tooltip={`On ${stats.stints.fastest.compound} tyres`}
                  />
                  <ClickableDriverStatCard 
                    driver={stats.stints.slowest.driver}
                    team={stats.stints.slowest.team}
                    title="Slowest Stint Pace"
                    value={formatTime(stats.stints.slowest.value)}
                    icon={Clock}
                    color="text-amber-400"
                    tooltip={`On ${stats.stints.slowest.compound} tyres`}
                  />
                  <ClickableDriverStatCard 
                    driver={stats.forces.highestG.driver}
                    team={stats.forces.highestG.team}
                    title="Highest G-Force"
                    value={formatGForce(stats.forces.highestG.value)}
                    icon={Activity}
                    color="text-purple-400"
                    tooltip={`Recorded at ${stats.forces.highestG.corner}`}
                    chartData={derivedData.gForces}
                    chartTitle="G-Forces - All Drivers"
                    formatValue={(val) => `${val.toFixed(2)}G`}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="temperature" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <ClickableDriverStatCard 
                    driver={stats.temperatures.highestBrakeTemp.driver}
                    team={stats.temperatures.highestBrakeTemp.team}
                    title="Highest Brake Temp"
                    value={formatTemperature(stats.temperatures.highestBrakeTemp.value)}
                    icon={Flame}
                    color="text-red-400"
                    tooltip={`${stats.temperatures.highestBrakeTemp.location} brake`}
                    chartData={derivedData.maxBrakeTemps}
                    chartTitle="Maximum Brake Temperatures - All Drivers"
                    formatValue={(val) => `${val}°C`}
                  />
                  <ClickableDriverStatCard 
                    driver={stats.temperatures.lowestBrakeTemp.driver}
                    team={stats.temperatures.lowestBrakeTemp.team}
                    title="Lowest Brake Temp"
                    value={formatTemperature(stats.temperatures.lowestBrakeTemp.value)}
                    icon={Flame}
                    color="text-cyan-400"
                    tooltip={`${stats.temperatures.lowestBrakeTemp.location} brake`}
                    chartData={derivedData.minBrakeTemps}
                    chartTitle="Minimum Brake Temperatures - All Drivers"
                    formatValue={(val) => `${val}°C`}
                  />
                  <ClickableDriverStatCard 
                    driver={stats.temperatures.highestTyreTemp.driver}
                    team={stats.temperatures.highestTyreTemp.team}
                    title="Highest Tyre Temp"
                    value={formatTemperature(stats.temperatures.highestTyreTemp.value)}
                    icon={ThermometerSun}
                    color="text-orange-400"
                    tooltip={`${stats.temperatures.highestTyreTemp.location} tyre`}
                    chartData={derivedData.maxTyreTemps}
                    chartTitle="Maximum Tyre Temperatures - All Drivers"
                    formatValue={(val) => `${val}°C`}
                  />
                  <ClickableDriverStatCard 
                    driver={stats.temperatures.lowestTyreTemp.driver}
                    team={stats.temperatures.lowestTyreTemp.team}
                    title="Lowest Tyre Temp"
                    value={formatTemperature(stats.temperatures.lowestTyreTemp.value)}
                    icon={ThermometerSun}
                    color="text-blue-400"
                    tooltip={`${stats.temperatures.lowestTyreTemp.location} tyre`}
                    chartData={derivedData.minTyreTemps}
                    chartTitle="Minimum Tyre Temperatures - All Drivers"
                    formatValue={(val) => `${val}°C`}
                  />
                  <ClickableDriverStatCard 
                    driver={stats.tyres.highestWear.driver}
                    team={stats.tyres.highestWear.team}
                    title="Highest Tyre Wear"
                    value={formatPercent(stats.tyres.highestWear.value / 100)}
                    icon={AlertTriangle}
                    color="text-amber-400"
                    tooltip={`${stats.tyres.highestWear.tyre} tyre`}
                    chartData={derivedData.tyreWear}
                    chartTitle="Tyre Wear - All Drivers"
                    formatValue={(val) => `${(val / 100).toFixed(1)}%`}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="surfaces" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(surfaceGroups).map(([surfaceType, data]) => (
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
    </motion.div>
  );
}