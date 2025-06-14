"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  Building2, 
  Trophy, 
  BarChart3, 
  Calendar,
  Flag,
  Car,
  Medal,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import SeasonSelector from './SeasonSelector';

// Individual Stat Card with Popup functionality
function StatCard({ title, winner, allData, season, isUpcoming }) {
  if (isUpcoming) {
    return (
      <div className="text-center p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
        <p className="text-gray-400 mb-1 text-sm">{title}</p>
        <p className="text-gray-500 font-semibold">N/A</p>
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="text-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/60 hover:bg-gray-700/50 cursor-pointer transition-colors group">
          <p className="text-gray-400 mb-1 text-sm">{title}</p>
          <p className="text-white font-semibold group-hover:text-blue-400 transition-colors">
            {winner}
          </p>
          <Eye className="w-3 h-3 text-gray-500 group-hover:text-blue-400 mx-auto mt-1 transition-colors" />
        </div>
      </DialogTrigger>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Season {season} - {title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {allData.map((driver, index) => (
            <div key={index} className="flex justify-between items-center p-2 bg-gray-800/50 rounded">
              <div>
                <p className="text-white font-medium">{driver.name}</p>
                <p className="text-gray-400 text-sm">{driver.team}</p>
              </div>
              <p className="text-blue-400 font-bold">{driver.value}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Season Overview Tab Component
function SeasonOverview({ overviewStats, season, isOverall }) {
  const getSeasonStatus = () => {
    if (isOverall) return 'All-Time';
    const seasonNum = parseInt(season);
    if (seasonNum < 11) return 'Finished';
    if (seasonNum === 11) return 'Active';
    return 'Upcoming';
  };

  const getGameVersion = () => {
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

  // Mock data for the stat cards - this would come from the new season stats API
  const generateMockStatData = (statName) => {
    if (isUpcoming) return [];
    
    const drivers = [
      { name: 'Harry Davies', team: 'McLaren' },
      { name: 'Max Wilson', team: 'Red Bull' },
      { name: 'Jake Thompson', team: 'Ferrari' },
      { name: 'Sarah Miller', team: 'Mercedes' },
      { name: 'Tom Wilson', team: 'Aston Martin' },
      { name: 'Mike Johnson', team: 'Alpine' },
      { name: 'Alex Brown', team: 'Williams' },
      { name: 'Chris Davis', team: 'Haas' },
      { name: 'Emma Clark', team: 'Sauber' },
      { name: 'Ryan Taylor', team: 'RB' }
    ];

    // Generate realistic values based on stat type
    return drivers.map((driver, index) => {
      let value;
      switch (statName) {
        case 'wins': value = Math.max(0, 5 - index); break;
        case 'podiums': value = Math.max(0, 8 - index); break;
        case 'poles': value = Math.max(0, 6 - index); break;
        case 'fastestLaps': value = Math.max(0, 4 - Math.floor(index/2)); break;
        case 'avgGrid': value = (3.2 + index * 1.1).toFixed(1); break;
        case 'avgFinish': value = (4.1 + index * 1.3).toFixed(1); break;
        case 'dnfs': value = Math.min(5, Math.floor(index/2)); break;
        case 'penalties': value = Math.min(10, index + 2); break;
        case 'dsqs': value = Math.min(3, Math.floor(index/3)); break;
        case 'avgPoints': value = (25 - index * 2.5).toFixed(1); break;
        case 'placesGained': value = `+${(2.8 - index * 0.3).toFixed(1)}`; break;
        case 'overtakes': value = (4.2 - index * 0.4).toFixed(1); break;
        case 'finishRate': value = `${Math.max(60, 92 - index * 3)}%`; break;
        case 'finishStreak': value = Math.max(1, 8 - index); break;
        case 'pointsStreak': value = Math.max(1, 7 - index); break;
        default: value = index + 1;
      }
      return { ...driver, value };
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">
          {isOverall ? 'All-Time Overview' : `Season ${season} Overview`}
        </h2>
        <p className="text-gray-400">
          {isOverall 
            ? 'Complete statistics across all MGL F1 seasons' 
            : `Complete statistics for Season ${season}`
          }
        </p>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center mb-3">
              <div className="p-3 bg-blue-500/20 rounded-full">
                <Flag className="h-6 w-6 text-blue-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">
              {getSeasonStatus()}
            </h3>
            <p className="text-gray-400 text-sm">Status</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center mb-3">
              <div className="p-3 bg-green-500/20 rounded-full">
                <Car className="h-6 w-6 text-green-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">
              {getGameVersion()}
            </h3>
            <p className="text-gray-400 text-sm">Game</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center mb-3">
              <div className="p-3 bg-purple-500/20 rounded-full">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">
              {isOverall ? overviewStats.totalDrivers || 45 : 20}
            </h3>
            <p className="text-gray-400 text-sm">
              {isOverall ? 'Total Drivers' : 'Drivers This Season'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center mb-3">
              <div className="p-3 bg-yellow-500/20 rounded-full">
                <Trophy className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">
              {isOverall ? 'Multiple' : isUpcoming ? 'TBD' : 'Harry Davies'}
            </h3>
            <p className="text-gray-400 text-sm">{getCurrentLeaderLabel()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Season Statistics */}
      {!isOverall && (
        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Season {season} Statistics
              {!isUpcoming && (
                <span className="text-sm text-gray-400 font-normal ml-2">
                  (Click any stat to see full rankings)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard 
                title="Most Wins" 
                winner={isUpcoming ? "N/A" : "Harry Davies (5)"} 
                allData={generateMockStatData('wins')} 
                season={season} 
                isUpcoming={isUpcoming} 
              />
              <StatCard 
                title="Most Podiums" 
                winner={isUpcoming ? "N/A" : "Harry Davies (8)"} 
                allData={generateMockStatData('podiums')} 
                season={season} 
                isUpcoming={isUpcoming} 
              />
              <StatCard 
                title="Most Fastest Laps" 
                winner={isUpcoming ? "N/A" : "Max Wilson (4)"} 
                allData={generateMockStatData('fastestLaps')} 
                season={season} 
                isUpcoming={isUpcoming} 
              />
              <StatCard 
                title="Most Poles" 
                winner={isUpcoming ? "N/A" : "Harry Davies (6)"} 
                allData={generateMockStatData('poles')} 
                season={season} 
                isUpcoming={isUpcoming} 
              />
              <StatCard 
                title="Best Avg Grid Position" 
                winner={isUpcoming ? "N/A" : "Harry Davies (3.2)"} 
                allData={generateMockStatData('avgGrid')} 
                season={season} 
                isUpcoming={isUpcoming} 
              />
              <StatCard 
                title="Best Avg Finish Position" 
                winner={isUpcoming ? "N/A" : "Harry Davies (4.1)"} 
                allData={generateMockStatData('avgFinish')} 
                season={season} 
                isUpcoming={isUpcoming} 
              />
              <StatCard 
                title="Most DNFs" 
                winner={isUpcoming ? "N/A" : "Jake Thompson (3)"} 
                allData={generateMockStatData('dnfs')} 
                season={season} 
                isUpcoming={isUpcoming} 
              />
              <StatCard 
                title="Most Penalties" 
                winner={isUpcoming ? "N/A" : "Mike Johnson (7)"} 
                allData={generateMockStatData('penalties')} 
                season={season} 
                isUpcoming={isUpcoming} 
              />
              <StatCard 
                title="Most DSQs" 
                winner={isUpcoming ? "N/A" : "Alex Brown (2)"} 
                allData={generateMockStatData('dsqs')} 
                season={season} 
                isUpcoming={isUpcoming} 
              />
              <StatCard 
                title="Best Avg Points" 
                winner={isUpcoming ? "N/A" : "Harry Davies (12.4)"} 
                allData={generateMockStatData('avgPoints')} 
                season={season} 
                isUpcoming={isUpcoming} 
              />
              <StatCard 
                title="Most Avg Places Gained" 
                winner={isUpcoming ? "N/A" : "Sarah Miller (+2.8)"} 
                allData={generateMockStatData('placesGained')} 
                season={season} 
                isUpcoming={isUpcoming} 
              />
              <StatCard 
                title="Most Avg Overtakes" 
                winner={isUpcoming ? "N/A" : "Tom Wilson (4.2)"} 
                allData={generateMockStatData('overtakes')} 
                season={season} 
                isUpcoming={isUpcoming} 
              />
              <StatCard 
                title="Best Finish Rate" 
                winner={isUpcoming ? "N/A" : "Harry Davies (92%)"} 
                allData={generateMockStatData('finishRate')} 
                season={season} 
                isUpcoming={isUpcoming} 
              />
              <StatCard 
                title="Max Finish Streak" 
                winner={isUpcoming ? "N/A" : "Harry Davies (8 races)"} 
                allData={generateMockStatData('finishStreak')} 
                season={season} 
                isUpcoming={isUpcoming} 
              />
              <StatCard 
                title="Max Points Streak" 
                winner={isUpcoming ? "N/A" : "Harry Davies (7 races)"} 
                allData={generateMockStatData('pointsStreak')} 
                season={season} 
                isUpcoming={isUpcoming} 
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* All-Time Overview */}
      {isOverall && (
        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Trophy className="h-5 w-5 text-yellow-500" />
              MGL F1 Championship History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-gray-300 mb-4">
                Welcome to the complete MGL F1 championship statistics. This overview encompasses 
                all seasons from the inaugural Season 1 through to the current championship.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
                <div>
                  <p><strong className="text-white">Legacy Seasons (1-7):</strong> Historical data from standings records</p>
                </div>
                <div>
                  <p><strong className="text-white">Modern Seasons (8+):</strong> Live-calculated from race results</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Drivers Standings Tab Component  
function DriversStandings({ drivers, teamColors, lightTeams }) {
  return (
    <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-white w-24">Position</TableHead>
                <TableHead className="text-white w-44">Driver</TableHead>
                <TableHead className="text-white">Team(s)</TableHead>
                <TableHead className="text-white w-24 text-right">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((driver, index) => (
                <TableRow key={index} className="hover:bg-gray-800/50 border-gray-800">
                  <TableCell className="text-white font-medium">{driver.position}</TableCell>
                  <TableCell className="text-white">{driver.driver}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {driver.teams.map((team, idx) => (
                        <Badge 
                          key={idx}
                          className="font-medium"
                          style={{ 
                            backgroundColor: teamColors[team] || '#444',
                            color: lightTeams.includes(team) ? 'black' : 'white'
                          }}
                        >
                          {team}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-white text-right font-semibold">{driver.points || '0'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// Constructors Standings Tab Component
function ConstructorsStandings({ constructors, teamColors, lightTeams }) {
  return (
    <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-white w-24">Position</TableHead>
                <TableHead className="text-white">Constructor</TableHead>
                <TableHead className="text-white w-24 text-right">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {constructors.map((constructor, index) => (
                <TableRow key={index} className="hover:bg-gray-800/50 border-gray-800">
                  <TableCell className="text-white font-medium">
                    {constructor.position}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className="font-medium"
                      style={{ 
                        backgroundColor: teamColors[constructor.constructor] || '#444',
                        color: lightTeams.includes(constructor.constructor) ? 'black' : 'white',
                      }}
                    >
                      {constructor.constructor}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-white text-right font-semibold">
                    {constructor.points || '0'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

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

  // Provide fallback data when there's an error
  const fallbackData = {
    drivers: drivers || [
      { position: 'P1', driver: 'Test Driver 1', teams: ['McLaren'], points: 150 },
      { position: 'P2', driver: 'Test Driver 2', teams: ['Red Bull'], points: 120 },
      { position: 'P3', driver: 'Test Driver 3', teams: ['Ferrari'], points: 100 },
    ],
    constructors: constructors || [
      { position: 'P1', constructor: 'McLaren', points: 200 },
      { position: 'P2', constructor: 'Red Bull', points: 180 },
      { position: 'P3', constructor: 'Ferrari', points: 150 },
    ],
    overviewStats: overviewStats || {
      totalRaces: 12,
      totalDrivers: 20,
      totalTeams: 10,
      totalSeasons: 11
    },
    availableSeasons: availableSeasons.length > 0 ? availableSeasons : ['11', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1'],
    teamColors: teamColors || {
      'McLaren': '#ff8700',
      'Red Bull': '#0600ef',
      'Ferrari': '#dc143c'
    },
    lightTeams: lightTeams || []
  };

  return (
    <div className="mb-6">
      {/* Error Banner */}
      {error && (
        <Card className="bg-red-900/30 border border-red-700/60 backdrop-blur-sm mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-red-400">
              <BarChart3 className="w-5 h-5" />
              <div>
                <p className="font-semibold">Database Connection Issue</p>
                <p className="text-sm text-red-300">Showing test data - {error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Season Selector */}
      <div className="flex justify-end mb-6">
        <SeasonSelector 
          currentSeason={season}
          availableSeasons={fallbackData.availableSeasons}
        />
      </div>
      
      {/* Season Analysis Tabs */}
      <div className="bg-gray-900/50 rounded-lg p-1 border border-gray-800 backdrop-blur-sm">
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 gap-1 bg-transparent h-auto w-full">
            <TabsTrigger 
              value="overview" 
              className={cn(
                "flex items-center gap-2 py-2 px-3 rounded-md data-[state=active]:bg-blue-600 data-[state=active]:text-white",
                "hover:bg-gray-800 transition-colors"
              )}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger 
              value="drivers" 
              className={cn(
                "flex items-center gap-2 py-2 px-3 rounded-md data-[state=active]:bg-blue-600 data-[state=active]:text-white",
                "hover:bg-gray-800 transition-colors"
              )}
            >
              <Users className="h-4 w-4" />
              <span>Driver Standings</span>
            </TabsTrigger>
            <TabsTrigger 
              value="constructors" 
              className={cn(
                "flex items-center gap-2 py-2 px-3 rounded-md data-[state=active]:bg-blue-600 data-[state=active]:text-white",
                "hover:bg-gray-800 transition-colors"
              )}
            >
              <Building2 className="h-4 w-4" />
              <span>Constructor Standings</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsContent value="overview" className="mt-0">
            <SeasonOverview 
              overviewStats={fallbackData.overviewStats}
              season={season}
              isOverall={isOverall}
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
        </Tabs>
      </div>
    </div>
  );
}