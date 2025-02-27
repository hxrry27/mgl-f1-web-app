// src/app/tracks/[track]/layout.jsx
'use client';

import * as React from 'react';
import { Box } from '@mui/material';
import Header from '@/components/Header';

export default function TracksLayout({ children }) {
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh', 
      backgroundColor: '#0a0e27', 
      color: 'white',
    }}>
      {/* Fixed Header and Banner */}
      <Box sx={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 1100,
      }}>
        <Header />
      </Box>

      {/* Main Content (Scrollable) */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: '128px', // Header height (32px banner + 64px header)
          p: 2,
          backgroundColor: '#0a0e27',
          overflowY: 'auto',
          height: 'calc(100vh - 128px)',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}