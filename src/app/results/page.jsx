'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trophy, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { teamColors, lightTeams } from '@/lib/data';

// Track data with countries and flags
const trackData = {
  'bahrain': { name: 'Bahrain', flag: 'bahrain' },
  'jeddah': { name: 'Jeddah', flag: 'saudi_arabia' },
  'yas-marina': { name: 'Yas Marina', flag: 'united_arab_emirates' },
  'melbourne': { name: 'Melbourne', flag: 'australia' },
  'suzuka': { name: 'Suzuka', flag: 'japan' },
  'shanghai': { name: 'Shanghai', flag: 'china' },
  'baku': { name: 'Baku', flag: 'azerbaijan' },
  'miami': { name: 'Miami', flag: 'united_states_of_america' },
  'monaco': { name: 'Monaco', flag: 'monaco' },
  'montreal': { name: 'Montreal', flag: 'canada' },
  'barcelona': { name: 'Barcelona', flag: 'spain' },
  'spielberg': { name: 'Spielberg', flag: 'austria' },
  'silverstone': { name: 'Silverstone', flag: 'united_kingdom' },
  'hungaroring': { name: 'Hungaroring', flag: 'hungary' },
  'spa-francorchamps': { name: 'Spa', flag: 'belgium' },
  'zandvoort': { name: 'Zandvoort', flag: 'netherlands' },
  'monza': { name: 'Monza', flag: 'italy' },
  'singapore': { name: 'Singapore', flag: 'singapore' },
  'austin': { name: 'Austin', flag: 'united_states_of_america' },
  'mexico': { name: 'Mexico City', flag: 'mexico' },
  'interlagos': { name: 'Interlagos', flag: 'brazil' },
  'las-vegas': { name: 'Las Vegas', flag: 'united_states_of_america' },
  'losail': { name: 'Losail', flag: 'qatar' },
  'imola': { name: 'Imola', flag: 'italy' },
  'portimao': { name: 'Portimão', flag: 'portugal' },
  'paul-ricard': { name: 'Paul Ricard', flag: 'france' }
};


export default function ResultsOverviewPage() {
  const router = useRouter();
  const [selectedSeason, setSelectedSeason] = useState('12');
  const [seasons, setSeasons] = useState([]);
  const [races, setRaces] = useState([]);
  const [raceInfoMap, setRaceInfoMap] = useState({});
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

  // Fetch races and race info for selected season
  useEffect(() => {
    async function fetchRacesAndInfo() {
      if (!selectedSeason) return;
      
      setLoading(true);
      try {
        // Fetch race list
        const racesResponse = await fetch(`/api/season-races?season=${selectedSeason}`);
        if (!racesResponse.ok) throw new Error('Failed to fetch races');
        
        const racesData = await racesResponse.json();
        const racesList = racesData.races || [];
        setRaces(racesList);

        // Fetch race info for each race
        const infoPromises = racesList.map(race =>
          fetch(`/api/race-info?season=${selectedSeason}&raceSlug=${race.slug}`)
            .then(res => res.ok ? res.json() : null)
            .catch(() => null)
        );

        const infoResults = await Promise.all(infoPromises);
        
        // Build map of race info
        const infoMap = {};
        racesList.forEach((race, index) => {
          if (infoResults[index]) {
            infoMap[race.slug] = infoResults[index];
          }
        });
        
        setRaceInfoMap(infoMap);
      } catch (error) {
        console.error('Error fetching races:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchRacesAndInfo();
  }, [selectedSeason]);

  const handleRaceClick = (raceSlug) => {
    router.push(`/results/season/${selectedSeason}/${raceSlug}`);
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
            <Trophy className="h-10 w-10 text-cyan-400" />
            Race Results
          </h1>
          <p className="text-neutral-400 text-lg">View all race results by season</p>
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

        {/* Results Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50 overflow-hidden">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
                </div>
              ) : races.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
                  <Trophy className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-bold">No races found for Season {selectedSeason}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-800">
                        <th className="text-left p-4 text-neutral-400 font-bold uppercase tracking-wider text-xs w-12">#</th>
                        <th className="text-left p-4 text-neutral-400 font-bold uppercase tracking-wider text-xs">Track</th>
                        <th className="text-left p-4 text-neutral-400 font-bold uppercase tracking-wider text-xs">Date</th>
                        <th className="text-left p-4 text-neutral-400 font-bold uppercase tracking-wider text-xs">Winner</th>
                        <th className="text-left p-4 text-neutral-400 font-bold uppercase tracking-wider text-xs">Team</th>
                        <th className="text-left p-4 text-neutral-400 font-bold uppercase tracking-wider text-xs">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {races.map((race, index) => {
                        const raceInfo = raceInfoMap[race.slug];
                        const trackInfo = trackData[race.slug] || { name: race.name, flag: '🏁' };
                        const hasWinner = raceInfo?.winner?.name && raceInfo.winner.name !== 'N/A';

                        return (
                          <motion.tr
                            key={race.slug}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => handleRaceClick(race.slug)}
                            className="border-b border-neutral-800/50 hover:bg-neutral-800/30 cursor-pointer transition-colors group"
                          >
                            <td className="p-4">
                              <span className="text-neutral-500 font-bold text-sm">
                                {race.race_number}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="relative w-8 h-6 flex-shrink-0">
                                  <Image
                                    src={`/images/flags/${trackInfo.flag}.png`}
                                    alt={`${trackInfo.name} flag`}
                                    fill
                                    className="object-cover rounded-sm"
                                  />
                                </div>
                                <p className="text-white font-bold group-hover:text-cyan-400 transition-colors">
                                  {trackInfo.name}
                                </p>
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="text-neutral-400 text-sm">
                                {race.date ? new Date(race.date).toLocaleDateString('en-GB', { 
                                  day: 'numeric', 
                                  month: 'short', 
                                  year: 'numeric' 
                                }) : 'TBD'}
                              </p>
                            </td>
                            <td className="p-4">
                              {hasWinner ? (
                                <p className="text-white font-bold">{raceInfo.winner.name}</p>
                              ) : (
                                <span className="text-neutral-500 italic text-sm">Not yet raced</span>
                              )}
                            </td>
                            <td className="p-4">
                              {hasWinner && raceInfo.winner.team ? (
                                <Badge 
                                  className="font-bold px-3 py-1 text-xs uppercase tracking-wider border-2"
                                  style={{ 
                                    backgroundColor: teamColors[raceInfo.winner.team] || '#404040',
                                    color: lightTeams.includes(raceInfo.winner.team) ? 'black' : 'white',
                                    borderColor: lightTeams.includes(raceInfo.winner.team) ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'
                                  }}
                                >
                                  {raceInfo.winner.team}
                                </Badge>
                              ) : (
                                <span className="text-neutral-500 text-sm">—</span>
                              )}
                            </td>
                            <td className="p-4">
                              {hasWinner ? (
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 font-bold px-3 py-1 text-xs uppercase">
                                  Completed
                                </Badge>
                              ) : (
                                <Badge className="bg-neutral-700/50 text-neutral-400 border-neutral-600/30 font-bold px-3 py-1 text-xs uppercase">
                                  Upcoming
                                </Badge>
                              )}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}