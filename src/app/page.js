// src/app/page.jsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Box,
  Container,
  Grid,
  Typography
} from '@mui/material';
import { lighten } from '@mui/material/styles';
import Header from '@/components/Header';

export default function HomePage() {
  const notificationHeight = 32;
  const headerHeight = 64;
  const totalTopHeight = notificationHeight + headerHeight;

  return (
    <Box
      sx={{
        height: '100vh',
        backgroundColor: '#0a0e27',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Header />

      {/* Hero Section */}
      <Box
        sx={{
          flexGrow: 1,
          minHeight: `calc(100vh - ${totalTopHeight}px)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center" justifyContent="center">
            <Grid item xs={12} md={6} sx={{ textAlign: { xs: 'center', md: 'left' } }}>
              <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                MGL F1
              </Typography>
              <Typography variant="h5" gutterBottom>
                Speed, Performance, Trophies. Something none of us really see.
              </Typography>
              <Typography variant="body1" paragraph>
                A work in progress site, to track all our stats, seasons, and shitbox performances over the last 4 years in the F1 series of games by C*demasters and EASp*rts
              </Typography>
              <Link href="/standings/season/10" style={{ textDecoration: 'none' }}>
                <Box
                  component="button"
                  sx={{
                    mt: 2,
                    px: 3,
                    py: 1.5,
                    borderRadius: 1,
                    backgroundColor: '#1976d2',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    '&:hover': {
                      backgroundColor: lighten('#1976d2', 0.1),
                    },
                  }}
                >
                  Current Season
                </Box>
              </Link>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  border: '1px solid #444',
                  borderRadius: 2,
                  p: 2,
                  backgroundColor: '#0a0e27',
                  minHeight: 300,
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Upcoming Race Preview
                </Typography>
                <Typography variant="body2">
                  [Placeholder: details, schedule, standings, etc.]
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}