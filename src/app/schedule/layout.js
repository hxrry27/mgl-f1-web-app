// src/app/standings/layout.jsx
'use client';

import * as React from 'react';
import { Box } from '@mui/material';

const seasons = [...Array(11)].map((_, i) => i + 1); // Seasons 1-9

export default function StandingsLayout({ children }) {
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh', 
      backgroundColor: '#0a0e27', 
      color: 'white',
    }}>
      
      {/* Main Layout Container */}
      <Box sx={{ 
        display: 'flex', 
        flexGrow: 1, 
        pt: '128px', // Account for header (32px banner + 64px header) height
        overflow: 'hidden', // Prevent main content from causing scroll
      }}>

        {/* Main Content (Scrollable) */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 2,
            backgroundColor: '#0a0e27',
            overflowY: 'auto', // Scrollable content
            height: 'calc(100vh - 128px)', // Full height minus header
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}