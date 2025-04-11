'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "lucide-react";

export default function ClientSeasonSelector({ seasons, defaultSeason }) {
  const [season, setSeason] = useState(defaultSeason);
  const router = useRouter();
  
  const handleSeasonChange = (newSeason) => {
    setSeason(newSeason);
    router.push(`/teams/lineups?season=${newSeason}`);
  };
  
  return (
    <div className="flex items-center gap-2 mb-6">
      <Calendar className="h-5 w-5 text-blue-500" />
      <Select
        value={season}
        onValueChange={handleSeasonChange}
      >
        <SelectTrigger className="w-40 bg-gray-900 border-gray-700 text-white">
          <SelectValue placeholder="Select Season" />
        </SelectTrigger>
        <SelectContent className="bg-gray-900 border-gray-700 text-white">
          <SelectGroup>
            <SelectLabel className="text-gray-400">Select Season</SelectLabel>
            {seasons.map((s) => (
              <SelectItem key={s} value={s} className="text-white hover:bg-gray-800">
                Season {s}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}