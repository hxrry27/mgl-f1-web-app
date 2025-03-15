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
          overflow: 'hidden',
        }}
      >
        {/* Scrollable Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            backgroundColor: '#0a0e27',
            overflowY: 'auto',
            overflowX: 'hidden',
            height: '100', // Exact height minus header
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}