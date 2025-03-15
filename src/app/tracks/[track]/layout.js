// src/app/standings/layout.jsx
'use client';

import * as React from 'react';
import { Box } from '@mui/material';
import Header from '@/components/Header';

export default function StandingsLayout({ children }) {
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
              zIndex: 1100, // Above content but below potential modals
            }}>
              <Header />
            </Box>
      
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
            pt: 2,
            backgroundColor: '#0a0e27',
            overflowY: 'auto', // Scrollable content
            height: 'calc(100vh - 100px)', // Full height minus header
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}