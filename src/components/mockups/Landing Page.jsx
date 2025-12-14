'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Flag, Users, Trophy, ArrowLeft } from 'lucide-react';
import NewHeader from '@/components/NewHeader';
import { AuroraText } from "@/components/ui/aurora-text";
import { BorderBeam } from "@/components/ui/border-beam";
import { RippleButton } from "@/components/ui/ripple-button";
import { teamColors } from '@/lib/data';

// Subtle Background
function SubtleBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-primary" />
      
      <motion.div
        className="absolute top-1/3 left-1/3 w-[600px] h-[600px] rounded-full blur-3xl opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15), transparent 70%)',
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <motion.div
        className="absolute bottom-1/3 right-1/3 w-[600px] h-[600px] rounded-full blur-3xl opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(20, 184, 166, 0.15), transparent 70%)',
        }}
        animate={{
          scale: [1.1, 1, 1.1],
          opacity: [0.25, 0.15, 0.25],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

// Current Standings Box with Border Beam
function StandingsBox({ drivers }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6, duration: 0.8 }}
      className="hidden xl:block w-[550px] ml-auto"
    >
<Link href="/seasons/12" className="block group">
  <div className="relative min-h-[600px] w-full bg-neutral-900/60 backdrop-blur-xl rounded-3xl border border-neutral-700/50 overflow-hidden">
    
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-cyan-500/30">
        <h3 className="text-xl font-black text-white">Driver Standings</h3>
        <span className="text-cyan-400 text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
          View Season <ArrowRight className="h-4 w-4" />
        </span>
      </div>

      {/* Top 10 Drivers */}
      <div className="space-y-4">
        {drivers.map((driver, index) => (
          <motion.div
            key={driver.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 + index * 0.1 }}
            className="flex items-center gap-4 group/item"
          >
            <span className="text-2xl font-black text-neutral-600 w-8">
              {index + 1}
            </span>
            <div className={`w-1 h-12 ${driver.color} rounded-full`} />
            <div className="flex-1">
              <p className="text-white font-bold group-hover/item:text-cyan-400 transition-colors">
                {driver.name}
              </p>
              <p className="text-neutral-500 text-sm">{driver.team}</p>
            </div>
            <span className="text-cyan-400 font-black text-lg">
              {driver.points}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
    <BorderBeam
        duration={6}
        size={400}
        borderWidth={2}
        className="from-transparent via-red-500 to-transparent"
        colorFrom="#22d3ee"
        colorTo="#14b8a6"
      />
      <BorderBeam
        duration={6}
        delay={3}
        size={400}
        borderWidth={2}
        className="from-transparent via-blue-500 to-transparent"
        colorFrom="#22d3ee" colorTo="#14b8a6"
      />
  </div>
</Link>
      
    </motion.div>
  );
}

// Stats Section
function StatsSection() {
  const [raceStats, setRaceStats] = useState({ formatted: '0/0' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRaceStats = async () => {
      try {
        const response = await fetch('/api/season-races?season=12');
        if (response.ok) {
          const data = await response.json();
          const races = data.races || [];
          const now = new Date();
          
          const completed = races.filter(race => 
            race.date && new Date(race.date) <= now
          ).length;
          
          setRaceStats({ 
            formatted: `${completed}/${races.length}`,
            completed,
            total: races.length
          });
        }
      } catch (error) {
        console.error('Error fetching race stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRaceStats();
  }, []);

  const stats = [
    { value: '6', label: 'Active Drivers', icon: <Users className="h-5 w-5" /> },
    { value: loading ? '...' : raceStats.formatted, label: 'Races Complete', icon: <Flag className="h-5 w-5" /> },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 }}
      className="flex gap-12 mt-12"
    >
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 + index * 0.1 }}
          className="flex flex-col"
        >
          <div className="flex items-center gap-2 text-neutral-500 mb-2">
            {stat.icon}
            <span className="text-sm uppercase tracking-wider">{stat.label}</span>
          </div>
          <span className="text-4xl font-black text-white">{stat.value}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}

// Main Landing Page
export default function NewLandingLayout() {
  const [nextRace, setNextRace] = useState(null);
  const [latestRace, setLatestRace] = useState(null);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Team color mapping
  const getTeamColor = (teamName) => {
    const colorMap = {
      'Mercedes': 'bg-cyan-500',
      'Red Bull': 'bg-blue-600',
      'Ferrari': 'bg-red-500',
      'McLaren': 'bg-orange-500',
      'Aston Martin': 'bg-green-500',
      'Alpine F1 Team': 'bg-blue-400',
      'Williams': 'bg-blue-500',
      'AlphaTauri': 'bg-blue-700',
      'Alfa Romeo': 'bg-red-600',
      'Haas F1 Team': 'bg-gray-400',
      'Racing Bulls': 'bg-purple-500',
    };
    return colorMap[teamName] || 'bg-neutral-500';
  };

  // Fetch race data and standings on mount
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch next race
        const nextResponse = await fetch('/api/schedule/next-race');
        if (nextResponse.ok) {
          const nextData = await nextResponse.json();
          if (nextData && (nextData.track || nextData.slug)) {
            setNextRace({
              season: nextData.season,
              slug: nextData.track || nextData.slug,
              date: nextData.date
            });
          }
        }

        // Fetch latest completed race
        const latestResponse = await fetch('/api/schedule/last-race');
        if (latestResponse.ok) {
          const latestData = await latestResponse.json();
          if (latestData && latestData.slug) {
            setLatestRace({
              season: latestData.season,
              slug: latestData.slug,
              date: latestData.date
            });
          }
        }

        // Fetch standings
        const standingsResponse = await fetch('/api/standings?season=12&limit=10');
        if (standingsResponse.ok) {
          const standingsData = await standingsResponse.json();
          const driversWithColors = standingsData.drivers.map(driver => ({
            ...driver,
            color: getTeamColor(driver.team)
          }));
          setStandings(driversWithColors);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  return (
    <div className="relative min-h-screen bg-primary overflow-hidden">
      {/* Background */}
      <SubtleBackground />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center px-8 lg:px-16 xl:px-24">
        <div className="max-w-[1800px] mx-auto w-full">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-16 items-center">
            {/* Left Side - Hero Content */}
            <div>
              {/* Season Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-8 inline-block"
              >
                <Badge 
                  className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-6 py-3 text-sm font-bold uppercase tracking-wider backdrop-blur-sm rounded-full"
                >
                  🏆 Season 12 Championship
                </Badge>
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-8"
              >
                <h1 className="text-xl md:text-xl lg:text-3xl font-black text-white leading-none mb-4 tracking-tight">
                  FORMULA 1 TELEMETRY LEAGUE
                </h1>
                <h2 className="text-6xl md:text-7xl lg:text-8xl font-black leading-none tracking-tight">
                  <span className="text-white">Race. Analyze.</span>
                  <br />
                  <AuroraText className="text-6xl md:text-7xl lg:text-8xl">Dominate.</AuroraText>
                </h2>
              </motion.div>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-xl text-neutral-400 mb-10 max-w-2xl leading-relaxed"
              >
                Welcome to the most comprehensive F1 telemetry platform. Track every millisecond, analyze every turn, and celebrate every victory with precision racing data.
              </motion.p>

              {/* Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-wrap gap-4 mb-12"
              >
                {/* Latest Race Button */}
                {latestRace ? (
                  <Link href={`/races/season/${latestRace.season}/${latestRace.slug}`}>
                    <motion.div
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <RippleButton
                        rippleColor="#525252"
                        className="px-8 py-4 bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700 text-white font-bold rounded-2xl flex items-center gap-3 transition-all backdrop-blur-sm"
                      >
                        <ArrowLeft className="h-5 w-5" />
                        Latest Race
                      </RippleButton>
                    </motion.div>
                  </Link>
                ) : (
                  <Link href="/races">
                    <motion.div
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <RippleButton
                        rippleColor="#525252"
                        className="px-8 py-4 bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700 text-white font-bold rounded-2xl flex items-center gap-3 transition-all backdrop-blur-sm"
                      >
                        <ArrowLeft className="h-5 w-5" />
                        Latest Race
                      </RippleButton>
                    </motion.div>
                  </Link>
                )}
                
                {/* Next Race Button */}
                {nextRace ? (
                  <Link href={`/tracks/${nextRace.slug}`}>
                    <motion.div
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <RippleButton
                        rippleColor="#22d3ee"
                        className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 text-black font-bold rounded-2xl flex items-center gap-3 shadow-lg shadow-cyan-500/20 transition-all"
                      >
                        Next Race <ArrowRight className="h-5 w-5" />
                      </RippleButton>
                    </motion.div>
                  </Link>
                ) : (
                  <Link href="/schedule">
                    <motion.div
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <RippleButton
                        rippleColor="#22d3ee"
                        className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 text-black font-bold rounded-2xl flex items-center gap-3 shadow-lg shadow-cyan-500/20 transition-all"
                      >
                        Next Race <ArrowRight className="h-5 w-5" />
                      </RippleButton>
                    </motion.div>
                  </Link>
                )}
              </motion.div>

              {/* Stats */}
              <StatsSection />
            </div>

            {/* Right Side - Standings Box */}
            <StandingsBox drivers={standings} />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Card */}
      <div className="xl:hidden fixed bottom-0 left-0 right-0 z-20">
        <Link href="/seasons/12">
          <div className="bg-neutral-900/95 backdrop-blur-xl p-6 border-t border-neutral-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-white">Driver Standings</h3>
              <span className="text-cyan-400 text-sm font-bold">View All →</span>
            </div>
            <div className="flex gap-4 overflow-x-auto">
              <div className="flex items-center gap-2 min-w-[200px]">
                <span className="text-xl font-black text-neutral-600">1</span>
                <div className="w-1 h-10 bg-blue-500 rounded-full" />
                <div>
                  <p className="text-white font-bold text-sm">Pierre Gasly</p>
                  <p className="text-neutral-500 text-xs">Alpine F1 Team</p>
                </div>
                <span className="text-cyan-400 font-black ml-auto">286</span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}