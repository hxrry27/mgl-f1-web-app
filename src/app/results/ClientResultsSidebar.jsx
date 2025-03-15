// src/app/results/ClientResultsSidebar.jsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Divider, List, ListItem, ListItemButton, ListItemText, Typography } from '@mui/material';

export default function ClientResultsSidebar({ season: initialSeason, races: initialRaces, trackNames }) {
  const params = useParams();
  const router = useRouter();
  const [races, setRaces] = useState(initialRaces);

  // Current season from URL
  const currentSeason = params.season || initialSeason;

  // Fetch races when season changes
  useEffect(() => {
    async function fetchRaces() {
      try {
        const response = await fetch(`/api/races?season=${currentSeason}`);
        const data = await response.json();
        setRaces(data);
      } catch (error) {
        console.error('Error fetching races:', error);
        setRaces(initialRaces); // Fallback to initial races
      }
    }
    fetchRaces();
  }, [currentSeason, initialRaces]);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: '128px',
        left: 0,
        width: 240,
        height: 'calc(100vh - 128px)',
        backgroundColor: '#0a0e27',
        borderRight: '1px solid #444',
        p: 2,
        overflowY: 'auto',
      }}
    >
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
        Season {currentSeason} Races
      </Typography>
      <Divider sx={{ mb: 1, backgroundColor: '#444' }} />
      <List sx={{ p: 0 }}>
        {races.map((race) => (
          <ListItem disablePadding key={race}>
            <ListItemButton onClick={() => router.push(`/results/season/${currentSeason}/${race}`)}>
              <ListItemText
                primary={trackNames[race] || race.replace(/-/g, ' ')}
                primaryTypographyProps={{ color: 'white' }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}