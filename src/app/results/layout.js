// src/app/results/layout.jsx
'use client';

import * as React from 'react';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Divider, List, ListItem, ListItemButton, ListItemText, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import Header from '@/components/Header';
import { seasons } from '@/lib/data';

export default function ResultsLayout({ children }) {
  const params = useParams();
  const router = useRouter();
  const season = params.season || Math.max(...Object.keys(seasons).map(Number)).toString(); // Default to latest if no season
  const [selectedSeason, setSelectedSeason] = useState(season);

  const races = seasons[season]?.races ? Object.keys(seasons[season].races) : [];

  const handleSeasonChange = (event) => {
    const newSeason = event.target.value;
    setSelectedSeason(newSeason);
    router.push(`/results/season/${newSeason}`);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#0a0e27',
        color: 'white',
      }}
    >
      {/* Fixed Header and Banner */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
        }}
      >
        <Header />
      </Box>

      {/* Main Layout Container */}
      <Box
        sx={{
          display: 'flex',
          flexGrow: 1,
          pt: '128px', // Header height (32px banner + 64px header)
          overflow: 'hidden',
        }}
      >
        {/* Fixed Sidebar */}
        <Box
          sx={{
            position: 'fixed',
            top: '128px',
            left: 0,
            width: 240,
            height: 'calc(100vh - 128px)', // Full height minus header
            backgroundColor: '#0a0e27',
            borderRight: '1px solid #444',
            p: 2,
            overflowY: 'auto', // Scrollable sidebar
          }}
        >
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
            Results
          </Typography>
          <Divider sx={{ mb: 2, backgroundColor: '#444' }} />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel sx={{ color: 'white' }}>Season</InputLabel>
            <Select
              value={selectedSeason}
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
          <List sx={{ p: 0 }}>
            {races.map((race) => (
              <ListItem disablePadding key={race}>
                <ListItemButton onClick={() => router.push(`/results/season/${season}/${race}`)}>
                  <ListItemText
                    primary={race.charAt(0).toUpperCase() + race.slice(1).replace(/-/g, ' ')}
                    primaryTypographyProps={{ color: 'white' }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>

        {/* Scrollable Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            ml: '240px', // Offset for sidebar width
            p: 2,
            backgroundColor: '#0a0e27',
            overflowY: 'auto',
            overflowX: 'hidden',
            height: 'calc(100vh - 128px)', // Exact height minus header
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}