"use client";

import { useState } from 'react';
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Badge 
} from "@/components/ui/badge";
import { 
  Users, 
  Building2 
} from "lucide-react";

export default function StandingsTabs({ season, isOverall, drivers, constructors, error, teamColors, lightTeams }) {
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
                          <TableHead className="text-white w-64">Driver</TableHead>
                          <TableHead className="text-white">Team(s)</TableHead>
                          <TableHead className="text-white w-24 text-right">Points</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {drivers.map((driver, index) => (
                          <TableRow key={index} className="hover:bg-gray-800/50 border-gray-800">
                            <TableCell className="text-white font-medium">
                              {driver.position}
                            </TableCell>
                            <TableCell className="text-white">
                              {driver.driver}
                            </TableCell>
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
                            <TableCell className="text-white text-right font-semibold">
                              {driver.points || '0'}
                            </TableCell>
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