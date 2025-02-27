// src/app/teams/[team]/page.jsx
'use client';

import { useParams } from 'next/navigation';
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { seasons, teams } from '@/lib/data';

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

const normalizeTeamName = (name) => {
  return typeof name === 'string' ? name.trim().toLowerCase().replace(/\s+/g, '-') : '';
};

const denormalizeTeamName = (normalizedName) => {
  const match = teams.find(t => normalizeTeamName(t) === normalizedName);
  return match || normalizedName.replace(/-/g, ' '); // Fallback preserves spaces
};

export default function TeamPage() {
  const params = useParams();
  const teamSlug = typeof params.team === 'string' ? params.team.trim() : '';
  const teamName = denormalizeTeamName(teamSlug);

  if (!teams.some(t => normalizeTeamName(t) === teamSlug)) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>
        <Typography variant="body1" sx={{ color: 'white' }}>Team not found.</Typography>
      </Box>
    );
  }

  const teamStats = {
    seasons: {},
    allTimePoints: 0,
    allTimePodiums: 0,
    allTimePoles: 0,
    allTimeFastestLaps: 0,
  };

  Object.entries(seasons).forEach(([season, data]) => {
    const standings = data.standings?.constructors || [];
    const teamStanding = standings.find(t => normalizeTeamName(t.constructor) === normalizeTeamName(teamName));
    const drivers = Object.entries(data.lineups || {})
      .filter(([, teamString]) => teamString.split('/').includes(teamName))
      .map(([driver]) => driver)
      .join(', ') || 'N/A';

    teamStats.seasons[season] = {
      drivers,
      points: teamStanding?.points || 'N/A',
    };

    teamStats.allTimePoints += teamStanding?.points || 0;
    teamStats.allTimePodiums += Object.values(data.races || {}).reduce((count, race) => {
      const podiumTeams = [race.podium1, race.podium2, race.podium3]
        .filter(Boolean)
        .filter(driver => (data.lineups?.[driver]?.split('/') || []).includes(teamName));
      return count + podiumTeams.length;
    }, 0);
    teamStats.allTimePoles += Object.values(data.races || {}).reduce((count, race) => {
      return count + (race.poleDriver && (data.lineups?.[race.poleDriver]?.split('/') || []).includes(teamName) ? 1 : 0);
    }, 0);
    teamStats.allTimeFastestLaps += Object.values(data.races || {}).reduce((count, race) => {
      return count + (race.fastestLapDriver && (data.lineups?.[race.fastestLapDriver]?.split('/') || []).includes(teamName) ? 1 : 0);
    }, 0);
  });

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <Typography variant="h4" gutterBottom sx={{ color: 'white' }}>
        Team: {teamName}
      </Typography>

      <Box sx={{ mb: 4, border: '1px solid #444', p: 1, borderRadius: 1, width: 'fit-content', maxWidth: '100%', overflow: 'hidden' }}>
        <Typography variant="h6" sx={{ color: 'white' }}>Season-by-Season Stats</Typography>
        <Table sx={{ color: 'white', tableLayout: 'fixed', width: '600px' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'white', borderColor: '#444', width: '100px' }}>Season</TableCell>
              <TableCell sx={{ color: 'white', borderColor: '#444', width: '300px' }}>Drivers</TableCell>
              <TableCell sx={{ color: 'white', borderColor: '#444', width: '100px' }}>Points</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(teamStats.seasons).map(([season, stats]) => (
              <TableRow key={season}>
                <TableCell sx={{ color: 'white', borderColor: '#444' }}>{season}</TableCell>
                <TableCell sx={{ color: 'white', borderColor: '#444' }}>{stats.drivers}</TableCell>
                <TableCell sx={{ color: 'white', borderColor: '#444' }}>
                  {typeof stats.points === 'string' ? (
                    <Typography sx={{ color: '#888', fontStyle: 'italic' }}>{stats.points}</Typography>
                  ) : (
                    stats.points
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      <Box sx={{ border: '1px solid #444', p: 1, borderRadius: 1, width: 'fit-content', maxWidth: '100%', overflow: 'hidden' }}>
        <Typography variant="h6" sx={{ color: 'white' }}>All-Time Stats</Typography>
        <Typography sx={{ color: 'white' }}>
          Total Points: {teamStats.allTimePoints || <Typography component="span" sx={{ color: '#888', fontStyle: 'italic' }}>Unavailable</Typography>}
        </Typography>
        <Typography sx={{ color: 'white' }}>
          Total Podiums: {teamStats.allTimePodiums || <Typography component="span" sx={{ color: '#888', fontStyle: 'italic' }}>Unavailable</Typography>}
        </Typography>
        <Typography sx={{ color: 'white' }}>
          Total Poles: {teamStats.allTimePoles || <Typography component="span" sx={{ color: '#888', fontStyle: 'italic' }}>Unavailable</Typography>}
        </Typography>
        <Typography sx={{ color: 'white' }}>
          Total Fastest Laps: {teamStats.allTimeFastestLaps || <Typography component="span" sx={{ color: '#888', fontStyle: 'italic' }}>Unavailable</Typography>}
        </Typography>
      </Box>
    </Box>
  );
}