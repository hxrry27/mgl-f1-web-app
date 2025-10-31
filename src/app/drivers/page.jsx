'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Loader2, Trophy } from 'lucide-react';
import { cn } from "@/lib/utils";
import { teamColors, lightTeams } from '@/lib/data';

// Normalize driver names for URLs
const normalizeDriverName = (name) => {
  return name.toLowerCase().replace(/\s+/g, '-');
};

export default function DriversPage() {
  const router = useRouter();
  const [selectedSeason, setSelectedSeason] = useState('12');
  const [seasons, setSeasons] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch available seasons
  useEffect(() => {
    async function fetchSeasons() {
      try {
        const response = await fetch('/api/seasons');
        if (response.ok) {
          const data = await response.json();
          setSeasons(data);
          if (data.length > 0 && !selectedSeason) {
            setSelectedSeason(data[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching seasons:', error);
      }
    }
    fetchSeasons();
  }, []);

  // Fetch drivers for selected season
  useEffect(() => {
    async function fetchDrivers() {
      if (!selectedSeason) return;
      
      setLoading(true);
      try {
        const response = await fetch(`/api/season-drivers?season=${selectedSeason}`);
        if (!response.ok) throw new Error('Failed to fetch drivers');
        
        const data = await response.json();
        setDrivers(data.drivers || []);
      } catch (error) {
        console.error('Error fetching drivers:', error);
        setDrivers([]);
      } finally {
        setLoading(false);
      }
    }
    fetchDrivers();
  }, [selectedSeason]);

  const handleDriverClick = (driverName) => {
    router.push(`/drivers/${normalizeDriverName(driverName)}`);
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-5xl font-black text-white mb-2 flex items-center gap-3">
            <Users className="h-10 w-10 text-cyan-400" />
            Drivers
          </h1>
          <p className="text-neutral-400 text-lg">View all drivers by season</p>
        </motion.div>

        {/* Season Selector */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-end mb-6"
        >
          <div className="flex items-center gap-3 p-4 bg-neutral-900/60 backdrop-blur-xl border border-neutral-700/50 rounded-2xl">
            <div className="flex items-center gap-2 text-neutral-400">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-bold uppercase tracking-wider">Season</span>
            </div>
            
            <Select value={selectedSeason} onValueChange={setSelectedSeason}>
              <SelectTrigger className="w-40 h-10 bg-neutral-800/80 border-neutral-700 rounded-xl text-white font-black hover:bg-neutral-700 hover:border-cyan-500/50 transition-all">
                <SelectValue>
                  <span>Season {selectedSeason}</span>
                </SelectValue>
              </SelectTrigger>
              
              <SelectContent className="bg-neutral-900 border-neutral-700 backdrop-blur-xl rounded-xl">
                {seasons.map((season) => (
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
          </div>
        </motion.div>

        {/* Drivers Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {loading ? (
            <Card className="bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50">
              <CardContent className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
              </CardContent>
            </Card>
          ) : drivers.length === 0 ? (
            <Card className="bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50">
              <CardContent className="flex flex-col items-center justify-center py-20 text-neutral-500">
                <Users className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-bold">No drivers found for Season {selectedSeason}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {drivers.map((driver, index) => (
                <motion.div
                  key={driver.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleDriverClick(driver.name)}
                  className="cursor-pointer"
                >
                  <Card className="bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50 hover:bg-neutral-800/60 hover:border-cyan-500/50 transition-all group h-full">
                    <CardContent className="p-6">
                      {/* Driver Name */}
                      <h3 className="text-2xl font-black text-white mb-3 group-hover:text-cyan-400 transition-colors">
                        {driver.name}
                      </h3>
                      
                      {/* Team Badge */}
                      <Badge 
                        className="font-bold px-3 py-1 text-xs uppercase tracking-wider border-2 mb-4"
                        style={{ 
                          backgroundColor: teamColors[driver.team] || '#404040',
                          color: lightTeams.includes(driver.team) ? 'black' : 'white',
                          borderColor: lightTeams.includes(driver.team) ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'
                        }}
                      >
                        {driver.team}
                      </Badge>
                      
                      {/* Stats Row */}
                      {(driver.points !== undefined || driver.position !== undefined) && (
                        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-neutral-700/50">
                          {driver.position && (
                            <div>
                              <p className="text-neutral-500 text-xs uppercase tracking-wider mb-1">Position</p>
                              <p className="text-white font-black text-lg">{driver.position}</p>
                            </div>
                          )}
                          {driver.points !== undefined && (
                            <div>
                              <p className="text-neutral-500 text-xs uppercase tracking-wider mb-1">Points</p>
                              <p className="text-cyan-400 font-black text-lg">{driver.points}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}