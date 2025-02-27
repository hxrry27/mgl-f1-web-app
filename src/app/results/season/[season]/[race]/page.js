// src/app/results/season/[season]/[race]/page.jsx
'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Tabs, Tab } from '@mui/material';
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

export default function RaceResultsPage() {
  const params = useParams();
  const { season, race } = params;

  // Placeholder data from seasons
  const raceData = seasons[season]?.races?.[race] || {};
  const standingsData = seasons[season]?.standings?.drivers || [];

  // Initial mock results data
  const initialResults = [
    { position: 'P1', driver: raceData.podium1 || 'hxrry27', time: '1:30:00.000', fastestLap: raceData.fastestLapDriver === raceData.podium1 ? raceData.fastestLapTime || 'N/A' : 'N/A', positionsChanged: 2, points: 25, penalties: '' },
    { position: 'P2', driver: raceData.podium2 || 'Evil Tactician', time: '1:30:05.123', fastestLap: raceData.fastestLapDriver === raceData.podium2 ? raceData.fastestLapTime || 'N/A' : 'N/A', positionsChanged: -1, points: 18, penalties: '' },
    { position: 'P3', driver: raceData.podium3 || 'MagicallyMichael', time: '1:30:10.456', fastestLap: raceData.fastestLapDriver === raceData.podium3 ? raceData.fastestLapTime || 'N/A' : 'N/A', positionsChanged: 0, points: 15, penalties: '5s' },
    { position: 'P4', driver: 'Kol_ri', time: '1:30:15.789', fastestLap: raceData.fastestLapDriver === 'Kol_ri' ? raceData.fastestLapTime || 'N/A' : 'N/A', positionsChanged: 3, points: 12, penalties: '' },
    { position: 'P5', driver: 'Xerxes', time: '1:30:20.000', fastestLap: raceData.fastestLapDriver === 'Xerxes' ? raceData.fastestLapTime || 'N/A' : 'N/A', positionsChanged: -2, points: 10, penalties: '' },
  ];

  // Transform results with team and gap
  const mockResults = initialResults.map((result, index) => {
    const team = seasons[season]?.lineups?.[result.driver]?.split('/')[0] || 'N/A';
    const leadTime = initialResults[0].time.split(':').reduce((acc, part) => acc * 60 + parseFloat(part), 0);
    const driverTime = result.time.split(':').reduce((acc, part) => acc * 60 + parseFloat(part), 0);
    const gap = index === 0 ? 'Winner' : `+${(driverTime - leadTime).toFixed(3)}s`;
    return { ...result, team, gap };
  });

  const [tabValue, setTabValue] = React.useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        p: 2,
      }}
    >
      <Typography variant="h4" gutterBottom sx={{ color: 'white', fontWeight: 'bold' }}>
        {race.charAt(0).toUpperCase() + race.slice(1).replace(/-/g, ' ')} - Season {season}
      </Typography>

      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        sx={{
          mb: 2,
          '& .MuiTabs-indicator': { backgroundColor: '#00A0F0' },
          '& .MuiTab-root': { color: 'white', fontWeight: 'bold' },
          '& .Mui-selected': { color: '#00A0F0' },
        }}
      >
        <Tab label="Race Results" />
        <Tab label="Qualifying" disabled /> {/* Placeholder for future expansion */}
      </Tabs>

      <Box
        sx={{
          border: '1px solid #444',
          p: 1,
          borderRadius: 1,
          width: 'fit-content',
          maxWidth: '100%',
          backgroundColor: '#0a0e27',
        }}
      >
        {tabValue === 0 && (
          <Table sx={{ color: 'white', tableLayout: 'fixed', width: '900px' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'white', borderColor: '#444', width: '60px', fontWeight: 'bold' }}>Pos</TableCell>
                <TableCell sx={{ color: 'white', borderColor: '#444', width: '180px', fontWeight: 'bold' }}>Driver</TableCell>
                <TableCell sx={{ color: 'white', borderColor: '#444', width: '140px', fontWeight: 'bold' }}>Team</TableCell>
                <TableCell sx={{ color: 'white', borderColor: '#444', width: '100px', fontWeight: 'bold' }}>Gap</TableCell>
                <TableCell sx={{ color: 'white', borderColor: '#444', width: '100px', fontWeight: 'bold' }}>Fastest Lap</TableCell>
                <TableCell sx={{ color: 'white', borderColor: '#444', width: '100px', fontWeight: 'bold' }}>Pos +/-</TableCell>
                <TableCell sx={{ color: 'white', borderColor: '#444', width: '60px', fontWeight: 'bold' }}>Points</TableCell>
                <TableCell sx={{ color: 'white', borderColor: '#444', width: '100px', fontWeight: 'bold' }}>Penalties</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mockResults.map((result, index) => (
                <TableRow key={index} sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' } }}>
                  <TableCell sx={{ color: 'white', borderColor: '#444' }}>{result.position}</TableCell>
                  <TableCell sx={{ color: 'white', borderColor: '#444' }}>{result.driver}</TableCell>
                  <TableCell sx={{ color: 'white', borderColor: '#444' }}>
                    <Box
                      sx={{
                        backgroundColor: teamColors[result.team] || '#444',
                        color: lightTeams.includes(result.team) ? 'black' : 'white',
                        p: 0.5,
                        borderRadius: 1,
                        display: 'inline-block',
                      }}
                    >
                      {result.team}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: 'white', borderColor: '#444' }}>{result.gap}</TableCell>
                  <TableCell sx={{ color: 'white', borderColor: '#444' }}>{result.fastestLap}</TableCell>
                  <TableCell sx={{ color: result.positionsChanged >= 0 ? '#00FF00' : '#FF0000', borderColor: '#444' }}>
                    {result.positionsChanged >= 0 ? `+${result.positionsChanged}` : result.positionsChanged}
                  </TableCell>
                  <TableCell sx={{ color: 'white', borderColor: '#444' }}>{result.points}</TableCell>
                  <TableCell sx={{ color: 'white', borderColor: '#444' }}>{result.penalties || 'None'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>
    </Box>
  );
}