"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { cn } from "@/lib/utils";

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
  const [isChanging, setIsChanging] = useState(false);

  const handleTrackChange = async (newTrack) => {
    if (newTrack === currentTrack) return;
    
    setIsChanging(true);
    router.push(`/tracks/${newTrack}`);
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
    <div className="flex items-center gap-3 p-4 bg-neutral-900/60 backdrop-blur-xl border border-neutral-700/50 rounded-2xl">
      <div className="flex items-center gap-2 text-neutral-400">
        <MapPin className="w-4 h-4" />
        <span className="text-sm font-bold uppercase tracking-wider">Track</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateToTrack('prev')}
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
          value={currentTrack}
          onValueChange={handleTrackChange}
          disabled={isChanging}
        >
          <SelectTrigger className={cn(
            "w-48 h-10 bg-neutral-800/80 border-neutral-700 rounded-xl",
            "text-white font-black text-center",
            "hover:bg-neutral-700 hover:border-cyan-500/50 transition-all",
            isChanging && "opacity-50 cursor-wait"
          )}>
            <SelectValue>
              {trackNames[currentTrack] || currentTrack}
            </SelectValue>
          </SelectTrigger>
          
          <SelectContent className="bg-neutral-900 border-neutral-700 backdrop-blur-xl rounded-xl">
            {tracks.map((track) => (
              <SelectItem 
                key={track} 
                value={track}
                className="text-white font-medium hover:bg-neutral-800 focus:bg-neutral-800 rounded-lg cursor-pointer"
              >
                {trackNames[track] || track}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateToTrack('next')}
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