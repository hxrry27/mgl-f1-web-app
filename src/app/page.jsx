// src/app/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Link } from '@mui/material';
import { lighten } from '@mui/material/styles';
import Image from 'next/image';
import { trackData } from '@/lib/data';

function isBST(date) {
  const year = date.getUTCFullYear();
  // Last Sunday of March
  const marchLastSunday = new Date(Date.UTC(year, 2, 31 - ((new Date(year, 2, 31).getUTCDay() + 7) % 7), 2));
  // Last Saturday (day before)
  const marchLastSaturday = new Date(marchLastSunday);
  marchLastSaturday.setUTCDate(marchLastSunday.getUTCDate() - 1);
  const octLastSunday = new Date(Date.UTC(year, 9, 31 - ((new Date(year, 9, 31).getUTCDay() + 7) % 7), 2));
  console.log('isBST Debug:', {
    date: date.toISOString(),
    marchLastSaturday: marchLastSaturday.toISOString(),
    octLastSunday: octLastSunday.toISOString(),
    isBST: date.getTime() >= marchLastSaturday.getTime() && date.getTime() < octLastSunday.getTime()
  });
  return date.getTime() >= marchLastSaturday.getTime() && date.getTime() < octLastSunday.getTime();
}

function formatRaceDateTime(isoDate, time) {
  try {
    const dateParts = isoDate.split('-');
    const date = new Date(Date.UTC(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10)));
    if (isNaN(date.getTime())) throw new Error('Invalid Date');

    const [hours, minutes] = (time || '19:00:00').split(':');
    let utcHours = parseInt(hours, 10);
    date.setUTCHours(utcHours, parseInt(minutes, 10), 0, 0);

    // Adjust for BST to keep UK local time consistent
    if (isBST(date)) utcHours -= 1;
    date.setUTCHours(utcHours, parseInt(minutes, 10), 0, 0);

    const userTime = date.toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    const day = date.getUTCDate();
    const month = date.toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' });
    const year = date.getUTCFullYear();
    const ordinal = (d) => {
      if (d > 3 && d < 21) return 'th';
      switch (d % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };

    return `${day}${ordinal(day)} ${month} ${year} - ${userTime}`;
  } catch (error) {
    console.error('Date Format Error:', error, { isoDate, time });
    return 'TBD';
  }
}

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
  'spielberg': 'Red Bull Ring',
  'barcelona': 'Circuit de Barcelona-Catalunya',
};

export default function HomePage() {
  const [nextRace, setNextRace] = useState({
    track: 'bahrain',
    season: '11',
    date: 'TBD',
    trackName: 'Bahrain International Circuit',
    country: 'BAHRAIN'
  });
  const [lastSeasonPodium, setLastSeasonPodium] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch the next race
        const nextRaceRes = await fetch('/api/schedule/next-race');
        const nextRaceData = await nextRaceRes.json();
        const track = nextRaceData.track || 'bahrain';
        const season = nextRaceData.season || '11';
        
        // Get track info
        const country = trackData[track]?.country || track.toUpperCase();
        const trackName = trackNames[track] || track.replace(/-/g, ' ');
        
        // Fetch schedule details for the race
        const scheduleRes = await fetch(`/api/schedule?season=${season}&track=${track}`);
        const scheduleData = await scheduleRes.json();
        console.log('Homepage Schedule Data:', scheduleData);
        
        // Format the date
        const formattedDate = scheduleData.date && scheduleData.date !== 'TBD'
          ? formatRaceDateTime(scheduleData.date, scheduleData.time)
          : 'TBD';
        
        // Set the next race info
        setNextRace({
          track: track,
          season: season,
          date: formattedDate,
          trackName: trackName,
          country: country
        });

        // Fetch last season's podium for this track
        const lastSeason = parseInt(season) - 1;
        const podiumRes = await fetch(`/api/results/${lastSeason}/${track}`);
        const podiumData = await podiumRes.json();
        setLastSeasonPodium(podiumData.slice(0, 3).map(row => row.driver) || []);
      } catch (err) {
        console.error('Fetch error:', err);
        // Fallback to default values
        setNextRace({
          track: 'bahrain',
          season: '11',
          date: 'TBD',
          trackName: 'Bahrain International Circuit',
          country: 'BAHRAIN'
        });
        setLastSeasonPodium([]);
      }
    };
    
    fetchData();
  }, []);

  return (
    <Box sx={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0e27', color: 'white' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '80%', maxWidth: '1200px', gap: 4 }}>
        <Box sx={{ maxWidth: '50%' }}>
          <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>MGL F1</Typography>
          <Typography variant="h5" gutterBottom>Speed, Performance, Trophies. Something none of us really see.</Typography>
          <Typography variant="body1" paragraph>
            A work in progress site, to track all our stats, seasons, and shitbox performances over the last 4 years in the F1 series of games by C*demasters and EASp*rts
          </Typography>
          <Link href="/standings/season/11" style={{ textDecoration: 'none' }}>
            <Box component="button" sx={{ mt: 2, px: 3, py: 1.5, borderRadius: 1, backgroundColor: '#1976d2', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '1rem', '&:hover': { backgroundColor: lighten('#1976d2', 0.1) } }}>
              Current Season
            </Box>
          </Link>
        </Box>
        <Link href={`/tracks/${nextRace.track}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <Box sx={{ minWidth: 500, alignContent: 'center', border: '1px solid #444', borderRadius: 2, p: 2, backgroundColor: '#0a0e27', transition: 'transform 0.2s ease', '&:hover': { transform: 'scale(1.05)', borderColor: '#00A0F0' } }}>
            <Box sx={{ position: 'relative', height: { xs: 400, md: 350 }, width: '100%' }}>
              <Image 
                src={`/images/tracks/${nextRace.track}.png`} 
                alt={`${nextRace.trackName} Track Map`} 
                layout="fill" 
                objectFit="contain" 
                onError={(e) => {
                  console.log(`${nextRace.track} track map not found`);
                  e.target.src = "/images/tracks/default.png";
                }} 
              />
            </Box>
            <Typography variant="h6" gutterBottom>{nextRace.country} - {nextRace.trackName}</Typography>
            <Typography variant="body2" gutterBottom>Date: {nextRace.date}</Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Last Season Podium (S{parseInt(nextRace.season) - 1}):</Typography>
              {lastSeasonPodium.length > 0 ? (
                lastSeasonPodium.map((driver, index) => (
                  <Typography key={index} variant="body2">{index + 1}. {driver}</Typography>
                ))
              ) : (
                <Typography variant="body2">No podium recorded for S{parseInt(nextRace.season) - 1}</Typography>
              )}
            </Box>
          </Box>
        </Link>
      </Box>
    </Box>
  );
}