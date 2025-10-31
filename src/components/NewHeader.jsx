'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Users,
  UsersRound,
  LayoutDashboard,
  Menu,
  X,
  Trophy,
  BarChart2,
  MapPin,
  RefreshCw,
  ArrowUpRight
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Toast,
  ToastProvider,
  ToastViewport,
} from "@/components/ui/toast";
import { AuroraText } from "@/components/ui/aurora-text";

// Import the original data sources
import { headerResults, seasons, drivers, teams } from '@/lib/data';

// Helper functions from original Header
const trackNames = {
  'bahrain': 'Bahrain International Circuit',
  'jeddah': 'Jeddah Corniche Circuit',
  'yas-marina': 'Yas Marina Circuit',
  'melbourne': 'Albert Park Circuit',
  'suzuka': 'Suzuka International Racing Course',
  'shanghai': 'Shanghai International Circuit',
  'baku': 'Baku City Circuit',
  'miami': 'Miami International Autodrome',
  'monaco': 'Circuit de Monaco',
  'montreal': 'Circuit Gilles Villeneuve',
  'catalunya': 'Circuit de Barcelona-Catalunya',
  'red-bull-ring': 'Red Bull Ring',
  'silverstone': 'Silverstone Circuit',
  'hungaroring': 'Hungaroring',
  'spa': 'Circuit de Spa-Francorchamps',
  'zandvoort': 'Circuit Zandvoort',
  'monza': 'Autodromo Nazionale Monza',
  'marina-bay': 'Marina Bay Street Circuit',
  'austin': 'Circuit of The Americas',
  'mexico': 'Autodromo Hermanos Rodriguez',
  'interlagos': 'Autodromo Jose Carlos Pace',
  'las-vegas': 'Las Vegas Strip Circuit',
  'lusail': 'Lusail International Circuit',
  'portimao': 'Algarve International Circuit',
  'paul-ricard': 'Circuit Paul Ricard',
};

const trackData = {
  bahrain: { country: 'BAHRAIN' },
  jeddah: { country: 'SAUDI ARABIA' },
  melbourne: { country: 'AUSTRALIA' },
  baku: { country: 'AZERBAIJAN' },
  miami: { country: 'MIAMI' },
  imola: { country: 'EMILIA-ROMAGNA' },
  monaco: { country: 'MONACO' },
  barcelona: { country: 'SPAIN' },
  montreal: { country: 'CANADA' },
  spielberg: { country: 'AUSTRIA' },
  silverstone: { country: 'GREAT BRITAIN' },
  hungaroring: { country: 'HUNGARY' },
  'spa-francorchamps': { country: 'BELGIUM' },
  zandvoort: { country: 'NETHERLANDS' },
  monza: { country: 'ITALY' },
  singapore: { country: 'SINGAPORE' },
  suzuka: { country: 'JAPAN' },
  losail: { country: 'QATAR' },
  austin: { country: 'AUSTIN' },
  mexico: { country: 'MEXICO' },
  interlagos: { country: 'BRAZIL' },
  'las-vegas': { country: 'LAS VEGAS' },
  'yas-marina': { country: 'ABU DHABI' },
  portimao: { country: 'PORTUGAL' },
  'paul-ricard': { country: 'FRANCE' },
  shanghai: { country: 'CHINA' },
  russia: { country: 'RUSSIA' },
};

// Placeholder Logo SVG Component
function PlaceholderLogo() {
  return (
    <svg 
      width="48" 
      height="48" 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-lg"
    >
      {/* Outer ring */}
      <circle 
        cx="24" 
        cy="24" 
        r="22" 
        stroke="url(#gradient1)" 
        strokeWidth="2"
        fill="none"
      />
      
      {/* Inner racing flag pattern */}
      <path
        d="M 24 8 L 28 12 L 24 16 L 20 12 Z"
        fill="url(#gradient2)"
      />
      <path
        d="M 32 16 L 36 20 L 32 24 L 28 20 Z"
        fill="#ffffff"
        opacity="0.9"
      />
      <path
        d="M 16 16 L 20 20 L 16 24 L 12 20 Z"
        fill="url(#gradient2)"
      />
      <path
        d="M 24 24 L 28 28 L 24 32 L 20 28 Z"
        fill="#ffffff"
        opacity="0.9"
      />
      <path
        d="M 32 32 L 36 36 L 32 40 L 28 36 Z"
        fill="url(#gradient2)"
      />
      <path
        d="M 16 32 L 20 36 L 16 40 L 12 36 Z"
        fill="#ffffff"
        opacity="0.9"
      />
      
      {/* Speed lines */}
      <path
        d="M 8 24 L 15 24"
        stroke="url(#gradient3)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M 33 24 L 40 24"
        stroke="url(#gradient3)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* Gradients */}
      <defs>
        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
        <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
          <stop offset="50%" stopColor="#06b6d4" stopOpacity="1" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}



// Full-screen menu component
function FullScreenMenu({ isOpen, onClose, isRefreshing, onRefreshCache, latestSeason }) {
  const [hoveredItem, setHoveredItem] = useState(null);

  const menuItems = [
    { label: 'Home', href: '/', icon: null },
    { label: 'Seasons', href: `/seasons/${latestSeason}`, icon: <BarChart2 size={24} /> },
    { label: 'Races', href: '/races', icon: <Trophy size={24} /> },
    { label: 'Drivers', href: '/drivers', icon: <Users size={24} /> },
    { label: 'Teams', href: '/teams', icon: <UsersRound size={24} /> },
    { label: 'Tracks', href: '/tracks', icon: <MapPin size={24} /> },
    { label: 'Calendar', href: '/schedule', icon: <Calendar size={24} /> },
    { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={24} /> },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
            initial={{ clipPath: 'inset(0% 0% 100% 0%)' }}
            animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
            exit={{ clipPath: 'inset(0% 0% 100% 0%)' }}
            transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 bg-[var(--color-test)] z-[90]"
            >
          <div className="flex flex-col justify-center items-end h-full px-8 md:px-20">
            {/* Cache Refresh Button */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="absolute top-24 right-8"
            >
              <Button
                onClick={onRefreshCache}
                disabled={isRefreshing}
                className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-full px-6 py-2 flex items-center gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                <span className="text-sm font-medium">
                  {isRefreshing ? 'Refreshing...' : 'Refresh Cache'}
                </span>
              </Button>
            </motion.div>

            {/* Menu Items */}
            <div className="w-full max-w-2xl space-y-2 flex flex-col items-end">
              {menuItems.map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + index * 0.05 }}
                >
                  <Link
                    href={item.href}
                    className="group flex items-center justify-between w-full px-8 py-6 rounded-2xl text-white hover:bg-neutral-900/50 transition-all border border-transparent hover:border-cyan-500/20"
                    onClick={onClose}
                    onMouseEnter={() => setHoveredItem(index)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className="flex items-center gap-4">
                      {item.icon && (
                        <span className="text-cyan-400 group-hover:scale-110 transition-transform">
                          {item.icon}
                        </span>
                      )}
                      <span className="text-4xl md:text-5xl font-black inline-flex overflow-hidden">
                        {item.label.toUpperCase().split('').map((char, charIndex) => (
                          <motion.span
                            key={charIndex}
                            className="inline-block"
                            animate={hoveredItem === index ? {
                              y: [0, -12, 0],
                              color: '#22d3ee',
                              transition: {
                                duration: 0.5,
                                delay: charIndex * 0.05,
                                ease: "easeInOut"
                              }
                            } : {
                              y: 0,
                              color: '#ffffff',
                              transition: {
                                duration: 0.5,
                                delay: (item.label.length - charIndex) * 0.05,
                                ease: "easeInOut"
                              }
                            }}
                          >
                            {char === ' ' ? '\u00A0' : char}
                          </motion.span>
                        ))}
                      </span>
                    </div>
                    <ArrowUpRight className="h-8 w-8 text-neutral-600 group-hover:text-cyan-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                  </Link>
                </motion.div>
              ))}
            </div>
            
            {/* Season Info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute bottom-8 text-center"
            >
              <p className="text-neutral-500 text-sm font-medium">
                Season 12 • 2025
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Race Notification component
function RaceNotification({ nextRace, onClose }) {
  if (!nextRace || !nextRace.track) return null;
  
  const nextRaceName = trackNames[nextRace.track] || nextRace.track.replace(/-/g, ' ');
  const nextRaceDate = nextRace.date
    ? new Date(nextRace.date).toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      })
    : 'Date TBA';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-20 right-4 z-[60] w-96 max-w-[90vw]"
    >
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                Next Race
              </span>
              <h3 className="text-xl font-black text-neutral-900 mt-2">
                {nextRaceName}
              </h3>
              <p className="text-sm text-neutral-600 mt-1">{nextRaceDate}</p>
            </div>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-900 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <Link
            href={`/tracks/${nextRace.track}`}
            className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-black font-bold rounded-xl hover:shadow-lg transition-shadow"
          >
            <span>View Track Details</span>
            <ArrowUpRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// Cache Refresh Success Notification
function CacheRefreshNotification({ show, onClose }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-20 right-4 z-[60] w-96 max-w-[90vw]"
    >
      <div className="bg-green-500 rounded-2xl shadow-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-full p-2">
            <RefreshCw className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-bold">Cache Refreshed!</p>
            <p className="text-white/80 text-sm">Data has been updated successfully</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Main Header Component
export default function NewHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRefreshSuccess, setShowRefreshSuccess] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [nextRace, setNextRace] = useState(null);
  const [latestSeason, setLatestSeason] = useState(12);

  // Handle cache refresh
  const handleRefreshCache = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/refresh-cache', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        setShowRefreshSuccess(true);
        setIsMenuOpen(false);
        
        // Force reload after a short delay
        setTimeout(() => {
          window.location.reload(true);
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to refresh cache:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Check notification dismissed status
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const lastDismissed = localStorage.getItem('raceNotificationDismissed');
    
    if (lastDismissed !== today) {
      setShowNotification(true);
    }
  }, []);

  // Handle notification dismiss
  const handleNotificationDismiss = () => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('raceNotificationDismissed', today);
    setShowNotification(false);
  };

  // Fetch latest season on mount
    useEffect(() => {
    async function fetchLatestSeason() {
        try {
        const response = await fetch('/api/header-data');
        const data = await response.json();
        if (data.seasons && data.seasons.length > 0) {
            // seasons array is ordered DESC, so [0] is the latest
            setLatestSeason(data.seasons[0]);
        }
        } catch (error) {
        console.error('Error fetching latest season:', error);
        // Falls back to default value of 12
        }
    }
    fetchLatestSeason();
    }, []);

  // Fetch next race data
  useEffect(() => {
    async function fetchNextRace() {
      try {
        const response = await fetch('/api/schedule/next-race');
        if (!response.ok) {
          throw new Error('Failed to fetch next race data');
        }
        
        const data = await response.json();
        if (data && data.track) {
          const raceDate = data.date ? new Date(data.date) : null;
          setNextRace({ 
            track: data.track, 
            date: raceDate ? raceDate.toISOString() : null 
          });
        } else {
          setNextRace({ track: 'bahrain', date: null });
        }
      } catch (error) {
        console.error('Error fetching next race:', error);
        setNextRace({ track: 'bahrain', date: null });
      }
    }
    
    fetchNextRace();
  }, []);

  return (
    <>
      <ToastProvider>
        {/* Invisible Header - Fixed at top */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] px-6 py-6 pointer-events-none"
        >
          <div className="flex items-center justify-between w-full">
            {/* Left: MGLF1 Logo Text */}
            <Link href="/" className="group pointer-events-auto">
                <motion.h1
                    className="text-3xl md:text-4xl font-black leading-none tracking-tighter"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400 }}
                >
                    <span className="text-white">MGL</span>
                    <AuroraText className="text-3xl md:text-4xl">F1</AuroraText>
                </motion.h1>
            </Link>

            {/* Center: Placeholder Logo 
            <Link href="/" className="absolute left-1/2 transform -translate-x-1/2">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <PlaceholderLogo />
              </motion.div>
            </Link>*/}

            {/* Right: Menu Button */}
            <motion.button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-14 h-14 flex items-center justify-center bg-neutral-900/80 backdrop-blur-xl hover:bg-neutral-800 transition-all rounded-2xl border border-neutral-800 pointer-events-auto"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-white" />
              ) : (
                <Menu className="w-6 h-6 text-white" />
              )}
            </motion.button>
          </div>
        </motion.header>

        {/* Full Screen Menu */}
        <FullScreenMenu
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          isRefreshing={isRefreshing}
          onRefreshCache={handleRefreshCache}
          latestSeason={latestSeason}
        />

        {/* Race Notification */}
        {showNotification && (
          <RaceNotification 
            nextRace={nextRace}
            onClose={handleNotificationDismiss}
          />
        )}

        {/* Cache Refresh Success Notification */}
        <CacheRefreshNotification 
          show={showRefreshSuccess}
          onClose={() => setShowRefreshSuccess(false)}
        />

        <ToastViewport className="fixed top-4 right-4 flex flex-col gap-2 w-96 max-w-[90vw]" />
      </ToastProvider>
    </>
  );
}