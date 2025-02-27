// src/app/drivers/layout.jsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Box, Divider, List, ListItem, ListItemButton, ListItemText, Typography } from '@mui/material';
import Header from '@/components/Header';
import { drivers } from '@/lib/data';

// Function to normalize driver names for URLs
const normalizeDriverName = (name) => {
  return name.toLowerCase().replace(/\s+/g, '-');
};

export default function DriversLayout({ children }) {
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
        pt: '128px', // Account for header (32px banner + 64px header) height
        overflow: 'hidden', // Prevent main content from causing scroll
      }}>
        {/* Fixed Sidebar */}
        <Box sx={{ 
          position: 'fixed', 
          top: '128px', // Align with bottom of header
          left: 0, 
          width: 240, 
          height: 'calc(100vh - 128px)', // Full height minus header
          backgroundColor: '#0a0e27', 
          borderRight: '1px solid #444', 
          p: 2, 
          overflowY: 'auto', // Scrollable sidebar if content overflows
        }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
            Drivers
          </Typography>
          <Divider sx={{ mb: 2, backgroundColor: '#444' }} />

          <List sx={{ p: 0 }}>
            {drivers.map((driver) => (
              <ListItem disablePadding key={driver} sx={{ my: 0.2 }}>
                <ListItemButton
                  component={Link}
                  href={`/drivers/${normalizeDriverName(driver)}`}
                  sx={{
                    py: 0.3,
                    px: 2,
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                  }}
                >
                  <ListItemText
                    primary={driver}
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: 400,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>

        {/* Main Content (Scrollable) */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            ml: '240px', // Offset for sidebar width
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