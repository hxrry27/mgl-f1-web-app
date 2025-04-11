'use client';

import React from 'react';
import {
  BarChart2,
  Clock,
  Gauge,
  Droplets,
  Activity,
  LineChart,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function DashboardHeader({
  seasons,
  selectedSeason,
  races,
  selectedRace,
  analysisType,
  handleSeasonChange,
  handleRaceChange,
  handleAnalysisTypeChange,
}) {
  return (
    <div className="mb-6">
      {/* Season & Race Selectors */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">F1 Telemetry Dashboard</h1>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Season Selector */}
          <Select 
            value={selectedSeason} 
            onValueChange={(value) => handleSeasonChange({ target: { value } })}
          >
            <SelectTrigger className="w-[180px] bg-gray-800/70 border-gray-700">
              <SelectValue placeholder="Select Season" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              {seasons.map((season) => (
                <SelectItem key={season} value={season} className="hover:bg-gray-800">
                  Season {season}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Race Selector */}
          <Select 
            value={selectedRace} 
            onValueChange={(value) => handleRaceChange({ target: { value } })}
            disabled={!selectedSeason}
          >
            <SelectTrigger className="w-[180px] bg-gray-800/70 border-gray-700">
              <SelectValue placeholder="Select Race" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              {races.map((race) => (
                <SelectItem key={race.slug} value={race.slug} className="hover:bg-gray-800">
                  {race.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Analysis Type Tabs */}
      <div className="bg-gray-900/50 rounded-lg p-1 border border-gray-800 backdrop-blur-sm">
        <Tabs 
          value={analysisType} 
          onValueChange={(value) => handleAnalysisTypeChange({ target: { value } }, value)}
          className="w-full"
        >
          <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-1 bg-transparent h-auto w-full">
            <TabsTrigger 
              value="general-stats" 
              className={cn(
                "flex items-center gap-2 py-2 px-3 rounded-md data-[state=active]:bg-blue-600 data-[state=active]:text-white",
                "hover:bg-gray-800 transition-colors"
              )}
            >
              <BarChart2 className="h-4 w-4" />
              <span className="hidden md:inline">General Stats</span>
              <span className="inline md:hidden">Stats</span>
            </TabsTrigger>
            <TabsTrigger 
              value="race-time" 
              className={cn(
                "flex items-center gap-2 py-2 px-3 rounded-md data-[state=active]:bg-blue-600 data-[state=active]:text-white",
                "hover:bg-gray-800 transition-colors"
              )}
            >
              <Clock className="h-4 w-4" />
              <span className="hidden md:inline">Race Time</span>
              <span className="inline md:hidden">Time</span>
            </TabsTrigger>
            <TabsTrigger 
              value="tyre-wear" 
              className={cn(
                "flex items-center gap-2 py-2 px-3 rounded-md data-[state=active]:bg-blue-600 data-[state=active]:text-white",
                "hover:bg-gray-800 transition-colors"
              )}
            >
              <Droplets className="h-4 w-4" />
              <span className="hidden md:inline">Tyre Wear</span>
              <span className="inline md:hidden">Tyres</span>
            </TabsTrigger>
            <TabsTrigger 
              value="damage" 
              className={cn(
                "flex items-center gap-2 py-2 px-3 rounded-md data-[state=active]:bg-blue-600 data-[state=active]:text-white",
                "hover:bg-gray-800 transition-colors"
              )}
            >
              <Activity className="h-4 w-4" />
              <span>Damage</span>
            </TabsTrigger>
            <TabsTrigger 
              value="individual-lap" 
              className={cn(
                "flex items-center gap-2 py-2 px-3 rounded-md data-[state=active]:bg-blue-600 data-[state=active]:text-white",
                "hover:bg-gray-800 transition-colors"
              )}
            >
              <LineChart className="h-4 w-4" />
              <span className="hidden md:inline">Individual Lap</span>
              <span className="inline md:hidden">Lap</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}