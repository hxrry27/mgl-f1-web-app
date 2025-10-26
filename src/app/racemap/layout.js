'use client';

import * as React from 'react';
import { Box } from '@mui/material';

export default function RacemapLayout({ children }) {
  return (
    <Box sx={{ 
      backgroundColor: '#0a0e27', 
      color: 'white',
      height: '100%',
      overflowY: 'auto',
      p: 2,
    }}>
      {children}
    </Box>
  );
}