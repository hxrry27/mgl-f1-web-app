// DriverSelector.jsx
import React from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

export default function DriverSelector({ 
  drivers, 
  selectedDriver, 
  driverTeams, 
  driverColorMap, 
  label = "Driver",
  disabled = false,
  multiSelect = false,
  onChange
}) {
  // Function to handle driver selection change
  const handleDriverChange = (event) => {
    onChange(event.target.value);
  };
  
  return (
    <FormControl sx={{ minWidth: 200 }} disabled={disabled}>
      <InputLabel sx={{ color: '#fff' }}>{label}</InputLabel>
      <Select
        value={selectedDriver || ''}
        onChange={handleDriverChange}
        label={label}
        sx={{ color: '#fff', backgroundColor: '#1a1f3b', '& .MuiSvgIcon-root': { color: '#fff' } }}
      >
        {drivers.map(driver => (
          <MenuItem key={driver} value={driver}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box 
                sx={{ 
                  width: 12, 
                  height: 12, 
                  borderRadius: '50%', 
                  bgcolor: driverColorMap[driver] || '#888', 
                  mr: 1 
                }} 
              />
              {driver} ({driverTeams[driver] || 'Unknown Team'})
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}