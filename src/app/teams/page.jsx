'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UsersRound, Calendar, Loader2 } from 'lucide-react';
import { teamColors, lightTeams } from '@/lib/data';

const normalizeTeamName = (name) => {
  return name.toLowerCase().replace(/\s+/g, '-');
};

export default function TeamsPage() {
  const router = useRouter();
  const [selectedSeason, setSelectedSeason] = useState('12');
  const [seasons, setSeasons] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSeasons() {
      try {
        const response = await fetch('/api/seasons');
        if (response.ok) {
          const data = await response.json();
          setSeasons(data);
        }
      } catch (error) {
        console.error('Error fetching seasons:', error);
      }
    }
    fetchSeasons();
  }, []);

  useEffect(() => {
    async function fetchTeams() {
      if (!selectedSeason) return;
      
      setLoading(true);
      try {
        const response = await fetch(`/api/team-profile?season=${selectedSeason}`);
        if (!response.ok) throw new Error('Failed to fetch teams');
        
        const data = await response.json();
        setTeams(data.teams || []);
      } catch (error) {
        console.error('Error fetching teams:', error);
        setTeams([]);
      } finally {
        setLoading(false);
      }
    }
    fetchTeams();
  }, [selectedSeason]);

  const handleTeamClick = (teamName) => {
    router.push(`/teams/${normalizeTeamName(teamName)}`);
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-5xl font-black text-white mb-2 flex items-center gap-3">
            <UsersRound className="h-10 w-10 text-cyan-400" />
            Teams
          </h1>
          <p className="text-neutral-400 text-lg">View all teams by season</p>
        </motion.div>

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
          ) : teams.length === 0 ? (
            <Card className="bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50">
              <CardContent className="flex flex-col items-center justify-center py-20 text-neutral-500">
                <UsersRound className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-bold">No teams found for Season {selectedSeason}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team, index) => (
                <motion.div
                  key={team.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleTeamClick(team.name)}
                  className="cursor-pointer"
                >
                  <Card className="bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50 hover:bg-neutral-800/60 hover:border-cyan-500/50 transition-all group h-full">
                    <CardContent className="p-6">
                      <div 
                        className="w-full h-3 rounded-full mb-6"
                        style={{ backgroundColor: teamColors[team.name] || '#404040' }}
                      />
                      
                      <h3 className="text-2xl font-black text-white mb-4 group-hover:text-cyan-400 transition-colors">
                        {team.name}
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-neutral-400 uppercase tracking-wider font-bold">Drivers</span>
                          <span className="text-white font-bold">{team.driver_count}</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {team.drivers?.slice(0, 3).map((driver, idx) => (
                            <Badge 
                              key={idx}
                              className="font-bold px-3 py-1 text-xs"
                              style={{ 
                                backgroundColor: 'rgba(34, 211, 238, 0.1)',
                                color: '#22d3ee',
                                borderColor: 'rgba(34, 211, 238, 0.3)'
                              }}
                            >
                              {driver}
                            </Badge>
                          ))}
                          {team.drivers?.length > 3 && (
                            <Badge className="bg-neutral-800 text-neutral-400 border-neutral-700 font-bold px-3 py-1 text-xs">
                              +{team.drivers.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {team.points !== undefined && (
                        <div className="mt-4 pt-4 border-t border-neutral-700/50">
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-400 text-xs uppercase tracking-wider font-bold">Points</span>
                            <span className="text-cyan-400 font-black text-xl">{team.points}</span>
                          </div>
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