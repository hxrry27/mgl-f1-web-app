"use client";

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { cn } from "@/lib/utils";

// Available tracks
const tracks = [
  'bahrain', 'jeddah', 'melbourne', 'baku', 'miami', 'imola', 'monaco', 
  'barcelona', 'montreal', 'spielberg', 'silverstone', 'hungaroring', 
  'spa-francorchamps', 'zandvoort', 'monza', 'singapore', 'suzuka', 
  'austin', 'mexico', 'interlagos', 'las-vegas', 'losail', 'yas-marina',
  'portimao', 'paul-ricard', 'shanghai'
];

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

export default function TrackSelector({ currentTrack }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChanging, setIsChanging] = useState(false);

  const handleTrackChange = async (newTrack) => {
    if (newTrack === currentTrack) return;
    
    setIsChanging(true);
    const newPath = `/tracks/${newTrack}`;
    router.push(newPath);
    
    // Reset loading state after navigation
    setTimeout(() => setIsChanging(false), 300);
  };

  const navigateToTrack = (direction) => {
    const currentIndex = tracks.indexOf(currentTrack);
    let newIndex;
    
    if (direction === 'next') {
      newIndex = Math.min(currentIndex + 1, tracks.length - 1);
    } else {
      newIndex = Math.max(currentIndex - 1, 0);
    }
    
    if (newIndex !== currentIndex) {
      handleTrackChange(tracks[newIndex]);
    }
  };

  const canGoBack = tracks.indexOf(currentTrack) > 0;
  const canGoForward = tracks.indexOf(currentTrack) < tracks.length - 1;

  return (
    <div className="flex items-center gap-3 p-4 bg-gray-900/50 border border-gray-700/60 rounded-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 text-gray-400">
        <MapPin className="w-4 h-4" />
        <span className="text-sm font-medium">Track</span>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Previous Track Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateToTrack('prev')}
          disabled={!canGoBack || isChanging}
          className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Track Selector */}
        <Select
          value={currentTrack}
          onValueChange={handleTrackChange}
          disabled={isChanging}
        >
          <SelectTrigger className={cn(
            "w-48 h-8 bg-gray-800/60 border-gray-600 text-white text-center font-semibold",
            isChanging && "opacity-50"
          )}>
            <SelectValue>
              {trackNames[currentTrack] || currentTrack}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            {tracks.map((track) => (
              <SelectItem key={track} value={track} className="text-white">
                {trackNames[track] || track}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Next Track Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateToTrack('next')}
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