'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Gauge,
  Flag,
  Car,
  Calendar,
  Users,
  UsersRound,
  LayoutDashboard,
  Menu,
  X,
  ChevronDown,
  Trophy,
  BarChart2,
  MapPin,
  Bell,
  AlertCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

// Import the original data sources
import { headerResults, seasons, drivers, teams } from '@/lib/data';

// Helper functions
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

// Helper functions
const getAllTeams = () => teams.sort();

const getAllTracks = () => {
  const trackSet = new Set();
  Object.values(seasons).forEach((season) => {
    Object.keys(season.races || {}).forEach((track) => trackSet.add(track));
  });
  return Array.from(trackSet).sort((a, b) => {
    const countryA = trackData[a]?.country || a;
    const countryB = trackData[b]?.country || b;
    return countryA.localeCompare(countryB);
  });
};

function getSubMenuContent(item) {
  switch (item) {
    case 'Results':
      return Object.keys(headerResults)
        .sort((a, b) => a - b)
        .map((season) => ({
          label: `Season ${season}`,
          href: `/results/season/${season}/bahrain`,
        }));
    case 'Standings':
      return [
        { label: 'All-Time Standings', href: '/standings/season/overall' },
        ...Object.keys(seasons)
          .sort((a, b) => a - b)
          .map((season) => ({
            label: `Season ${season}`,
            href: `/standings/season/${season}`,
          })),
      ];
    case 'Drivers':
      return drivers.map((driver) => ({
        label: driver,
        href: `/drivers/${driver.toLowerCase().replace(/\s+/g, '-')}`,
      }));
    case 'Teams':
      return [
        { label: 'Team Lineups', href: '/teams/lineups' },
        ...getAllTeams().map((team) => ({
          label: team,
          href: `/teams/${team.toLowerCase().replace(/\s+/g, '-')}`,
        })),
      ];
    case 'Tracks':
      return getAllTracks().map((track) => ({
        label: trackData[track]?.country || track.charAt(0).toUpperCase() + track.slice(1).replace(/-/g, ' '),
        href: `/tracks/${track}`,
      }));
    default:
      return [];
  }
}

const NAV_ITEMS = [
  { label: 'Results', hasDropdown: true, icon: <Trophy size={18} /> },
  { label: 'Standings', hasDropdown: true, icon: <BarChart2 size={18} /> },
  { label: 'Drivers', hasDropdown: true, icon: <Users size={18} /> },
  { label: 'Teams', hasDropdown: true, icon: <UsersRound size={18} /> },
  { label: 'Tracks', hasDropdown: true, icon: <MapPin size={18} /> },
  { label: 'Schedule', hasDropdown: false, href: '/schedule', icon: <Calendar size={18} /> },
  { label: 'Dashboard', hasDropdown: false, href: '/dashboard', icon: <LayoutDashboard size={18} /> },
];

// Custom Race Notification component
function RaceNotification({ nextRace, onClose }) {
  if (!nextRace || !nextRace.track) return null;
  
  const nextRaceName = trackNames[nextRace.track] || nextRace.track.replace(/-/g, ' ');
  const nextRaceDate = nextRace.date
    ? new Date(nextRace.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    : '';
  
  return (
    <Toast className="bg-blue-600 border-blue-500 text-white">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        <ToastTitle className="text-white">Next Race</ToastTitle>
      </div>
      <ToastDescription className="text-white">
        {nextRaceName} {nextRaceDate && `— ${nextRaceDate}`}
      </ToastDescription>
      <ToastAction asChild altText="View details">
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-transparent border-white text-white hover:bg-blue-700"
          asChild
        >
          <Link href={`/tracks/${nextRace.track}`}>View Details</Link>
        </Button>
      </ToastAction>
      <ToastClose className="text-white hover:text-gray-200" />
    </Toast>
  );
}

export default function Header() {
  const [activeItem, setActiveItem] = useState(null);
  const [nextRace, setNextRace] = useState({ track: 'bahrain', date: null });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const timeoutRef = React.useRef(null);

  // Check if notification has been dismissed
  useEffect(() => {
    // Get current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    const lastDismissed = localStorage.getItem('raceNotificationDismissed');
    
    // Show notification if it hasn't been dismissed today
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
          // Format the date from the database
          const raceDate = data.date ? new Date(data.date) : null;
          setNextRace({ 
            track: data.track, 
            date: raceDate ? raceDate.toISOString() : null 
          });
        } else {
          // Fallback if no data is returned
          setNextRace({ track: 'bahrain', date: null });
        }
      } catch (error) {
        console.error('Error fetching next race:', error);
        setNextRace({ track: 'bahrain', date: null });
      }
    }
    
    fetchNextRace();
  }, []);

  const handleMouseEnter = (item) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveItem(item);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setActiveItem(null), 200);
  };

  return (
    <>
      {/* Toast Provider for Notifications */}
      <ToastProvider>
        {/* Main Navigation */}
        <div className="sticky top-0 z-50 w-full bg-black/80 backdrop-blur-md border-b border-gray-800">
          <div className="container mx-auto px-4 flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 text-white hover:text-blue-500 transition-colors">
              <Car className="h-6 w-6 text-blue-500" />
              <span className="font-bold text-xl">MGL<span className="text-blue-500">F1</span></span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {NAV_ITEMS.map((item) => (
                item.hasDropdown ? (
                  <div
                    key={item.label}
                    className="relative"
                    onMouseEnter={() => handleMouseEnter(item.label)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <Button 
                      variant="ghost" 
                      className={cn(
                        "flex items-center space-x-1 px-3 py-2 text-sm font-medium transition-colors",
                        activeItem === item.label 
                          ? "text-white bg-gray-800" 
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      )}
                    >
                      {item.icon && <span className="mr-1">{item.icon}</span>}
                      <span>{item.label}</span>
                      <ChevronDown size={14} />
                    </Button>
                    
                    {activeItem === item.label && (
                      <div className="absolute left-0 top-full w-56 bg-gray-900 border border-gray-700 rounded-md shadow-lg z-50 py-1 mt-1">
                        {getSubMenuContent(item.label).map((submenu) => (
                          <Link 
                            key={submenu.label} 
                            href={submenu.href}
                            className="block w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                          >
                            {submenu.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href || '/'}
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-300 hover:bg-gray-800 hover:text-white"
                  >
                    {item.icon && <span>{item.icon}</span>}
                    <span>{item.label}</span>
                  </Link>
                )
              ))}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                <DrawerTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="h-[90vh] bg-gray-950 border-l-gray-800 text-white p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <Link href="/dashboard" className="flex items-center gap-2 text-white hover:text-blue-500 transition-colors" onClick={() => setDrawerOpen(false)}>
                      <Gauge className="h-6 w-6 text-blue-500" />
                      <span className="font-bold text-xl">F1<span className="text-blue-500">Telemetry</span></span>
                    </Link>
                    <DrawerClose asChild>
                      <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white">
                        <X className="h-5 w-5" />
                        <span className="sr-only">Close menu</span>
                      </Button>
                    </DrawerClose>
                  </div>

                  <div className="flex-grow overflow-y-auto space-y-1">
                    {NAV_ITEMS.map((item) => (
                      <div key={item.label}>
                        {item.hasDropdown ? (
                          <div className="mb-3">
                            <div className="flex items-center space-x-2 p-2 text-white font-medium border-b border-gray-800">
                              {item.icon && <span>{item.icon}</span>}
                              <span>{item.label}</span>
                            </div>
                            <div className="ml-4 mt-2 space-y-1">
                              {getSubMenuContent(item.label).slice(0, 10).map((subItem) => (
                                <Link
                                  key={subItem.label}
                                  href={subItem.href}
                                  className="block p-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-md"
                                  onClick={() => setDrawerOpen(false)}
                                >
                                  {subItem.label}
                                </Link>
                              ))}
                              {getSubMenuContent(item.label).length > 10 && (
                                <Link
                                  href={item.href || '/'}
                                  className="block p-2 text-sm text-blue-500 hover:text-blue-400"
                                  onClick={() => setDrawerOpen(false)}
                                >
                                  View all {item.label.toLowerCase()}...
                                </Link>
                              )}
                            </div>
                          </div>
                        ) : (
                          <Link
                            href={item.href || '/'}
                            className="flex items-center space-x-3 p-3 rounded-md text-base font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
                            onClick={() => setDrawerOpen(false)}
                          >
                            {item.icon && <span>{item.icon}</span>}
                            <span>{item.label}</span>
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </DrawerContent>
              </Drawer>
            </div>
          </div>
        </div>

        {/* Race Notification Toast */}
        {showNotification && (
          <RaceNotification 
            nextRace={nextRace}
            onClose={handleNotificationDismiss}
          />
        )}

        <ToastViewport className="fixed top-4 right-4 flex flex-col gap-2 w-96 max-w-[90vw]" />
      </ToastProvider>
    </>
  );
}