'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';

export default function RaceStatsLayout({ children }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState('telemetry');

  const tabs = [
    { label: 'Telemetry', value: 'telemetry' },
    { label: 'Car Motion', value: 'carmotion' },
    { label: 'Session', value: 'session' },
    { label: 'Lap', value: 'lap' },
    { label: 'Event', value: 'event' },
    { label: 'Final Classification', value: 'final' },
  ];

  const handleTabClick = (value) => {
    setActiveTab(value);
    router.push(`/race-stats?tab=${value}`);
  };

  const sidebarWidth = 200;

  return (
    <Box sx={{ backgroundColor: '#0f1214', minHeight: '100vh', color: 'white' }}>
      {/* Fixed Header spanning full width */}
      <AppBar
        position="fixed"
        sx={{
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          backgroundColor: '#0f1214',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          boxShadow: 'none',
        }}
      >
        <Toolbar sx={{ minHeight: '60px', px: 2 }}>
          <Box sx={{ flexGrow: 1, fontSize: '1.3rem', fontWeight: 'bold' }}>
            MGL F1 Dashboard
          </Box>
        </Toolbar>
      </AppBar>

      {/* Divider below header */}
      <Box sx={{ pt: '60px' }}>
        <Divider variant="middle" sx={{ borderColor: '#444' }} />
      </Box>

      {/* Main Layout container as a flex row */}
      <Box sx={{ display: 'flex' }}>
        {/* Fixed Sidebar */}
        <Drawer
          variant="permanent"
          PaperProps={{
            sx: {
              width: sidebarWidth,
              backgroundColor: '#0f1214',
              color: 'white',
              p: 0,
              borderRight: 'none',
              top: '60px', // starts below header
              height: 'calc(100vh - 60px)',
            },
          }}
        >
          {/* Sidebar Header */}
          <Box sx={{ p: 2, borderBottom: '1px solid #444' }}>
            <Box component="h2" sx={{ m: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>
              Race Stats
            </Box>
          </Box>
          {/* Navigation Buttons */}
          <List sx={{ p: 0 }}>
            {tabs.map((tab) => (
              <ListItem key={tab.value} disablePadding sx={{ m: 0 }}>
                <ListItemButton
                  onClick={() => handleTabClick(tab.value)}
                  selected={activeTab === tab.value}
                  sx={{
                    borderRadius: 0,
                    py: 0.5,
                    px: 2,
                    backgroundColor: 'transparent',
                    '&.Mui-selected': {
                      borderLeft: '4px solid #fff',
                      backgroundColor: 'transparent',
                    },
                    '&:hover': { backgroundColor: '#333' },
                  }}
                >
                  <ListItemText primary={tab.label} primaryTypographyProps={{ fontSize: '0.9rem' }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Drawer>

        {/* Vertical Divider (using MUI Divider with vertical orientation) */}
        <Divider
          orientation="vertical"
          variant="middle"
          flexItem
          sx={{ borderColor: '#444' }}
        />

        {/* Main Content Area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            mt: '60px',
            height: 'calc(100vh - 60px)',
            overflowY: 'auto',
            backgroundColor: '#0f1214',
            p: 2,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
