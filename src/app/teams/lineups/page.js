// src/app/drivers/lineups/page.jsx
'use client';

import { useState } from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { seasons } from '@/lib/data';

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

export default function DriversLineupsPage() {
  const [season, setSeason] = useState(Math.max(...Object.keys(seasons).map(Number)).toString()); // Default to latest season

  const handleSeasonChange = (event) => {
    setSeason(event.target.value);
  };

  // Process lineups into team-based structure
  const getLineupsForSeason = (seasonKey) => {
    const seasonData = seasons[seasonKey] || {};
    const lineups = seasonData.lineups || {};
    const teamMap = {};

    Object.entries(lineups).forEach(([driver, teams]) => {
      if (teams === 'Unavailable' || teams === "Didn't Race") return; // Skip non-racing entries
      const teamList = teams.split('/').filter(Boolean);
      
      teamList.forEach((team) => {
        if (!teamMap[team]) {
          teamMap[team] = { team, driver1: null, driver2: null };
        }
        if (!teamMap[team].driver1) {
          teamMap[team].driver1 = driver;
        } else if (!teamMap[team].driver2) {
          teamMap[team].driver2 = driver;
        } else {
          console.warn(`More than 2 drivers for ${team} in Season ${seasonKey}: ${driver}`);
        }
      });
    });

    return Object.values(teamMap).sort((a, b) => a.team.localeCompare(b.team));
  };

  const lineups = getLineupsForSeason(season);

  return (
    <Box sx={{ pt: 15, pl: 0, pr: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'white' }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>
        Driver Lineups
      </Typography>
      <FormControl sx={{ mb: 4, minWidth: 120 }}>
        <InputLabel sx={{ color: 'white' }}>Season</InputLabel>
        <Select
          value={season}
          label="Season"
          onChange={handleSeasonChange}
          sx={{
            color: 'white',
            backgroundColor: '#0a0e27',
            border: '1px solid #444',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#666' },
          }}
        >
          {Object.keys(seasons).sort((a, b) => a - b).map((s) => (
            <MenuItem key={s} value={s}>Season {s}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <Box sx={{ border: '1px solid #444', borderRadius: 1, width: 'fit-content', maxWidth: '100%', overflow: 'hidden' }}>
        <Table sx={{ color: 'white', tableLayout: 'fixed', width: '800px', backgroundColor: '#0a0e27' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'white', borderColor: '#444', fontWeight: 'bold', width: '200px' }}>Team</TableCell>
              <TableCell sx={{ color: 'white', borderColor: '#444', fontWeight: 'bold', width: '200px' }}>Driver 1</TableCell>
              <TableCell sx={{ color: 'white', borderColor: '#444', fontWeight: 'bold', width: '200px' }}>Driver 2</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lineups.map((row, index) => (
              <TableRow key={index} sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' } }}>
                <TableCell sx={{ color: 'white', borderColor: '#444' }}>
                  <Box
                    sx={{
                      backgroundColor: teamColors[row.team] || '#444',
                      color: lightTeams.includes(row.team) ? 'black' : 'white',
                      p: 0.5,
                      borderRadius: 1,
                      display: 'inline-block',
                    }}
                  >
                    {row.team}
                  </Box>
                </TableCell>
                <TableCell sx={{ color: 'white', borderColor: '#444' }}>{row.driver1 || 'N/A'}</TableCell>
                <TableCell sx={{ color: 'white', borderColor: '#444' }}>{row.driver2 || 'N/A'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}