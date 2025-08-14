"use client";

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, User } from 'lucide-react';
import { cn } from "@/lib/utils";
import { drivers } from '@/lib/data';

// Function to normalize driver names for URLs
const normalizeDriverName = (name) => {
  return name.toLowerCase().replace(/\s+/g, '-');
};

// Function to get driver name from URL
const getDriverFromUrl = (name) => {
  return drivers.find(driver => normalizeDriverName(driver) === name) || name;
};

export default function DriverSelector({ currentDriver }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChanging, setIsChanging] = useState(false);

  const handleDriverChange = async (newDriverUrl) => {
    const newDriverName = getDriverFromUrl(newDriverUrl);
    const currentDriverName = getDriverFromUrl(currentDriver);
    
    if (newDriverName === currentDriverName) return;
    
    setIsChanging(true);
    const newPath = `/drivers/${newDriverUrl}`;
    router.push(newPath);
    
    // Reset loading state after navigation
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
    <div className="flex items-center gap-3 p-4 bg-gray-900/50 border border-gray-700/60 rounded-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 text-gray-400">
        <User className="w-4 h-4" />
        <span className="text-sm font-medium">Driver</span>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Previous Driver Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateToDriver('prev')}
          disabled={!canGoBack || isChanging}
          className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Driver Selector */}
        <Select
          value={currentDriver}
          onValueChange={handleDriverChange}
          disabled={isChanging}
        >
          <SelectTrigger className={cn(
            "w-48 h-8 bg-gray-800/60 border-gray-600 text-white text-center font-semibold",
            isChanging && "opacity-50"
          )}>
            <SelectValue>
              {getDriverFromUrl(currentDriver)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            {drivers.map((driver) => (
              <SelectItem key={driver} value={normalizeDriverName(driver)} className="text-white">
                {driver}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Next Driver Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateToDriver('next')}
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