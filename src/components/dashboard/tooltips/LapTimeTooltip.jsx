import React from 'react';
import { Box, Typography } from '@mui/material';

// Helper function to format time for axis labels
const formatAxisTime = (timeInSec) => {
  if (timeInSec === undefined || timeInSec === null) return '';
  const minutes = Math.floor(timeInSec / 60);
  const seconds = (timeInSec % 60).toFixed(1);
  return `${minutes}:${seconds.padStart(4, '0')}`;
};

/**
 * Custom tooltip component for lap time charts
 */
const LapTimeTooltip = ({ active, payload, label, displayMode, driverTeams }) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <Box sx={{ 
      bgcolor: '#222', 
      color: '#fff', 
      p: 1.5, 
      borderRadius: 1,
      boxShadow: '0 4px 8px rgba(0,0,0,0.5)',
      border: '1px solid #444'
    }}>
      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
        Lap {label}
      </Typography>
      {payload.map((entry, index) => {
        // Extract metadata from the entry
        const key = entry.dataKey.split('|');
        const driver = key[0];
        const compound = key[1];
        const stint = key[2];
        const team = driverTeams[driver] || 'Unknown Team';
        
        return (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <Box 
              sx={{ 
                width: 12, 
                height: 12, 
                borderRadius: '50%', 
                bgcolor: entry.color, 
                mr: 1 
              }} 
            />
            <Typography variant="body2">
              <strong>{driver}</strong> ({team}, {compound}{displayMode === 'team' ? `, stint ${stint}` : ''}): {formatAxisTime(entry.value)}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

export default LapTimeTooltip;