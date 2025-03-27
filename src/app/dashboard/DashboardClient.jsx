'use client';

import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, CircularProgress, Checkbox, Switch, FormControlLabel, Tooltip } from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';

// Helper function to format lap time from milliseconds to MM:SS.mmm
const formatLapTime = (timeInMs) => {
  if (!timeInMs) return '--:--.---;';
  
  const totalSeconds = timeInMs / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.floor((totalSeconds - Math.floor(totalSeconds)) * 1000);
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

// Format time for axis labels (simpler format)
const formatAxisTime = (timeInSec) => {
  if (timeInSec === undefined || timeInSec === null) return '';
  const minutes = Math.floor(timeInSec / 60);
  const seconds = (timeInSec % 60).toFixed(1);
  return `${minutes}:${seconds.padStart(4, '0')}`;
};

// Tyre compound colors
const compoundColors = {
  'Soft': '#ff4444',
  'Medium': '#ffff00',
  'Hard': '#ffffff',
  'Intermediate': '#00cc00',
  'Wet': '#00b7eb',
};

// Team colors - from the provided list
const teamColors = {
  'Williams': '#64C4FF',
  'Renault': '#FFF500',
  'McLaren': '#FF8000',
  'Haas': '#B6BABD',
  'Alfa Romeo': '#900000',
  'Alpha Tauri': '#2B4562',
  'Aston Martin': '#229971',
  'Alpine': '#0093CC',
  'Mercedes': '#27F4D2',
  'Ferrari': '#E80020',
  'Red Bull': '#3671C6',
  'Racing Point': '#F596C8',
  'Toro Rosso': '#0000FF',
  'Racing Bulls': '#6692FF',
  'Kick Sauber': '#52E252'
};

// Map team IDs to colors
const teamIdToColor = {
  1: teamColors['Williams'],
  2: teamColors['Renault'],
  3: teamColors['McLaren'],
  4: teamColors['Haas'],
  5: teamColors['Alfa Romeo'],
  6: teamColors['Alpha Tauri'],
  7: teamColors['Aston Martin'],
  8: teamColors['Alpine'],
  9: teamColors['Mercedes'],
  10: teamColors['Ferrari'],
  11: teamColors['Red Bull'],
  12: teamColors['Racing Point'],
  13: teamColors['Toro Rosso'],
  14: teamColors['Racing Bulls'],
  15: teamColors['Kick Sauber']
};

// Function to generate a random color as fallback
const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

// Custom tooltip component
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

export default function DashboardClient({ user }) {
  const [isLoading, setIsLoading] = useState(true);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [races, setRaces] = useState([]);
  const [selectedRace, setSelectedRace] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [driverTeams, setDriverTeams] = useState({});
  const [lapData, setLapData] = useState([]);
  const [hoveredDriver, setHoveredDriver] = useState(null);
  const [hoveredLine, setHoveredLine] = useState(null);
  
  // Data correction options
  const [correctPitTransitions, setCorrectPitTransitions] = useState(true);
  const [filterOutlaps, setFilterOutlaps] = useState(false);
  const [filterInlaps, setFilterInlaps] = useState(false);
  const [outlierThreshold, setOutlierThreshold] = useState(15);
  const [stintData, setStintData] = useState({});
  const useStintData = true;
  const [showRawLapData, setShowRawLapData] = useState(false);
  
  // Display mode toggle
  const [displayMode, setDisplayMode] = useState('team'); // 'team' or 'compound'
  
  // Selected drivers state
  const [selectedDrivers, setSelectedDrivers] = useState({});

  // Fetch available seasons
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const response = await fetch('/api/available-seasons', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          if (data.seasons && data.seasons.length) {
            setSeasons(data.seasons);
            setSelectedSeason(data.seasons[0]); // Select most recent season
          }
        }
      } catch (error) {
        console.error('Error fetching seasons:', error);
      }
    };
    
    fetchSeasons();
  }, []);

  // Fetch races when season changes
  useEffect(() => {
    if (!selectedSeason) return;
    
    const fetchRaces = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/season-races?season=${selectedSeason}`, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          if (data.races && data.races.length) {
            setRaces(data.races);
            setSelectedRace(data.races[data.races.length - 1].slug); // Select most recent race
          }
        }
      } catch (error) {
        console.error('Error fetching races:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRaces();
  }, [selectedSeason]);

  // Fetch lap data when race changes
  useEffect(() => {
    if (!selectedSeason || !selectedRace) return;
    
    const fetchLapData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/lap-data?season=${selectedSeason}&raceSlug=${selectedRace}`, 
          { credentials: 'include' }
        );
        if (response.ok) {
          const data = await response.json();
          console.log("API Response:", data);
          
          // Process drivers with team information
          const driverList = data.drivers.map(d => d.name);
          setDrivers(driverList);
          
          // Create driver to team mapping
          const teamMap = {};
          data.drivers.forEach(driver => {
            teamMap[driver.name] = driver.team;
          });
          setDriverTeams(teamMap);
          
          // Store teams data
          setTeams(data.teams || []);
          
          // Store lap data
          setLapData(data.lapData || []);
          
          // Store stint data if available
          if (data.stintData) {
            setStintData(data.stintData);
            console.log("Stint data loaded:", data.stintData);
          } else {
            setStintData({});
          }
          
          // Initialize all drivers as selected by default
          const initialSelectedState = {};
          driverList.forEach(driver => {
            initialSelectedState[driver] = true;
          });
          setSelectedDrivers(initialSelectedState);
        }
      } catch (error) {
        console.error('Error fetching lap data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLapData();
  }, [selectedSeason, selectedRace]);

  // Process lap data into a format Recharts can use
  const { chartData, lineConfigs, yDomain, driverColorMap } = useMemo(() => {
    if (!lapData || lapData.length === 0) {
      return { chartData: [], lineConfigs: [], yDomain: [0, 0], driverColorMap: {} };
    }
    
    console.log("Processing lap data with stint information");
    
    // Create driver color mapping based on team_id
    const driverColorMap = {};
    lapData.forEach(lap => {
      const driver = lap.driver;
      if (!driverColorMap[driver] && lap.team_id) {
        driverColorMap[driver] = teamIdToColor[lap.team_id] || getRandomColor();
      } else if (!driverColorMap[driver]) {
        driverColorMap[driver] = getRandomColor();
      }
    });
    
    let processedLapData = [...lapData];
    
  // If we have stint data and want to use it
  if (Object.keys(stintData).length > 0 && useStintData) {
    // Group laps by driver
    const driverLaps = {};
    lapData.forEach(lap => {
      if (!driverLaps[lap.driver]) {
        driverLaps[lap.driver] = [];
      }
      driverLaps[lap.driver].push(lap);
    });
    
    // Sort laps for each driver by lap number
    Object.keys(driverLaps).forEach(driver => {
      driverLaps[driver].sort((a, b) => a.lap_number - b.lap_number);
    });
    
    // Process stint data for each driver
    processedLapData = [];
    
    Object.entries(driverLaps).forEach(([driver, laps]) => {
      if (!stintData[driver]) {
        // If no stint data for this driver, keep original laps
        processedLapData.push(...laps);
        return;
      }
      
      // Parse the stint string (e.g., "S7,H13,S9")
      const driverStintRaw = stintData[driver];
      console.log(`Processing stint raw for ${driver}: ${driverStintRaw}`);
      const stintParts = driverStintRaw.split(',');
      const parsedStints = [];
      
      // Very clear, explicit stint boundary calculation
      let nextStintStartLap = 1; // First stint always starts at lap 1
      
      for (let stintIndex = 0; stintIndex < stintParts.length; stintIndex++) {
        const stintPart = stintParts[stintIndex];
        
        // Extract compound and lap count
        const compound = stintPart.charAt(0);
        const reportedLapCount = parseInt(stintPart.substring(1));
        
        // Map single-letter compounds to full names
        let fullCompoundName;
        switch(compound.toUpperCase()) {
          case 'S': fullCompoundName = 'Soft'; break;
          case 'M': fullCompoundName = 'Medium'; break;
          case 'H': fullCompoundName = 'Hard'; break;
          case 'I': fullCompoundName = 'Intermediate'; break;
          case 'W': fullCompoundName = 'Wet'; break;
          default: fullCompoundName = 'Unknown';
        }
        
        const stintStartLap = nextStintStartLap;
        let actualLapCount;
        
        if (stintIndex === 0) {
          // FIRST STINT: Add 1 to reported count
          actualLapCount = reportedLapCount + 1;
        } else {
          // ALL OTHER STINTS: Use reported count exactly as is
          actualLapCount = reportedLapCount;
        }
        
        const stintEndLap = stintStartLap + actualLapCount - 1;
        
        parsedStints.push({
          compound: fullCompoundName,
          startLap: stintStartLap,
          endLap: stintEndLap,
          lapCount: actualLapCount,
          stintIndex,
          isFirstStint: stintIndex === 0,
          isLastStint: stintIndex === stintParts.length - 1
        });
        
        // Update next stint's start lap
        nextStintStartLap = stintEndLap + 1;
        
        console.log(`Stint ${stintIndex+1} (${fullCompoundName}): laps ${stintStartLap}-${stintEndLap} (${actualLapCount} laps)`);
      }
      
      // Now correct each lap based on the parsed stint information
      const correctedLaps = [];
      
      // Find the maximum lap number for this driver
      const maxLap = Math.max(...laps.map(lap => lap.lap_number));
      
      for (let lapNumber = 1; lapNumber <= maxLap; lapNumber++) {
        // Find the lap data for this lap number
        const lapData = laps.find(lap => lap.lap_number === lapNumber);
        
        if (!lapData) continue; // Skip if no data for this lap
        
        const lapCopy = {...lapData};
        
        // Find which stint this lap belongs to
        const correctStint = parsedStints.find(stint => 
          lapNumber >= stint.startLap && lapNumber <= stint.endLap
        );
        
        if (correctStint) {
          // Update the compound to the correct one from stint data
          lapCopy.tyre_compound = correctStint.compound;
          lapCopy.stintIndex = correctStint.stintIndex;
          
          // Mark outlaps - the first lap of a stint except for the first stint
          if (lapNumber === correctStint.startLap && !correctStint.isFirstStint) {
            lapCopy.isOutlap = true;
            console.log(`Marked lap ${lapNumber} as outlap for ${driver} (${correctStint.compound})`);
          }
          
          // Mark inlaps - the last lap of a stint except for the last stint
          if (lapNumber === correctStint.endLap && !correctStint.isLastStint) {
            lapCopy.isInlap = true;
            console.log(`Marked lap ${lapNumber} as inlap for ${driver} (${correctStint.compound})`);
          }
        }
        
        correctedLaps.push(lapCopy);
      }
      
      processedLapData.push(...correctedLaps);
    });
    }
    
    return processLapData(processedLapData, driverColorMap);
    
  }, [lapData, stintData, useStintData, correctPitTransitions, filterOutlaps, filterInlaps, outlierThreshold, showRawLapData]);

  // Helper function to process lap data into chart format
  function processLapData(processedLapData, driverColorMap) {
    // Group by lap number first (x-axis)
    const lapMap = {};
    const driverStints = {};
    let minTime = Infinity;
    let maxTime = 0;
    
    // Initial pass to identify stints with special handling for consecutive same-compound stints
    processedLapData.forEach(lap => {
      const driver = lap.driver;
      
      // Track driver stint changes
      if (!driverStints[driver]) {
        driverStints[driver] = [{ 
          compound: lap.tyre_compound, 
          startLap: lap.lap_number,
          endLap: lap.lap_number,
          stintNumber: 1,
          stintIndex: lap.stintIndex || 0, // Use stintIndex if available
          team: lap.team
        }];
      } else {
        const lastStint = driverStints[driver][driverStints[driver].length - 1];
        
        const isNewStint = 
          lastStint.compound !== lap.tyre_compound || // Different compound
          lap.lap_number > lastStint.endLap + 1 ||    // Gap in laps
          (lap.stintIndex !== undefined && lastStint.stintIndex !== lap.stintIndex); // Same compound but different stint
        
        if (isNewStint) {
          // New stint
          driverStints[driver].push({ 
            compound: lap.tyre_compound, 
            startLap: lap.lap_number,
            endLap: lap.lap_number,
            stintNumber: driverStints[driver].length + 1,
            stintIndex: lap.stintIndex || lastStint.stintIndex + 1,
            team: lap.team
          });
        } else {
          // Update end lap of current stint
          lastStint.endLap = lap.lap_number;
        }
      }
      
      // Organize data by lap number
      if (!lapMap[lap.lap_number]) {
        lapMap[lap.lap_number] = { lap: lap.lap_number };
      }
    });
    
    // Second pass to add data with correct stint numbering
    processedLapData.forEach(lap => {
      const driver = lap.driver;
      const lapNumber = lap.lap_number;
      
      // Find which stint this lap belongs to - with special handling for consecutive same-compound stints
      let stint = null;
      
      if (lap.stintIndex !== undefined) {
        // If lap has explicit stint index, use that for matching
        stint = driverStints[driver]?.find(s => 
          s.compound === lap.tyre_compound && 
          s.stintIndex === lap.stintIndex &&
          lapNumber >= s.startLap && 
          lapNumber <= s.endLap
        );
      } else {
        // Otherwise use regular lap number range matching
        stint = driverStints[driver]?.find(s => 
          s.compound === lap.tyre_compound && 
          lapNumber >= s.startLap && 
          lapNumber <= s.endLap
        );
      }
      
      if (stint) {
        // Skip outlaps if filtering is enabled
        if (filterOutlaps && lap.isOutlap) {
          return;
        }
        
        // Skip inlaps if filtering is enabled
        if (filterInlaps && lap.isInlap) {
          return;
        }
        
        // Create a unique key that includes driver, compound, and stint number
        const key = `${driver}|${lap.tyre_compound}|${stint.stintNumber}`;
        
        // Add data point
        const timeValue = lap.lap_time_int / 1000; // Convert to seconds
        
        // Skip extreme outliers to keep the chart readable
        if (timeValue > 0 && timeValue < 150) {
          lapMap[lapNumber][key] = timeValue;
          
          // Track min/max for axis scaling
          if (timeValue < minTime && timeValue > 50) minTime = timeValue;
          if (timeValue > maxTime) maxTime = timeValue;
        }
      }
    });
    
    // Create array from lap map and sort by lap number
    const chartData = Object.values(lapMap).sort((a, b) => a.lap - b.lap);
    console.log("Chart data prepared:", chartData.length, "data points");
    
    // Generate line configurations
    const lineConfigs = [];
    Object.entries(driverStints).forEach(([driver, stints]) => {
      stints.forEach((stint) => {
        const key = `${driver}|${stint.compound}|${stint.stintNumber}`;
        const teamColor = driverColorMap[driver];
        const compoundColor = compoundColors[stint.compound] || '#888888';
        
        // Check if there's data for this stint after filtering
        const hasData = chartData.some(lap => lap[key] !== undefined);
        
        if (hasData) {
          lineConfigs.push({
            key,
            driver,
            compound: stint.compound,
            stintNumber: stint.stintNumber,
            startLap: stint.startLap,
            endLap: stint.endLap,
            teamColor,
            compoundColor,
            team: stint.team || driverTeams[driver] || 'Unknown Team'
          });
        }
      });
    });
    
    // Add padding to y-axis
    const padding = Math.max(...[minTime, maxTime]) === Infinity 
      ? 0 
      : (maxTime - minTime) * 0.1;
      
    const yDomain = Math.max(...[minTime, maxTime]) === Infinity 
      ? [0, 0] 
      : [Math.max(0, minTime - padding), maxTime + padding];
    
    return { chartData, lineConfigs, yDomain, driverColorMap };
  }

  // Helper function to correct compounds based on lap time patterns
  // (only used as fallback if stint data is not available)
  function correctCompoundsWithLapTimes(lapData, outlierThreshold) {
    // Group laps by driver
    const driverLaps = {};
    lapData.forEach(lap => {
      if (!driverLaps[lap.driver]) {
        driverLaps[lap.driver] = [];
      }
      driverLaps[lap.driver].push(lap);
    });
    
    // Sort laps for each driver by lap number
    Object.keys(driverLaps).forEach(driver => {
      driverLaps[driver].sort((a, b) => a.lap_number - b.lap_number);
    });
    
    // Process each driver's laps
    const processedLapData = [];
    
    Object.entries(driverLaps).forEach(([driver, laps]) => {
      // Skip if driver has too few laps
      if (laps.length <= 2) {
        processedLapData.push(...laps);
        return;
      }
      
      // Calculate average lap time for the driver
      const validLapTimes = laps
        .map(lap => lap.lap_time_int)
        .filter(time => time > 0 && time < 300000);
      
      const avgLapTime = validLapTimes.reduce((sum, time) => sum + time, 0) / validLapTimes.length;
      const outlapThreshold = 1 + (outlierThreshold / 100);
      
      // Identify compound transitions and fix incorrect compounds
      const fixedLaps = [];
      
      // First pass: Identify outlaps and inlaps based on lap times
      for (let i = 0; i < laps.length; i++) {
        const currentLap = {...laps[i]};
        const prevLap = i > 0 ? laps[i-1] : null;
        const nextLap = i < laps.length - 1 ? laps[i+1] : null;
        
        // Check if this is likely an outlap (significantly slower)
        currentLap.isOutlap = currentLap.lap_time_int > avgLapTime * outlapThreshold;
        
        // Check if this is likely an inlap (followed by a compound change)
        currentLap.isInlap = nextLap && nextLap.tyre_compound !== currentLap.tyre_compound;
        
        // Check for compound change without appropriate lap time change
        if (prevLap && prevLap.tyre_compound !== currentLap.tyre_compound) {
          // If this is a compound change but lap isn't slow enough to be an outlap
          if (!currentLap.isOutlap) {
            // This is likely a case where the wrong compound was assigned
            currentLap.fixCandidate = true;
            currentLap.suggestedCompound = prevLap.tyre_compound;
          }
        }
        
        fixedLaps.push(currentLap);
      }
      
      // Second pass: Fix compounds based on patterns
      for (let i = 0; i < fixedLaps.length; i++) {
        const currentLap = fixedLaps[i];
        
        // Fix laps with incorrect compounds
        if (currentLap.fixCandidate) {
          currentLap.tyre_compound = currentLap.suggestedCompound;
        }
        
        processedLapData.push(currentLap);
      }
    });
    
    return processedLapData;
  }

  const handleSeasonChange = (event) => {
    setSelectedSeason(event.target.value);
    setSelectedRace('');
  };

  const handleRaceChange = (event) => {
    setSelectedRace(event.target.value);
  };

  // Toggle display mode
  const handleDisplayModeToggle = () => {
    setDisplayMode(prev => prev === 'team' ? 'compound' : 'team');
  };

  // Toggle driver selection
  const handleDriverToggle = (driver) => {
    setSelectedDrivers(prev => ({
      ...prev,
      [driver]: !prev[driver]
    }));
  };

  // Select all drivers
  const handleSelectAll = () => {
    const newState = {};
    drivers.forEach(driver => {
      newState[driver] = true;
    });
    setSelectedDrivers(newState);
  };

  // Deselect all drivers
  const handleDeselectAll = () => {
    const newState = {};
    drivers.forEach(driver => {
      newState[driver] = false;
    });
    setSelectedDrivers(newState);
  };

  // Custom dot component to show which line is active
  const CustomDot = (props) => {
    const { cx, cy, dataKey, payload, stroke } = props;
    
    // Only show for the active line
    if (hoveredLine !== dataKey) {
      return null;
    }
    
    // Get the value for this key
    const value = payload[dataKey];
    if (value === undefined) {
      return null;
    }
    
    return (
      <g>
        <circle cx={cx} cy={cy} r={5} fill={stroke} />
        <circle cx={cx} cy={cy} r={8} fill="none" stroke={stroke} />
      </g>
    );
  };

  return (
    <Box sx={{ minHeight: 'calc(89vh)', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#fff', backgroundColor: '#0a0e27', p: 4 }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>F1 Telemetry Analysis</Typography>
      
      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
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

      {/* Lap Time Comparison Chart */}
      <Box sx={{ width: '100%', height: '70vh', border: '1px solid #444', borderRadius: 3, p: 2, backgroundColor: '#0a0e27', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#fff' }}>Lap Time Comparison</Typography>
          
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
                <Typography variant="body2">
                  Remove outlaps
                </Typography>
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
                <Typography variant="body2">
                  Remove inlaps
                </Typography>
              }
            />
          </Box>
        </Box>
        
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100% - 100px)' }}>
            <CircularProgress color="primary" />
          </Box>
        ) : chartData.length > 0 ? (
          <Box sx={{ border: '0px solid #444', display: 'flex', width: '100%', height: '55vh', overflow: 'hidden', positioning: 'relative' }}>
            {/* Legend */}
            <Box sx={{ 
              width: '180px', 
              overflowY: 'auto',
              overflowX: 'hidden', // Prevent horizontal overflow
              pr: 2,
              borderRight: '1px solid #444',
              height: '100%', // Full height,
              flexShrink: 0, // Prevent shrinking,
              pb: 2 // Add padding at the bottom for scrolling
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
                          {compoundStints.length > 1 && (
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
                        connectNulls={false} // Important! Prevents connecting across gaps
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
      </Box>
    </Box>
  );
}