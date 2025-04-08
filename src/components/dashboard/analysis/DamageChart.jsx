import React from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, CircularProgress } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

export default function DamageChart({
  isLoading,
  processedDamageData,
  selectedDriver,
  maxLapNumber,
  drivers,
  driverTeams,
  driverColorMap,
  onDriverSelect
}) {
  // Custom tooltip component for damage data
  const DamageTooltip = ({ active, payload, label }) => {
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
          // Only show damage components that exist in the data
          if (entry.value === undefined) return null;
          
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
                {entry.name}: {Math.round(entry.value)}%
              </Typography>
            </Box>
          );
        })}
      </Box>
    );
  };

  return (
    <Box sx={{ width: '100%', height: '60vh', pt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, mx: 2 }}>
        <Typography variant="subtitle1">
          Car Damage % Over Race Distance {selectedDriver ? `- ${selectedDriver}` : ''}
        </Typography>
        <DriverSelector 
          drivers={drivers}
          selectedDriver={selectedDriver}
          driverTeams={driverTeams}
          driverColorMap={driverColorMap}
          disabled={isLoading}
          onDriverSelect={onDriverSelect}
        />
      </Box>
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100% - 40px)' }}>
          <CircularProgress color="primary" />
        </Box>
      ) : processedDamageData.length > 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%' }}>
          <ResponsiveContainer width="95%" height="90%">
            <LineChart
              data={processedDamageData}
              margin={{ top: 10, right: 30, bottom: 40, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis 
                dataKey="lap" 
                label={{ value: 'Lap Number', position: 'insideBottom', offset: -50, fill: '#fff' }}
                tick={{ fill: '#fff' }}
                stroke="#777"
                type="number"
                domain={['dataMin', 'dataMax']}
                ticks={Array.from({ length: maxLapNumber }, (_, i) => i + 1)}
              />
              <YAxis 
                label={{ value: 'Damage %', angle: -90, position: 'insideLeft', offset: -5, fill: '#fff' }}
                domain={[0, 100]}
                tick={{ fill: '#fff' }}
                stroke="#777"
              />
              <RechartsTooltip content={<DamageTooltip />} />
              <Legend wrapperStyle={{ color: '#fff' }} />
              
              <Line type="monotone" dataKey="frontWing" name="Front Wing" stroke="#ff0000" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="rearWing" name="Rear Wing" stroke="#00ff00" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="diffuser" name="Diffuser" stroke="#0088ff" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="floor" name="Floor" stroke="#ff00ff" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="sidepod" name="Sidepod" stroke="#ffff00" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100% - 40px)' }}>
          <Typography variant="body1" color="text.secondary">
            No damage data available for this session or driver
          </Typography>
        </Box>
      )}
    </Box>
  );
}

// Internal driver selector component
const DriverSelector = ({ 
  drivers, 
  selectedDriver, 
  driverTeams, 
  driverColorMap, 
  disabled = false,
  onDriverSelect
}) => {
  return (
    <FormControl sx={{ minWidth: 200 }} disabled={disabled}>
      <InputLabel sx={{ color: '#fff' }}>Driver</InputLabel>
      <Select
        value={selectedDriver || ''}
        onChange={(e) => onDriverSelect(e.target.value)}
        label="Driver"
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
};