"use client";

import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, Trophy } from "lucide-react";

// Championship Odds Component (prominent styling)
function ChampionshipOdds({ odds }) {
  if (!odds || odds === 0) {
    return <span className="text-gray-500 text-sm font-medium">0%</span>;
  }

  const getOddsColor = (odds) => {
    if (odds >= 60) return 'text-green-400 font-bold text-lg';
    if (odds >= 40) return 'text-blue-400 font-semibold text-base';
    if (odds >= 25) return 'text-yellow-400 font-medium text-base';
    if (odds >= 10) return 'text-orange-400 font-medium text-sm';
    if (odds >= 3) return 'text-red-400 text-sm';
    return 'text-gray-400 text-xs';
  };

  return (
    <span className={getOddsColor(odds)}>
      {odds}%
    </span>
  );
}

// Points Gap Display
function PointsGapDisplay({ gap, isLeader }) {
  if (isLeader) {
    return <span className="text-green-400 font-semibold">Leader</span>;
  }
  return <span className="text-gray-300 font-medium">-{gap}</span>;
}

// Championship Summary Component
function ChampionshipSummary({ drivers, remainingRaces }) {
  if (!drivers?.length || remainingRaces === 0) return null;

  const contenders = drivers.filter(d => d.championshipStatus?.canMathematicallyWin);
  const eliminated = drivers.length - contenders.length;
  const maxPointsRemaining = remainingRaces * 26;

  return (
    <div className="bg-gray-900/70 border border-gray-700/80 rounded-lg p-4 mb-6">
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <Trophy className="w-5 h-5" />
        Championship Battle
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-gray-400">Races Remaining</p>
          <p className="text-xl font-semibold text-white">{remainingRaces}</p>
        </div>
        <div>
          <p className="text-gray-400">Drivers Still In Contention</p>
          <p className="text-xl font-semibold text-green-400">{contenders.length}</p>
        </div>
        <div>
          <p className="text-gray-400">Mathematically Eliminated</p>
          <p className="text-xl font-semibold text-red-400">{eliminated}</p>
        </div>
        <div>
          <p className="text-gray-400">Max Points Available</p>
          <p className="text-xl font-semibold text-white">{maxPointsRemaining}</p>
        </div>
      </div>
    </div>
  );
}

export default function StandingsTabs({ 
  season, 
  isOverall, 
  drivers, 
  constructors, 
  error, 
  teamColors, 
  lightTeams, 
  remainingRaces = 0, 
  showChampionshipData = false 
}) {
  const [activeTab, setActiveTab] = useState("drivers");

  return (
    <div className="container mx-auto px-4 max-w-5xl">
      <h1 className="text-3xl font-bold text-white text-center mb-6">
        {isOverall ? 'Overall Standings' : `Season ${season} Standings`}
      </h1>

      <Tabs
        defaultValue="drivers"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 bg-gray-800/60 border border-gray-700/60 mb-6">
          <TabsTrigger 
            value="drivers" 
            className="flex items-center gap-2 data-[state=active]:bg-gray-700"
          >
            <Users className="h-4 w-4" />
            Drivers
          </TabsTrigger>
          <TabsTrigger 
            value="constructors" 
            className="flex items-center gap-2 data-[state=active]:bg-gray-700"
          >
            <Building2 className="h-4 w-4" />
            Constructors
          </TabsTrigger>
        </TabsList>

        {/* Championship Summary */}
        {showChampionshipData && (
          <ChampionshipSummary 
            drivers={drivers} 
            remainingRaces={remainingRaces} 
          />
        )}

        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-0">
            {error ? (
              <div className="p-4 text-center text-red-400">{error}</div>
            ) : (
              <>
                <TabsContent value="drivers" className="mt-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-white w-24">Position</TableHead>
                          <TableHead className="text-white w-44">Driver</TableHead>
                          <TableHead className="text-white">Team(s)</TableHead>
                          <TableHead className="text-white w-24 text-right">Points</TableHead>
                          {showChampionshipData && (
                            <>
                              <TableHead className="text-white w-24 text-center">Gap</TableHead>
                              <TableHead className="text-white w-32 text-center">
                                Championship Odds
                              </TableHead>
                            </>
                          )}
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
                            {showChampionshipData && driver.championshipStatus && (
                              <>
                                <TableCell className="text-center">
                                  <PointsGapDisplay 
                                    gap={driver.championshipStatus.pointsGap} 
                                    isLeader={driver.championshipStatus.pointsGap === 0}
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <ChampionshipOdds 
                                    odds={driver.championshipStatus.championshipOdds}
                                  />
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="constructors" className="mt-0">
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
                </TabsContent>
              </>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}