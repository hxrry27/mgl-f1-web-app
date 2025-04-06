'use client';

import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, CircularProgress, Checkbox, Switch, FormControlLabel, Tooltip } from '@mui/material';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Button from '@mui/material/Button';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
// Import icons for the toggle buttons
import TimerIcon from '@mui/icons-material/Timer';
import BuildIcon from '@mui/icons-material/Build';
import SpeedIcon from '@mui/icons-material/Speed';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BarChartIcon from '@mui/icons-material/BarChart';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, ReferenceArea, Brush
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
  const [availableSessions, setAvailableSessions] = useState([]);
  const [selectedSessionType, setSelectedSessionType] = useState('race');
  const [maxLapNumber, setMaxLapNumber] = useState(0);
  
  // New state for analysis type toggle
  const [analysisType, setAnalysisType] = useState('race-time');
  
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

  // New state for real data
  const [tyreWearData, setTyreWearData] = useState([]);
  const [damageData, setDamageData] = useState([]);
  const [telemetryData, setTelemetryData] = useState([]);
  const [selectedLap, setSelectedLap] = useState(1);

  // Handle analysis type change
  const handleAnalysisTypeChange = (event, newType) => {
    if (newType !== null) {
      setAnalysisType(newType);
    }
  };

  // Get the first selected driver - defined early so other hooks can use it
  const selectedDriver = useMemo(() => {
    const drivers = Object.keys(selectedDrivers).filter(d => selectedDrivers[d]);
    return drivers.length > 0 ? drivers[0] : null;
  }, [selectedDrivers]);

  // Reusable driver selector component
  const DriverSelector = ({ 
    drivers, 
    selectedDriver, 
    driverTeams, 
    driverColorMap, 
    label = "Driver",
    disabled = false,
    multiSelect = false
  }) => {
    // Function to handle driver selection change
    const handleDriverChange = (driver) => {
      if (multiSelect) {
        // For multi-select mode, toggle the selected state
        setSelectedDrivers(prev => ({
          ...prev,
          [driver]: !prev[driver]
        }));
      } else {
        // For single-select mode, deselect all and select just one
        const newSelectedState = {};
        drivers.forEach(d => {
          newSelectedState[d] = d === driver;
        });
        setSelectedDrivers(newSelectedState);
      }
    };
    
    return (
      <FormControl sx={{ minWidth: 200 }} disabled={disabled}>
        <InputLabel sx={{ color: '#fff' }}>{label}</InputLabel>
        <Select
          value={selectedDriver || ''}
          onChange={(e) => handleDriverChange(e.target.value)}
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
  };

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
          `/api/lap-data?season=${selectedSeason}&raceSlug=${selectedRace}&sessionType=${selectedSessionType}`, 
          { credentials: 'include' }
        );
        if (response.ok) {
          const data = await response.json();
          console.log("API Response:", data);
  
          // Store available sessions if any
          if (data.available_sessions && data.available_sessions.length > 0) {
            setAvailableSessions(data.available_sessions);
          }
          
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
          
          // Store max lap number
          setMaxLapNumber(data.max_lap_number || 0);
          
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
  }, [selectedSeason, selectedRace, selectedSessionType]);

  // Fetch tyre wear data when race changes
  useEffect(() => {
    if (!selectedSeason || !selectedRace || !selectedSessionType) return;
    
    const fetchTyreWearData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/tyre-wear-data?season=${selectedSeason}&raceSlug=${selectedRace}&sessionType=${selectedSessionType}`, 
          { credentials: 'include' }
        );
        if (response.ok) {
          const data = await response.json();
          console.log("Tyre Wear API Response:", data);
          setTyreWearData(data.tyreWearData || []);
        }
      } catch (error) {
        console.error('Error fetching tyre wear data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTyreWearData();
  }, [selectedSeason, selectedRace, selectedSessionType]);

  // Fetch damage data when race changes
  useEffect(() => {
    if (!selectedSeason || !selectedRace || !selectedSessionType) return;
    
    const fetchDamageData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/damage-data?season=${selectedSeason}&raceSlug=${selectedRace}&sessionType=${selectedSessionType}`, 
          { credentials: 'include' }
        );
        if (response.ok) {
          const data = await response.json();
          console.log("Damage API Response:", data);
          setDamageData(data.damageData || []);
        }
      } catch (error) {
        console.error('Error fetching damage data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDamageData();
  }, [selectedSeason, selectedRace, selectedSessionType]);

  // Fetch telemetry data for individual lap analysis
  useEffect(() => {
    if (!selectedSeason || !selectedRace || !selectedSessionType || !selectedDriver) return;
    
    const fetchTelemetryData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/telemetry-data?season=${selectedSeason}&raceSlug=${selectedRace}&sessionType=${selectedSessionType}&lap=${selectedLap}&driver=${selectedDriver}`, 
          { credentials: 'include' }
        );
        if (response.ok) {
          const data = await response.json();
          console.log("Telemetry API Response:", data);
          setTelemetryData(data.telemetryData || []);
        }
      } catch (error) {
        console.error('Error fetching telemetry data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (selectedDriver) {
      fetchTelemetryData();
    }
  }, [selectedSeason, selectedRace, selectedSessionType, selectedLap, selectedDriver]);

  // Process lap data into a format Recharts can use
  const { chartData, lineConfigs, yDomain, driverColorMap } = useMemo(() => {
    if (!lapData || lapData.length === 0) {
      return { chartData: [], lineConfigs: [], yDomain: [0, 0], driverColorMap: {} };
    }
    
    console.log("Processing lap data with session history information");
    
    // Create driver color mapping based on team_id or team_color
    const driverColorMap = {};
    lapData.forEach(lap => {
      const driver = lap.driver;
      if (!driverColorMap[driver]) {
        // First try to use team_color if available directly from API
        if (lap.team_color) {
          driverColorMap[driver] = lap.team_color;
        }
        // Then try team ID mapping
        else if (lap.team_id && teamIdToColor[lap.team_id]) {
          driverColorMap[driver] = teamIdToColor[lap.team_id];
        }
        // Finally fall back to random color
        else {
          driverColorMap[driver] = getRandomColor();
        }
      }
    });
    
    return processLapData(lapData, driverColorMap);
    
  }, [lapData, filterOutlaps, filterInlaps, maxLapNumber]);

  // Process damage data for the chart
  const processedDamageData = useMemo(() => {
    if (!damageData || damageData.length === 0 || !selectedDriver) {
      return [];
    }
    
    console.log("Processing damage data, total points:", damageData.length);
    
    // Filter for the selected driver
    const driverData = damageData.filter(dp => dp.driver === selectedDriver);
    
    if (driverData.length === 0) {
      console.log(`No damage data for driver: ${selectedDriver}`);
      return [];
    }
    
    // Sort by session_time
    driverData.sort((a, b) => a.session_time - b.session_time);
    
    // Sample the data to reduce points (take every Nth point)
    const sampleSize = Math.max(1, Math.floor(driverData.length / 2000));
    const sampledData = driverData.filter((_, i) => i % sampleSize === 0);
    
    console.log(`Sampled damage data from ${driverData.length} to ${sampledData.length} points`);
    
    // Calculate approximate lap time from the data
    const totalTime = driverData[driverData.length-1].session_time - driverData[0].session_time;
    const estimatedLapTime = Math.floor(totalTime / (maxLapNumber || 50)); // Use maxLapNumber as fallback
    const pointsPerLap = Math.max(1, Math.floor(sampledData.length / (maxLapNumber || 50)));
    
    console.log(`Estimated lap time: ${estimatedLapTime}s, points per lap: ${pointsPerLap}`);
    
    // Assign lap numbers more evenly
    const processedData = sampledData.map((dataPoint, index) => {
      // Calculate lap number based on index in the array
      const lap = Math.floor(index / pointsPerLap) + 1;
      
      return {
        lap,
        frontWing: (dataPoint.front_left_wing_damage + dataPoint.front_right_wing_damage) / 2,
        rearWing: dataPoint.rear_wing_damage,
        diffuser: dataPoint.diffuser_damage,
        floor: dataPoint.floor_damage,
        sidepod: dataPoint.sidepod_damage,
        session_time: dataPoint.session_time
      };
    });
    
    // Group by lap and calculate average values
    const lapMap = {};
    processedData.forEach(dataPoint => {
      if (!lapMap[dataPoint.lap]) {
        lapMap[dataPoint.lap] = {
          lap: dataPoint.lap,
          frontWing: 0,
          rearWing: 0,
          diffuser: 0,
          floor: 0,
          sidepod: 0,
          count: 0
        };
      }
      
      lapMap[dataPoint.lap].frontWing += dataPoint.frontWing;
      lapMap[dataPoint.lap].rearWing += dataPoint.rearWing;
      lapMap[dataPoint.lap].diffuser += dataPoint.diffuser;
      lapMap[dataPoint.lap].floor += dataPoint.floor;
      lapMap[dataPoint.lap].sidepod += dataPoint.sidepod;
      lapMap[dataPoint.lap].count++;
    });
    
    // Calculate averages
    const finalData = Object.values(lapMap)
      .map(lap => ({
        lap: lap.lap,
        frontWing: lap.frontWing / lap.count,
        rearWing: lap.rearWing / lap.count,
        diffuser: lap.diffuser / lap.count,
        floor: lap.floor / lap.count,
        sidepod: lap.sidepod / lap.count
      }))
      .sort((a, b) => a.lap - b.lap); // Ensure laps are in order
    
    console.log(`Processed damage data into ${finalData.length} laps`);
    return finalData;
  }, [damageData, selectedDriver, maxLapNumber]);

  

  // Process the tyre wear data for the chart
  const processedTyreWearData = useMemo(() => {
    if (!tyreWearData || tyreWearData.length === 0) {
      return [];
    }
    
    // Filter data for the selected driver if one is selected
    const driverData = selectedDriver 
      ? tyreWearData.filter(item => item.driver === selectedDriver)
      : tyreWearData.slice(0, 10000); // Limit to first 10000 points if no driver selected
    
    // Sample the data to avoid performance issues (take every Nth point)
    const sampleRate = Math.max(1, Math.floor(driverData.length / 5000));
    const sampledData = driverData.filter((_, index) => index % sampleRate === 0);
    
    // Sort by session time
    sampledData.sort((a, b) => a.session_time - b.session_time);
    
    // Transform the data to the chart format - multiplying by 100 to convert to percentage
    return sampledData.map(point => ({
      session_time: point.session_time,
      front_left: point.tyre_wear_fl * 100,
      front_right: point.tyre_wear_fr * 100,
      rear_left: point.tyre_wear_rl * 100,
      rear_right: point.tyre_wear_rr * 100,
      driver: point.driver,
      team: point.team
    }));
  }, [tyreWearData, selectedDriver]);

// Process the tyre wear data for the chart
  // Calculate y-axis range for tyre wear chart - this goes at component level
  const tyreWearYRange = useMemo(() => {
    if (!processedTyreWearData || processedTyreWearData.length === 0) return [0, 1];
    
    let min = Infinity;
    let max = -Infinity;
    
    processedTyreWearData.forEach(point => {
      if (point.front_left !== null) min = Math.min(min, point.front_left);
      if (point.front_right !== null) min = Math.min(min, point.front_right);
      if (point.rear_left !== null) min = Math.min(min, point.rear_left);
      if (point.rear_right !== null) min = Math.min(min, point.rear_right);
      
      if (point.front_left !== null) max = Math.max(max, point.front_left);
      if (point.front_right !== null) max = Math.max(max, point.front_right);
      if (point.rear_left !== null) max = Math.max(max, point.rear_left);
      if (point.rear_right !== null) max = Math.max(max, point.rear_right);
    });
    
    if (min === Infinity) min = 0;
    if (max === -Infinity) max = 1;
    
    // Add 10% padding to the top
    return [0, Math.max(1, max * 1.1)];
  }, [processedTyreWearData]);

  // Process telemetry data for individual lap analysis
  const processedTelemetryData = useMemo(() => {
    if (!telemetryData || telemetryData.length === 0) {
      return [];
    }
    
    console.log("Processing telemetry data:", telemetryData.length, "data points");
    
    // Sort telemetry data by session_time
    const sortedData = [...telemetryData].sort((a, b) => a.session_time - b.session_time);
    
    // Find significant time gaps that would indicate lap transitions
    const timeGaps = [];
    for (let i = 1; i < sortedData.length; i++) {
      const timeDiff = sortedData[i].session_time - sortedData[i-1].session_time;
      if (timeDiff > 1.5) { // Gap of 1.5+ seconds might indicate lap transition
        timeGaps.push({
          index: i,
          timeDiff: timeDiff,
          time: sortedData[i].session_time
        });
      }
    }
    
    console.log(`Found ${timeGaps.length} potential lap transitions`);
    
    // Divide data into laps based on identified gaps
    const laps = [];
    let lapStart = 0;
    
    timeGaps.forEach((gap, index) => {
      laps.push(sortedData.slice(lapStart, gap.index));
      lapStart = gap.index;
    });
    
    // Add the final lap
    if (lapStart < sortedData.length) {
      laps.push(sortedData.slice(lapStart));
    }
    
    console.log(`Divided telemetry data into ${laps.length} laps`);
    
    // If we have no laps or very short laps, try a different approach
    if (laps.length === 0 || laps.every(lap => lap.length < 10)) {
      // Just create equal divisions based on estimated lap time
      const estimatedPointsPerLap = sortedData.length / Math.max(1, maxLapNumber);
      console.log(`Using estimated points per lap: ${estimatedPointsPerLap}`);
      
      laps.length = 0; // Clear the array
      
      // Create new laps using estimated size
      for (let i = 0; i < maxLapNumber; i++) {
        const start = Math.floor(i * estimatedPointsPerLap);
        const end = Math.floor((i + 1) * estimatedPointsPerLap);
        if (start < sortedData.length) {
          laps.push(sortedData.slice(start, Math.min(end, sortedData.length)));
        }
      }
      
      console.log(`Created ${laps.length} equal-sized laps`);
    }
    
    // Select the requested lap (with fallback to first lap)
    const lapIndex = Math.min(Math.max(0, selectedLap - 1), laps.length - 1);
    const lapData = laps[lapIndex] || [];
    
    console.log(`Selected lap ${selectedLap}, which has ${lapData.length} data points`);
    
    // If we have lap data, normalize it to 100 points for visualization
    if (lapData.length === 0) {
      return [];
    }
    
    // Create 100 evenly spaced points for visualization
    const numSectors = 100;
    const normalizedData = [];
    
    // Create normalized data points
    for (let i = 0; i < numSectors; i++) {
      // Find the corresponding index in the original data
      const dataIndex = Math.min(Math.floor((i / numSectors) * lapData.length), lapData.length - 1);
      const dataPoint = lapData[dataIndex];
      
      normalizedData.push({
        sector: i + 1,
        position: i,
        speed: dataPoint.speed,
        throttle: dataPoint.throttle * 100, // Convert to percentage
        brake: dataPoint.brake * 100, // Convert to percentage
        gear: dataPoint.gear,
        rpm: dataPoint.engine_rpm,
        drs: dataPoint.drs
      });
    }
    
    return normalizedData;
  }, [telemetryData, selectedLap, maxLapNumber]);

  // Helper function to process lap data into chart format
  function processLapData(processedLapData, driverColorMap) {
  // Create a map to store data for all laps (1 to maxLapNumber+1 to account for lap 0)
  const lapMap = {};
  
  // Find the min and max lap numbers in the actual data
  let minLapNumberInData = Infinity;
  let maxLapNumberInData = 0;
  
  processedLapData.forEach(lap => {
    // Check the original lap numbers before normalization
    if (lap.lap_number < minLapNumberInData) minLapNumberInData = lap.lap_number;
    if (lap.lap_number > maxLapNumberInData) maxLapNumberInData = lap.lap_number;
  });
  
  // Calculate the normalized max lap (adding 1 to account for zero-indexing)
  const normalizedMaxLap = maxLapNumberInData + 1;
  console.log(`Lap range in data: ${minLapNumberInData}-${maxLapNumberInData}, normalized to ${minLapNumberInData+1}-${normalizedMaxLap}`);
  
  // Initialize the map with entries for all laps (using normalized numbers)
  for (let i = 1; i <= normalizedMaxLap; i++) {
    lapMap[i] = { lap: i };
  }
  
  // Map to track driver stints
  const driverStints = {};
  let minTime = Infinity;
  let maxTime = 0;
  
  // Group lap data by driver to identify stint boundaries
  const driverLaps = {};
  processedLapData.forEach(lap => {
    // Normalize the lap number by adding 1
    lap.normalizedLapNumber = lap.lap_number + 1;
    
    if (!driverLaps[lap.driver]) {
      driverLaps[lap.driver] = [];
    }
    driverLaps[lap.driver].push(lap);
  });
  
  // Sort laps for each driver by normalized lap number
  Object.keys(driverLaps).forEach(driver => {
    driverLaps[driver].sort((a, b) => a.normalizedLapNumber - b.normalizedLapNumber);
  });
  
  // Process stints for each driver based on tyre_stint_visual changes
  Object.entries(driverLaps).forEach(([driver, laps]) => {
    if (!laps.length) return;
    
    // Skip processing if we have too many laps to prevent performance issues
    if (laps.length > 10000) {
      console.warn(`Skipping detailed stint processing for ${driver} - too many laps (${laps.length})`);
      return;
    }
    
    const stints = [];
    let currentStint = null;
    let stintNumber = 1;
    
    // Process laps to identify stint changes based on tyre_stint_visual
    laps.forEach((lap, index) => {
      // If this is the first lap or the tyre_stint_visual has changed
      if (!currentStint || 
          (lap.tyre_stint_visual !== null && 
           currentStint.tyreVisual !== lap.tyre_stint_visual)) {
        
        // Close the previous stint if it exists
        if (currentStint) {
          currentStint.endLap = laps[index - 1].normalizedLapNumber;
          stints.push(currentStint);
          stintNumber++;
        }
        
        // Start a new stint
        currentStint = {
          tyreVisual: lap.tyre_stint_visual,
          compound: lap.tyre_compound,
          startLap: lap.normalizedLapNumber,
          endLap: null, // Will be set when stint changes or at last lap
          stintNumber: stintNumber,
          team: lap.team
        };
      }
      
      // If this is the last lap for this driver
      if (index === laps.length - 1) {
        currentStint.endLap = lap.normalizedLapNumber;
        stints.push(currentStint);
      }
      
      // Mark outlaps (first lap of a stint)
      if (lap.normalizedLapNumber === currentStint.startLap) {
        lap.isOutlap = true;
      }
    });
    
    // Second pass to mark inlaps now that we know stint end laps
    laps.forEach(lap => {
      const stint = stints.find(s => 
        lap.normalizedLapNumber >= s.startLap && 
        lap.normalizedLapNumber <= s.endLap
      );
      
      if (stint && lap.normalizedLapNumber === stint.endLap && stint !== stints[stints.length - 1]) {
        lap.isInlap = true;
      }
    });
    
    // Store stints for this driver
    driverStints[driver] = stints;
    
    // Add lap data to the lap map using normalized lap numbers
    laps.forEach(lap => {
      const stint = stints.find(s => 
        lap.normalizedLapNumber >= s.startLap && 
        lap.normalizedLapNumber <= s.endLap
      );
      
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
        
        // Add data point using normalized lap number
        const timeValue = lap.lap_time_int / 1000; // Convert to seconds
        
        // Skip extreme outliers to keep the chart readable
        if (timeValue > 0 && timeValue < 150) {
          lapMap[lap.normalizedLapNumber][key] = timeValue;
          
          // Track min/max for axis scaling
          if (timeValue < minTime && timeValue > 50) minTime = timeValue;
          if (timeValue > maxTime) maxTime = timeValue;
        }
      }
    });
  });
  
  // Create array from lap map and sort by normalized lap number
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

  // Extract unique driver names from the processed data - place this at component level with other useMemo hooks
  const driversInData = useMemo(() => {
    if (!processedTyreWearData || processedTyreWearData.length === 0) return [];
    
    const driverSet = new Set();
    processedTyreWearData.forEach(point => {
      Object.keys(point).forEach(key => {
        if (key !== 'session_time' && key !== 'car_index') {
          const driverName = key.split('_')[0];
          driverSet.add(driverName);
        }
      });
    });
    
    return Array.from(driverSet);
  }, [processedTyreWearData]);

  // Render different analysis content based on selected type
  const renderAnalysisContent = () => {
    switch(analysisType) {
      case 'race-time':
        return renderRaceTimeAnalysis();
      case 'damage':
        return renderDamageAnalysis();
      case 'tyre-wear':
        return renderTyreWearAnalysis();
      case 'individual-lap':
        return renderIndividualLapAnalysis();
      case 'general-stats':
        return renderGeneralStatsAnalysis();
      default:
        return renderRaceTimeAnalysis();
    }
  };
  
  // Render damage analysis chart - using processed data from useMemo hook
  const renderDamageAnalysis = () => {
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
                  label={{ value: 'Lap Number', position: 'insideBottom', offset: -10, fill: '#fff' }}
                  tick={{ fill: '#fff' }}
                  stroke="#777"
                  type="number"
                  domain={['dataMin', 'dataMax']}
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
  };
  
  // Get all drivers that have tyre wear data - this is a component-level useMemo hook
  const driversWithTyreWearData = useMemo(() => {
    if (!processedTyreWearData || processedTyreWearData.length === 0) return [];
    
    const driverSet = new Set();
    processedTyreWearData.forEach(point => {
      if (point.driver) {
        driverSet.add(point.driver);
      }
    });
    
    return Array.from(driverSet);
  }, [processedTyreWearData]);

  // Get unique drivers from the processed data - this is a component-level useMemo hook
  const driversInTyreWearData = useMemo(() => {
    if (!processedTyreWearData || processedTyreWearData.length === 0) return [];
    return [...new Set(processedTyreWearData.map(d => d.driver))];
  }, [processedTyreWearData]);

  // Render tyre wear analysis chart
  const renderTyreWearAnalysis = () => {
    return (
      <Box sx={{ width: '100%', height: '60vh', pt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, mx: 2 }}>
          <Typography variant="subtitle1">
            Tyre Wear % Over Session Time {selectedDriver ? `- ${selectedDriver}` : ''}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel sx={{ color: '#fff' }}>Driver</InputLabel>
              <Select
                value={selectedDriver || ''}
                onChange={(e) => {
                  // Update the selected driver
                  const newDriver = e.target.value;
                  
                  // Update selectedDrivers state
                  const newSelectedDrivers = {};
                  drivers.forEach(d => {
                    newSelectedDrivers[d] = d === newDriver;
                  });
                  setSelectedDrivers(newSelectedDrivers);
                }}
                label="Driver"
                sx={{ color: '#fff', backgroundColor: '#1a1f3b', '& .MuiSvgIcon-root': { color: '#fff' } }}
              >
                <MenuItem value="">All Drivers</MenuItem>
                {drivers.map(driver => (
                  <MenuItem key={driver} value={driver}>{driver}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
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
                margin={{ top: 10, right: 30, bottom: 40, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis 
                  dataKey="session_time" 
                  label={{ value: 'Session Time (s)', position: 'insideBottom', offset: -10, fill: '#fff' }}
                  tick={{ fill: '#fff' }}
                  stroke="#777"
                  type="number"
                />
                <YAxis 
                  label={{ value: 'Wear %', angle: -90, position: 'insideLeft', offset: -5, fill: '#fff' }}
                  domain={tyreWearYRange}
                  tick={{ fill: '#fff' }}
                  stroke="#777"
                />
                <RechartsTooltip 
                  formatter={(value) => [`${value.toFixed(4)}%`, '']}
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
  };
  
  // Render individual lap analysis chart - using processed data from useMemo hook
  const renderIndividualLapAnalysis = () => {
    // Create a lap selector component
    const LapSelector = () => {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2">Lap:</Typography>
          <FormControl sx={{ width: 100 }}>
            <Select
              value={selectedLap}
              onChange={(e) => setSelectedLap(e.target.value)}
              size="small"
              sx={{ color: '#fff', backgroundColor: '#1a1f3b' }}
            >
              {Array.from({ length: maxLapNumber }, (_, i) => (
                <MenuItem key={i + 1} value={i + 1}>
                  {i + 1}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      );
    };
    
    // Custom tooltip component for telemetry data
    const TelemetryTooltip = ({ active, payload, label }) => {
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
            Sector {label} / 100
          </Typography>
          {payload.map((entry, index) => {
            if (entry.name === 'position') return null;
            
            let displayValue = entry.value;
            let unit = '';
            
            // Format different types of data
            if (entry.name === 'speed') {
              unit = ' km/h';
            } else if (entry.name === 'throttle' || entry.name === 'brake') {
              unit = '%';
              displayValue = Math.round(displayValue);
            } else if (entry.name === 'rpm') {
              unit = ' rpm';
              displayValue = Math.round(displayValue);
            } else if (entry.name === 'drs') {
              displayValue = displayValue > 0 ? 'Enabled' : 'Disabled';
            }
            
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
                  {entry.name.charAt(0).toUpperCase() + entry.name.slice(1)}: {displayValue}{unit}
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
            {selectedDriver ? `${selectedDriver} - ` : ''}Lap {selectedLap} Telemetry
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <LapSelector />
            <DriverSelector 
              drivers={drivers}
              selectedDriver={selectedDriver}
              driverTeams={driverTeams}
              driverColorMap={driverColorMap}
              disabled={isLoading}
            />
            
            {/* Add a debug button for telemetry data */}
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
        
        {/* Show raw data if debug mode is on */}
        {showRawLapData && (
          <Box sx={{ maxHeight: '200px', overflowY: 'auto', mb: 2, p: 2, border: '1px solid #444', borderRadius: 1 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
              Raw Telemetry Data Sample ({telemetryData.length} points)
            </Typography>
            <pre style={{ fontSize: '0.75rem', color: '#aaa' }}>
              {JSON.stringify(telemetryData.slice(0, 5), null, 2)}
            </pre>
            
            <Typography variant="caption" sx={{ display: 'block', mt: 2, mb: 1 }}>
              Processed Telemetry Data Sample ({processedTelemetryData.length} points)
            </Typography>
            <pre style={{ fontSize: '0.75rem', color: '#aaa' }}>
              {JSON.stringify(processedTelemetryData.slice(0, 2), null, 2)}
            </pre>
          </Box>
        )}
        
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100% - 60px)' }}>
            <CircularProgress color="primary" />
          </Box>
        ) : processedTelemetryData.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', height: 'calc(100% - 50px)' }}>
            {/* Speed Chart */}
            <Box sx={{ flex: 1 }}>
              <ResponsiveContainer width="95%" height="100%">
                <LineChart
                  data={processedTelemetryData}
                  margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis 
                    dataKey="sector" 
                    tick={false}
                    stroke="#777"
                  />
                  <YAxis 
                    yAxisId="speed"
                    label={{ value: 'Speed (km/h)', angle: -90, position: 'insideLeft', offset: -5, fill: '#fff' }}
                    domain={[0, 'dataMax + 20']}
                    tick={{ fill: '#fff' }}
                    stroke="#777"
                  />
                  <RechartsTooltip content={<TelemetryTooltip />} />
                  <Legend wrapperStyle={{ color: '#fff' }} />
                  
                  <Line 
                    yAxisId="speed"
                    type="monotone" 
                    dataKey="speed" 
                    name="Speed" 
                    stroke="#ff4444" 
                    strokeWidth={2} 
                    dot={false} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
            
            {/* Throttle/Brake Chart */}
            <Box sx={{ flex: 1 }}>
              <ResponsiveContainer width="95%" height="100%">
                <LineChart
                  data={processedTelemetryData}
                  margin={{ top: 0, right: 30, left: 10, bottom: 20 }}
                  syncId="telemetry"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis 
                    dataKey="sector" 
                    label={{ value: 'Track Position', position: 'insideBottom', offset: -10, fill: '#fff' }}
                    tick={{ fill: '#fff' }}
                    stroke="#777"
                  />
                  <YAxis 
                    yAxisId="percent"
                    label={{ value: 'Throttle/Brake %', angle: -90, position: 'insideLeft', offset: -5, fill: '#fff' }}
                    domain={[0, 100]}
                    tick={{ fill: '#fff' }}
                    stroke="#777"
                  />
                  <YAxis 
                    yAxisId="gear"
                    orientation="right"
                    label={{ value: 'Gear', angle: 90, position: 'insideRight', offset: 5, fill: '#fff' }}
                    domain={[0, 8]}
                    allowDataOverflow={true}
                    tick={{ fill: '#fff' }}
                    stroke="#777"
                  />
                  <RechartsTooltip content={<TelemetryTooltip />} />
                  <Legend wrapperStyle={{ color: '#fff' }} />
                  
                  <Line 
                    yAxisId="percent"
                    type="monotone" 
                    dataKey="throttle" 
                    name="Throttle" 
                    stroke="#00ff00" 
                    strokeWidth={2} 
                    dot={false} 
                  />
                  <Line 
                    yAxisId="percent"
                    type="monotone" 
                    dataKey="brake" 
                    name="Brake" 
                    stroke="#ff00ff" 
                    strokeWidth={2} 
                    dot={false} 
                  />
                  <Line 
                    yAxisId="gear"
                    type="stepAfter" 
                    dataKey="gear" 
                    name="Gear" 
                    stroke="#ffff00" 
                    strokeWidth={2} 
                    dot={false} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100% - 40px)' }}>
            <Typography variant="body1" color="text.secondary">
              No telemetry data available for this lap or driver
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  // Render general stats analysis chart (placeholder)
  const renderGeneralStatsAnalysis = () => {
    return (
      <Box sx={{ width: '100%', height: '60vh', pt: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, ml: 2 }}>Season Performance Statistics</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100% - 40px)' }}>
          <Typography variant="body1" color="text.secondary">
            General performance statistics coming soon
          </Typography>
        </Box>
      </Box>
    );
  };

  // Render the race time analysis content
  const renderRaceTimeAnalysis = () => {
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
                    domain={[1, maxLapNumber]} // Explicitly set domain to show all laps
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
      </>
    );
  };

  const handleSessionTypeChange = (event) => {
    setSelectedSessionType(event.target.value);
  };

  const SessionTypeSelector = ({ 
    availableSessions, 
    selectedSessionType, 
    onSessionTypeChange,
    disabled 
  }) => {
    // If no sessions are available or only one, no need for control
    if (!availableSessions || availableSessions.length <= 1) {
      return null;
    }
  
    return (
      <FormControl sx={{ minWidth: 150 }}>
        <InputLabel sx={{ color: '#fff' }}>Session</InputLabel>
        <Select 
          value={selectedSessionType} 
          onChange={onSessionTypeChange}
          label="Session Type" 
          disabled={disabled}
          sx={{ color: '#fff', backgroundColor: '#1a1f3b', '& .MuiSvgIcon-root': { color: '#fff' } }}
        >
          {availableSessions.map(session => (
            <MenuItem key={session.type} value={session.type}>
              {session.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

  return (
    <Box sx={{ minHeight: 'calc(89vh)', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#fff', backgroundColor: '#0a0e27', p: 4 }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>F1 Telemetry Analysis</Typography>
      
      {/* Top Controls Section */}
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

      {/* Lap Time Comparison Chart */}
      <Box sx={{ width: '100%', height: '70vh', border: '1px solid #444', borderRadius: 3, p: 2, backgroundColor: '#0a0e27', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#fff' }}>
            {analysisType === 'race-time' ? 'Lap Time Comparison' : 
             analysisType === 'damage' ? 'Damage Analysis' :
             analysisType === 'tyre-wear' ? 'Tyre Wear Analysis' :
             analysisType === 'individual-lap' ? 'Individual Lap Analysis' :
             'General Statistics'}
          </Typography>
          
          {analysisType === 'race-time' && (
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
          )}
        </Box>

        {/* Render different content based on selected analysis type */}
        {renderAnalysisContent()}
      </Box>
      
      {/* Enhanced Debug panel */}
      <Box sx={{ mt: 4, p: 2, border: '1px dashed #666', borderRadius: 1, width: '100%' }}>
        <Typography variant="h6">Debug Information</Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="body2">
            Selected Driver: {selectedDriver || "None"}<br />
            Selected Lap: {selectedLap}<br />
            Tyre Wear Data: {tyreWearData.length} points<br />
            Damage Data: {damageData.length} points<br />
            Telemetry Data: {telemetryData.length} points<br />
            Processed Data Points:<br />
            - Tyre Wear: {processedTyreWearData.length} laps<br />
            - Damage: {processedDamageData.length} laps<br />
            - Telemetry: {processedTelemetryData.length} points<br />
          </Typography>
          
          <Button 
            variant="outlined"
            onClick={() => setShowRawLapData(!showRawLapData)}
            sx={{ height: 40 }}
          >
            {showRawLapData ? 'Hide Raw Data' : 'Show Raw Data'}
          </Button>
        </Box>
        
        {showRawLapData && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Driver Data Check</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {drivers.map(driver => {
                // Check if we have tyre wear data for this driver
                const hasData = processedTyreWearData.length > 0 && 
                              Object.keys(processedTyreWearData[0] || {}).some(key => 
                                key.startsWith(`${driver}_`)
                              );
                              
                return (
                  <Box 
                    key={driver} 
                    sx={{ 
                      p: 1, 
                      border: '1px solid #444', 
                      borderRadius: 1,
                      backgroundColor: hasData ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)'
                    }}
                  >
                    <Typography variant="body2">
                      {driver}: {hasData ? 'Has Data' : 'No Data'}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
            
            <Accordion sx={{ mt: 2, backgroundColor: '#1a1f3b' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#fff' }} />}>
                <Typography>Raw API Response Samples</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2">Tyre Wear Data Sample (first 2 entries)</Typography>
                <pre style={{ fontSize: '0.75rem', color: '#aaa', maxHeight: '200px', overflow: 'auto' }}>
                  {JSON.stringify(tyreWearData.slice(0, 2), null, 2)}
                </pre>
                
                <Typography variant="subtitle2" sx={{ mt: 2 }}>Damage Data Sample (first 2 entries)</Typography>
                <pre style={{ fontSize: '0.75rem', color: '#aaa', maxHeight: '200px', overflow: 'auto' }}>
                  {JSON.stringify(damageData.slice(0, 2), null, 2)}
                </pre>
                
                <Typography variant="subtitle2" sx={{ mt: 2 }}>Telemetry Data Sample (first 2 entries)</Typography>
                <pre style={{ fontSize: '0.75rem', color: '#aaa', maxHeight: '200px', overflow: 'auto' }}>
                  {JSON.stringify(telemetryData.slice(0, 2), null, 2)}
                </pre>
              </AccordionDetails>
            </Accordion>
            
            <Accordion sx={{ mt: 2, backgroundColor: '#1a1f3b' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#fff' }} />}>
                <Typography>Processed Data Samples</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2">Processed Tyre Wear Data (first lap)</Typography>
                <pre style={{ fontSize: '0.75rem', color: '#aaa', maxHeight: '200px', overflow: 'auto' }}>
                  {JSON.stringify(processedTyreWearData.slice(0, 1), null, 2)}
                </pre>
                
                <Typography variant="subtitle2" sx={{ mt: 2 }}>Processed Damage Data (first lap)</Typography>
                <pre style={{ fontSize: '0.75rem', color: '#aaa', maxHeight: '200px', overflow: 'auto' }}>
                  {JSON.stringify(processedDamageData.slice(0, 1), null, 2)}
                </pre>
                
                <Typography variant="subtitle2" sx={{ mt: 2 }}>Processed Telemetry Data (first 5 points)</Typography>
                <pre style={{ fontSize: '0.75rem', color: '#aaa', maxHeight: '200px', overflow: 'auto' }}>
                  {JSON.stringify(processedTelemetryData.slice(0, 5), null, 2)}
                </pre>
              </AccordionDetails>
            </Accordion>
          </Box>
        )}
      </Box>
    </Box>
  );
}