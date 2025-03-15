// src/app/admin/teams/lineups/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, Button, TextField, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { useRouter } from 'next/navigation';

async function fetchSeasons() {
  const res = await fetch('/api/seasons', { cache: 'no-store' });
  return res.ok ? await res.json() : [];
}

async function fetchDrivers() {
  const res = await fetch('/api/drivers', { cache: 'no-store' });
  return res.ok ? await res.json() : [];
}

async function fetchTeams() {
  const res = await fetch('/api/teams', { cache: 'no-store' });
  return res.ok ? await res.json() : [];
}

async function fetchLineups(season) {
  const res = await fetch(`/api/lineups?season=${season}`, { cache: 'no-store' });
  return res.ok ? await res.json() : [];
}

export default function AdminTeamsLineupsPage() {
  const [seasons, setSeasons] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [lineups, setLineups] = useState([]);
  const [season, setSeason] = useState('');
  const [driver, setDriver] = useState('');
  const [team, setTeam] = useState('');
  const router = useRouter();

  useEffect(() => {
    Promise.all([fetchSeasons(), fetchDrivers(), fetchTeams()]).then(([seasonsData, driversData, teamsData]) => {
      setSeasons(seasonsData);
      setDrivers(driversData);
      setTeams(teamsData);
      setSeason(seasonsData[0] || '');
    });
  }, []);

  useEffect(() => {
    if (season) {
      fetchLineups(season).then(setLineups);
    }
  }, [season]);

  const handleAddLineup = async () => {
    if (!driver || !team || !season) return;
    const res = await fetch('/api/lineups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ season, driver, team }),
    });
    if (res.ok) {
      setLineups(await fetchLineups(season));
      setDriver('');
      setTeam('');
    }
  };

  const handleRemoveLineup = async (lineupId) => {
    const res = await fetch(`/api/lineups?id=${lineupId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setLineups(await fetchLineups(season));
    }
  };

  return (
    <Box sx={{ pt: 15, pl: 0, pr: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'white' }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>
        Admin - Team Lineups
      </Typography>
      <FormControl sx={{ mb: 2, minWidth: 120 }}>
        <InputLabel sx={{ color: 'white' }}>Season</InputLabel>
        <Select
          value={season}
          label="Season"
          onChange={(e) => setSeason(e.target.value)}
          sx={{
            color: 'white',
            backgroundColor: '#0a0e27',
            border: '1px solid #444',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
          }}
        >
          {seasons.map((s) => (
            <MenuItem key={s} value={s}>Season {s}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <Box sx={{ mb: 4, display: 'flex', gap: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel sx={{ color: 'white' }}>Driver</InputLabel>
          <Select
            value={driver}
            label="Driver"
            onChange={(e) => setDriver(e.target.value)}
            sx={{ color: 'white', backgroundColor: '#0a0e27', border: '1px solid #444' }}
          >
            {drivers.map((d) => (
              <MenuItem key={d} value={d}>{d}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel sx={{ color: 'white' }}>Team</InputLabel>
          <Select
            value={team}
            label="Team"
            onChange={(e) => setTeam(e.target.value)}
            sx={{ color: 'white', backgroundColor: '#0a0e27', border: '1px solid #444' }}
          >
            {teams.map((t) => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          onClick={handleAddLineup}
          sx={{ backgroundColor: '#1976d2', '&:hover': { backgroundColor: '#1565c0' } }}
        >
          Add Lineup
        </Button>
      </Box>
      <Box sx={{ border: '1px solid #444', borderRadius: 1, width: 'fit-content', maxWidth: '100%', overflow: 'hidden' }}>
        <Table sx={{ color: 'white', tableLayout: 'fixed', width: '800px', backgroundColor: '#0a0e27' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'white', borderColor: '#444', fontWeight: 'bold' }}>Driver</TableCell>
              <TableCell sx={{ color: 'white', borderColor: '#444', fontWeight: 'bold' }}>Team</TableCell>
              <TableCell sx={{ color: 'white', borderColor: '#444', fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lineups.map((row) => (
              <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' } }}>
                <TableCell sx={{ color: 'white', borderColor: '#444' }}>{row.driver}</TableCell>
                <TableCell sx={{ color: 'white', borderColor: '#444' }}>{row.team}</TableCell>
                <TableCell sx={{ color: 'white', borderColor: '#444' }}>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => handleRemoveLineup(row.id)}
                    sx={{ borderColor: '#d32f2f', color: '#d32f2f' }}
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}