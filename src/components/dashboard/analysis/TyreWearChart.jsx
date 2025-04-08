import React from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, CircularProgress, Button } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

export default function TyreWearChart({
  isLoading,
  processedTyreWearData,
  tyreWearYRange,
  selectedDriver,
  drivers,
  driverTeams,
  driverColorMap,
  onDriverSelect,
  showRawLapData,
  setShowRawLapData
}) {
  console.log("TyreWearChart rendered with selectedDriver:", selectedDriver);

  return (
    <Box sx={{ width: '100%', height: '60vh', pt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, mx: 2 }}>
        <Typography variant="subtitle1">
          Tyre Wear % Over Session Time {selectedDriver ? `- ${selectedDriver}` : '(No Driver Selected)'}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <DriverSelector 
            drivers={drivers}
            selectedDriver={selectedDriver}
            driverTeams={driverTeams}
            driverColorMap={driverColorMap}
            disabled={isLoading}
            onDriverSelect={onDriverSelect}
          />
          
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => setShowRawLapData(!showRawLapData)}
            sx={{ color: '#fff', borderColor: '#fff', height: 40 }}
          >
            {showRawLapData ? 'Hide Raw Data' : 'Show Raw Data'}
          </Button>
        </Box>
      </Box>
      
      {/* Debug panel */}
      {showRawLapData && (
        <Box sx={{ maxHeight: '200px', overflowY: 'auto', mb: 2, p: 2, border: '1px solid #444', borderRadius: 1 }}>
          <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
            Data points: {processedTyreWearData.length} after sampling
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
            Y-axis range: {tyreWearYRange[0].toFixed(4)}% to {tyreWearYRange[1].toFixed(4)}%
          </Typography>
          <pre style={{ fontSize: '0.75rem', color: '#aaa' }}>
            {JSON.stringify(processedTyreWearData.slice(0, 3), null, 2)}
          </pre>
        </Box>
      )}
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100% - 40px)' }}>
          <CircularProgress color="primary" />
        </Box>
      ) : processedTyreWearData.length > 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%' }}>
          <ResponsiveContainer width="95%" height="90%">
            <LineChart
              data={processedTyreWearData}
              margin={{ top: 0, right: 30, bottom: 40, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis 
                dataKey="session_time" 
                label={{ value: 'Session Time (s)', position: 'insideBottom', offset: -50, fill: '#fff' }}
                tick={{ fill: '#fff' }}
                stroke="#777"
                type="number"
              />
              <YAxis 
                label={{ value: 'Wear %', angle: -90, position: 'insideLeft', offset: -5, fill: '#fff' }}
                domain={tyreWearYRange}
                tick={{ fill: '#fff' }}
                tickCount={5}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(value) => Math.round(value)}
                stroke="#777"
              />
              <RechartsTooltip 
                formatter={(value) => [`${value.toFixed(2)}%`, '']}
                labelFormatter={(time) => `Session Time: ${time.toFixed(2)}s`}
                contentStyle={{ backgroundColor: '#222', borderColor: '#444', color: '#fff' }}
              />
              <Legend wrapperStyle={{ color: '#fff' }} />
              
              <Line 
                type="monotone" 
                dataKey="front_left" 
                name="Front Left" 
                stroke="#ff4444" 
                strokeWidth={3} 
                dot={false}
                connectNulls={true}
                isAnimationActive={false}
              />
              <Line 
                type="monotone" 
                dataKey="front_right" 
                name="Front Right" 
                stroke="#44ff44" 
                strokeWidth={3} 
                dot={false}
                connectNulls={true}
                isAnimationActive={false}
              />
              <Line 
                type="monotone" 
                dataKey="rear_left" 
                name="Rear Left" 
                stroke="#4444ff" 
                strokeWidth={3}
                dot={false}
                connectNulls={true}
                isAnimationActive={false}
              />
              <Line 
                type="monotone" 
                dataKey="rear_right" 
                name="Rear Right" 
                stroke="#ffff44" 
                strokeWidth={3} 
                dot={false}
                connectNulls={true}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100% - 40px)' }}>
          <Typography variant="body1" color="text.secondary">
            No tyre wear data available for this session
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
  console.log("DriverSelector rendered with:", { selectedDriver, driversCount: drivers.length });

  const handleChange = (event) => {
    const value = event.target.value;
    console.log("Driver selected in dropdown:", value);
    onDriverSelect(value);
  };

  return (
    <FormControl sx={{ minWidth: 200 }} disabled={disabled}>
      <InputLabel sx={{ color: '#fff' }}>Driver</InputLabel>
      <Select
        value={selectedDriver || ''}
        onChange={handleChange}
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
                  bgcolor: driverColorMap?.[driver] || '#888', 
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