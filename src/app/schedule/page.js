// src/app/schedule/page.jsx
'use client';

import { Box, Typography, Grid } from '@mui/material';
import Image from 'next/image';

const scheduleData = [
  { round: 1, name: 'Australian Grand Prix', track: 'melbourne', date: 'March 14-16' },
  { round: 2, name: 'Chinese Grand Prix', track: 'shanghai', date: 'March 21-23' },
  { round: 3, name: 'Japanese Grand Prix', track: 'suzuka', date: 'April 4-6' },
  { round: 4, name: 'Bahrain Grand Prix', track: 'bahrain', date: 'April 11-13' },
  { round: 5, name: 'Saudi Arabian Grand Prix', track: 'jeddah', date: 'April 18-20' },
  // Add more as placeholders or fetch from DB later
];

export default function SchedulePage() {
  return (
    <Box sx={{ pt: 15, pl: 80, pr: 80, color: 'white', textAlign: 'center' }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>
        2025 Race Schedule
      </Typography>
      <Grid container spacing={3} justifyContent="center">
        {scheduleData.map((race) => (
          <Grid item xs={12} sm={6} md={4} key={race.round}>
            <Box
              sx={{
                border: '1px solid #444',
                borderRadius: 1,
                p: 2,
                backgroundColor: '#0a0e27',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
              }}
            >
              <Typography variant="h6" sx={{ mb: 1 }}>
                Round {race.round}: {race.name}
              </Typography>
              <Box sx={{ position: 'relative', height: 150, width: '100%' }}>
                <Image
                  src={`/images/tracks/${race.track}.png`}
                  alt={`${race.name} Track Map`}
                  layout="fill"
                  objectFit="contain"
                  onError={() => console.log(`No image for ${race.track}`)}
                />
              </Box>
              <Typography sx={{ mt: 1 }}>{race.date}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}