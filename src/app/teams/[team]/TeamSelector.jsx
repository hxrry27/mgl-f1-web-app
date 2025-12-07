"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, UsersRound } from 'lucide-react';
import { cn } from "@/lib/utils";
import { teams } from '@/lib/data';

const normalizeTeamName = (name) => {
  return name.toLowerCase().replace(/\s+/g, '-');
};

const getTeamFromUrl = (name) => {
  return teams.find(team => normalizeTeamName(team) === name) || name;
};

export default function TeamSelector({ currentTeam }) {
  const router = useRouter();
  const [isChanging, setIsChanging] = useState(false);

  const handleTeamChange = async (newTeamUrl) => {
    const newTeamName = getTeamFromUrl(newTeamUrl);
    const currentTeamName = getTeamFromUrl(currentTeam);
    
    if (newTeamName === currentTeamName) return;
    
    setIsChanging(true);
    router.push(`/teams/${newTeamUrl}`);
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
    <div className="flex items-center gap-3 p-4 bg-neutral-900/60 backdrop-blur-xl border border-neutral-700/50 rounded-2xl">
      <div className="flex items-center gap-2 text-neutral-400">
        <UsersRound className="w-4 h-4" />
        <span className="text-sm font-bold uppercase tracking-wider">Team</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateToTeam('prev')}
          disabled={!canGoBack || isChanging}
          className={cn(
            "h-10 w-10 p-0 rounded-xl transition-all",
            "bg-neutral-800/80 hover:bg-neutral-700 hover:scale-110",
            "text-neutral-400 hover:text-cyan-400",
            "disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-neutral-800/80"
          )}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <Select
          value={currentTeam}
          onValueChange={handleTeamChange}
          disabled={isChanging}
        >
          <SelectTrigger className={cn(
            "w-48 h-10 bg-neutral-800/80 border-neutral-700 rounded-xl",
            "text-white font-black text-center",
            "hover:bg-neutral-700 hover:border-cyan-500/50 transition-all",
            isChanging && "opacity-50 cursor-wait"
          )}>
            <SelectValue>
              {getTeamFromUrl(currentTeam)}
            </SelectValue>
          </SelectTrigger>
          
          <SelectContent className="bg-neutral-900 border-neutral-700 backdrop-blur-xl rounded-xl">
            {teams.map((team) => (
              <SelectItem 
                key={team} 
                value={normalizeTeamName(team)}
                className="text-white font-medium hover:bg-neutral-800 focus:bg-neutral-800 rounded-lg cursor-pointer"
              >
                {team}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateToTeam('next')}
          disabled={!canGoForward || isChanging}
          className={cn(
            "h-10 w-10 p-0 rounded-xl transition-all",
            "bg-neutral-800/80 hover:bg-neutral-700 hover:scale-110",
            "text-neutral-400 hover:text-cyan-400",
            "disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-neutral-800/80"
          )}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
      
      {isChanging && (
        <div className="flex items-center gap-2 text-xs text-neutral-500 animate-pulse ml-2">
          <div className="h-2 w-2 bg-cyan-400 rounded-full animate-ping" />
          <span className="font-medium">Loading...</span>
        </div>
      )}
    </div>
  );
}