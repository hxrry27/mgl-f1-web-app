"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, User } from 'lucide-react';
import { cn } from "@/lib/utils";

const normalizeDriverName = (name) => {
  return name.toLowerCase().replace(/\s+/g, '-');
};

export default function DriverSelector({ currentDriver }) {
  const router = useRouter();
  const [isChanging, setIsChanging] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [currentDriverName, setCurrentDriverName] = useState('');

  useEffect(() => {
    async function fetchDrivers() {
      try {
        const response = await fetch('/api/drivers');
        if (response.ok) {
          const data = await response.json();
          setDrivers(data);
          
          // Find current driver's display name
          const normalized = data.map(d => ({ name: d, slug: normalizeDriverName(d) }));
          const current = normalized.find(d => d.slug === currentDriver);
          if (current) {
            setCurrentDriverName(current.name);
          }
        }
      } catch (error) {
        console.error('Error fetching drivers:', error);
      }
    }
    fetchDrivers();
  }, [currentDriver]);

  const handleDriverChange = async (newDriverSlug) => {
    if (newDriverSlug === currentDriver) return;
    
    setIsChanging(true);
    router.push(`/drivers/${newDriverSlug}`);
    
    setTimeout(() => setIsChanging(false), 300);
  };

  const navigateToDriver = (direction) => {
    const normalizedDrivers = drivers.map(normalizeDriverName);
    const currentIndex = normalizedDrivers.indexOf(currentDriver);
    let newIndex;
    
    if (direction === 'next') {
      newIndex = Math.min(currentIndex + 1, drivers.length - 1);
    } else {
      newIndex = Math.max(currentIndex - 1, 0);
    }
    
    if (newIndex !== currentIndex) {
      handleDriverChange(normalizedDrivers[newIndex]);
    }
  };

  const canGoBack = drivers.map(normalizeDriverName).indexOf(currentDriver) > 0;
  const canGoForward = drivers.map(normalizeDriverName).indexOf(currentDriver) < drivers.length - 1;

  return (
    <div className="flex items-center gap-3 p-4 bg-neutral-900/60 backdrop-blur-xl border border-neutral-700/50 rounded-2xl">
      <div className="flex items-center gap-2 text-neutral-400">
        <User className="w-4 h-4" />
        <span className="text-sm font-bold uppercase tracking-wider">Driver</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateToDriver('prev')}
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
          value={currentDriver}
          onValueChange={handleDriverChange}
          disabled={isChanging}
        >
          <SelectTrigger className={cn(
            "w-48 h-10 bg-neutral-800/80 border-neutral-700 rounded-xl",
            "text-white font-black text-center",
            "hover:bg-neutral-700 hover:border-cyan-500/50 transition-all",
            isChanging && "opacity-50 cursor-wait"
          )}>
            <SelectValue>
              {currentDriverName || 'Loading...'}
            </SelectValue>
          </SelectTrigger>
          
          <SelectContent className="bg-neutral-900 border-neutral-700 backdrop-blur-xl rounded-xl">
            {drivers.map((driver) => (
              <SelectItem 
                key={driver} 
                value={normalizeDriverName(driver)}
                className="text-white font-medium hover:bg-neutral-800 focus:bg-neutral-800 rounded-lg cursor-pointer"
              >
                {driver}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateToDriver('next')}
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