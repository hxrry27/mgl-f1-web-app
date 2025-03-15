// src/app/drivers/lineups/ClientSeasonSelector.jsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

export default function ClientSeasonSelector({ seasons, defaultSeason }) {
  const [season, setSeason] = useState(defaultSeason);
  const router = useRouter();

  const handleSeasonChange = (event) => {
    const newSeason = event.target.value;
    setSeason(newSeason);
    router.push(`/teams/lineups?season=${newSeason}`);
  };

  return (
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
        {seasons.map((s) => (
          <MenuItem key={s} value={s}>Season {s}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}