// src/app/standings/season/[season]/layout.jsx
'use client';

import * as React from 'react';
import { Box } from '@mui/material';
import Header from '@/components/Header';

export default function SeasonStandingsLayout({ children }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '85vh', // Full viewport height, no minHeight to avoid overflow
        backgroundColor: '#0a0e27',
        color: 'white',
        overflow: 'hidden', // No page-level scrolling
      }}
    >
      {/* Fixed Header */}
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

      {/* Scrollable Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          // Matches Header height
          px: 2,
          pb: 2,
          backgroundColor: '#0a0e27',
          overflowY: 'auto', // Only this area scrolls vertically
          overflowX: 'hidden', // No horizontal scrolling
          height: 'calc(100vh - 128px)', // Exact height to fit viewport minus header
        }}
      >
        {children}
      </Box>
    </Box>
  );
}