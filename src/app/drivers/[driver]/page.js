// src/app/drivers/[driver]/page.jsx
'use client';

import { useParams } from 'next/navigation';
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { seasons, drivers } from '@/lib/data';

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

const normalizeDriverName = (name) => {
  return typeof name === 'string' ? name.trim().toLowerCase().replace(/\s+/g, '-') : '';
};

const denormalizeDriverName = (normalizedName) => {
  const match = drivers.find(d => normalizeDriverName(d) === normalizedName);
  return match || normalizedName;
};

export default function DriverPage() {
  const params = useParams();
  const driverGamertag = typeof params.driver === 'string' ? params.driver.trim() : '';
  const driverName = denormalizeDriverName(driverGamertag);

  if (!drivers.some(d => normalizeDriverName(d) === driverGamertag)) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>
        <Typography variant="body1" sx={{ color: 'white' }}>Driver not found.</Typography>
      </Box>
    );
  }

  const driverStats = {
    seasons: {},
    allTimePoints: 0,
    allTimePodiums: 0,
    allTimePoles: 0,
    allTimeFastestLaps: 0,
  };

  Object.entries(seasons).forEach(([season, data]) => {
    const standings = data.standings?.drivers || [];
    const driverStanding = standings.find(d => normalizeDriverName(d.driver) === normalizeDriverName(driverName));
    const lineup = driverStanding ? (data.lineups[driverName] || 'Unavailable') : "Didn't Race";
    const races = data.races || {};

    driverStats.seasons[season] = {
      team: lineup,
      points: driverStanding?.points || 'Unavailable',
    };

    driverStats.allTimePoints += driverStanding?.points || 0;
    driverStats.allTimePodiums += Object.values(races).reduce((count, race) => {
      const podiumDrivers = [race.podium1, race.podium2, race.podium3].filter(Boolean);
      const matched = podiumDrivers.includes(driverName);
      if (matched) {
        console.log(`Podium match in Season ${season}: ${race.podium1}, ${race.podium2}, ${race.podium3} for "${driverName}"`);
      }
      return count + (matched ? 1 : 0);
    }, 0);
    driverStats.allTimePoles += Object.values(races).reduce((count, race) => {
      const matched = race.poleDriver === driverName;
      if (matched) {
        console.log(`Pole match in Season ${season}: "${race.poleDriver}" for "${driverName}"`);
      }
      return count + (matched ? 1 : 0);
    }, 0);
    driverStats.allTimeFastestLaps += Object.values(races).reduce((count, race) => {
      const matched = race.fastestLapDriver === driverName;
      if (matched) {
        console.log(`Fastest Lap match in Season ${season}: "${race.fastestLapDriver}" for "${driverName}"`);
      }
      return count + (matched ? 1 : 0);
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
        Gamertag: {driverName}
      </Typography>

      <Box sx={{ mb: 4, border: '1px solid #444', p: 1, borderRadius: 1, width: 'fit-content', maxWidth: '100%', overflow: 'hidden' }}>
        <Typography variant="h6" sx={{ color: 'white' }}>Season-by-Season Stats</Typography>
        <Table sx={{ color: 'white', tableLayout: 'fixed', width: '540px' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'white', borderColor: '#444', width: '100px' }}>Season</TableCell>
              <TableCell sx={{ color: 'white', borderColor: '#444', width: '200px' }}>Team</TableCell>
              <TableCell sx={{ color: 'white', borderColor: '#444', width: '100px' }}>Points</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(driverStats.seasons).map(([season, stats]) => {
              const teamList = stats.team === "Didn't Race" ? [stats.team] : stats.team.split('/').filter(team => team !== 'Unavailable');
              return (
                <TableRow key={season}>
                  <TableCell sx={{ color: 'white', borderColor: '#444' }}>{season}</TableCell>
                  <TableCell sx={{ color: 'white', borderColor: '#444' }}>
                    {teamList.map((team, index) => (
                      <Box
                        key={index}
                        sx={{
                          backgroundColor: team === "Didn't Race" ? '#444' : teamColors[team] || '#444',
                          p: 0.5,
                          borderRadius: 1,
                          display: 'inline-block',
                          color: team === "Didn't Race" ? '#888' : (lightTeams.includes(team) ? 'black' : 'white'),
                          fontStyle: team === "Didn't Race" ? 'italic' : 'normal',
                          mr: teamList.length > 1 && index < teamList.length - 1 ? 0.5 : 0,
                          mb: 0.5,
                        }}
                      >
                        {team}
                      </Box>
                    ))}
                  </TableCell>
                  <TableCell sx={{ color: 'white', borderColor: '#444' }}>
                    {typeof stats.points === 'string' ? (
                      <Typography sx={{ color: '#888', fontStyle: 'italic' }}>{stats.points}</Typography>
                    ) : (
                      stats.points
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>

      <Box sx={{ border: '1px solid #444', p: 1, borderRadius: 1, width: 'fit-content', maxWidth: '100%', overflow: 'hidden' }}>
        <Typography variant="h6" sx={{ color: 'white' }}>All-Time Stats</Typography>
        <Typography sx={{ color: 'white' }}>
          Total Points: {driverStats.allTimePoints || <Typography component="span" sx={{ color: '#888', fontStyle: 'italic' }}>Unavailable</Typography>}
        </Typography>
        <Typography sx={{ color: 'white' }}>
          Total Podiums: {driverStats.allTimePodiums || <Typography component="span" sx={{ color: '#888', fontStyle: 'italic' }}>Unavailable</Typography>}
        </Typography>
        <Typography sx={{ color: 'white' }}>
          Total Poles: {driverStats.allTimePoles || <Typography component="span" sx={{ color: '#888', fontStyle: 'italic' }}>Unavailable</Typography>}
        </Typography>
        <Typography sx={{ color: 'white' }}>
          Total Fastest Laps: {driverStats.allTimeFastestLaps || <Typography component="span" sx={{ color: '#888', fontStyle: 'italic' }}>Unavailable</Typography>}
        </Typography>
      </Box>
    </Box>
  );
}