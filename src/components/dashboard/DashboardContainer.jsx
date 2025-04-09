'use client';

// DashboardContainer.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import DashboardHeader from './DashboardHeader';
import RaceTimeChart from './analysis/RaceTimeChart';
import DamageChart from './analysis/DamageChart';
import TyreWearChart from './analysis/TyreWearChart';
import IndividualLapChart from './analysis/IndividualLapChart';


export default function DashboardContainer({ user = null }) {

    const username = user?.name || 'Guest';

    const compoundColors = {
        'Soft': '#ff4444',
        'Medium': '#ffff00',
        'Hard': '#ffffff',
        'Intermediate': '#00cc00',
        'Wet': '#00b7eb',
    };

  // ALL STATE CONSTANTS

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
    const [selectedDriver, setSelectedDriver] = useState('Verstappen');
    const [additionalDriversData, setAdditionalDriversData] = useState({});

    // New state for real data
    const [tyreWearData, setTyreWearData] = useState([]);
    const [damageData, setDamageData] = useState([]);
    const [telemetryData, setTelemetryData] = useState([]);
    const [selectedLap, setSelectedLap] = useState(1);
    const [lapTelemetryData, setLapTelemetryData] = useState([]);
    
    const [trackData, setTrackData] = useState(null);

    const [driversWithDamage, setDriversWithDamage] = useState([]);
  
  // ALL THE USE EFFECT HOOKS

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
            
            // Store the list of drivers who have damage
            if (data.driversWithDamage && Array.isArray(data.driversWithDamage)) {
              console.log(`Found ${data.driversWithDamage.length} drivers with damage`);
              setDriversWithDamage(data.driversWithDamage.map(d => d.name));
            }
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
      if (!selectedSeason || !selectedRace || !selectedSessionType) return;
      
      const fetchTelemetryData = async () => {
        setIsLoading(true);
        try {
          console.log(`Fetching telemetry data for lap ${selectedLap}, driver: ${selectedDriver || 'default'}`);
          
          // Use the telemetry-lap-data endpoint
          const response = await fetch(
            `/api/telemetry-lap-data?season=${selectedSeason}&raceSlug=${selectedRace}&sessionType=${selectedSessionType}&lap=${selectedLap}&driver=${selectedDriver || ''}`, 
            { credentials: 'include' }
          );
          
          if (response.ok) {
            const data = await response.json();
            
            // Log the entire API response to see what we're getting
            console.log("FULL API RESPONSE:", data);
            
            // Check if we have lapTelemetry in the response
            if (data && data.lapTelemetry && Array.isArray(data.lapTelemetry)) {
              console.log(`✅ Successfully received ${data.lapTelemetry.length} telemetry points`);
              
              // Log some sample data to see the structure
              if (data.lapTelemetry.length > 0) {
                console.log("Sample data point:", data.lapTelemetry[0]);
                
                // Check if the data has the expected fields
                const requiredFields = ['speed', 'throttle', 'brake', 'distance'];
                const missingFields = requiredFields.filter(field => 
                  data.lapTelemetry[0][field] === undefined
                );
                
                if (missingFields.length > 0) {
                  console.warn(`⚠️ Missing required fields: ${missingFields.join(', ')}`);
                } else {
                  console.log("✅ All required fields present");
                }
              }
              
              // Store the data in state
              setLapTelemetryData(data.lapTelemetry);
            } else {
              console.warn("❌ No lapTelemetry array found in API response");
              setLapTelemetryData([]);
            }
          } else {
            console.error(`❌ API returned error: ${response.status}`);
            setLapTelemetryData([]);
          }
        } catch (error) {
          console.error('❌ Error fetching telemetry data:', error);
          setLapTelemetryData([]);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchTelemetryData();
    }, [selectedSeason, selectedRace, selectedSessionType, selectedLap, selectedDriver]);

    // Fetch track details when a race is selected
    useEffect(() => {
      if (!selectedSeason || !selectedRace) return;
      
      const fetchTrackData = async () => {
        try {
          const response = await fetch(
            `/api/track-details?raceSlug=${selectedRace}`, 
            { credentials: 'include' }
          );
          
          if (response.ok) {
            const data = await response.json();
            console.log("Track data:", data);
            setTrackData(data.track || null);
          } else {
            console.error("Error fetching track data:", await response.text());
            setTrackData(null);
          }
        } catch (error) {
          console.error('Error fetching track data:', error);
          setTrackData(null);
        }
      };
  
  fetchTrackData();
    }, [selectedSeason, selectedRace]);

    useEffect(() => {
      console.log(`🔄 lapTelemetryData updated: ${lapTelemetryData?.length || 0} points`);
      
      // Log sample data if available
      if (lapTelemetryData && lapTelemetryData.length > 0) {
        console.log("Sample point from state:", lapTelemetryData[0]);
      }
    }, [lapTelemetryData]);

    useEffect(() => {
      // Clear additional drivers when changing analysis type
      setAdditionalDriversData({});
    }, [analysisType]);
  
  // ALL THE DATA PROCESSING FUNCTIONS / CONSTS
  
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
        
        // Transform the data to the chart format - (no longer multiplying by 100 to convert to percentage)
        return sampledData.map(point => ({
        session_time: point.session_time,
        front_left: point.tyre_wear_fl,
        front_right: point.tyre_wear_fr,
        rear_left: point.tyre_wear_rl,
        rear_right: point.tyre_wear_rr,
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
      if (!telemetryData || !telemetryData.length) {
        console.log("No telemetry data available");
        return [];
      }
      
      console.log(`Processing telemetry data for driver: "${selectedDriver}", lap: ${selectedLap}`);
      
      // Extract the main telemetry data and lap data from the API response
      // The API returns { telemetryData: [...], lapData: [...] }
      const telemetryPoints = telemetryData.telemetryData || telemetryData;
      const lapDataPoints = telemetryData.lapData || [];
      
      if (telemetryPoints.length === 0) {
        console.log("No telemetry points found");
        return [];
      }
      
      console.log(`Found ${telemetryPoints.length} telemetry points and ${lapDataPoints.length} lap data points`);
      
      // Step 1: Sort both datasets by created_at timestamp
      const sortedTelemetry = [...telemetryPoints].sort((a, b) => 
        new Date(a.created_at || a.session_time) - new Date(b.created_at || b.session_time)
      );
      
      const sortedLapData = [...lapDataPoints].sort((a, b) => 
        a.lap_number - b.lap_number
      );
      
      // Step 2: Create lap boundaries based on timestamps in lap_data
      if (sortedLapData.length === 0) {
        console.log("No lap data available, showing all telemetry");
        return processAllTelemetry(sortedTelemetry);
      }
      
      // Step 3: Find the requested lap in lap_data
      const targetLapNumber = parseInt(selectedLap, 10);
      const targetLap = sortedLapData.find(lap => lap.lap_number === targetLapNumber);
      
      if (!targetLap) {
        console.log(`Lap ${selectedLap} not found in lap data, defaulting to first lap`);
        // If requested lap not found, use the first available lap
        return filterTelemetryByLap(sortedTelemetry, sortedLapData[0].lap_number, sortedLapData);
      }
      
      console.log(`Found lap ${targetLapNumber} in lap data:`, targetLap);
      return filterTelemetryByLap(sortedTelemetry, targetLapNumber, sortedLapData);
      
      // Helper function to process all telemetry if no lap data is available
      function processAllTelemetry(telemetry) {
        // Simply normalize all telemetry data for visualization
        console.log("Processing all telemetry data (no lap segmentation)");
        
        // Calculate distance based on time progression
        const startTime = telemetry[0].session_time || new Date(telemetry[0].created_at).getTime();
        const endTime = telemetry[telemetry.length - 1].session_time || 
                        new Date(telemetry[telemetry.length - 1].created_at).getTime();
        const timeRange = endTime - startTime;
        
        // Normalize the data for visualization
        return telemetry.map((point, index, array) => {
          const currentTime = point.session_time || new Date(point.created_at).getTime();
          const timeProgress = (currentTime - startTime) / timeRange;
          const distance = timeProgress * 5000; // Assuming 5km lap length
          
          return {
            position: index / array.length * 100,
            distance: distance,
            speed: point.speed,
            throttle: point.throttle * 100, // Convert 0-1 to percentage
            brake: point.brake * 100,       // Convert 0-1 to percentage
            gear: point.gear,
            rpm: point.engine_rpm,
            drs: point.drs,
            session_time: point.session_time || new Date(point.created_at).getTime(),
            car_index: point.car_index,
            driver: selectedDriver
          };
        });
      }
      
      function filterTelemetryByLap(telemetry, lapNumber, lapData) {
        console.log(`Filtering telemetry data for lap ${lapNumber}`);
        
        // Find the target lap and adjacent laps
        const lapIndex = lapData.findIndex(lap => lap.lap_number === lapNumber);
        const currentLap = lapData[lapIndex];
        const previousLap = lapIndex > 0 ? lapData[lapIndex - 1] : null;
        const nextLap = lapIndex < lapData.length - 1 ? lapData[lapIndex + 1] : null;
        
        if (!currentLap) {
          console.log(`Could not find lap ${lapNumber} data`);
          return [];
        }
        
        // IMPROVED: Correct the lap boundaries with additional validation
        const currentLapCreatedAt = new Date(currentLap.created_at || currentLap.session_time).getTime();
        const currentLapTime = currentLap.current_lap_time_ms || currentLap.lap_time_ms || 90000;
        
        // Calculate start time using more robust logic
        let lapStartTime;
        
        // Special handling for Lap 2 since it's clearly wrong in API response
        if (lapNumber === 2 && previousLap) {
          // Force Lap 2 to start at Lap 1's end time
          lapStartTime = new Date(previousLap.created_at || previousLap.session_time).getTime() + 
                         (previousLap.current_lap_time_ms || previousLap.lap_time_ms || 90000);
          
          console.log(`Special fix for Lap 2: Using Lap 1 end time: ${new Date(lapStartTime).toISOString()}`);
        } 
        else if (previousLap) {
          // For Lap 3+ use the end time of previous lap
          const previousLapTimestamp = new Date(previousLap.created_at || previousLap.session_time).getTime();
          const previousLapTime = previousLap.current_lap_time_ms || previousLap.lap_time_ms || 90000;
          lapStartTime = previousLapTimestamp + previousLapTime;
          
          console.log(`Using previous lap (${previousLap.lap_number}) end time for start: ${new Date(lapStartTime).toISOString()}`);
        } 
        else {
          // First lap - use estimated start time
          lapStartTime = currentLapCreatedAt - currentLapTime;
          console.log(`First lap: Estimated start time: ${new Date(lapStartTime).toISOString()}`);
        }
        
        // Calculate end time
        let lapEndTime;
        if (nextLap) {
          // Use next lap's start as this lap's end
          lapEndTime = new Date(nextLap.created_at || nextLap.session_time).getTime();
        } else {
          // Last lap - estimate end time
          lapEndTime = currentLapCreatedAt + currentLapTime;
        }
        
        console.log(`Final Lap ${lapNumber} boundaries: ${new Date(lapStartTime).toISOString()} to ${new Date(lapEndTime).toISOString()}`);
        
        // Filter telemetry within boundaries
        const lapTelemetry = telemetry.filter(point => {
          const pointTime = point.session_time || new Date(point.created_at).getTime();
          return pointTime >= lapStartTime && pointTime <= lapEndTime;
        });
        
        console.log(`Found ${lapTelemetry.length} telemetry points for lap ${lapNumber}`);
        
        if (lapTelemetry.length === 0) {
          return [];
        }
        
        // IMPROVED: More robust distance calculation
        const actualTrackLength = trackData?.length_meters || 5000;
        
        // Process points with initial distance estimates
        const processedPoints = lapTelemetry.map((point, index, array) => {
          const pointTime = point.session_time || new Date(point.created_at).getTime();
          const elapsedLapTime = pointTime - lapStartTime;
          const totalLapTime = lapEndTime - lapStartTime;
          const percentage = elapsedLapTime / totalLapTime;
          
          return {
            position: index / array.length * 100,
            distance: percentage * actualTrackLength, // Use actual track length directly
            speed: point.speed,
            throttle: point.throttle * 100,
            brake: point.brake * 100,
            gear: point.gear,
            rpm: point.engine_rpm,
            drs: point.drs,
            session_time: pointTime,
            car_index: point.car_index,
            driver: selectedDriver,
            lap: lapNumber
          };
        });
        
        // IMPROVED: Force the last point to be exactly at track end
        const finalPoints = [...processedPoints];
        
        // If we have points, ensure the last one reaches track end
        if (finalPoints.length > 0) {
          finalPoints[finalPoints.length - 1].distance = actualTrackLength;
          
          console.log(`Forced last telemetry point to track end (${actualTrackLength}m)`);
          console.log(`Point distances: first=${finalPoints[0].distance.toFixed(1)}m, last=${finalPoints[finalPoints.length-1].distance.toFixed(1)}m`);
        }
        
        return finalPoints;
      }

    }, [telemetryData, selectedDriver, selectedLap, trackData]);

    const fetchDriverTelemetry = async (driver, lap) => {
      // Ensure lap is a number
      const lapValue = typeof lap === 'string' ? parseInt(lap, 10) || 1 : lap;
      
      // Log what we're fetching
      console.log(`Fetching telemetry for driver: ${driver}, lap: ${lapValue}`);
      setIsLoading(true);
      
      try {
        const response = await fetch(
          `/api/telemetry-lap-data?season=${selectedSeason}&raceSlug=${selectedRace}&sessionType=${selectedSessionType}&lap=${lapValue}&driver=${driver}`, 
          { credentials: 'include' }
        );
        
        if (response.ok) {
          const data = await response.json();
          
          if (data && data.lapTelemetry && Array.isArray(data.lapTelemetry)) {
            console.log(`✅ Fetched ${data.lapTelemetry.length} telemetry points for ${driver}`);
            
            // Add to additionalDriversData state
            setAdditionalDriversData(prev => ({
              ...prev,
              [driver]: {
                driver,
                lap: lapValue,  // Use the numeric lap value
                telemetryData: data.lapTelemetry
              }
            }));
            
            return data.lapTelemetry;
          } else {
            console.warn(`❌ No telemetry data found for ${driver}, lap ${lapValue}`);
            return [];
          }
        } else {
          console.error(`❌ API returned error: ${response.status}`);
          return [];
        }
      } catch (error) {
        console.error(`❌ Error fetching telemetry for ${driver}, lap ${lapValue}:`, error);
        return [];
      } finally {
        setIsLoading(false);
      }
    };

    const fetchDriverTyreWearData = async (driver) => {
      console.log(`Fetching tyre wear data for driver: ${driver}`);
      setIsLoading(true);
      
      try {
        // If your API supports driver parameter:
        const response = await fetch(
          `/api/tyre-wear-data?season=${selectedSeason}&raceSlug=${selectedRace}&sessionType=${selectedSessionType}&driver=${driver}`, 
          { credentials: 'include' }
        );
        
        // If your API doesn't support driver parameter, use the existing endpoint and filter client-side:
        // const response = await fetch(
        //   `/api/tyre-wear-data?season=${selectedSeason}&raceSlug=${selectedRace}&sessionType=${selectedSessionType}`, 
        //   { credentials: 'include' }
        // );
        
        if (response.ok) {
          const data = await response.json();
          
          // Filter for specific driver if using client-side filtering
          const driverData = data.tyreWearData.filter(item => item.driver === driver);
          
          // Sample the data to avoid performance issues
          const sampleRate = Math.max(1, Math.floor(driverData.length / 5000));
          const sampledData = driverData.filter((_, index) => index % sampleRate === 0);
          
          // Sort by session time
          sampledData.sort((a, b) => a.session_time - b.session_time);
          
          // Add driver prefix to keys for the chart
          return sampledData.map(point => ({
            session_time: point.session_time,
            [`${driver}_front_left`]: point.tyre_wear_fl,
            [`${driver}_front_right`]: point.tyre_wear_fr,
            [`${driver}_rear_left`]: point.tyre_wear_rl,
            [`${driver}_rear_right`]: point.tyre_wear_rr,
            driver: point.driver,
            team: point.team
          }));
        } else {
          console.error(`API returned error: ${response.status}`);
          return [];
        }
      } catch (error) {
        console.error(`Error fetching tyre wear data for ${driver}:`, error);
        return [];
      } finally {
        setIsLoading(false);
      }
    };

    const fetchDriverDamageData = async (driver) => {
      console.log(`Fetching damage data for driver: ${driver}`);
      setIsLoading(true);
      
      try {
        // Use API endpoint with driver parameter
        const response = await fetch(
          `/api/damage-data?season=${selectedSeason}&raceSlug=${selectedRace}&sessionType=${selectedSessionType}&driver=${driver}`, 
          { credentials: 'include' }
        );
        
        if (response.ok) {
          const data = await response.json();
          
          if (!data.damageData || data.damageData.length === 0) {
            console.warn(`No damage data found for ${driver}`);
            return [];
          }
          
          console.log(`Received ${data.damageData.length} damage data points for ${driver}`);
          
          // Filter for the selected driver (should already be filtered by API, but double-check)
          const driverData = data.damageData.filter(dp => dp.driver === driver);
          
          if (driverData.length === 0) {
            console.log(`No damage data for driver: ${driver}`);
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
        } else {
          console.error(`API returned error: ${response.status}`);
          return [];
        }
      } catch (error) {
        console.error(`Error fetching damage data for ${driver}:`, error);
        return [];
      } finally {
        setIsLoading(false);
      }
    };
    
    // Function to add a driver to the comparison
    const addDriverToComparison = async (driver, lap = 1) => {  // Changed default from 'fastest' to 1
      // Don't add if it's the currently selected driver
      if (driver === selectedDriver) {
        console.log(`${driver} is already the main selected driver`);
        return;
      }
      
      // Don't add if already in additionalDriversData
      if (additionalDriversData[driver]) {
        console.log(`${driver} is already in the comparison`);
        return;
      }
      
      console.log(`Adding ${driver} (lap ${lap}) to comparison`);
      
      // Always use a numeric lap value
      const lapToUse = typeof lap === 'string' ? parseInt(lap, 10) || 1 : lap;
      
      // Fetch the data with the numeric lap
      await fetchDriverTelemetry(driver, lapToUse);
    };
    
    // Function to remove a driver from the comparison
    const removeDriverFromComparison = (driver) => {
      console.log(`Removing ${driver} from comparison`);
      
      // Remove from additionalDriversData
      setAdditionalDriversData(prev => {
        const newData = {...prev};
        delete newData[driver];
        return newData;
      });
    };

  // ALL THE EVENT HANDLERS

    const handleSeasonChange = (event) => {
        setSelectedSeason(event.target.value);
        setSelectedRace('');
    };

    const handleRaceChange = (event) => {
        setSelectedRace(event.target.value);
    };

    const handleDisplayModeToggle = () => {
        setDisplayMode(prev => prev === 'team' ? 'compound' : 'team');
    };

    const handleDriverToggle = (driver) => {
        setSelectedDrivers(prev => ({
        ...prev,
        [driver]: !prev[driver]
        }));
    };

    // Select 'All' drivers
    const handleSelectAll = () => {
        const newState = {};
        drivers.forEach(driver => {
        newState[driver] = true;
        });
        setSelectedDrivers(newState);
    };

    // Select 'None' drivers
    const handleDeselectAll = () => {
        const newState = {};
        drivers.forEach(driver => {
        newState[driver] = false;
        });
        setSelectedDrivers(newState);
    };

    // Handle analysis type change
    const handleAnalysisTypeChange = (event, newType) => {
        if (newType !== null) {
        setAnalysisType(newType);
        }
    };

    const handleDamageDriverSelect = (driver) => {
      console.log("Driver selected:", driver);
      // Update both selectedDriver (for DamageChart) and selectedDrivers
      setSelectedDriver(driver);
      
      // Also update selectedDrivers for consistency
      const newSelectedDrivers = {};
      drivers.forEach(d => {
        newSelectedDrivers[d] = d === driver;
      });
      setSelectedDrivers(newSelectedDrivers);
    };

    const handleTyreWearDriverSelect = (driver) => {
      console.log("Tyre wear driver selected:", driver);
      // Update both selectedDriver (for TyreWearChart) and selectedDrivers
      setSelectedDriver(driver);
      
      // Also update selectedDrivers for consistency
      const newSelectedDrivers = {};
      drivers.forEach(d => {
        newSelectedDrivers[d] = d === driver;
      });
      setSelectedDrivers(newSelectedDrivers);
    };

    const handleIndividualLapDriverSelect = (driver) => {
      console.log("Individual lap driver selected:", driver);
      // Update both selectedDriver and selectedDrivers
      setSelectedDriver(driver);
      
      // Also update selectedDrivers for consistency
      const newSelectedDrivers = {};
      drivers.forEach(d => {
        newSelectedDrivers[d] = d === driver;
      });
      setSelectedDrivers(newSelectedDrivers);
    };
    
    const handleLapSelect = (lap) => {
      console.log("Lap selected:", lap);
      setSelectedLap(lap);
    };

    

    return (
        <Box sx={{ minHeight: 'calc(89vh)', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#fff', backgroundColor: '#0a0e27', p: 4 }}>
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>F1 Telemetry Analysis</Typography>
        
        {/* Pass required props to header component */}
        <DashboardHeader 
            seasons={seasons}
            selectedSeason={selectedSeason}
            races={races}
            selectedRace={selectedRace}
            analysisType={analysisType}
            displayMode={displayMode}
            handleSeasonChange={handleSeasonChange}
            handleRaceChange={handleRaceChange}
            handleAnalysisTypeChange={handleAnalysisTypeChange}
            handleDisplayModeToggle={handleDisplayModeToggle}
            filterOutlaps={filterOutlaps}
            filterInlaps={filterInlaps}
            setFilterOutlaps={setFilterOutlaps} 
            setFilterInlaps={setFilterInlaps}
        />

        {/* Render the appropriate analysis component based on selected type */}
        <Box sx={{ width: '100%', height: '70vh', border: '0px solid #444', borderRadius: 3, p: 2, backgroundColor: '#0a0e27', overflow: 'visible' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ color: '#fff' }}>
                {analysisType === 'race-time' ? 'Lap Time Comparison' : 
                analysisType === 'damage' ? 'Damage Analysis' :
                analysisType === 'tyre-wear' ? 'Tyre Wear Analysis' :
                analysisType === 'individual-lap' ? 'Individual Lap Analysis' :
                'General Statistics'}
            </Typography>
            </Box>

            {analysisType === 'race-time' && (
            <RaceTimeChart 
                isLoading={isLoading}
                filterOutlaps={filterOutlaps}
                filterInlaps={filterInlaps}
                setFilterInlaps={setFilterInlaps}
                setFilterOutlaps={setFilterOutlaps}
                maxLapNumber={maxLapNumber}
                chartData={chartData}
                lineConfigs={lineConfigs}
                yDomain={yDomain}
                driverColorMap={driverColorMap}
                displayMode={displayMode}
                selectedDrivers={selectedDrivers}
                drivers={drivers}
                driverTeams={driverTeams}
                hoveredDriver={hoveredDriver}
                hoveredLine={hoveredLine}
                setHoveredDriver={setHoveredDriver}
                setHoveredLine={setHoveredLine}
                handleDriverToggle={handleDriverToggle}
                handleSelectAll={handleSelectAll}
                handleDeselectAll={handleDeselectAll}
                handleDisplayModeToggle={handleDisplayModeToggle}
            />
            )}

            {analysisType === 'damage' && (
            <DamageChart 
                isLoading={isLoading}
                processedDamageData={processedDamageData}
                selectedDriver={selectedDriver}
                maxLapNumber={maxLapNumber}
                drivers={drivers}
                driverTeams={driverTeams}
                driverColorMap={driverColorMap}
                onDriverSelect={handleDamageDriverSelect}
                fetchDriverDamageData={fetchDriverDamageData}
                driversWithDamage={driversWithDamage}
            />
            )}

            {analysisType === 'tyre-wear' && (
            <TyreWearChart 
                isLoading={isLoading}
                processedTyreWearData={processedTyreWearData}
                tyreWearYRange={tyreWearYRange}
                selectedDriver={selectedDriver}
                drivers={drivers}
                driverTeams={driverTeams}
                driverColorMap={driverColorMap}
                onDriverSelect={handleTyreWearDriverSelect}
                showRawLapData={showRawLapData}
                setShowRawLapData={setShowRawLapData}
                fetchDriverTyreWearData={fetchDriverTyreWearData}
              />
            )}

            {analysisType === 'individual-lap' && (
              <IndividualLapChart 
              isLoading={isLoading}
              lapTelemetry={lapTelemetryData} // Add this or make sure both are defined
              lapTelemetryData={lapTelemetryData}
              selectedDriver={selectedDriver}
              selectedLap={selectedLap}
              maxLapNumber={maxLapNumber}
              drivers={drivers}
              driverTeams={driverTeams}
              driverColorMap={driverColorMap}
              onDriverSelect={handleIndividualLapDriverSelect}
              onLapSelect={handleLapSelect}
              showRawLapData={showRawLapData}
              setShowRawLapData={setShowRawLapData}
              trackData={trackData}
              additionalDriversData={additionalDriversData}
              fetchDriverTelemetry={fetchDriverTelemetry}
              addDriverToComparison={addDriverToComparison}
              removeDriverFromComparison={removeDriverFromComparison}
              exportChartAsImage={(ref, filename) => {
                console.log('Export chart functionality would go here', ref, filename);
                // Define a simple function or import your actual export function
              }}
            />
            )}

            {analysisType === 'n/a' && (
            <DamageChart 
              isLoading={isLoading}
              processedDamageData={processedDamageData}
              selectedDriver={selectedDriver}
              maxLapNumber={maxLapNumber}
              drivers={drivers}
              driverTeams={driverTeams}
              driverColorMap={driverColorMap}
              onDriverSelect={handleDamageDriverSelect}
            />
            )}
            
        </Box>
        
        {/* Debug panel can remain in the container for now
        <Box sx={{ mt: 4, p: 2, border: '1px dashed #666', borderRadius: 1, width: '100%' }}> */}
            {/* Debug panel content */}
        </Box>
    );
}