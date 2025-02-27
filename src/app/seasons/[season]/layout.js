// src/app/seasons/[season]/layout.jsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { 
  Box, 
  Divider, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemText 
} from '@mui/material';
import "../../globals.css";
import Header from '@/components/Header';

export default function SeasonLayout({ children, params }) {
  const season = params?.season || '';

  return (
    <Box sx={{ display: 'flex', height: '100vh', backgroundColor: '#0a0e27', color: 'white', flexDirection: 'column' }}>
      <Header />

      {/* Main Layout Container */}
      <Box sx={{ display: 'flex', flexGrow: 1, pt: 2 }}>
        {/* Sidebar */}
        <Box
          sx={{
            width: 240,
            backgroundColor: '#0a0e27',
            borderRight: '1px solid #444',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Top Navigation Group */}
          <List sx={{ p: 0 }}>
            <ListItem disablePadding>
              <ListItemButton component={Link} href="/calendar">
                <ListItemText primary="Calendar" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={Link} href="/race-results">
                <ListItemText primary="Race Results" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={Link} href="/lineups">
                <ListItemText primary="Lineups" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={Link} href="/standings">
                <ListItemText primary="Standings" />
              </ListItemButton>
            </ListItem>
          </List>

          {/* Separator */}
          <Divider sx={{ my: 2, backgroundColor: '#444' }} />

          {/* Bottom Navigation Group */}
          <List sx={{ p: 0 }}>
            <ListItem disablePadding>
              <ListItemButton component={Link} href="/penalties">
                <ListItemText primary="Penalties" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>

        {/* Main Content Area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 2,
            backgroundColor: '#0a0e27',
            overflowY: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}