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
        <h1 className="text-4xl font-black text-white tracking-tight">Telemetry Dashboard</h1>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Season Selector */}
          <Select 
            value={selectedSeason} 
            onValueChange={(value) => handleSeasonChange({ target: { value } })}
          >
            <SelectTrigger className="w-[180px] bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50 text-white rounded-2xl">
              <SelectValue placeholder="Select Season" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-900 border-neutral-700/50 rounded-2xl">
              {seasons.map((season) => (
                <SelectItem 
                  key={season} 
                  value={season} 
                  className="hover:bg-neutral-800 text-white focus:bg-neutral-800 focus:text-white"
                >
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
            <SelectTrigger className="w-[200px] bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50 text-white rounded-2xl">
              <SelectValue placeholder="Select Race" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-900 border-neutral-700/50 rounded-2xl">
              {races.map((race) => (
                <SelectItem 
                  key={race.slug} 
                  value={race.slug} 
                  className="hover:bg-neutral-800 text-white focus:bg-neutral-800 focus:text-white"
                >
                  {race.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Analysis Type Tabs */}
      <Tabs value={analysisType} onValueChange={(value) => handleAnalysisTypeChange({ target: { value } }, value)} className="w-full">
        <TabsList className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-700/50 rounded-2xl p-1 h-auto flex-wrap">
          
          <TabsTrigger 
            value="general-stats" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-teal-500 data-[state=active]:text-black font-bold rounded-xl flex items-center gap-2"
          >
            <Gauge size={16} />
            General Stats
          </TabsTrigger>
          
          <TabsTrigger 
            value="lap-analysis" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-teal-500 data-[state=active]:text-black font-bold rounded-xl flex items-center gap-2"
          >
            <Clock size={16} />
            Lap Analysis
          </TabsTrigger>
          
          <TabsTrigger 
            value="damage" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-teal-500 data-[state=active]:text-black font-bold rounded-xl flex items-center gap-2"
          >
            <Activity size={16} />
            Damage
          </TabsTrigger>          
          
          <TabsTrigger 
            value="tyre-wear" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-teal-500 data-[state=active]:text-black font-bold rounded-xl flex items-center gap-2"
          >
            <Droplets size={16} />
            Tyre Wear
          </TabsTrigger>
          
          <TabsTrigger 
            value="track-dominance" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-teal-500 data-[state=active]:text-black font-bold rounded-xl flex items-center gap-2"
          >
            <LineChart size={16} />
            Track Dominance
          </TabsTrigger>
          
          <TabsTrigger 
            value="team-pace" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-teal-500 data-[state=active]:text-black font-bold rounded-xl flex items-center gap-2"
          >
            <BarChart2 size={16} />
            Team Pace
          </TabsTrigger>


        </TabsList>
      </Tabs>
    </div>
  );
}