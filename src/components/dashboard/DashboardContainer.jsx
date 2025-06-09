'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DashboardHeader from './DashboardHeader';
import TeamPaceRankingChart from './analysis/TeamPaceRankingChart';
import LapDistributionViolinChart from './analysis/LapDistributionViolinChart';
import RaceTimeChart from './analysis/RaceTimeChart';
import DamageChart from './analysis/DamageChart';
import TyreWearChart from './analysis/TyreWearChart';
import IndividualLapChart from './analysis/IndividualLapChart';
import GeneralStatsChart from './analysis/GeneralStatsChart';
import TrackDominanceChart from './analysis/TrackDominanceChart';
import F1Card from './F1Card';
import { Trophy, Zap, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DashboardContainer() {
  const compoundColors = {
    'Soft': '#ff4444',
    'Medium': '#ffff00',
    'Hard': '#ffffff',
    'Intermediate': '#00cc00',
    'Wet': '#00b7eb',
  };

  // Helper function to generate random color
  const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  // Team ID to color mapping
  const teamIdToColor = {
    1: '#00D2BE', // Mercedes
    2: '#0600EF', // Red Bull Racing
    3: '#DC0000', // Ferrari
    4: '#FF8700', // McLaren
    5: '#0090FF', // Alpine
    6: '#006F62', // Aston Martin
    7: '#900000', // Alfa Romeo
    8: '#2B4562', // AlphaTauri
    9: '#FFFFFF', // Haas
    10: '#005AFF', // Williams
  };

  // SEPARATE LOADING STATES - This fixes F1Cards reloading issue
  const [isInitialLoading, setIsInitialLoading] = useState(true); // For F1Cards and initial data
  const [isTelemetryLoading, setIsTelemetryLoading] = useState(false); // For telemetry data only
  const [isRaceDataLoading, setIsRaceDataLoading] = useState(false); // For race/season changes
  
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

  // Analysis type toggle - updated to include track-dominance and lap-analysis
  const [analysisType, setAnalysisType] = useState('lap-analysis');

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
  const [selectedLap, setSelectedLap] = useState('fastest'); // Default to fastest lap
  const [lapTelemetryData, setLapTelemetryData] = useState([]);
  const [previousLapTelemetryData, setPreviousLapTelemetryData] = useState([]); // Keep previous data while loading
  
  const [trackData, setTrackData] = useState(null);
  const [driversWithDamage, setDriversWithDamage] = useState([]);
  const [generalStats, setGeneralStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [selectedStat, setSelectedStat] = useState('overview');

  // New state for track dominance data
  const [dominanceData, setDominanceData] = useState([]);
  const [isLoadingDominance, setIsLoadingDominance] = useState(false);

  // Race information - separate from other loading states
  const [raceInfo, setRaceInfo] = useState({
    winner: { name: 'Loading...', team: 'default' },
    poleSitter: { name: 'Loading...', time: '', team: 'default' },
    fastestLap: { name: 'Loading...', time: '', team: 'default' }
  });
  const [isRaceInfoLoading, setIsRaceInfoLoading] = useState(false);

  // USE EFFECT HOOKS
  // Fetch available seasons
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const response = await fetch('/api/available-seasons', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          console.log('📅 Available seasons:', data.seasons);

          if (data.seasons && data.seasons.length) {
            setSeasons(data.seasons);
            console.log('🎯 Will select season:', data.seasons[0]);
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
      setIsRaceDataLoading(true);
      try {
        console.log('🔍 Fetching races for season:', selectedSeason);

        const response = await fetch(`/api/season-races?season=${selectedSeason}`, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();

          console.log('📊 API Response:', data); 
          console.log('🏁 Races array:', data.races); 

          if (data.races && data.races.length) {
            setRaces(data.races);
            setSelectedRace(data.races[data.races.length - 1].slug); // Select most recent race
          }
        }
      } catch (error) {
         console.error('Error fetching races:', error);
      } finally {
        setIsRaceDataLoading(false);
      }
    };
    
    fetchRaces();
  }, [selectedSeason]);

  // Fetch race information (winner, pole, fastest lap) - SEPARATE LOADING STATE
  useEffect(() => {
    if (!selectedSeason || !selectedRace) return;
    
    const fetchRaceInfo = async () => {
      setIsRaceInfoLoading(true); // Use separate loading state
      try {
        const response = await fetch(
          `/api/race-info?season=${selectedSeason}&raceSlug=${selectedRace}`, 
          { credentials: 'include' }
        );
        
        if (response.ok) {
          const data = await response.json();
          setRaceInfo({
            winner: { 
              name: data.winner?.name || 'N/A', 
              team: data.winner?.team || 'default'
            },
            poleSitter: { 
              name: data.poleSitter?.name || 'N/A', 
              time: data.poleSitter?.time || '', 
              team: data.poleSitter?.team || 'default'
            },
            fastestLap: { 
              name: data.fastestLap?.name || 'N/A',
              time: data.fastestLap?.time || '',
              team: data.fastestLap?.team || 'default'
            }
          });
        }
      } catch (error) {
        // DEBUG: console.error('Error fetching race info:', error);
      } finally {
        setIsRaceInfoLoading(false);
      }
    };
    
    fetchRaceInfo();
  }, [selectedSeason, selectedRace]); // Only depends on season and race, NOT lap

  // Fetch lap data when race changes
  useEffect(() => {
    if (!selectedSeason || !selectedRace) return;
    
    const fetchLapData = async () => {
      setIsInitialLoading(true);
      try {
        const response = await fetch(
          `/api/lap-data?season=${selectedSeason}&raceSlug=${selectedRace}&sessionType=${selectedSessionType}`, 
          { credentials: 'include' }
        );
        if (response.ok) {
          const data = await response.json();
          // DEBUG: console.log("API Response:", data);
  
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
            // DEBUG: console.log("Stint data loaded:", data.stintData);
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
        // DEBUG: console.error('Error fetching lap data:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };
    
    fetchLapData();
  }, [selectedSeason, selectedRace, selectedSessionType]);

  // Fetch track dominance data when race changes
  useEffect(() => {
    if (!selectedSeason || !selectedRace || !selectedSessionType) return;
    
    const fetchDominanceData = async () => {
      setIsLoadingDominance(true);
      try {
        const response = await fetch(
          `/api/track-dominance?season=${selectedSeason}&raceSlug=${selectedRace}&sessionType=${selectedSessionType}`, 
          { credentials: 'include' }
        );
        if (response.ok) {
          const data = await response.json();
          // DEBUG: console.log("Track dominance API Response:", data);
          setDominanceData(data.dominanceData || []);
        }
      } catch (error) {
        // DEBUG: console.error('Error fetching track dominance data:', error);
        setDominanceData([]);
      } finally {
        setIsLoadingDominance(false);
      }
    };
    
    fetchDominanceData();
  }, [selectedSeason, selectedRace, selectedSessionType]);

  // Fetch tyre wear data when race changes
  useEffect(() => {
    if (!selectedSeason || !selectedRace || !selectedSessionType) return;
    
    const fetchTyreWearData = async () => {
      setIsRaceDataLoading(true);
      try {
        const response = await fetch(
          `/api/tyre-wear-data?season=${selectedSeason}&raceSlug=${selectedRace}&sessionType=${selectedSessionType}`, 
          { credentials: 'include' }
        );
        if (response.ok) {
          const data = await response.json();
          // DEBUG: console.log("Tyre Wear API Response:", data);
          setTyreWearData(data.tyreWearData || []);
        }
      } catch (error) {
        // DEBUG: console.error('Error fetching tyre wear data:', error);
      } finally {
        setIsRaceDataLoading(false);
      }
    };
    
    fetchTyreWearData();
  }, [selectedSeason, selectedRace, selectedSessionType]);

  // Fetch damage data when race changes
  useEffect(() => {
    if (!selectedSeason || !selectedRace || !selectedSessionType) return;
    
    const fetchDamageData = async () => {
      setIsRaceDataLoading(true);
      try {
        const response = await fetch(
          `/api/damage-data?season=${selectedSeason}&raceSlug=${selectedRace}&sessionType=${selectedSessionType}`, 
          { credentials: 'include' }
        );
        if (response.ok) {
          const data = await response.json();
          // DEBUG: console.log("Damage API Response:", data);
          setDamageData(data.damageData || []);
          
          // Store the list of drivers who have damage
          if (data.driversWithDamage && Array.isArray(data.driversWithDamage)) {
            // DEBUG: console.log(`Found ${data.driversWithDamage.length} drivers with damage`);
            setDriversWithDamage(data.driversWithDamage.map(d => d.name));
          }
        }
      } catch (error) {
        // DEBUG: console.error('Error fetching damage data:', error);
      } finally {
        setIsRaceDataLoading(false);
      }
    };
    
    fetchDamageData();
  }, [selectedSeason, selectedRace, selectedSessionType]);

  // Fetch telemetry data for individual lap analysis - SEPARATE LOADING STATE
  useEffect(() => {
    if (!selectedSeason || !selectedRace || !selectedSessionType) return;
    
    const fetchTelemetryData = async () => {
      setIsTelemetryLoading(true); // Use separate loading state
      // Keep previous data visible while loading
      setPreviousLapTelemetryData(lapTelemetryData);
      
      try {
        // Get actual lap number for API call
        const actualLap = getActualLapNumber(selectedLap, selectedDriver);
        
        // DEBUG: console.log(`Fetching telemetry data for lap ${selectedLap} (actual: ${actualLap}), driver: ${selectedDriver || 'default'}`);
        
        const response = await fetch(
          `/api/telemetry-lap-data?season=${selectedSeason}&raceSlug=${selectedRace}&sessionType=${selectedSessionType}&lap=${actualLap}&driver=${selectedDriver || ''}`, 
          { credentials: 'include' }
        );
        
        if (response.ok) {
          const data = await response.json();
          
          // DEBUG: console.log("FULL API RESPONSE:", data);
          
          if (data && data.lapTelemetry && Array.isArray(data.lapTelemetry)) {
            // DEBUG: console.log(`✅ Successfully received ${data.lapTelemetry.length} telemetry points`);
            
            if (data.lapTelemetry.length > 0) {
              // DEBUG: console.log("Sample data point:", data.lapTelemetry[0]);
              
              const requiredFields = ['speed', 'throttle', 'brake', 'distance'];
              const missingFields = requiredFields.filter(field => 
                data.lapTelemetry[0][field] === undefined
              );
              
              if (missingFields.length > 0) {
                // DEBUG: console.warn(`⚠️ Missing required fields: ${missingFields.join(', ')}`);
              } else {
                // DEBUG: console.log("✅ All required fields present");
              }
            }
            
            setLapTelemetryData(data.lapTelemetry);
            setPreviousLapTelemetryData([]); // Clear previous data once new data is loaded
          } else {
            // DEBUG: console.warn("❌ No lapTelemetry array found in API response");
            setLapTelemetryData([]);
          }
        } else {
          // DEBUG: console.error(`❌ API returned error: ${response.status}`);
          setLapTelemetryData([]);
        }
      } catch (error) {
        // DEBUG: console.error('❌ Error fetching telemetry data:', error);
        setLapTelemetryData([]);
      } finally {
        setIsTelemetryLoading(false);
      }
    };
    
    fetchTelemetryData();
  }, [selectedSeason, selectedRace, selectedSessionType, selectedLap, selectedDriver, lapData]); // Add lapData dependency

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
          // DEBUG: console.log("Track data:", data);
          setTrackData(data.track || null);
        } else {
          // DEBUG: console.error("Error fetching track data:", await response.text());
          setTrackData(null);
        }
      } catch (error) {
        // DEBUG: console.error('Error fetching track data:', error);
        setTrackData(null);
      }
    };

    fetchTrackData();
  }, [selectedSeason, selectedRace]);

  useEffect(() => {
    // DEBUG: console.log(`🔄 lapTelemetryData updated: ${lapTelemetryData?.length || 0} points`);
    
    if (lapTelemetryData && lapTelemetryData.length > 0) {
      // DEBUG: console.log("Sample point from state:", lapTelemetryData[0]);
    }
  }, [lapTelemetryData]);

  useEffect(() => {
    // Clear additional drivers when changing analysis type
    setAdditionalDriversData({});
  }, [analysisType]);

  useEffect(() => {
    if (!selectedSeason || !selectedRace || !selectedSessionType) return;
    
    const fetchGeneralStats = async () => {
      try {
        setIsLoadingStats(true);
        const response = await fetch(
          `/api/general-stats?season=${selectedSeason}&raceSlug=${selectedRace}&sessionType=${selectedSessionType}`, 
          { credentials: 'include' }
        );
        if (response.ok) {
          const data = await response.json();
          setGeneralStats(data);
        }
      } catch (error) {
        // DEBUG: console.error('Error fetching general stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };
    
    fetchGeneralStats();
  }, [selectedSeason, selectedRace, selectedSessionType]);

  // Function to force the cache reset (for sunday eve usage basically)
  const forceRefresh = () => {
  // Clear browser cache for your API endpoints
  if ('caches' in window) {
    caches.delete('api-cache');
  }
  
  // Force reload
  window.location.reload(true);
  };

  // Function to find fastest lap for a driver
  const getFastestLapForDriver = (driver) => {
    if (!lapData || lapData.length === 0) return 1;
    
    // Filter laps for the specific driver and find the fastest valid lap time
    const driverLaps = lapData.filter(lap => 
      lap.driver === driver && 
      lap.lap_time_int > 0 && // Valid lap time
      lap.lap_time_int < 200000 // Reasonable lap time (under 200 seconds)
    );
    
    if (driverLaps.length === 0) return 1;
    
    // Find the lap with the minimum lap time
    const fastestLap = driverLaps.reduce((fastest, current) => 
      current.lap_time_int < fastest.lap_time_int ? current : fastest
    );
    
    // Return the normalized lap number (adding 1 to account for zero-indexing)
    return (fastestLap.lap_number || 0) + 1;
  };

  // Get actual lap number for API calls
  const getActualLapNumber = (lapSelection, driver) => {
    if (lapSelection === 'fastest') {
      return getFastestLapForDriver(driver);
    }
    return parseInt(lapSelection) || 1;
  };
  
  // Process lap data into a format Recharts can use
  const { chartData, lineConfigs, yDomain, driverColorMap } = useMemo(() => {
    if (!lapData || lapData.length === 0) {
      return { chartData: [], lineConfigs: [], yDomain: [0, 0], driverColorMap: {} };
    }
    
    // DEBUG: console.log("Processing lap data with session history information");
    
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
    // DEBUG: console.log(`Lap range in data: ${minLapNumberInData}-${maxLapNumberInData}, normalized to ${minLapNumberInData+1}-${normalizedMaxLap}`);
    
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
        // DEBUG: console.warn(`Skipping detailed stint processing for ${driver} - too many laps (${laps.length})`);
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
    // DEBUG: console.log("Chart data prepared:", chartData.length, "data points");
    
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
    
    // DEBUG: console.log("Processing damage data, total points:", damageData.length);
    
    // Filter for the selected driver
    const driverData = damageData.filter(dp => dp.driver === selectedDriver);
    
    if (driverData.length === 0) {
      // DEBUG: console.log(`No damage data for driver: ${selectedDriver}`);
      return [];
    }
    
    // Sort by session_time
    driverData.sort((a, b) => a.session_time - b.session_time);
    
    // Sample the data to reduce points (take every Nth point)
    const sampleSize = Math.max(1, Math.floor(driverData.length / 2000));
    const sampledData = driverData.filter((_, i) => i % sampleSize === 0);
    
    // DEBUG: console.log(`Sampled damage data from ${driverData.length} to ${sampledData.length} points`);
    
    // Calculate approximate lap time from the data
    const totalTime = driverData[driverData.length-1].session_time - driverData[0].session_time;
    const estimatedLapTime = Math.floor(totalTime / (maxLapNumber || 50)); // Use maxLapNumber as fallback
    const pointsPerLap = Math.max(1, Math.floor(sampledData.length / (maxLapNumber || 50)));
    
    // DEBUG: console.log(`Estimated lap time: ${estimatedLapTime}s, points per lap: ${pointsPerLap}`);
    
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
    
    // DEBUG: console.log(`Processed damage data into ${finalData.length} laps`);
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
    
    // Transform the data to the chart format
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

  // Calculate y-axis range for tyre wear chart
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
      // DEBUG: console.log("No telemetry data available");
      return [];
    }
    
    // DEBUG: console.log(`Processing telemetry data for driver: "${selectedDriver}", lap: ${selectedLap}`);
    
    // Extract the main telemetry data and lap data from the API response
    const telemetryPoints = telemetryData.telemetryData || telemetryData;
    const lapDataPoints = telemetryData.lapData || [];
    
    if (telemetryPoints.length === 0) {
      // DEBUG: console.log("No telemetry points found");
      return [];
    }
    
    // DEBUG: console.log(`Found ${telemetryPoints.length} telemetry points and ${lapDataPoints.length} lap data points`);
    
    // Step 1: Sort both datasets by created_at timestamp
    const sortedTelemetry = [...telemetryPoints].sort((a, b) => 
      new Date(a.created_at || a.session_time) - new Date(b.created_at || b.session_time)
    );
    
    const sortedLapData = [...lapDataPoints].sort((a, b) => 
      a.lap_number - b.lap_number
    );
    
    // Step 2: Create lap boundaries based on timestamps in lap_data
    if (sortedLapData.length === 0) {
      // DEBUG: console.log("No lap data available, showing all telemetry");
      return processAllTelemetry(sortedTelemetry);
    }
    
    // Step 3: Find the requested lap in lap_data
    const targetLapNumber = parseInt(selectedLap, 10);
    const targetLap = sortedLapData.find(lap => lap.lap_number === targetLapNumber);
    
    if (!targetLap) {
      // DEBUG: console.log(`Lap ${selectedLap} not found in lap data, defaulting to first lap`);
      return filterTelemetryByLap(sortedTelemetry, sortedLapData[0].lap_number, sortedLapData);
    }
    
    // DEBUG: console.log(`Found lap ${targetLapNumber} in lap data:`, targetLap);
    return filterTelemetryByLap(sortedTelemetry, targetLapNumber, sortedLapData);
    
    // Helper function to process all telemetry if no lap data is available
    function processAllTelemetry(telemetry) {
      // DEBUG: console.log("Processing all telemetry data (no lap segmentation)");
      
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
      // DEBUG: console.log(`Filtering telemetry data for lap ${lapNumber}`);
      
      const lapIndex = lapData.findIndex(lap => lap.lap_number === lapNumber);
      const currentLap = lapData[lapIndex];
      const previousLap = lapIndex > 0 ? lapData[lapIndex - 1] : null;
      const nextLap = lapIndex < lapData.length - 1 ? lapData[lapIndex + 1] : null;
      
      if (!currentLap) {
        // DEBUG: console.log(`Could not find lap ${lapNumber} data`);
        return [];
      }
      
      const currentLapCreatedAt = new Date(currentLap.created_at || currentLap.session_time).getTime();
      const currentLapTime = currentLap.current_lap_time_ms || currentLap.lap_time_ms || 90000;
      
      let lapStartTime;
      
      if (lapNumber === 2 && previousLap) {
        lapStartTime = new Date(previousLap.created_at || previousLap.session_time).getTime() + 
                       (previousLap.current_lap_time_ms || previousLap.lap_time_ms || 90000);
        
        // DEBUG: console.log(`Special fix for Lap 2: Using Lap 1 end time: ${new Date(lapStartTime).toISOString()}`);
      } 
      else if (previousLap) {
        const previousLapTimestamp = new Date(previousLap.created_at || previousLap.session_time).getTime();
        const previousLapTime = previousLap.current_lap_time_ms || previousLap.lap_time_ms || 90000;
        lapStartTime = previousLapTimestamp + previousLapTime;
        
        // DEBUG: console.log(`Using previous lap (${previousLap.lap_number}) end time for start: ${new Date(lapStartTime).toISOString()}`);
      } 
      else {
        lapStartTime = currentLapCreatedAt - currentLapTime;
        // DEBUG: console.log(`First lap: Estimated start time: ${new Date(lapStartTime).toISOString()}`);
      }
      
      let lapEndTime;
      if (nextLap) {
        lapEndTime = new Date(nextLap.created_at || nextLap.session_time).getTime();
      } else {
        lapEndTime = currentLapCreatedAt + currentLapTime;
      }
      
      // DEBUG: console.log(`Final Lap ${lapNumber} boundaries: ${new Date(lapStartTime).toISOString()} to ${new Date(lapEndTime).toISOString()}`);
      
      const lapTelemetry = telemetry.filter(point => {
        const pointTime = point.session_time || new Date(point.created_at).getTime();
        return pointTime >= lapStartTime && pointTime <= lapEndTime;
      });
      
      // DEBUG: console.log(`Found ${lapTelemetry.length} telemetry points for lap ${lapNumber}`);
      
      if (lapTelemetry.length === 0) {
        return [];
      }
      
      const actualTrackLength = trackData?.length_meters || 5000;
      
      const processedPoints = lapTelemetry.map((point, index, array) => {
        const pointTime = point.session_time || new Date(point.created_at).getTime();
        const elapsedLapTime = pointTime - lapStartTime;
        const totalLapTime = lapEndTime - lapStartTime;
        const percentage = elapsedLapTime / totalLapTime;
        
        return {
          position: index / array.length * 100,
          distance: percentage * actualTrackLength,
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
      
      const finalPoints = [...processedPoints];
      
      if (finalPoints.length > 0) {
        finalPoints[finalPoints.length - 1].distance = actualTrackLength;
        
        // DEBUG: console.log(`Forced last telemetry point to track end (${actualTrackLength}m)`);
        // DEBUG: console.log(`Point distances: first=${finalPoints[0].distance.toFixed(1)}m, last=${finalPoints[finalPoints.length-1].distance.toFixed(1)}m`);
      }
      
      return finalPoints;
    }
  }, [telemetryData, selectedDriver, selectedLap, trackData]);

  const fetchDriverTelemetry = async (driver, lap) => {
    const lapValue = typeof lap === 'string' ? parseInt(lap, 10) || 1 : lap;
    
    // DEBUG: console.log(`Fetching telemetry for driver: ${driver}, lap: ${lapValue}`);
    setIsTelemetryLoading(true);
    
    try {
      const response = await fetch(
        `/api/telemetry-lap-data?season=${selectedSeason}&raceSlug=${selectedRace}&sessionType=${selectedSessionType}&lap=${lapValue}&driver=${driver}`, 
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.lapTelemetry && Array.isArray(data.lapTelemetry)) {
          // DEBUG: console.log(`✅ Fetched ${data.lapTelemetry.length} telemetry points for ${driver}`);
          
          setAdditionalDriversData(prev => ({
            ...prev,
            [driver]: {
              driver,
              lap: lapValue,
              telemetryData: data.lapTelemetry
            }
          }));
          
          return data.lapTelemetry;
        } else {
          // DEBUG: console.warn(`❌ No telemetry data found for ${driver}, lap ${lapValue}`);
          return [];
        }
      } else {
        // DEBUG: console.error(`❌ API returned error: ${response.status}`);
        return [];
      }
    } catch (error) {
      // DEBUG: console.error(`❌ Error fetching telemetry for ${driver}, lap ${lapValue}:`, error);
      return [];
    } finally {
      setIsTelemetryLoading(false);
    }
  };

  const fetchDriverTyreWearData = async (driver) => {
    // DEBUG: console.log(`Fetching tyre wear data for driver: ${driver}`);
    setIsRaceDataLoading(true);
    
    try {
      const response = await fetch(
        `/api/tyre-wear-data?season=${selectedSeason}&raceSlug=${selectedRace}&sessionType=${selectedSessionType}&driver=${driver}`, 
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        const driverData = data.tyreWearData.filter(item => item.driver === driver);
        
        const sampleRate = Math.max(1, Math.floor(driverData.length / 5000));
        const sampledData = driverData.filter((_, index) => index % sampleRate === 0);
        
        sampledData.sort((a, b) => a.session_time - b.session_time);
        
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
        // DEBUG: console.error(`API returned error: ${response.status}`);
        return [];
      }
    } catch (error) {
      // DEBUG: console.error(`Error fetching tyre wear data for ${driver}:`, error);
      return [];
    } finally {
      setIsRaceDataLoading(false);
    }
  };

  const fetchDriverDamageData = async (driver) => {
    // DEBUG: console.log(`Fetching damage data for driver: ${driver}`);
    setIsRaceDataLoading(true);
    
    try {
      const response = await fetch(
        `/api/damage-data?season=${selectedSeason}&raceSlug=${selectedRace}&sessionType=${selectedSessionType}&driver=${driver}`, 
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (!data.damageData || data.damageData.length === 0) {
          // DEBUG: console.warn(`No damage data found for ${driver}`);
          return [];
        }
        
        // DEBUG: console.log(`Received ${data.damageData.length} damage data points for ${driver}`);
        
        const driverData = data.damageData.filter(dp => dp.driver === driver);
        
        if (driverData.length === 0) {
          // DEBUG: console.log(`No damage data for driver: ${driver}`);
          return [];
        }
        
        driverData.sort((a, b) => a.session_time - b.session_time);
        
        const sampleSize = Math.max(1, Math.floor(driverData.length / 2000));
        const sampledData = driverData.filter((_, i) => i % sampleSize === 0);
        
        // DEBUG: console.log(`Sampled damage data from ${driverData.length} to ${sampledData.length} points`);
        
        const totalTime = driverData[driverData.length-1].session_time - driverData[0].session_time;
        const estimatedLapTime = Math.floor(totalTime / (maxLapNumber || 50));
        const pointsPerLap = Math.max(1, Math.floor(sampledData.length / (maxLapNumber || 50)));
        
        const processedData = sampledData.map((dataPoint, index) => {
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
        
        const finalData = Object.values(lapMap)
          .map(lap => ({
            lap: lap.lap,
            frontWing: lap.frontWing / lap.count,
            rearWing: lap.rearWing / lap.count,
            diffuser: lap.diffuser / lap.count,
            floor: lap.floor / lap.count,
            sidepod: lap.sidepod / lap.count
          }))
          .sort((a, b) => a.lap - b.lap);
        
        // DEBUG: console.log(`Processed damage data into ${finalData.length} laps`);
        return finalData;
      } else {
        // DEBUG: console.error(`API returned error: ${response.status}`);
        return [];
      }
    } catch (error) {
      // DEBUG: console.error(`Error fetching damage data for ${driver}:`, error);
      return [];
    } finally {
      setIsRaceDataLoading(false);
    }
  };
  
  // Function to add a driver to the comparison
  const addDriverToComparison = async (driver, lap = 1) => {
    if (driver === selectedDriver) {
      // DEBUG: console.log(`${driver} is already the main selected driver`);
      return;
    }
    
    // DEBUG: console.log(`Adding/Updating ${driver} (lap ${lap}) to comparison`);
    
    const lapToUse = typeof lap === 'string' ? parseInt(lap, 10) || 1 : lap;
    
    if (additionalDriversData[driver]) {
      // DEBUG: console.log(`Removing existing data for ${driver} before adding lap ${lapToUse}`);
      removeDriverFromComparison(driver);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    await fetchDriverTelemetry(driver, lapToUse);
  };
  
  // Function to remove a driver from the comparison
  const removeDriverFromComparison = (driver) => {
    // DEBUG: console.log(`Removing ${driver} from comparison`);
    
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

  const handleSelectAll = () => {
    const newState = {};
    drivers.forEach(driver => {
      newState[driver] = true;
    });
    setSelectedDrivers(newState);
  };

  const handleDeselectAll = () => {
    const newState = {};
    drivers.forEach(driver => {
      newState[driver] = false;
    });
    setSelectedDrivers(newState);
  };

  const handleAnalysisTypeChange = (event, newType) => {
    if (newType !== null) {
      setAnalysisType(newType);
    }
  };

  const handleDamageDriverSelect = (driver) => {
    // DEBUG: console.log("Driver selected:", driver);
    setSelectedDriver(driver);
    
    const newSelectedDrivers = {};
    drivers.forEach(d => {
      newSelectedDrivers[d] = d === driver;
    });
    setSelectedDrivers(newSelectedDrivers);
  };

  const handleTyreWearDriverSelect = (driver) => {
    // DEBUG: console.log("Tyre wear driver selected:", driver);
    setSelectedDriver(driver);
    
    const newSelectedDrivers = {};
    drivers.forEach(d => {
      newSelectedDrivers[d] = d === driver;
    });
    setSelectedDrivers(newSelectedDrivers);
  };

  const handleIndividualLapDriverSelect = (driver) => {
    // DEBUG: console.log("Individual lap driver selected:", driver);
    setSelectedDriver(driver);
    
    const newSelectedDrivers = {};
    drivers.forEach(d => {
      newSelectedDrivers[d] = d === driver;
    });
    setSelectedDrivers(newSelectedDrivers);
  };
  
  const handleLapSelect = (lap) => {
    // DEBUG: console.log("Lap selected:", lap);
    setSelectedLap(lap);
  };

  // Use the current lap telemetry data or fall back to previous data while loading
  const displayTelemetryData = isTelemetryLoading && previousLapTelemetryData.length > 0 
    ? previousLapTelemetryData 
    : lapTelemetryData;

  return (
    <div className="flex flex-col space-y-6">
      {/* Dashboard Header with Race and Season Selection */}
      <DashboardHeader 
        seasons={seasons}
        selectedSeason={selectedSeason}
        races={races}
        selectedRace={selectedRace}
        analysisType={analysisType}
        handleSeasonChange={handleSeasonChange}
        handleRaceChange={handleRaceChange}
        handleAnalysisTypeChange={handleAnalysisTypeChange}
      />

      {/* Race Information Cards - USE SEPARATE LOADING STATE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <F1Card
          title="Race Winner"
          value={raceInfo.winner.name}
          team={raceInfo.winner.team}
          icon={<Trophy size={20} />}
          loading={isRaceInfoLoading} // Use separate loading state
        />
        <F1Card
          title="Pole Position"
          value={raceInfo.poleSitter.name}
          subValue={raceInfo.poleSitter.time}
          team={raceInfo.poleSitter.team}
          icon={<Zap size={20} />}
          loading={isRaceInfoLoading} // Use separate loading state
        />
        <F1Card
          title="Fastest Lap"
          value={raceInfo.fastestLap.name}
          subValue={raceInfo.fastestLap.time}
          team={raceInfo.fastestLap.team}
          icon={<Clock size={20} />}
          loading={isRaceInfoLoading} // Use separate loading state
        />
      </div>
      
      {/* Main Content Area */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-4 sm:p-6">
        {/* Render the appropriate analysis component based on selected type */}
        {analysisType === 'lap-analysis' && (
          <Tabs defaultValue="race-time" className="w-full">
            <TabsList className="bg-gray-800/60 border border-gray-700/60 mb-4">
              <TabsTrigger value="race-time" className="data-[state=active]:bg-gray-700">
                Total Race View
              </TabsTrigger>
              <TabsTrigger value="individual-lap" className="data-[state=active]:bg-gray-700">
                Individual Lap Analysis
              </TabsTrigger>
              <TabsTrigger value="team-pace" className="data-[state=active]:bg-gray-700">
                Team Pace Ranking
              </TabsTrigger>
              <TabsTrigger value="lap-distro" className="data-[state=active]:bg-gray-700">
                Lap Distribution
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="race-time" className="mt-0">
              <RaceTimeChart 
                isLoading={isInitialLoading || isRaceDataLoading}
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
            </TabsContent>
            
            <TabsContent value="individual-lap" className="mt-0">
              <IndividualLapChart 
                isLoading={isTelemetryLoading}
                lapTelemetry={displayTelemetryData} // Use display data that doesn't clear while loading
                lapTelemetryData={displayTelemetryData}
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
              />
            </TabsContent>

            <TabsContent value="team-pace" className="mt-0">
              <TeamPaceRankingChart 
                isLoading={isInitialLoading || isRaceDataLoading}
                maxLapNumber={maxLapNumber}
                chartData={chartData}
                lineConfigs={lineConfigs}
                driverColorMap={driverColorMap}
                drivers={drivers}
                driverTeams={driverTeams}
                selectedDrivers={selectedDrivers}
              />
            </TabsContent>

            <TabsContent value="lap-distro" className="mt-0">
              {/* <LapDistributionViolinChart
                //isLoading={isLoading}
                lapData={lapData}
                drivers={drivers}
                selectedSeason={selectedSeason}
                selectedRace={selectedRace}
                selectedSessionType={selectedSessionType}
              /> */}
            </TabsContent>

          </Tabs>
        )}

        {analysisType === 'track-dominance' && (
          <TrackDominanceChart 
            isLoading={isLoadingDominance} // Only pass dominance loading, not telemetry loading
            isTelemetryLoading={isTelemetryLoading} // Pass telemetry loading separately
            selectedDriver={selectedDriver}
            selectedLap={selectedLap}
            maxLapNumber={maxLapNumber}
            drivers={drivers}
            driverTeams={driverTeams}
            driverColorMap={driverColorMap}
            onDriverSelect={handleIndividualLapDriverSelect}
            onLapSelect={handleLapSelect}
            trackData={trackData}
            additionalDriversData={additionalDriversData}
            fetchDriverTelemetry={fetchDriverTelemetry}
            addDriverToComparison={addDriverToComparison}
            removeDriverFromComparison={removeDriverFromComparison}
            lapTelemetryData={displayTelemetryData} // Use display data
            selectedSeason={selectedSeason}
            selectedRace={selectedRace}
            selectedSessionType={selectedSessionType}
            lapData={lapData} // Pass lapData for fastest lap detection
          />
        )}

        {analysisType === 'damage' && (
          <DamageChart 
            isLoading={isInitialLoading || isRaceDataLoading}
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
            isLoading={isInitialLoading || isRaceDataLoading}
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

        {analysisType === 'general-stats' && (
          <GeneralStatsChart
            isLoading={isLoadingStats}
            generalStats={generalStats}
            drivers={drivers}
            driverTeams={driverTeams}
            selectedStat={selectedStat}
            setSelectedStat={setSelectedStat}
          />
        )}
      </div>
    </div>
  );
}