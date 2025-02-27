// src/app/tracks/[track]/page.jsx
'use client';

import { useParams } from 'next/navigation';
import { Box, Typography, Divider, Grid, List, ListItem } from '@mui/material';
import Image from 'next/image';
import { seasons, trackData } from '@/lib/data';

const teamColors = {
  'Williams': '#00A0F0',
  'Renault': '#FFF500',
  'McLaren': '#FF8700',
  'Haas': '#FFFFFF',
  'Alfa Romeo': '#900000',
  'Alpha Tauri': '#2B4562',
  'Aston Martin': '#006F62',
  'Alpine': '#2293D1',
  'Mercedes': '#00D2BE',
  'Ferrari': '#DC0000',
  'Red Bull': '#1E41FF',
  'Racing Point': '#F596C8',
  'Toro Rosso': '#0000FF',
};

const lightTeams = ['Haas', 'Mercedes', 'Renault'];

export default function TrackPage() {
  const params = useParams();
  const track = params.track;

  // Get dynamic track info
  const trackInfo = trackData[track] || {
    country: 'UNKNOWN',
    name: 'Unknown Circuit',
    length: 'N/A',
    turns: 'N/A',
    firstGrandPrix: 'N/A',
    laps: 'N/A',
  };
  const halfLaps = trackInfo.laps !== 'N/A' ? Math.round(trackInfo.laps / 2) : 'N/A';

  // Aggregate historical results
  const historicalResults = Object.entries(seasons)
    .reduce((acc, [season, data]) => {
      const race = data.races?.[track];
      if (race) {
        const podium = [race.podium1, race.podium2, race.podium3].filter(Boolean);
        const winner = podium[0] || null;
        const winnerTeam = winner ? (data.lineups?.[winner]?.split('/')[0] || 'N/A') : 'N/A';
        const fastestLap = race.fastestLapDriver ? {
          driver: race.fastestLapDriver,
          time: race.fastestLapTime || 'N/A',
          season,
          team: data.lineups?.[race.fastestLapDriver]?.split('/')[0] || 'N/A',
        } : null;

        acc.push({
          season,
          winner,
          team: winnerTeam,
          podium: podium.length > 0 ? podium : [],
          fastestLap: fastestLap ? `${fastestLap.driver} (${fastestLap.time})` : 'N/A',
          pole: race.poleDriver || 'N/A',
          fastestLapData: fastestLap,
        });
      }
      return acc;
    }, [])
    .sort((a, b) => Number(b.season) - Number(a.season));

  const significantResults = historicalResults.filter(result => 
    result.podium.length > 0 || result.fastestLap !== 'N/A' || result.pole !== 'N/A'
  );

  // Previous Winners
  const previousWinners = significantResults
    .filter(result => result.winner)
    .map(result => ({
      driver: result.winner,
      team: result.team,
      season: `${result.season}`,
    }));

  // Most Successful Driver(s)
  const winnerCounts = previousWinners.reduce((acc, { driver }) => {
    acc[driver] = (acc[driver] || 0) + 1;
    return acc;
  }, {});
  const maxWins = Math.max(...Object.values(winnerCounts));
  const mostSuccessfulDrivers = Object.entries(winnerCounts)
    .filter(([, wins]) => wins === maxWins)
    .map(([driver]) => driver)
    .sort((a, b) => a.localeCompare(b));
  const mostSuccessfulText = mostSuccessfulDrivers.length > 0 
    ? `${mostSuccessfulDrivers.join(' / ')} - ${maxWins} win${maxWins !== 1 ? 's' : ''}`
    : 'No wins recorded';

  // Fastest Historical Race Lap
  const fastestLap = significantResults
    .filter(result => result.fastestLapData && result.fastestLapData.time !== 'N/A')
    .reduce((fastest, result) => {
      const timeInSeconds = result.fastestLapData.time.split(':').reduce((acc, part) => acc * 60 + parseFloat(part), 0);
      if (!fastest || timeInSeconds < fastest.timeInSeconds) {
        return {
          driver: result.fastestLapData.driver,
          time: result.fastestLapData.time,
          timeInSeconds,
          season: result.fastestLapData.season,
          team: result.fastestLapData.team,
        };
      }
      return fastest;
    }, null);

  // Most Poles
  const poleCounts = significantResults.reduce((acc, result) => {
    if (result.pole && result.pole !== 'N/A') {
      acc[result.pole] = (acc[result.pole] || 0) + 1;
    }
    return acc;
  }, {});
  const maxPoles = Math.max(...Object.values(poleCounts));
  const mostPoleDrivers = Object.entries(poleCounts)
    .filter(([, poles]) => poles === maxPoles)
    .map(([driver]) => driver)
    .sort((a, b) => a.localeCompare(b));
  const mostPolesText = mostPoleDrivers.length > 0
    ? `${mostPoleDrivers.join(' / ')} - ${maxPoles} pole${maxPoles !== 1 ? 's' : ''}`
    : 'No poles recorded';

  // Most Podiums
  const podiumCounts = significantResults.reduce((acc, result) => {
    result.podium.forEach((driver) => {
      acc[driver] = (acc[driver] || 0) + 1;
    });
    return acc;
  }, {});
  const maxPodiums = Math.max(...Object.values(podiumCounts));
  const mostPodiumDrivers = Object.entries(podiumCounts)
    .filter(([, podiums]) => podiums === maxPodiums)
    .map(([driver]) => driver)
    .sort((a, b) => a.localeCompare(b));
  const mostPodiumsText = mostPodiumDrivers.length > 0
    ? `${mostPodiumDrivers.join(' / ')} - ${maxPodiums} podium${maxPodiums !== 1 ? 's' : ''}`
    : 'No podiums recorded';

  return (
    <Box sx={{ pt: 15, pl: 80, pr: 80 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        <Box sx={{ flex: '1 1 300px' }}>
          <Typography variant="h4" sx={{ mb: 2, color: 'white' }}>
            {trackInfo.country}
          </Typography>
          <Typography sx={{ color: 'white' }}>Track Name: {trackInfo.name}</Typography>
          <Typography sx={{ color: 'white' }}>Circuit Length: {trackInfo.length} km</Typography>
          <Typography sx={{ color: 'white' }}>Turns: {trackInfo.turns}</Typography>
          <Typography sx={{ color: 'white' }}>First Grand Prix: {trackInfo.firstGrandPrix}</Typography>
          <Typography sx={{ color: 'white' }}>Laps (50%): {Math.round(trackInfo.laps / 2)}</Typography>
        </Box>
        <Box sx={{ flex: '0 0 auto', position: 'relative', height: 500, width: 900, pr: 5 }}>
          <Image
            src={`/images/tracks/${track}.png`}
            alt={`${trackInfo.name} Track Map`}
            layout="fill"
            objectFit="contain"
            onError={() => console.log(`No image found for ${track}`)}
          />
        </Box>
      </Box>
      <Divider sx={{ my: 3, borderColor: '#444' }} />

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Left Column - Previous Winners */}
        <Grid item xs={12} md={4}>
          <Box sx={{ border: '1px solid #444', borderRadius: 1, p: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>Previous Winners</Typography>
            {previousWinners.length > 0 ? (
              <List dense sx={{ maxHeight: 300, overflowY: 'auto' }}>
                {previousWinners.map((win, index) => (
                  <ListItem key={index} sx={{ py: 0 }}>
                    <Typography sx={{ display: 'flex', alignItems: 'center', color: 'white' }}>
                      {win.driver}{' '}
                      <Box
                        sx={{
                          backgroundColor: teamColors[win.team] || '#444',
                          color: lightTeams.includes(win.team) ? 'black' : 'white',
                          px: 0.5,
                          py: 0.2,
                          borderRadius: 1,
                          ml: 1,
                          mr: 1,
                          fontSize: '0.8rem',
                        }}
                      >
                        {win.team}
                      </Box>
                      <Typography component="span" sx={{ color: '#888' }}>- S{win.season}</Typography>
                    </Typography>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography sx={{ color: 'white' }}>No previous winners recorded.</Typography>
            )}
          </Box>
        </Grid>

        {/* Right 2x2 Grid */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ border: '1px solid #444', borderRadius: 1, p: 2, height: 120 }}>
                <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>Fastest Race Lap</Typography>
                {fastestLap ? (
                  <Typography sx={{ display: 'flex', alignItems: 'center', color: 'white' }}>
                    {fastestLap.driver}{' '}
                    <Box
                      sx={{
                        backgroundColor: teamColors[fastestLap.team] || '#444',
                        color: lightTeams.includes(fastestLap.team) ? 'black' : 'white',
                        px: 0.5,
                        py: 0.2,
                        borderRadius: 1,
                        ml: 1,
                        mr: 1,
                        fontSize: '0.8rem',
                      }}
                    >
                      {fastestLap.team}
                    </Box>
                    - {fastestLap.time} (S{fastestLap.season})
                  </Typography>
                ) : (
                  <Typography sx={{ color: 'white' }}>No fastest lap recorded.</Typography>
                )}
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ border: '1px solid #444', borderRadius: 1, p: 2, height: 120 }}>
                <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>Most Successful Driver</Typography>
                <Typography sx={{ color: 'white' }}>{mostSuccessfulText}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ border: '1px solid #444', borderRadius: 1, p: 2, height: 120 }}>
                <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>Most Poles</Typography>
                <Typography sx={{ color: 'white' }}>{mostPolesText}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ border: '1px solid #444', borderRadius: 1, p: 2, height: 120 }}>
                <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>Most Podiums</Typography>
                <Typography sx={{ color: 'white' }}>{mostPodiumsText}</Typography>
              </Box>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Full Historical Results */}
      <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>Full Historical Results</Typography>
      {significantResults.length > 0 ? (
        <Box sx={{ border: '1px solid #444', borderRadius: 1, overflow: 'hidden', backgroundColor: '#0a0e27' }}>
          {significantResults.map((result, index) => (
            <Box key={index} sx={{ p: 1, backgroundColor: index % 2 === 0 ? '#0a0e27' : '#1a1e37' }}>
              <Typography sx={{ color: 'white' }}><strong>Season {result.season}</strong></Typography>
              <Typography sx={{ color: 'white' }}>Podium: {result.podium.length > 0 ? result.podium.join(', ') : 'N/A'}</Typography>
              <Typography sx={{ color: 'white' }}>Fastest Lap: {result.fastestLap}</Typography>
              <Typography sx={{ color: 'white' }}>Pole: {result.pole}</Typography>
            </Box>
          ))}
        </Box>
      ) : (
        <Typography sx={{ color: 'white' }}>No significant historical results available.</Typography>
      )}
    </Box>
  );
}