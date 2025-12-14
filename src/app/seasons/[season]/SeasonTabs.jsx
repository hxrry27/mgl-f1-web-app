"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  Building2, 
  Trophy, 
  BarChart3, 
  Flag,
  Car,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import SeasonSelector from './SeasonSelector';

// Individual Stat Card with Popup functionality
function StatCard({ title, winner, allData, season, isUpcoming }) {
  if (isUpcoming) {
    return (
      <div className="text-center p-4 bg-neutral-800/30 rounded-xl border border-neutral-700/50">
        <p className="text-neutral-400 mb-1 text-sm font-bold uppercase tracking-wider">{title}</p>
        <p className="text-neutral-500 font-bold">N/A</p>
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="text-center p-4 bg-neutral-800/50 rounded-xl border border-neutral-700/60 hover:bg-neutral-700/50 hover:border-cyan-500/50 cursor-pointer transition-all group"
        >
          <p className="text-neutral-400 mb-2 text-xs font-bold uppercase tracking-wider">{title}</p>
          <p className="text-white font-black text-lg group-hover:text-cyan-400 transition-colors">
            {winner}
          </p>
          <Eye className="w-3 h-3 text-neutral-500 group-hover:text-cyan-400 mx-auto mt-2 transition-colors" />
        </motion.div>
      </DialogTrigger>
      <DialogContent className="bg-neutral-900 border-neutral-700 backdrop-blur-xl max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-white font-black">Season {season} - {title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-custom">
          {allData.map((driver, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex justify-between items-center p-3 bg-neutral-800/50 rounded-xl hover:bg-neutral-700/50 transition-colors"
            >
              <div>
                <p className="text-white font-bold">{driver.name}</p>
                <p className="text-neutral-400 text-sm">{driver.team}</p>
              </div>
              <p className="text-cyan-400 font-black text-lg">{driver.value}</p>
            </motion.div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to check for ties and format winner display
function getWinnerDisplay(data) {
  if (!data || data.length === 0) return "Insufficient Data";
  
  const topValue = data[0].value;
  const tiedDrivers = data.filter(d => d.value === topValue);
  
  if (tiedDrivers.length > 1) {
    return `Multiple Drivers (${topValue})`;
  }
  
  return `${data[0].name} (${topValue})`;
}

// Season Overview Tab Component
function SeasonOverview({ overviewStats, season, isOverall, seasonStats, seasonInfo }) {
  const getSeasonStatus = () => {
    if (isOverall) return 'All-Time';
    const seasonNum = parseInt(season);
    if (seasonNum < 12) return 'Finished';
    if (seasonNum === 12) return 'Active';
    return 'Upcoming';
  };

  const getGameVersion = () => {
    if (seasonInfo?.gameVersion) {
      return seasonInfo.gameVersion;
    }
    if (isOverall) return 'Multiple';
    const seasonNum = parseInt(season);
    if (seasonNum <= 8) return 'F1 23';
    if (seasonNum <= 10) return 'F1 24';
    return 'F1 25';
  };

  const getCurrentLeaderLabel = () => {
    const status = getSeasonStatus();
    return status === 'Finished' ? 'Winner' : 'Current Leader';
  };

  const isUpcoming = getSeasonStatus() === 'Upcoming';
  
  const getSeasonWinner = () => {
    if (isOverall) return 'Multiple';
    if (isUpcoming) return 'TBD';
    if (seasonStats?.driverStats?.length > 0) {
      return seasonStats.driverStats[0].driver;
    }
    return 'Unknown';
  };

  // Generate stat data from real season statistics
  const generateStatData = (statName, seasonStats) => {
    if (isUpcoming || !seasonStats?.driverStats) return [];
    
    const driverStats = seasonStats.driverStats;
    
    return driverStats.map(driver => {
      let value;
      switch (statName) {
        case 'wins': value = driver.wins || 0; break;
        case 'podiums': value = driver.podiums || 0; break;
        case 'poles': value = driver.poles || 0; break;
        case 'fastestLaps': value = driver.fastest_laps || 0; break;
        case 'avgGrid': 
          value = driver.avg_grid_position != null && !isNaN(parseFloat(driver.avg_grid_position)) ? 
            parseFloat(driver.avg_grid_position).toFixed(1) : 'N/A'; 
          break;
        case 'avgFinish': 
          value = driver.avg_position != null && !isNaN(parseFloat(driver.avg_position)) ? 
            parseFloat(driver.avg_position).toFixed(1) : 'N/A'; 
          break;
        case 'dnfs': value = driver.dnfs || 0; break;
        case 'penalties': value = driver.penalties || 0; break;
        case 'dsqs': value = driver.dsqs || 0; break;
        case 'avgPoints': 
          value = driver.avg_points && typeof driver.avg_points === 'number' ? 
            parseFloat(driver.avg_points).toFixed(1) : '0.0'; 
          break;
        case 'placesGained': 
          value = driver.places_gained && typeof driver.places_gained === 'number' ? 
            (driver.places_gained >= 0 ? `+${driver.places_gained.toFixed(1)}` : driver.places_gained.toFixed(1)) : 
            '0.0'; 
          break;
        case 'overtakes': 
          value = driver.overtakes && typeof driver.overtakes === 'number' ? driver.overtakes.toFixed(1) : '0.0'; 
          break;
        case 'finishRate': 
          value = driver.finish_rate && typeof driver.finish_rate === 'number' ? 
            `${Math.round(driver.finish_rate)}%` : '0%'; 
          break;
        case 'finishStreak': value = driver.finish_streak || 0; break;
        case 'pointsStreak': value = driver.points_streak || 0; break;
        default: value = 0;
      }
      return { 
        name: driver.driver, 
        team: driver.team, 
        value 
      };
    }).sort((a, b) => {
      if (['avgGrid', 'avgFinish'].includes(statName)) {
        return parseFloat(a.value) - parseFloat(b.value);
      } else if (['dnfs', 'penalties', 'dsqs'].includes(statName)) {
        return parseFloat(b.value) - parseFloat(a.value);
      }
      return parseFloat(b.value) - parseFloat(a.value);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-4xl font-black text-white mb-2">
          {isOverall ? 'All-Time Overview' : `Season ${season} Overview`}
        </h2>
        <p className="text-neutral-400">
          {isOverall 
            ? 'Complete statistics across all MGL F1 seasons' 
            : `Complete statistics for Season ${season}`
          }
        </p>
      </motion.div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <Card className="bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="p-3 bg-cyan-500/20 rounded-full">
                  <Flag className="h-6 w-6 text-cyan-400" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-white mb-1">{getSeasonStatus()}</h3>
              <p className="text-neutral-400 text-sm uppercase tracking-wider font-bold">Status</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
          <Card className="bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="p-3 bg-green-500/20 rounded-full">
                  <Car className="h-6 w-6 text-green-400" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-white mb-1">{getGameVersion()}</h3>
              <p className="text-neutral-400 text-sm uppercase tracking-wider font-bold">Game</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
          <Card className="bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="p-3 bg-purple-500/20 rounded-full">
                  <Users className="h-6 w-6 text-purple-400" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-white mb-1">
                {isOverall ? overviewStats.totalDrivers || 45 : 20}
              </h3>
              <p className="text-neutral-400 text-sm uppercase tracking-wider font-bold">
                {isOverall ? 'Total Drivers' : 'Drivers'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
          <Card className="bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="p-3 bg-yellow-500/20 rounded-full">
                  <Trophy className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-white mb-1">{getSeasonWinner()}</h3>
              <p className="text-neutral-400 text-sm uppercase tracking-wider font-bold">{getCurrentLeaderLabel()}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* All-Time Statistics */}
      {isOverall && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <BarChart3 className="h-5 w-5 text-cyan-400" />
                <span className="font-black">All-Time Career Statistics</span>
                <span className="text-sm text-neutral-400 font-normal ml-2">
                  (Click any stat to see full rankings • Min. 20 career races required)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard 
                  title="Most Career Wins" 
                  winner={getWinnerDisplay(generateStatData('wins', seasonStats))}
                />
                <StatCard 
                  title="Most Career Podiums" 
                  winner={getWinnerDisplay(generateStatData('podiums', seasonStats))} 
                />
                <StatCard 
                  title="Most Career Fastest Laps" 
                  winner={(() => {
                    const fastestLapsData = generateStatData('fastestLaps', seasonStats);
                    return fastestLapsData.length > 0 ? `${fastestLapsData[0].name} (${fastestLapsData[0].value})` : "Insufficient Data";
                  })()} 
                  allData={generateStatData('fastestLaps', seasonStats)} 
                  season={season} 
                  isUpcoming={false} 
                />
                <StatCard 
                  title="Most Career Poles" 
                  winner={(() => {
                    const polesData = generateStatData('poles', seasonStats);
                    return polesData.length > 0 ? `${polesData[0].name} (${polesData[0].value})` : "Insufficient Data";
                  })()} 
                  allData={generateStatData('poles', seasonStats)} 
                  season={season} 
                  isUpcoming={false} 
                />
                <StatCard 
                  title="Best Career Avg Finish" 
                  winner={(() => {
                    const avgFinishData = generateStatData('avgFinish', seasonStats);
                    return avgFinishData.length > 0 ? `${avgFinishData[0].name} (${avgFinishData[0].value})` : "Insufficient Data";
                  })()} 
                  allData={generateStatData('avgFinish', seasonStats)} 
                  season={season} 
                  isUpcoming={false} 
                />
                <StatCard 
                  title="Best Career Finish Rate" 
                  winner={(() => {
                    const finishRateData = generateStatData('finishRate', seasonStats);
                    return finishRateData.length > 0 ? `${finishRateData[0].name} (${finishRateData[0].value})` : "Insufficient Data";
                  })()} 
                  allData={generateStatData('finishRate', seasonStats)} 
                  season={season} 
                  isUpcoming={false} 
                />
                <StatCard 
                  title="Max Career Finish Streak" 
                  winner={(() => {
                    const finishStreakData = generateStatData('finishStreak', seasonStats);
                    return finishStreakData.length > 0 ? `${finishStreakData[0].name} (${finishStreakData[0].value} races)` : "Insufficient Data";
                  })()} 
                  allData={generateStatData('finishStreak', seasonStats)} 
                  season={season} 
                  isUpcoming={false} 
                />
                <StatCard 
                  title="Max Career Points Streak" 
                  winner={(() => {
                    const pointsStreakData = generateStatData('pointsStreak', seasonStats);
                    return pointsStreakData.length > 0 ? `${pointsStreakData[0].name} (${pointsStreakData[0].value} races)` : "Insufficient Data";
                  })()} 
                  allData={generateStatData('pointsStreak', seasonStats)} 
                  season={season} 
                  isUpcoming={false} 
                />
                <StatCard 
                  title="Most Career DNFs" 
                  winner={(() => {
                    const dnfsData = generateStatData('dnfs', seasonStats);
                    return dnfsData.length > 0 && dnfsData[0].value > 0 ? `${dnfsData[0].name} (${dnfsData[0].value})` : "None";
                  })()} 
                  allData={generateStatData('dnfs', seasonStats)} 
                  season={season} 
                  isUpcoming={false} 
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Season Statistics */}
      {!isOverall && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <BarChart3 className="h-5 w-5 text-cyan-400" />
                <span className="font-black">Season {season} Statistics</span>
                {!isUpcoming && (
                  <span className="text-sm text-neutral-400 font-normal ml-2">
                    (Click any stat to see full rankings • Min. 5 races required)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard title="Most Wins" winner={isUpcoming ? "N/A" : getWinnerDisplay(generateStatData('wins', seasonStats))} allData={generateStatData('wins', seasonStats)} season={season} isUpcoming={isUpcoming} />
                <StatCard title="Most Podiums" winner={isUpcoming ? "N/A" : getWinnerDisplay(generateStatData('podiums', seasonStats))} allData={generateStatData('podiums', seasonStats)} season={season} isUpcoming={isUpcoming} />
                <StatCard title="Most Fastest Laps" winner={isUpcoming ? "N/A" : getWinnerDisplay(generateStatData('fastestLaps', seasonStats))} allData={generateStatData('fastestLaps', seasonStats)} season={season} isUpcoming={isUpcoming} />
                <StatCard title="Most Poles" winner={isUpcoming ? "N/A" : getWinnerDisplay(generateStatData('poles', seasonStats))} allData={generateStatData('poles', seasonStats)} season={season} isUpcoming={isUpcoming} />
                <StatCard title="Best Avg Grid Position" winner={isUpcoming ? "N/A" : getWinnerDisplay(generateStatData('avgGrid', seasonStats))} allData={generateStatData('avgGrid', seasonStats)} season={season} isUpcoming={isUpcoming} />
                <StatCard title="Best Avg Finish Position" winner={isUpcoming ? "N/A" : getWinnerDisplay(generateStatData('avgFinish', seasonStats))} allData={generateStatData('avgFinish', seasonStats)} season={season} isUpcoming={isUpcoming} />
                <StatCard title="Most DNFs" winner={isUpcoming ? "N/A" : getWinnerDisplay(generateStatData('dnfs', seasonStats))} allData={generateStatData('dnfs', seasonStats)} season={season} isUpcoming={isUpcoming} />
                <StatCard title="Most Penalties" winner={isUpcoming ? "N/A" : getWinnerDisplay(generateStatData('penalties', seasonStats))} allData={generateStatData('penalties', seasonStats)} season={season} isUpcoming={isUpcoming} />
                <StatCard title="Most DSQs" winner={isUpcoming ? "N/A" : getWinnerDisplay(generateStatData('dsqs', seasonStats))} allData={generateStatData('dsqs', seasonStats)} season={season} isUpcoming={isUpcoming} />
                <StatCard title="Best Avg Points" winner={isUpcoming ? "N/A" : getWinnerDisplay(generateStatData('avgPoints', seasonStats))} allData={generateStatData('avgPoints', seasonStats)} season={season} isUpcoming={isUpcoming} />
                <StatCard title="Most Avg Places Gained" winner={isUpcoming ? "N/A" : getWinnerDisplay(generateStatData('placesGained', seasonStats))} allData={generateStatData('placesGained', seasonStats)} season={season} isUpcoming={isUpcoming} />
                <StatCard title="Most Avg Overtakes" winner={isUpcoming ? "N/A" : getWinnerDisplay(generateStatData('overtakes', seasonStats))} allData={generateStatData('overtakes', seasonStats)} season={season} isUpcoming={isUpcoming} />
                <StatCard title="Best Finish Rate" winner={isUpcoming ? "N/A" : getWinnerDisplay(generateStatData('finishRate', seasonStats))} allData={generateStatData('finishRate', seasonStats)} season={season} isUpcoming={isUpcoming} />
                <StatCard title="Max Finish Streak" winner={isUpcoming ? "N/A" : getWinnerDisplay(generateStatData('finishStreak', seasonStats))} allData={generateStatData('finishStreak', seasonStats)} season={season} isUpcoming={isUpcoming} />
                <StatCard title="Max Points Streak" winner={isUpcoming ? "N/A" : getWinnerDisplay(generateStatData('pointsStreak', seasonStats))} allData={generateStatData('pointsStreak', seasonStats)} season={season} isUpcoming={isUpcoming} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* All-Time Overview */}
      {isOverall && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Card className="bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span className="font-black">MGL F1 Championship History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-neutral-300 mb-4 leading-relaxed">
                  Welcome to the complete MGL F1 championship statistics. This overview encompasses 
                  all seasons from the inaugural Season 1 through to the current championship.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="p-4 bg-neutral-800/50 rounded-xl">
                    <p className="text-cyan-400 font-black mb-1">Legacy Seasons (1-7)</p>
                    <p className="text-neutral-400">Historical data from standings records</p>
                  </div>
                  <div className="p-4 bg-neutral-800/50 rounded-xl">
                    <p className="text-cyan-400 font-black mb-1">Modern Seasons (8+)</p>
                    <p className="text-neutral-400">Live-calculated from race results</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

// Drivers Standings Component
function DriversStandings({ drivers, teamColors, lightTeams }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <Card className="bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left p-4 text-neutral-400 font-bold uppercase tracking-wider text-xs">Pos</th>
                  <th className="text-left p-4 text-neutral-400 font-bold uppercase tracking-wider text-xs">Driver</th>
                  <th className="text-left p-4 text-neutral-400 font-bold uppercase tracking-wider text-xs">Team(s)</th>
                  <th className="text-right p-4 text-neutral-400 font-bold uppercase tracking-wider text-xs">Points</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((driver, index) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors group"
                  >
                    <td className="p-4">
                      <span className={cn(
                        "text-2xl font-black",
                        index === 0 && "text-yellow-400",
                        index === 1 && "text-neutral-300",
                        index === 2 && "text-orange-400",
                        index > 2 && "text-neutral-600"
                      )}>
                        {driver.position.replace('P', '')}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-white font-bold group-hover:text-cyan-400 transition-colors">
                        {driver.driver}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {driver.teams.map((team, idx) => (
                          <Badge 
                            key={idx}
                            className="font-bold px-3 py-1 text-xs uppercase tracking-wider border-2"
                            style={{ 
                              backgroundColor: teamColors[team] || '#404040',
                              color: lightTeams.includes(team) ? 'black' : 'white',
                              borderColor: lightTeams.includes(team) ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'
                            }}
                          >
                            {team}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-cyan-400 font-black text-lg">
                        {driver.points || '0'}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Constructors Standings Component
function ConstructorsStandings({ constructors, teamColors, lightTeams }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <Card className="bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left p-4 text-neutral-400 font-bold uppercase tracking-wider text-xs">Pos</th>
                  <th className="text-left p-4 text-neutral-400 font-bold uppercase tracking-wider text-xs">Constructor</th>
                  <th className="text-right p-4 text-neutral-400 font-bold uppercase tracking-wider text-xs">Points</th>
                </tr>
              </thead>
              <tbody>
                {constructors.map((constructor, index) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors group"
                  >
                    <td className="p-4">
                      <span className={cn(
                        "text-2xl font-black",
                        index === 0 && "text-yellow-400",
                        index === 1 && "text-neutral-300",
                        index === 2 && "text-orange-400",
                        index > 2 && "text-neutral-600"
                      )}>
                        {constructor.position.replace('P', '')}
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge 
                        className="font-black text-sm px-4 py-2 border-2 uppercase tracking-wide"
                        style={{ 
                          backgroundColor: teamColors[constructor.constructor] || '#404040',
                          color: lightTeams.includes(constructor.constructor) ? 'black' : 'white',
                          borderColor: lightTeams.includes(constructor.constructor) ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'
                        }}
                      >
                        {constructor.constructor}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-cyan-400 font-black text-lg">
                        {constructor.points || '0'}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Main SeasonTabs Component
export default function SeasonTabs({ 
  season, 
  isOverall, 
  drivers, 
  constructors, 
  overviewStats,
  error, 
  teamColors, 
  lightTeams,
  availableSeasons = []
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [seasonStats, setSeasonStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(null);
  const [seasonInfo, setSeasonInfo] = useState(null);

  // Fetch season statistics when component mounts or season changes
  useEffect(() => {
    const fetchSeasonStats = async () => {
      setStatsLoading(true);
      setStatsError(null);
      
      try {
        const apiEndpoint = isOverall ? '/api/all-time-stats' : `/api/season-stats?season=${season}`;
        const response = await fetch(apiEndpoint);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setSeasonStats(data);
      } catch (err) {
        console.error('Error fetching season stats:', err);
        setStatsError(err.message);
      } finally {
        setStatsLoading(false);
      }
    };

    if (season || isOverall) {
      fetchSeasonStats();
    }
  }, [season, isOverall]);

  // Fetch season info for game version and other metadata
  useEffect(() => {
    const fetchSeasonInfo = async () => {
      try {
        const seasonParam = isOverall ? 'overall' : season;
        const response = await fetch(`/api/season-info?season=${seasonParam}`);
        if (response.ok) {
          const data = await response.json();
          setSeasonInfo(data);
        }
      } catch (err) {
        console.error('Error fetching season info:', err);
      }
    };

    if (season || isOverall) {
      fetchSeasonInfo();
    }
  }, [season, isOverall]);

  // Provide fallback data when there's an error
  const fallbackData = {
    drivers: drivers || [],
    constructors: constructors || [],
    overviewStats: overviewStats || {},
    availableSeasons: availableSeasons.length > 0 ? availableSeasons : ['12', '11', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1', 'overall'],
    teamColors: teamColors || {},
    lightTeams: lightTeams || []
  };

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-red-500/10 border-red-500/30 backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 text-red-400">
                <BarChart3 className="w-5 h-5" />
                <div>
                  <p className="font-bold">Database Connection Issue</p>
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Season Selector */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
        <SeasonSelector 
          currentSeason={season}
          availableSeasons={fallbackData.availableSeasons}
        />
      </motion.div>
      
      {/* Tabs */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 gap-2 bg-transparent p-1">
            <TabsTrigger 
              value="overview" 
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all",
                "bg-neutral-800/50 border border-neutral-700/50",
                "hover:bg-neutral-700/50 hover:border-neutral-600",
                "data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-teal-500",
                "data-[state=active]:text-black data-[state=active]:border-transparent",
                "data-[state=inactive]:text-neutral-400"
              )}
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger 
              value="drivers" 
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all",
                "bg-neutral-800/50 border border-neutral-700/50",
                "hover:bg-neutral-700/50 hover:border-neutral-600",
                "data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-teal-500",
                "data-[state=active]:text-black data-[state=active]:border-transparent",
                "data-[state=inactive]:text-neutral-400"
              )}
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Drivers</span>
            </TabsTrigger>
            <TabsTrigger 
              value="constructors" 
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all",
                "bg-neutral-800/50 border border-neutral-700/50",
                "hover:bg-neutral-700/50 hover:border-neutral-600",
                "data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-teal-500",
                "data-[state=active]:text-black data-[state=active]:border-transparent",
                "data-[state=inactive]:text-neutral-400"
              )}
            >
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Teams</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="overview" className="mt-0">
              <SeasonOverview 
                overviewStats={fallbackData.overviewStats}
                season={season}
                isOverall={isOverall}
                seasonStats={seasonStats}
                seasonInfo={seasonInfo}
              />
            </TabsContent>

            <TabsContent value="drivers" className="mt-0">
              <DriversStandings 
                drivers={fallbackData.drivers}
                teamColors={fallbackData.teamColors}
                lightTeams={fallbackData.lightTeams}
              />
            </TabsContent>

            <TabsContent value="constructors" className="mt-0">
              <ConstructorsStandings 
                constructors={fallbackData.constructors}
                teamColors={fallbackData.teamColors}
                lightTeams={fallbackData.lightTeams}
              />
            </TabsContent>
          </div>
        </Tabs>
      </motion.div>
    </div>
  );
}