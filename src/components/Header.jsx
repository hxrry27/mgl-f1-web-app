// src/components/Header.jsx
'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  Fade,
} from '@mui/material';
import { lighten } from '@mui/material/styles';
import { headerResults, seasons, drivers, teams } from '@/lib/data';

// Map slugs to full track names
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
  { label: 'Results', hasDropdown: true },
  { label: 'Standings', hasDropdown: true },
  { label: 'Drivers', hasDropdown: true },
  { label: 'Teams', hasDropdown: true },
  { label: 'Tracks', hasDropdown: true },
  { label: 'Schedule', hasDropdown: false },
  { label: 'Dashboard', hasDropdown: false },
];

export default function Header() {
  const [activeItem, setActiveItem] = useState(null);
  const [nextRace, setNextRace] = useState({ track: 'bahrain', date: null });
  const timeoutRef = React.useRef(null);

  useEffect(() => {
    async function fetchNextRace() {
      try {
        // Fetch next race from the schedule database
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

  const nextRaceName = trackNames[nextRace.track] || nextRace.track.replace(/-/g, ' ');
  const nextRaceDate = nextRace.date
    ? new Date(nextRace.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    : '';

  return (
    <>
      <Box sx={{ backgroundColor: '#1976d2', py: 1, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: '#fff' }}>
          Next Race: {nextRaceName} {nextRaceDate && `— ${nextRaceDate}`} —{' '}
          <Link href={`/tracks/${nextRace.track}`} style={{ color: 'white', textDecoration: 'underline' }}>
            View Details
          </Link>
        </Typography>
      </Box>
      <AppBar position="static" sx={{ backgroundColor: '#0a0e27', boxShadow: 'none', borderBottom: '1px solid #444' }}>
        <Toolbar sx={{ minHeight: 64, px: { xs: 2, md: 4 } }}>
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mr: 4, display: 'flex', alignItems: 'center', height: '100%', pb: 0.5 }}>
              MGL F1
            </Typography>
          </Link>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            {NAV_ITEMS.map((item) => (
              <Box
                key={item.label}
                sx={{ position: 'relative' }}
                onMouseEnter={item.hasDropdown ? () => handleMouseEnter(item.label) : undefined}
                onMouseLeave={item.hasDropdown ? handleMouseLeave : undefined}
              >
                {item.hasDropdown ? (
                  <Typography
                    variant="body1"
                    sx={{
                      cursor: 'pointer',
                      color: activeItem === item.label ? lighten('#fff', 0.3) : '#fff',
                      borderBottom: activeItem === item.label ? '2px solid #fff' : '2px solid transparent',
                      pb: 0.5,
                      transition: 'all 0.2s ease',
                      fontSize: '1.1rem',
                    }}
                  >
                    {item.label}
                  </Typography>
                ) : (
                  <Link href={item.label === 'Dashboard' ? '/dashboard' : '/schedule'} style={{ textDecoration: 'none' }}>
                    <Typography
                      variant="body1"
                      sx={{
                        cursor: 'pointer',
                        color: activeItem === item.label ? lighten('#fff', 0.3) : '#fff',
                        borderBottom: '2px solid transparent',
                        pb: 0.5,
                        transition: 'all 0.2s ease',
                        fontSize: '1.1rem',
                        '&:hover': { color: lighten('#fff', 0.3) },
                      }}
                    >
                      {item.label}
                    </Typography>
                  </Link>
                )}
                {item.hasDropdown && (
                  <Fade in={activeItem === item.label} timeout={200}>
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        minWidth: 200,
                        backgroundColor: '#0a0e27',
                        border: '1px solid #444',
                        borderRadius: 1,
                        zIndex: 1300,
                        py: 1,
                      }}
                    >
                      {getSubMenuContent(item.label).map((submenu) => (
                        <Link key={submenu.label} href={submenu.href} style={{ textDecoration: 'none', color: '#fff' }}>
                          <Box sx={{ px: 2, py: 1, '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' } }}>
                            <Typography variant="body2">{submenu.label}</Typography>
                          </Box>
                        </Link>
                      ))}
                    </Box>
                  </Fade>
                )}
              </Box>
            ))}
          </Box>
        </Toolbar>
      </AppBar>
    </>
  );
}