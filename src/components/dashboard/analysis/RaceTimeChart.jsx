// RaceTimeAnalysis.jsx
import React from 'react';
import { Box, Typography, Checkbox, Switch, FormControlLabel, Tooltip, CircularProgress } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

// Import the custom tooltip component
import LapTimeTooltip from '../tooltips/LapTimeTooltip';
import CustomDot from '../chart-elements/CustomDot';
import { compoundColors, teamColors } from '@/constants/f1Constants';

export default function RaceTimeChart({
  isLoading,
  filterOutlaps,
  filterInlaps,
  maxLapNumber,
  chartData,
  lineConfigs,
  yDomain,
  driverColorMap,
  displayMode,
  selectedDrivers,
  drivers,
  driverTeams,
  hoveredDriver,
  hoveredLine,
  setHoveredDriver,
  setHoveredLine,
  handleDriverToggle,
  handleSelectAll,
  handleDeselectAll,
  setFilterInlaps,
  setFilterOutlaps,
  handleDisplayModeToggle
}) {
  // Helper function to format lap time for axis
  const formatAxisTime = (timeInSec) => {
    if (timeInSec === undefined || timeInSec === null) return '';
    const minutes = Math.floor(timeInSec / 60);
    const seconds = (timeInSec % 60).toFixed(1);
    return `${minutes}:${seconds.padStart(4, '0')}`;
  };

  return (
    <>
      {/* Data Correction Options Panel - SIMPLIFIED */}
      <Box sx={{ 
        bgcolor: '#1a1f3b', 
        p: 2, 
        borderRadius: 3, 
        mb: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1
      }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
          Lap Display Options
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={filterOutlaps}
                onChange={(e) => setFilterOutlaps(e.target.checked)}
                color="primary"
                size="small"
              />
            }
            label={
              <Tooltip title="First lap on each tyre compound">
                <Typography variant="body2">
                  Remove outlaps
                </Typography>
              </Tooltip>
            }
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={filterInlaps}
                onChange={(e) => setFilterInlaps(e.target.checked)}
                color="primary"
                size="small"
              />
            }
            label={
              <Tooltip title="Last lap on each tyre compound">
                <Typography variant="body2">
                  Remove inlaps
                </Typography>
              </Tooltip>
            }
          />

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Switch
              checked={displayMode === 'compound'}
              onChange={handleDisplayModeToggle}
              color="primary"
            />
            <Box sx={{ width: '180px', ml: 1 }}>
              <Typography variant="body2" sx={{ color: '#fff' }}>
                {displayMode === 'compound' ? "Showing Tyre Compounds" : "Showing Team Colors"}
              </Typography>
            </Box>
          </Box>

        </Box>
      </Box>
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100% - 100px)' }}>
          <CircularProgress color="primary" />
        </Box>
      ) : maxLapNumber > 0 ? (
        <Box sx={{ border: '0px solid #444', display: 'flex', width: '100%', height: '55vh', overflow: 'hidden', positioning: 'relative' }}>
          {/* Legend */}
          <Box sx={{ 
            width: '180px', 
            overflowY: 'auto',
            overflowX: 'hidden',
            pr: 2,
            borderRight: '1px solid #444',
            height: '100%',
            flexShrink: 0,
            pb: 2
          }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Drivers</Typography>
            <Box>
              <Typography 
                variant="caption" 
                sx={{ 
                  cursor: 'pointer', 
                  textDecoration: 'underline',
                  mr: 1,
                  '&:hover': { color: '#aaf' } 
                }}
                onClick={handleSelectAll}
              >
                All
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  cursor: 'pointer', 
                  textDecoration: 'underline',
                  '&:hover': { color: '#aaf' } 
                }}
                onClick={handleDeselectAll}
              >
                None
              </Typography>
            </Box>
          </Box>

            {/* Group drivers from lineConfigs */}
            {Array.from(new Set(lineConfigs.map(config => config.driver))).map(driver => {
              // Get all configs for this driver
              const driverConfigs = lineConfigs.filter(config => config.driver === driver);
              // Get first config for basic info
              const firstConfig = driverConfigs[0] || {};
              // Get unique compounds
              const compounds = [...new Set(driverConfigs.map(config => config.compound))];
              
              return (
                <Box 
                  key={driver}
                  sx={{
                    mb: 2,
                    opacity: hoveredDriver && hoveredDriver !== driver ? 0.5 : 1,
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={() => setHoveredDriver(driver)}
                  onMouseLeave={() => setHoveredDriver(null)}
                >
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      '&:hover': { color: '#aaf' }
                    }}
                    onClick={() => handleDriverToggle(driver)}
                  >
                    <Checkbox 
                      checked={!!selectedDrivers[driver]} 
                      sx={{ 
                        p: 0.5, 
                        color: '#fff',
                        '&.Mui-checked': { color: '#aaf' }
                      }} 
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                      <Box 
                        sx={{ 
                          width: 12, 
                          height: 12, 
                          borderRadius: '50%', 
                          bgcolor: firstConfig.teamColor || '#888', 
                          mr: 1 
                        }} 
                      />
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 'bold', 
                          textDecoration: selectedDrivers[driver] ? 'none' : 'line-through'
                        }}
                      >
                        {driver}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      display: 'block', 
                      color: '#aaa',
                      ml: 4,
                      mb: 0.5,
                      fontSize: '0.7rem' 
                    }}
                  >
                    {driverTeams[driver] || firstConfig.team || 'Unknown Team'}
                  </Typography>
                  
                  {compounds.map(compound => {
                    // Get all stints for this compound
                    const compoundStints = driverConfigs.filter(config => config.compound === compound);
                    
                    return (
                      <Box key={`${driver}-${compound}`} sx={{ ml: 3, mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box 
                            sx={{ 
                              width: 8, 
                              height: 8, 
                              borderRadius: '50%', 
                              bgcolor: compoundColors[compound] || '#888', 
                              mr: 1 
                            }} 
                          />
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontSize: '0.75rem',
                              opacity: selectedDrivers[driver] ? 1 : 0.5
                            }}
                          >
                            {compound} ({compoundStints.length} {compoundStints.length === 1 ? 'stint' : 'stints'})
                          </Typography>
                        </Box>
                        
                        {/* Show stint ranges */}
                        {compoundStints.length > 0 && (
                          <Box sx={{ ml: 2 }}>
                            {compoundStints.map((stint, idx) => (
                              <Typography 
                                key={idx} 
                                variant="caption" 
                                sx={{ 
                                  display: 'block', 
                                  color: '#aaa',
                                  fontSize: '0.7rem' 
                                }}
                              >
                                Stint {stint.stintNumber}: Laps {stint.startLap}-{stint.endLap}
                              </Typography>
                            ))}
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              );
            })}
            
            {displayMode === 'compound' && (
              <>
                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>Compounds</Typography>
                {Object.entries(compoundColors).map(([compound, color]) => (
                  <Box key={compound} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <Box 
                      sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        bgcolor: color, 
                        mr: 1 
                      }} 
                    />
                    <Typography variant="body2">{compound}</Typography>
                  </Box>
                ))}
              </>
            )}
          </Box>
          
          {/* Chart */}
          <Box sx={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 30, bottom: 40, left: 50 }}
                onMouseLeave={() => setHoveredLine(null)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis 
                  dataKey="lap" 
                  label={{ value: 'Lap Number', position: 'insideBottom', offset: -10, fill: '#fff' }}
                  tick={{ fill: '#fff' }}
                  stroke="#777"
                  domain={[1, maxLapNumber]}
                  type="number"
                  allowDataOverflow={false}
                />
                <YAxis 
                  label={{ value: 'Lap Time', angle: -90, position: 'insideLeft', offset: -30, fill: '#fff' }}
                  tickFormatter={formatAxisTime}
                  domain={yDomain}
                  tick={{ fill: '#fff' }}
                  stroke="#777"
                />
                <RechartsTooltip content={<LapTimeTooltip displayMode={displayMode} driverTeams={driverTeams} />} />
                
                {lineConfigs.map(config => {
                  // Only render lines for selected drivers
                  if (!selectedDrivers[config.driver]) {
                    return null;
                  }
                  
                  // Choose color based on display mode
                  const lineColor = displayMode === 'team' ? config.teamColor : config.compoundColor;
                  
                  const isHighlighted = hoveredLine === config.key || 
                                       (!hoveredLine && (!hoveredDriver || hoveredDriver === config.driver));
                  
                  return (
                    <Line
                      key={config.key}
                      type="monotone"
                      dataKey={config.key}
                      name={`${config.driver} (${config.compound})`}
                      stroke={lineColor}
                      strokeWidth={isHighlighted ? 3 : 2}
                      strokeOpacity={isHighlighted ? 1 : 0.7}
                      dot={<CustomDot />}
                      activeDot={{ r: 6, fill: lineColor, stroke: '#fff' }}
                      connectNulls={false}
                      isAnimationActive={false}
                      onMouseEnter={() => setHoveredLine(config.key)}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100% - 100px)' }}>
          <Typography variant="body1" color="text.secondary">
            No lap data available for this race
          </Typography>
        </Box>
      )}
    </>
  );
}