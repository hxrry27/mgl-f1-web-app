"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Trophy, Flag } from 'lucide-react';
import { cn } from "@/lib/utils";

// Available seasons and tracks (this could be fetched from API in the future)
const SEASONS = ['8', '9', '10', '11'];

// Map slugs to full track names
const trackNames = {
  'bahrain': 'Bahrain',
  'jeddah': 'Saudi Arabia',
  'yas-marina': 'Abu Dhabi',
  'melbourne': 'Australia',
  'suzuka': 'Japan',
  'shanghai': 'China',
  'baku': 'Azerbaijan',
  'miami': 'Miami',
  'monaco': 'Monaco',
  'montreal': 'Canada',
  'barcelona': 'Spain',
  'spielberg': 'Austria',
  'silverstone': 'Great Britain',
  'hungaroring': 'Hungary',
  'spa-francorchamps': 'Belgium',
  'zandvoort': 'Netherlands',
  'monza': 'Italy',
  'singapore': 'Singapore',
  'austin': 'Texas',
  'mexico': 'Mexico',
  'interlagos': 'Brazil',
  'las-vegas': 'Las Vegas',
  'losail': 'Qatar',
  'imola': 'Emilia-Romagna',
  'portimao': 'Portugal',
  'paul-ricard': 'France'
};

// Default races for each season (this should ideally come from database)
const SEASON_RACES = {
  '8': ['bahrain', 'jeddah', 'melbourne', 'baku', 'miami', 'monaco', 'barcelona', 'montreal', 'silverstone', 'spielberg', 'hungaroring', 'spa-francorchamps', 'monza', 'singapore', 'suzuka', 'austin', 'mexico', 'interlagos', 'yas-marina'],
  '9': ['bahrain', 'jeddah', 'melbourne', 'baku', 'miami', 'monaco', 'barcelona', 'montreal', 'silverstone', 'spielberg', 'hungaroring', 'spa-francorchamps', 'monza', 'singapore', 'suzuka', 'austin', 'mexico', 'interlagos', 'yas-marina'],
  '10': ['bahrain', 'jeddah', 'melbourne', 'baku', 'miami', 'monaco', 'barcelona', 'montreal', 'silverstone', 'spielberg', 'hungaroring', 'spa-francorchamps', 'monza', 'singapore', 'suzuka', 'austin', 'mexico', 'interlagos', 'yas-marina'],
  '11': ['bahrain', 'jeddah', 'melbourne', 'baku', 'miami', 'monaco', 'barcelona', 'montreal', 'silverstone', 'spielberg', 'hungaroring', 'spa-francorchamps', 'monza', 'singapore', 'suzuka', 'austin', 'mexico', 'interlagos', 'yas-marina']
};

export default function SeasonRaceSelector({ currentSeason, currentRace }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChanging, setIsChanging] = useState(false);
  const [availableRaces, setAvailableRaces] = useState(SEASON_RACES[currentSeason] || []);

  useEffect(() => {
    setAvailableRaces(SEASON_RACES[currentSeason] || []);
  }, [currentSeason]);

  const handleSeasonChange = async (newSeason) => {
    if (newSeason === currentSeason) return;
    
    setIsChanging(true);
    const seasonRaces = SEASON_RACES[newSeason] || [];
    const firstRace = seasonRaces[0] || 'bahrain';
    const newPath = `/results/season/${newSeason}/${firstRace}`;
    router.push(newPath);
    
    setTimeout(() => setIsChanging(false), 300);
  };

  const handleRaceChange = async (newRace) => {
    if (newRace === currentRace) return;
    
    setIsChanging(true);
    const newPath = `/results/season/${currentSeason}/${newRace}`;
    router.push(newPath);
    
    setTimeout(() => setIsChanging(false), 300);
  };

  const navigateRace = (direction) => {
    const currentRaceIndex = availableRaces.indexOf(currentRace);
    let newIndex;
    
    if (direction === 'next') {
      newIndex = Math.min(currentRaceIndex + 1, availableRaces.length - 1);
    } else {
      newIndex = Math.max(currentRaceIndex - 1, 0);
    }
    
    if (newIndex !== currentRaceIndex) {
      handleRaceChange(availableRaces[newIndex]);
    }
  };

  const canGoBack = availableRaces.indexOf(currentRace) > 0;
  const canGoForward = availableRaces.indexOf(currentRace) < availableRaces.length - 1;

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-900/50 border border-gray-700/60 rounded-lg backdrop-blur-sm">
      {/* Season Selector */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-gray-400">
          <Trophy className="w-4 h-4" />
          <span className="text-sm font-medium">Season</span>
        </div>
        
        <Select
          value={currentSeason}
          onValueChange={handleSeasonChange}
          disabled={isChanging}
        >
          <SelectTrigger className={cn(
            "w-20 h-8 bg-gray-800/60 border-gray-600 text-white text-center font-semibold",
            isChanging && "opacity-50"
          )}>
            <SelectValue>{currentSeason}</SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            {SEASONS.map((season) => (
              <SelectItem key={season} value={season} className="text-white">
                Season {season}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Race Selector */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-gray-400">
          <Flag className="w-4 h-4" />
          <span className="text-sm font-medium">Race</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Previous Race Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateRace('prev')}
            disabled={!canGoBack || isChanging}
            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {/* Race Selector */}
          <Select
            value={currentRace}
            onValueChange={handleRaceChange}
            disabled={isChanging}
          >
            <SelectTrigger className={cn(
              "w-48 h-8 bg-gray-800/60 border-gray-600 text-white text-center font-semibold",
              isChanging && "opacity-50"
            )}>
              <SelectValue>
                {trackNames[currentRace] || currentRace}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              {availableRaces.map((race) => (
                <SelectItem key={race} value={race} className="text-white">
                  {trackNames[race] || race}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Next Race Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateRace('next')}
            disabled={!canGoForward || isChanging}
            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {isChanging && (
        <div className="text-xs text-gray-400 animate-pulse">
          Loading...
        </div>
      )}
    </div>
  );
}