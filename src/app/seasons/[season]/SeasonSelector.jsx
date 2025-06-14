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
    // Expected paths: /seasons/11 or /seasons/11/drivers or /seasons/11/constructors
    if (segments.length <= 3) {
      return 'overview'; // /seasons/11 -> overview tab
    }
    return segments[3] || 'overview'; // /seasons/11/drivers -> drivers tab
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
    <div className="flex items-center gap-3 p-4 bg-gray-900/50 border border-gray-700/60 rounded-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 text-gray-400">
        <Calendar className="w-4 h-4" />
        <span className="text-sm font-medium">Season</span>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Previous Season Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateToSeason('prev')}
          disabled={!canGoBack || isChanging}
          className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Season Selector */}
        <Select
          value={currentSeason}
          onValueChange={handleSeasonChange}
          disabled={isChanging}
        >
          <SelectTrigger className={cn(
            "w-32 h-8 bg-gray-800/60 border-gray-600 text-white text-center font-semibold",
            isChanging && "opacity-50"
          )}>
            <SelectValue>
              {currentSeason === 'overall' ? 'All-Time' : `Season ${currentSeason}`}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            <SelectItem value="overall" className="text-white">
              All-Time
            </SelectItem>
            {availableSeasons
              .filter(season => season !== 'overall')
              .sort((a, b) => parseInt(b) - parseInt(a))
              .map((season) => (
                <SelectItem key={season} value={season} className="text-white">
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