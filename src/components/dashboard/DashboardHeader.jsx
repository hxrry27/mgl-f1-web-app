// DashboardHeader.jsx
import React from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, ToggleButtonGroup, ToggleButton, Tooltip } from '@mui/material';
import TimerIcon from '@mui/icons-material/Timer';
import BuildIcon from '@mui/icons-material/Build';
import SpeedIcon from '@mui/icons-material/Speed';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BarChartIcon from '@mui/icons-material/BarChart';

export default function DashboardHeader({
  seasons,
  selectedSeason,
  races,
  selectedRace,
  analysisType,
  handleSeasonChange,
  handleRaceChange,
  handleAnalysisTypeChange
}) {
  return (
    <Box sx={{ display: 'flex', width: '100%', mb: 4, justifyContent: 'space-between', alignItems: 'center' }}>
      {/* Analysis Type Toggle - Left Aligned */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <ToggleButtonGroup
          value={analysisType}
          exclusive
          onChange={handleAnalysisTypeChange}
          aria-label="analysis type"
          sx={{ 
            backgroundColor: '#1a1f3b',
            '& .MuiToggleButton-root': {
              color: '#aaa',
              '&.Mui-selected': {
                color: '#fff',
                backgroundColor: '#2d355b'
              }
            }
          }}
        >
          <ToggleButton value="race-time" aria-label="race time analysis">
            <Tooltip title="Race Time Analysis">
              <TimerIcon />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="damage" aria-label="damage analysis">
            <Tooltip title="Damage Analysis">
              <BuildIcon />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="tyre-wear" aria-label="tyre wear analysis">
            <Tooltip title="Tyre Wear Analysis">
              <SpeedIcon />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="individual-lap" aria-label="individual lap analysis">
            <Tooltip title="Individual Lap Analysis">
              <AssessmentIcon />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="general-stats" aria-label="general stats">
            <Tooltip title="General Stats">
              <BarChartIcon />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      {/* Season/Race Filters - Right Aligned */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel sx={{ color: '#fff' }}>Season</InputLabel>
          <Select 
            value={selectedSeason} 
            onChange={handleSeasonChange} 
            label="Season" 
            sx={{ color: '#fff', backgroundColor: '#1a1f3b', '& .MuiSvgIcon-root': { color: '#fff' } }}
          >
            {seasons.map(season => (
              <MenuItem key={season} value={season}>Season {season}</MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel sx={{ color: '#fff' }}>Race</InputLabel>
          <Select 
            value={selectedRace} 
            onChange={handleRaceChange} 
            label="Race" 
            sx={{ color: '#fff', backgroundColor: '#1a1f3b', '& .MuiSvgIcon-root': { color: '#fff' } }}
            disabled={!selectedSeason || races.length === 0}
          >
            {races.map(race => (
              <MenuItem key={race.slug} value={race.slug}>
                {race.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
}