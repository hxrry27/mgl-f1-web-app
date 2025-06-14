"use client";

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, UsersRound } from 'lucide-react';
import { cn } from "@/lib/utils";
import { teams } from '@/lib/data';

// Function to normalize team names for URLs
const normalizeTeamName = (name) => {
  return name.toLowerCase().replace(/\s+/g, '-');
};

// Function to get team name from URL
const getTeamFromUrl = (name) => {
  return teams.find(team => normalizeTeamName(team) === name) || name;
};

export default function TeamSelector({ currentTeam }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChanging, setIsChanging] = useState(false);

  const handleTeamChange = async (newTeamUrl) => {
    const newTeamName = getTeamFromUrl(newTeamUrl);
    const currentTeamName = getTeamFromUrl(currentTeam);
    
    if (newTeamName === currentTeamName) return;
    
    setIsChanging(true);
    const newPath = `/teams/${newTeamUrl}`;
    router.push(newPath);
    
    // Reset loading state after navigation
    setTimeout(() => setIsChanging(false), 300);
  };

  const navigateToTeam = (direction) => {
    const normalizedTeams = teams.map(normalizeTeamName);
    const currentIndex = normalizedTeams.indexOf(currentTeam);
    let newIndex;
    
    if (direction === 'next') {
      newIndex = Math.min(currentIndex + 1, teams.length - 1);
    } else {
      newIndex = Math.max(currentIndex - 1, 0);
    }
    
    if (newIndex !== currentIndex) {
      handleTeamChange(normalizedTeams[newIndex]);
    }
  };

  const canGoBack = teams.map(normalizeTeamName).indexOf(currentTeam) > 0;
  const canGoForward = teams.map(normalizeTeamName).indexOf(currentTeam) < teams.length - 1;

  return (
    <div className="flex items-center gap-3 p-4 bg-gray-900/50 border border-gray-700/60 rounded-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 text-gray-400">
        <UsersRound className="w-4 h-4" />
        <span className="text-sm font-medium">Team</span>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Previous Team Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateToTeam('prev')}
          disabled={!canGoBack || isChanging}
          className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Team Selector */}
        <Select
          value={currentTeam}
          onValueChange={handleTeamChange}
          disabled={isChanging}
        >
          <SelectTrigger className={cn(
            "w-48 h-8 bg-gray-800/60 border-gray-600 text-white text-center font-semibold",
            isChanging && "opacity-50"
          )}>
            <SelectValue>
              {getTeamFromUrl(currentTeam)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            {teams.map((team) => (
              <SelectItem key={team} value={normalizeTeamName(team)} className="text-white">
                {team}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Next Team Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateToTeam('next')}
          disabled={!canGoForward || isChanging}
          className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      
      {isChanging && (
        <div className="text-xs text-gray-400 animate-pulse">
          Loading...
        </div>
      )}
    </div>
  );
}