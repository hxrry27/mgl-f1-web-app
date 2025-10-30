"use client";

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function SeasonSelector({ currentSeason, availableSeasons = [] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChanging, setIsChanging] = useState(false);

  // Get current tab from pathname
  const getCurrentTab = () => {
    const segments = pathname.split('/');
    if (segments.length <= 3) {
      return 'overview';
    }
    return segments[3] || 'overview';
  };

  const handleSeasonChange = async (newSeason) => {
    if (newSeason === currentSeason) return;
    
    setIsChanging(true);
    const currentTab = getCurrentTab();
    
    // Navigate to the same tab in the new season
    const newPath = `/seasons/${newSeason}${currentTab !== 'overview' ? `/${currentTab}` : ''}`;
    router.push(newPath);
    
    // Reset loading state after navigation
    setTimeout(() => setIsChanging(false), 300);
  };

  const navigateToSeason = (direction) => {
    const currentIndex = availableSeasons.indexOf(currentSeason);
    let newIndex;
    
    if (direction === 'next') {
      newIndex = Math.min(currentIndex + 1, availableSeasons.length - 1);
    } else {
      newIndex = Math.max(currentIndex - 1, 0);
    }
    
    if (newIndex !== currentIndex) {
      handleSeasonChange(availableSeasons[newIndex]);
    }
  };

  const canGoBack = availableSeasons.indexOf(currentSeason) > 0;
  const canGoForward = availableSeasons.indexOf(currentSeason) < availableSeasons.length - 1;

  return (
    <div className="flex items-center gap-3 p-4 bg-neutral-900/60 backdrop-blur-xl border border-neutral-700/50 rounded-2xl">
      {/* Label */}
      <div className="flex items-center gap-2 text-neutral-400">
        <Calendar className="w-4 h-4" />
        <span className="text-sm font-bold uppercase tracking-wider">Season</span>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Previous Season Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateToSeason('prev')}
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

        {/* Season Selector Dropdown */}
        <Select
          value={currentSeason}
          onValueChange={handleSeasonChange}
          disabled={isChanging}
        >
          <SelectTrigger className={cn(
            "w-40 h-10 bg-neutral-800/80 border-neutral-700 rounded-xl",
            "text-white font-black text-center",
            "hover:bg-neutral-700 hover:border-cyan-500/50 transition-all",
            isChanging && "opacity-50 cursor-wait"
          )}>
            <SelectValue>
              {currentSeason === 'overall' ? (
                <span className="flex items-center justify-center gap-2">
                  <span>🏆</span>
                  <span>All-Time</span>
                </span>
              ) : (
                <span>Season {currentSeason}</span>
              )}
            </SelectValue>
          </SelectTrigger>
          
          <SelectContent className="bg-neutral-900 border-neutral-700 backdrop-blur-xl rounded-xl">
            <SelectItem 
              value="overall" 
              className="text-white font-bold hover:bg-neutral-800 focus:bg-neutral-800 rounded-lg cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span>🏆</span>
                <span>All-Time</span>
              </span>
            </SelectItem>
            
            {availableSeasons
              .filter(season => season !== 'overall')
              .sort((a, b) => parseInt(b) - parseInt(a))
              .map((season) => (
                <SelectItem 
                  key={season} 
                  value={season} 
                  className="text-white font-medium hover:bg-neutral-800 focus:bg-neutral-800 rounded-lg cursor-pointer"
                >
                  Season {season}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {/* Next Season Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateToSeason('next')}
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
      
      {/* Loading Indicator */}
      {isChanging && (
        <div className="flex items-center gap-2 text-xs text-neutral-500 animate-pulse ml-2">
          <div className="h-2 w-2 bg-cyan-400 rounded-full animate-ping" />
          <span className="font-medium">Loading...</span>
        </div>
      )}
    </div>
  );
}