// src/app/standings/layout.jsx
'use client';

import * as React from 'react';
import { Box } from '@mui/material';

export default function StandingsLayout({ children }) {
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: 'calc(100vh - 100px)', 
      backgroundColor: '#0a0e27', 
      color: 'white',
    }}>
      
      {/* Main Layout Container */}
      <Box sx={{ 
        display: 'flex', 
        flexGrow: 1, 
        pt: '100px', // Account for header (32px banner + 64px header) height
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
            height: '90vh', // Full height minus header
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}