// src/app/results/season/[season]/page.jsx
'use client';

import { useParams } from 'next/navigation';
import { Box, Typography } from '@mui/material';

export default function SeasonResultsPage() {
  const params = useParams();
  const season = params.season;

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
        Results for Season {season}
      </Typography>
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
        <Typography sx={{ color: 'white' }}>
          Select a race from the schedule to view results.
        </Typography>
      </Box>
    </Box>
  );
}