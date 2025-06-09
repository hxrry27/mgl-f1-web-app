"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Zap, TrendingUp, BarChart2, Map } from 'lucide-react';
import trackLayouts from '@/data/track-layouts.json';

// Enhanced Track Visualization Component with hover interactions
const F1TrackViz = ({ 
  trackSlug, 
  sectorDeltas, 
  selectedDriver, 
  comparisonDriver, 
  driverColorMap, 
  driverTeams,
  hoveredSector,
  setHoveredSector 
}) => {
  const trackRef = useRef(null);
  const [trackSegments, setTrackSegments] = useState([]);
  
  // get track path from the FastF1 track layouts already pulled and stored
  const trackPath = trackSlug && trackLayouts[trackSlug] ? trackLayouts[trackSlug] : null;
  
  // generate track segments once track path is available
  useEffect(() => {
    if (!trackPath || !trackRef.current) return;
    
    try {
      // create a temporary SVG element to work with the path
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.style.visibility = "hidden";
      svg.style.position = "absolute";
      document.body.appendChild(svg);
      
      // create a path element with track path
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", trackPath);
      svg.appendChild(path);
      
      // get total length of path
      const pathLength = path.getTotalLength();
      
      // preset 25 segments following on from fastlytics analysis
      const numSegments = Math.min(25, sectorDeltas?.length || 25);
      const segments = [];
      
      // create segment data with proper path extraction
      for (let i = 0; i < numSegments; i++) {
        const startPercent = i / numSegments;
        const endPercent = (i + 1) / numSegments;
        
        const startDistance = startPercent * pathLength;
        const endDistance = endPercent * pathLength;
        
        // get more points within each segment to maintain pwetty curve shape
        const numPointsPerSegment = 10;
        const segmentPoints = [];
        
        for (let j = 0; j <= numPointsPerSegment; j++) {
          const pointDistance = startDistance + (j / numPointsPerSegment) * (endDistance - startDistance);
          const point = path.getPointAtLength(pointDistance);
          segmentPoints.push({ x: point.x, y: point.y });
        }
        
        // generate a proper path string for this segment that follows the track curve
        let segmentPath = `M ${segmentPoints[0].x} ${segmentPoints[0].y}`;
        for (let j = 1; j <= numPointsPerSegment; j++) {
          segmentPath += ` L ${segmentPoints[j].x} ${segmentPoints[j].y}`;
        }
        
        segments.push({
          id: i,
          sector: i + 1, // Add 1-based sector number for easier matching
          startPoint: segmentPoints[0],
          endPoint: segmentPoints[numPointsPerSegment],
          segmentPath,
          startDistance,
          endDistance,
          segmentPoints,
          sectorData: sectorDeltas?.[i] || null
        });
      }
      
      // clean up
      document.body.removeChild(svg);
      
      // set the track segments
      setTrackSegments(segments);
    } catch (error) {
      // DEBUG: console.error("Error generating track segments:", error);
      setTrackSegments([]);
    }
  }, [trackPath, sectorDeltas]);
  
  // Handle sector hover
  const handleSectorHover = (sectorNumber) => {
    setHoveredSector(sectorNumber);
  };
  
  const handleSectorLeave = () => {
    setHoveredSector(null);
  };
  
  // default track fallback
  if (!trackPath) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-400">
          <Map className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Track layout not available for {trackSlug}</p>
        </div>
      </div>
    );
  }
  
  // default viewBox size
  const viewBoxWidth = 400;
  const viewBoxHeight = 400;
  
  // check for same team or similar-colored teams
  const needsAlternateColor = () => {
    if (!driverTeams || !selectedDriver || !comparisonDriver) return false;
    
    const selectedTeam = driverTeams[selectedDriver];
    const comparisonTeam = driverTeams[comparisonDriver];
    
    if (!selectedTeam || !comparisonTeam) return false;
    
    // same team case
    if (selectedTeam === comparisonTeam) return true;
    
    // handle teams with similar blue colors that are hard to distinguish (i'm colourblind don't hate)
    const blueTeams = ['Alpine', 'Williams', 'Racing Bulls'];
    const selectedIsBlue = blueTeams.some(team => selectedTeam.includes(team));
    const comparisonIsBlue = blueTeams.some(team => comparisonTeam.includes(team));
    
    // if both drivers are from blue teams, use alternate colors
    if (selectedIsBlue && comparisonIsBlue) return true;
    
    return false;
  };
  
  const needsAlternateColorValue = needsAlternateColor();
  
  // get driver colors with special handling for same-team or similar colored teams
  const primaryColor = driverColorMap[selectedDriver] || '#3B82F6'; // blue fallback
  const comparisonColor = needsAlternateColorValue ? '#FFFFFF' : // pure white for same team or similar-colored teams
    (driverColorMap[comparisonDriver] || '#EF4444'); // normal team color or red fallback
  
  const neutralColor = '#F59E0B'; // yellow for neutral/equal sections
  const defaultTrackColor = '#4B5563'; // default track color when no comparison
  
  const equalThreshold = 0.005; // very small threshold to minimize yellow segments, will only show if within 0.005s of each other
  
  // fixed track width - thin boi
  const trackWidth = 5; 
  
  return (
    <svg 
      ref={trackRef}
      width="100%" 
      height="100%" 
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      preserveAspectRatio="xMidYMid meet"
      className="max-w-full h-auto"
    >
      <defs>
        <filter id="track-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        {/* Enhanced shadow filter for hovered sectors - dark theme */}
        <filter id="sector-hover-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#6B7280" floodOpacity="0.8"/>
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#4B5563" floodOpacity="0.4"/>
        </filter>
      </defs>
      
      {/* track base outline - shadow */}
      <path
        d={trackPath}
        fill="none"
        stroke="#1F2937"
        strokeWidth={trackWidth + 8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* track base - full path */}
      <path
        d={trackPath}
        fill="none"
        stroke="#374151"
        strokeWidth={trackWidth + 4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* track surface - single path */}
      <path
        d={trackPath}
        fill="none"
        stroke={defaultTrackColor}
        strokeWidth={trackWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={comparisonDriver !== 'none' ? "opacity-30" : "opacity-100"}
      />
      
      {/* colored mini sector overlays - uses a separate path for each mini sector */}
      {comparisonDriver !== 'none' && trackSegments.length > 0 && sectorDeltas && sectorDeltas.length > 0 && (
        trackSegments.map((segment, index) => {
          if (index >= sectorDeltas.length) return null;
          
          const sectorData = sectorDeltas[index];
          if (!sectorData) return null;
          
          // Check if this sector is hovered
          const isHovered = hoveredSector === segment.sector;
          
          // determine segment color based on which driver is faster
          let segmentColor;
          
          if (Math.abs(sectorData.advantage) < equalThreshold) {
            // if advantage is minimal, consider it neutral/equal
            segmentColor = neutralColor;
          } else if (sectorData.faster === 'driver1') {
            segmentColor = primaryColor;
          } else {
            segmentColor = comparisonColor;
          }
          
          return (
            <path
              key={index}
              d={segment.segmentPath}
              fill="none"
              stroke={segmentColor}
              strokeWidth={isHovered ? trackWidth + 4 : trackWidth} // Increase width on hover like "font size"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={isHovered ? "1" : "0.9"}
              filter={isHovered ? "url(#sector-hover-shadow)" : "none"} // Add shadow on hover
              style={{
                cursor: 'pointer',
                transition: 'stroke-width 0.15s ease, opacity 0.15s ease'
                // Removed transform scale to prevent movement
              }}
              onMouseEnter={() => handleSectorHover(segment.sector)}
              onMouseLeave={handleSectorLeave}
            />
          );
        })
      )}
      
      {/* start finish marker */}
      {trackSegments.length > 0 && (
        <g>
          <circle
            cx={trackSegments[0].startPoint.x}
            cy={trackSegments[0].startPoint.y}
            r="8"
            fill="#1F2937"
            stroke="#F59E0B"
            strokeWidth="2"
          />
          <circle
            cx={trackSegments[0].startPoint.x}
            cy={trackSegments[0].startPoint.y}
            r="5"
            fill="#F59E0B"
            opacity="0.9"
            filter="url(#track-glow)"
          />
          <text
            x={trackSegments[0].startPoint.x}
            y={trackSegments[0].startPoint.y - 15}
            textAnchor="middle"
            fill="#F3F4F6"
            fontSize="12"
            fontWeight="bold"
          >
            S/F
          </text>
        </g>
      )}
    </svg>
  );
};

// calculate mini sector deltas using telemetry speed data
const calculateSpeedSectorDeltas = (driver1Data, driver2Data, numSectors = 25) => {
  if (!driver1Data || !driver2Data || driver1Data.length === 0 || driver2Data.length === 0) {
    return [];
  }
  
  const trackLength = Math.max(
    driver1Data[driver1Data.length - 1]?.distance || 0,
    driver2Data[driver2Data.length - 1]?.distance || 0
  );
  
  if (trackLength === 0) return [];
  
  const sectorSize = trackLength / numSectors;
  const sectors = [];
  
  for (let i = 0; i < numSectors; i++) {
    const sectorStart = i * sectorSize;
    const sectorEnd = (i + 1) * sectorSize;
    
    // find the points in said mini sector for each driver
    const driver1Points = driver1Data.filter(p => p.distance >= sectorStart && p.distance < sectorEnd);
    const driver2Points = driver2Data.filter(p => p.distance >= sectorStart && p.distance < sectorEnd);
    
    if (driver1Points.length > 0 && driver2Points.length > 0) {
      // calculate their average speed through this mini sector
      const driver1AvgSpeed = driver1Points.reduce((sum, p) => sum + (p.speed || 0), 0) / driver1Points.length;
      const driver2AvgSpeed = driver2Points.reduce((sum, p) => sum + (p.speed || 0), 0) / driver2Points.length;
      
      // calculate the time delta using distance/speed formula (t = d/v)

      // for the same distance, time is inversely proportional to speed
      const sectorDistance = sectorEnd - sectorStart;
      const driver1Time = driver1AvgSpeed > 0 ? sectorDistance / driver1AvgSpeed : 0;
      const driver2Time = driver2AvgSpeed > 0 ? sectorDistance / driver2AvgSpeed : 0;
      
      // time delta in seconds/ms (postive means driver1 is faster)
      const timeDelta = driver1Time > 0 && driver2Time > 0 ? driver1Time - driver2Time : 0;
      
      // magnify the delta to make differences more visible
      // multiply by 10 to convert fractions of a second to a more visible scale
      const scaledAdvantage = Math.abs(timeDelta) * 10;
      
      sectors.push({
        sector: i + 1,
        sectorStart,
        sectorEnd,
        driver1Speed: driver1AvgSpeed,
        driver2Speed: driver2AvgSpeed,
        driver1Time,
        driver2Time,
        timeDelta, // this is crucial for the chart, don't be stupid and forget it again
        speedDelta: driver1AvgSpeed - driver2AvgSpeed,
        faster: timeDelta < 0 ? 'driver1' : 'driver2',
        advantage: scaledAdvantage
      });
    }
  }
  
  // DEBUG: log sector stats
  if (sectors.length > 0) {
    const driver1Faster = sectors.filter(s => s.faster === 'driver1').length;
    const driver2Faster = sectors.filter(s => s.faster === 'driver2').length;
    const avgAdvantage = sectors.reduce((sum, s) => sum + s.advantage, 0) / sectors.length;
    // DEBUG: console.log(`Sector analysis: ${sectors.length} sectors, Driver1 faster: ${driver1Faster}, Driver2 faster: ${driver2Faster}, Avg advantage: ${avgAdvantage.toFixed(2)}`);
  }
  
  return sectors;
};

// calculate mini sector deltas using track data from API
const calculateTrackSectorDeltas = (sectorData, primaryDriver, comparisonDriver, drivers) => {
  if (!sectorData || !primaryDriver || comparisonDriver === 'none') return [];
  
  // map of car indices (lookup by driver name)
  const carIndices = {};
  drivers.forEach((driver, index) => {
    carIndices[driver] = index;
  });
  
  // get the car indices for primary and comparison drivers
  const primaryCarIndex = `Car ${carIndices[primaryDriver] || 0}`;
  const comparisonCarIndex = `Car ${carIndices[comparisonDriver] || 1}`;
  
  // DEBUG: console.log(`Using car indices: ${primaryDriver} = ${primaryCarIndex}, ${comparisonDriver} = ${comparisonCarIndex}`);
  
  const sectors = [];
  
  // process each sector with data for both selected drivers
  for (const sectorNum in sectorData) {
    const sector = parseInt(sectorNum);
    const sectorInfo = sectorData[sector];
    
    // skip sectors without data for both drivers (shouldn't happen)
    if (!sectorInfo[primaryCarIndex] || !sectorInfo[comparisonCarIndex]) {
      // DEBUG: console.log(`Missing data for sector ${sector} for one or both drivers`);
      continue;
    }
    
    // get positional data
    const car1Data = sectorInfo[primaryCarIndex];
    const car2Data = sectorInfo[comparisonCarIndex];
    
    // check for timing data first - preferred metric
    if (car1Data.sectorTime && car2Data.sectorTime) {
      // use actual mini sector times if available
      const car1Time = car1Data.sectorTime;
      const car2Time = car2Data.sectorTime;
      
      // calculate time delta between drivers (negative means car1 is faster)
      const timeDelta = car1Time - car2Time;
      
      // magnify the delta to make differences more visible
      // multiply by 10 to convert fractions of a second to a more visible scale
      let scaledAdvantage = Math.abs(timeDelta) * 10;
      
      // handle the case where the advantage is 0 but we know which driver is faster
      // this handles API data that indicates a driver is faster but doesn't provide meaningful advantage values
      if (scaledAdvantage === 0 && timeDelta !== 0) {
        // add a small non-zero advantage (1.0) to ensure the correct color is used
        scaledAdvantage = 1.0;
      }
      
      sectors.push({
        sector: sector + 1,
        car1Time,
        car2Time,
        timeDelta,
        speedDelta: -timeDelta, // invert to match our convention (positive = driver1 faster)
        faster: timeDelta < 0 ? 'driver1' : 'driver2',
        advantage: scaledAdvantage,
        car1Pos: { x: car1Data.worldPosX, y: car1Data.worldPosY },
        car2Pos: { x: car2Data.worldPosX, y: car2Data.worldPosY }
      });
    } else {
      // fall back to position count if timing data not available
      const car1Metric = car1Data.positionCount || 1;
      const car2Metric = car2Data.positionCount || 1;
      
      // more positions in the same mini sector suggests slower progress
      // so higher positionCount = slower time
      const metricDelta = car1Metric - car2Metric;
      
      // scale up the advantage to make it more visible
      let scaledAdvantage = Math.abs(metricDelta) * 2;
      
      // critical fix: For zero advantages with known faster driver, add a small non-zero advantage
      if (scaledAdvantage === 0 && metricDelta !== 0) {
        // if we know one driver is faster but have zero advantage, set a small advantage
        scaledAdvantage = 1.0;
      }
      
      sectors.push({
        sector: sector + 1,
        car1Metric,
        car2Metric,
        metricDelta,
        timeDelta: metricDelta * 0.01, // convert to time (rough approximation)
        speedDelta: -metricDelta, // invert to match our convention (positive = driver1 faster)
        faster: metricDelta > 0 ? 'driver2' : 'driver1',
        advantage: scaledAdvantage,
        car1Pos: { x: car1Data.worldPosX, y: car1Data.worldPosY },
        car2Pos: { x: car2Data.worldPosX, y: car2Data.worldPosY }
      });
    }
  }
  
  // sort by sector number
  const sortedSectors = sectors.sort((a, b) => a.sector - b.sector);
  
  // special case handling: If ALL sectors have zero advantage but same faster driver
  // this likely means the API is reporting a driver as faster but not providing meaningful advantage values
  if (sortedSectors.length > 0) {
    const allSameDriver = sortedSectors.every(s => s.faster === sortedSectors[0].faster);
    const allZeroAdvantage = sortedSectors.every(s => s.advantage === 0);
    
    if (allSameDriver && allZeroAdvantage) {
      // DEBUG: console.log("Detected all zero advantages with same faster driver - applying synthetic advantages");
      
      // apply varying synthetic advantages to make visualization interesting
      sortedSectors.forEach((sector, index) => {
        // create a wave pattern of advantages (1.0 to 3.0)
        const wavePattern = 1.0 + Math.sin(index / sortedSectors.length * Math.PI * 2) * 1.0;
        sector.advantage = wavePattern;
      });
    }
  }
  
  // log some stats about the calculated sectors
  if (sortedSectors.length > 0) {
    const driver1Faster = sortedSectors.filter(s => s.faster === 'driver1').length;
    const driver2Faster = sortedSectors.filter(s => s.faster === 'driver2').length;
    const avgAdvantage = sortedSectors.reduce((sum, s) => sum + s.advantage, 0) / sortedSectors.length;
    // DEBUG: console.log(`Track sector analysis: ${sortedSectors.length} sectors, Driver1 faster: ${driver1Faster}, Driver2 faster: ${driver2Faster}, Avg advantage: ${avgAdvantage.toFixed(2)}`);
  }
  
  return sortedSectors;
};

export default function TrackDominanceChart({
  isLoading,
  isTelemetryLoading = false,
  selectedDriver,
  selectedLap,
  maxLapNumber,
  drivers,
  driverTeams,
  driverColorMap,
  onDriverSelect,
  onLapSelect,
  trackData,
  additionalDriversData,
  fetchDriverTelemetry,
  addDriverToComparison,
  removeDriverFromComparison,
  lapTelemetryData,
  selectedSeason,
  selectedRace,
  selectedSessionType,
  lapData = []
}) {
  // State for comparison driver
  const [comparisonDriver, setComparisonDriver] = useState('none');
  const [comparisonLap, setComparisonLap] = useState('fastest'); // Default to fastest lap
  const [numSectors, setNumSectors] = useState(25);
  
  // State for track dominance data from API
  const [dominanceData, setDominanceData] = useState(null);
  const [isDominanceLoading, setIsDominanceLoading] = useState(false);
  
  // NEW: State for hover interactions
  const [hoveredSector, setHoveredSector] = useState(null);
  
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
  
  // Get actual lap numbers for display and API calls
  const getActualLapNumber = (lapSelection, driver) => {
    if (lapSelection === 'fastest') {
      return getFastestLapForDriver(driver);
    }
    return parseInt(lapSelection) || 1;
  };
  
  // Get display text for lap selection
  const getLapDisplayText = (lapSelection, driver) => {
    if (lapSelection === 'fastest') {
      const actualLap = getFastestLapForDriver(driver);
      return `Fastest Lap (Lap ${actualLap})`;
    }
    return `Lap ${lapSelection}`;
  };
  
  // Get driver names for comparison
  const availableDrivers = drivers.filter(driver => driver !== selectedDriver);
  
  // Get telemetry data for both drivers
  const primaryDriverData = lapTelemetryData || [];
  const comparisonDriverData = comparisonDriver !== 'none' ? 
    additionalDriversData[comparisonDriver]?.telemetryData || [] : [];
  
  // Fetch track dominance data when component mounts or selections change
  useEffect(() => {
    if (!selectedSeason || !selectedRace || !selectedSessionType) return;
    
    const fetchDominanceData = async () => {
      setIsDominanceLoading(true);
      try {
        const response = await fetch(
          `/api/track-dominance?season=${selectedSeason}&raceSlug=${selectedRace}&sessionType=${selectedSessionType}`,
          { credentials: 'include' }
        );
        
        if (response.ok) {
          const data = await response.json();
          // DEBUG: console.log("Track dominance data:", data);
          setDominanceData(data);
        } else {
          // DEBUG: console.error("Failed to fetch track dominance data:", response.status);
          setDominanceData(null);
        }
      } catch (error) {
        // DEBUG: console.error("Error fetching track dominance data:", error);
        setDominanceData(null);
      } finally {
        setIsDominanceLoading(false);
      }
    };
    
    fetchDominanceData();
  }, [selectedSeason, selectedRace, selectedSessionType]);
  
  // Calculate sector deltas based on available data
  const sectorDeltas = useMemo(() => {
    if (comparisonDriver === 'none') return [];
    
    // Simple telemetry-based approach - focus on performance
    if (primaryDriverData && comparisonDriverData && 
        primaryDriverData.length > 0 && comparisonDriverData.length > 0) {
      // Use consistent 25 sectors for better performance
      const fixedSectorCount = 25;
      return calculateSpeedSectorDeltas(primaryDriverData, comparisonDriverData, fixedSectorCount);
    } 
    // Fall back to API data if telemetry isn't available
    else if (dominanceData?.sectorData) {
      return calculateTrackSectorDeltas(dominanceData.sectorData, selectedDriver, comparisonDriver, drivers);
    } 
    // Empty array if no data available
    else {
      return [];
    }
  }, [primaryDriverData, comparisonDriverData, dominanceData, selectedDriver, comparisonDriver, drivers]);
  
  // Process speed trace data for chart
  const speedTraceData = useMemo(() => {
    if (primaryDriverData.length === 0) return [];
    
    // Sample data every N points to avoid overwhelming the chart
    const sampleRate = Math.max(1, Math.floor(primaryDriverData.length / 500));
    
    const combined = primaryDriverData
      .filter((_, index) => index % sampleRate === 0)
      .map((point, index) => {
        // Find corresponding point in comparison data
        const compPoint = comparisonDriverData.find(cp => 
          Math.abs(cp.distance - point.distance) < 50
        ) || null;
        
        return {
          distance: point.distance || 0,
          primarySpeed: point.speed || 0,
          comparisonSpeed: compPoint?.speed || null,
          primaryDriver: selectedDriver,
          comparisonDriver: comparisonDriver !== 'none' ? comparisonDriver : null
        };
      });
    
    return combined;
  }, [primaryDriverData, comparisonDriverData, selectedDriver, comparisonDriver]);
  
  // Handle comparison driver selection
  const handleComparisonDriverChange = async (driver) => {
    // Only proceed if the driver actually changed
    if (driver === comparisonDriver) return;
    
    setComparisonDriver(driver);
    
    if (driver && driver !== selectedDriver && driver !== 'none') {
      try {
        const actualLap = getActualLapNumber(comparisonLap, driver);
        await addDriverToComparison(driver, actualLap);
      } catch (error) {
        // DEBUG: console.error("Error adding comparison driver:", error);
      }
    } else if (driver === 'none') {
      try {
        // Clear all comparison data when "none" is selected
        Object.keys(additionalDriversData).forEach(existingDriver => {
          if (existingDriver !== selectedDriver) {
            removeDriverFromComparison(existingDriver);
          }
        });
      } catch (error) {
        // DEBUG: console.error("Error removing comparison drivers:", error);
      }
    }
  };
  
  // Handle comparison lap change
  const handleComparisonLapChange = async (lap) => {
    // Only proceed if the lap actually changed
    if (lap === comparisonLap) return;
    
    // Update the state
    setComparisonLap(lap);
    
    // Only fetch new data if we have a comparison driver
    if (comparisonDriver !== 'none') {
      try {
        // Use a direct approach to update the comparison data
        const actualLap = getActualLapNumber(lap, comparisonDriver);
        await addDriverToComparison(comparisonDriver, actualLap);
      } catch (error) {
        // DEBUG: console.error("Error updating comparison lap:", error);
      }
    }
  };
  
  // Calculate summary stats from sector deltas
  const summaryStats = useMemo(() => {
    if (!sectorDeltas || sectorDeltas.length === 0) return null;
    
    // Calculate sector results
    const driver1Faster = sectorDeltas.filter(s => s.faster === 'driver1').length;
    const driver2Faster = sectorDeltas.filter(s => s.faster === 'driver2').length;
    
    // Calculate actual time deltas (unmagnified, in seconds)
    // Get raw timeDelta values if available, otherwise divide advantage by our magnification factor
    const timeDeltas = sectorDeltas.map(s => {
      if (s.timeDelta !== undefined) return s.timeDelta; // Note: not using absolute value to preserve sign
      return (s.faster === 'driver1' ? 1 : -1) * (s.advantage / 10); // Assuming we used a 10x magnification
    });
    
    // Calculate average in a way that preserves sign
    const avgTimeDelta = timeDeltas.reduce((sum, d) => sum + d, 0) / timeDeltas.length;
    
    // Now calculate absolute values for display
    const rawAvgDelta = Math.abs(avgTimeDelta);
    const rawMaxDelta = Math.max(...timeDeltas.map(d => Math.abs(d)));
    
    // Find which driver is faster on average
    const averageFaster = avgTimeDelta > 0 ? 'driver2' : 'driver1';
    
    // Find which driver has the maximum advantage in any sector
    const maxDeltaSector = sectorDeltas.find(s => Math.abs(s.timeDelta || (s.advantage / 10)) === rawMaxDelta);
    const maxFaster = maxDeltaSector ? maxDeltaSector.faster : (avgTimeDelta > 0 ? 'driver2' : 'driver1');
    
    // Calculate magnified advantage values for visualization
    const avgAdvantage = sectorDeltas.reduce((sum, s) => sum + s.advantage, 0) / sectorDeltas.length;
    const maxAdvantage = Math.max(...sectorDeltas.map(s => s.advantage));
    
    return {
      driver1Faster,
      driver2Faster,
      rawAvgDelta,     // Actual time delta in seconds
      rawMaxDelta,     // Actual maximum time delta in seconds
      avgAdvantage,    // Magnified advantage for visualization
      maxAdvantage,    // Magnified maximum advantage
      averageFaster,   // Which driver is faster on average
      maxFaster,       // Which driver has the maximum advantage in any sector
      totalSectors: sectorDeltas.length
    };
  }, [sectorDeltas]);
  
  // Check for same team or similar color teams that need alternate colors
  const needsAlternateColor = () => {
    if (!driverTeams || !selectedDriver || !comparisonDriver) return false;
    
    const selectedTeam = driverTeams[selectedDriver];
    const comparisonTeam = driverTeams[comparisonDriver];
    
    if (!selectedTeam || !comparisonTeam) return false;
    
    // Same team case
    if (selectedTeam === comparisonTeam) return true;
    
    // Handle teams with similar blue colors that are hard to distinguish
    const blueTeams = ['Alpine', 'Williams', 'Racing Bulls'];
    const selectedIsBlue = blueTeams.some(team => selectedTeam.includes(team));
    const comparisonIsBlue = blueTeams.some(team => comparisonTeam.includes(team));
    
    // If both drivers are from blue teams, use alternate colors
    if (selectedIsBlue && comparisonIsBlue) return true;
    
    return false;
  };
  
  const needsAlternateColorValue = needsAlternateColor();
  
  // Get reason for alternate color
  const getColorChangeReason = () => {
    if (!driverTeams || !selectedDriver || !comparisonDriver) return '';
    
    const selectedTeam = driverTeams[selectedDriver];
    const comparisonTeam = driverTeams[comparisonDriver];
    
    if (selectedTeam === comparisonTeam) return 'same team';
    
    // Check if both are blue teams
    const blueTeams = ['Alpine', 'Williams', 'Racing Bulls'];
    const selectedIsBlue = blueTeams.some(team => selectedTeam.includes(team));
    const comparisonIsBlue = blueTeams.some(team => comparisonTeam.includes(team));
    
    if (selectedIsBlue && comparisonIsBlue) {
      return 'teams with similar colours (blue teams)';
    }
    
    return '';
  };
  
  // Select contrasting colors for same-team drivers or similar colored teams
  const primaryColor = driverColorMap[selectedDriver] || '#3B82F6'; // Blue fallback
  const comparisonColor = needsAlternateColorValue ? 
                       '#FFFFFF' : // Pure white for same team or similar-colored teams
                       (driverColorMap[comparisonDriver] || '#EF4444'); // Normal team color or red fallback
  
  /* DEBUG: console.log("Color selection info:", { 
    selectedDriver, 
    comparisonDriver, 
    needsAlternateColor: needsAlternateColorValue,
    reason: getColorChangeReason(),
    primaryTeam: driverTeams ? driverTeams[selectedDriver] : 'unknown',
    comparisonTeam: driverTeams ? driverTeams[comparisonDriver] : 'unknown',
    primaryColor, 
    comparisonColor
  }); */
  
  if (isLoading || isDominanceLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <Card className="bg-gray-900/70 border border-gray-700/80">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Map className="w-5 h-5" />
            Track Dominance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Primary Driver Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Primary Driver</label>
              <Select value={selectedDriver || ''} onValueChange={onDriverSelect}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {drivers.map(driver => (
                    <SelectItem key={driver} value={driver} className="text-white">
                      {driver} ({driverTeams[driver] || 'Unknown'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Primary Lap Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Primary Lap</label>
              <Select value={selectedLap.toString()} onValueChange={(value) => onLapSelect(value === 'fastest' ? 'fastest' : parseInt(value))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="fastest" className="text-white">
                    Fastest Lap
                  </SelectItem>
                  {Array.from({ length: maxLapNumber }, (_, i) => i + 1).map(lap => (
                    <SelectItem key={lap} value={lap.toString()} className="text-white">
                      Lap {lap}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Comparison Driver Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Comparison Driver</label>
              <Select value={comparisonDriver} onValueChange={handleComparisonDriverChange}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Select comparison driver" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="none" className="text-white">None</SelectItem>
                  {availableDrivers.map(driver => (
                    <SelectItem key={driver} value={driver} className="text-white">
                      {driver} ({driverTeams[driver] || 'Unknown'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Comparison Lap Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Comparison Lap</label>
              <Select 
                value={comparisonLap.toString()} 
                onValueChange={handleComparisonLapChange}
                disabled={comparisonDriver === 'none'}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="fastest" className="text-white">
                    Fastest Lap
                  </SelectItem>
                  {Array.from({ length: maxLapNumber }, (_, i) => i + 1).map(lap => (
                    <SelectItem key={lap} value={lap.toString()} className="text-white">
                      Lap {lap}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Driver status indicators */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: primaryColor }}
              ></div>
              <span className="text-sm text-gray-300">
                {selectedDriver} ({getLapDisplayText(selectedLap, selectedDriver)})
              </span>
            </div>
            {comparisonDriver !== 'none' && (
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: comparisonColor }}
                ></div>
                <span className="text-sm text-gray-300">
                  {comparisonDriver} ({getLapDisplayText(comparisonLap, comparisonDriver)})
                  {needsAlternateColorValue && (
                    <span className="ml-1 text-xs text-white"> (using white for {getColorChangeReason()})</span>
                  )}
                </span>
              </div>
            )}
          </div>
          
          {/* Hover instruction */}
          {comparisonDriver !== 'none' && sectorDeltas.length > 0 && (
            <div className="mt-3 text-xs text-gray-400">
              💡 Hover over sectors on the track or bars in the chart to see which parts of the track they represent
            </div>
          )}
          
        </CardContent>
      </Card>
      
      {/* Summary Stats */}
      {summaryStats && comparisonDriver !== 'none' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-900/70 border border-gray-700/80">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Mini Sectors Faster</p>
                  <p className="text-2xl font-semibold" style={{ color: primaryColor }}>{summaryStats.driver1Faster}</p>
                  <p className="text-xs text-gray-500">{selectedDriver}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900/70 border border-gray-700/80">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Mini Sectors Faster</p>
                  <p className="text-2xl font-semibold" style={{ color: comparisonColor }}>{summaryStats.driver2Faster}</p>
                  <p className="text-xs text-gray-500">{comparisonDriver}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900/70 border border-gray-700/80">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Average Time Delta</p>
                  <p className="text-2xl font-semibold text-white">{summaryStats.rawAvgDelta.toFixed(3)}s</p>
                  <p className="text-xs text-gray-500">
                    in favor of {summaryStats.averageFaster === 'driver1' ? selectedDriver : comparisonDriver}
                  </p>
                </div>
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900/70 border border-gray-700/80">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Max Time Delta</p>
                  <p className="text-2xl font-semibold text-white">{summaryStats.rawMaxDelta.toFixed(3)}s</p>
                  <p className="text-xs text-gray-500">
                    in favor of {summaryStats.maxFaster === 'driver1' ? selectedDriver : comparisonDriver}
                  </p>
                </div>
                <Zap className="w-5 h-5 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Track Map with Sector Analysis */}
        <Card className="bg-gray-900/70 border border-gray-700/80">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Map className="w-5 h-5" />
              Track Dominance Map
              {hoveredSector && (
                <span className="ml-2 text-sm text-blue-400">
                  (Sector {hoveredSector})
                </span>
              )}
            </CardTitle>
            {dominanceData && comparisonDriver === 'none' && (
              <p className="text-sm text-gray-400">Select a comparison driver to see track dominance</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="bg-gray-800 rounded-lg p-4 min-h-[300px] flex items-center justify-center relative">
              {/* Show loading indicator in corner instead of covering everything */}
              {isTelemetryLoading && (
                <div className="absolute top-2 right-2 z-10">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              )}
              
              {/* Always show the track visualization - don't hide it during loading */}
              {(isLoading || isDominanceLoading) ? (
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              ) : (
                <F1TrackViz
                  trackSlug={selectedRace}
                  sectorDeltas={sectorDeltas}
                  selectedDriver={selectedDriver}
                  comparisonDriver={comparisonDriver}
                  driverColorMap={driverColorMap}
                  driverTeams={driverTeams}
                  hoveredSector={hoveredSector}
                  setHoveredSector={setHoveredSector}
                />
              )}
            </div>
            
            {/* Legend */}
            {comparisonDriver !== 'none' && (
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: primaryColor }}
                  ></div>
                  <span className="text-sm text-gray-300">{selectedDriver} Faster</span>
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: comparisonColor }}
                  ></div>
                  <span className="text-sm text-gray-300">{comparisonDriver} Faster</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm text-gray-300">Equal/Start-Finish</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Sector Analysis Chart */}
        <Card className="bg-gray-900/70 border border-gray-700/80">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <BarChart2 className="w-5 h-5" />
              Mini Sector Time Deltas
              {hoveredSector && (
                <span className="ml-2 text-sm text-blue-400">
                  (Sector {hoveredSector})
                </span>
              )}
            </CardTitle>
            {comparisonDriver === 'none' && (
              <p className="text-sm text-gray-400">Select a comparison driver to see sector analysis</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="h-80 relative">
              {sectorDeltas && sectorDeltas.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sectorDeltas} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="sector" 
                        tick={{ fill: '#9CA3AF', fontSize: 10 }}
                        label={{ value: 'Sector Number', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
                        interval={Math.max(0, Math.floor(sectorDeltas.length / 20))}
                      />
                      <YAxis 
                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                        label={{ value: 'Time Delta (s)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={(value) => `${value.toFixed(3)}s`}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '8px' }}
                        labelStyle={{ color: '#FFFFFF' }}
                        itemStyle={{ color: '#FFFFFF' }}
                        formatter={(value, name) => {
                          const delta = Math.abs(value).toFixed(3);
                          // Fix the logic: negative values mean selectedDriver is faster, positive means comparisonDriver is faster
                          const faster = value < 0 ? selectedDriver : comparisonDriver;
                          return [`${faster} faster by ${delta}s`, ''];
                        }}
                        labelFormatter={(label) => `Sector ${label}`}
                      />
                      <Bar dataKey="timeDelta" name="Sector Advantage">
                        {sectorDeltas.map((entry, index) => {
                          const isHovered = hoveredSector === entry.sector;
                          
                          // Set opacity based on advantage and hover state
                          const baseOpacity = Math.max(0.6, Math.min(entry.advantage / 5, 0.95));
                          const opacity = isHovered ? 1.0 : baseOpacity;
                          
                          // Get the driver colors with same team handling
                          const fillColor = entry.faster === 'driver1' 
                            ? primaryColor 
                            : comparisonColor;
                          
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={fillColor} 
                              opacity={opacity}
                              stroke={isHovered ? '#6B7280' : 'none'} // Dark theme stroke
                              strokeWidth={isHovered ? 2 : 0}
                              style={{
                                cursor: 'pointer',
                                transition: 'opacity 0.15s ease, stroke-width 0.15s ease'
                              }}
                              onMouseEnter={() => setHoveredSector(entry.sector)}
                              onMouseLeave={() => setHoveredSector(null)}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <BarChart2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>{!selectedDriver ? 'Select a primary driver' : 'Select a comparison driver to analyze sectors'}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-3 text-xs text-gray-400">
              <p>Positive values indicate {comparisonDriver} is faster, negative values indicate {selectedDriver} is faster</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Speed Trace Chart */}
      {comparisonDriver !== 'none' && speedTraceData.length > 0 && (
        <Card className="bg-gray-900/70 border border-gray-700/80">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Speed Trace Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={speedTraceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="distance" 
                    tick={{ fill: '#9CA3AF', fontSize: 10 }}
                    label={{ value: 'Distance (m)', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
                    tickFormatter={(value) => `${Math.round(value)}m`}
                  />
                  <YAxis 
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    label={{ value: 'Speed (km/h)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#F3F4F6' }}
                    formatter={(value, name) => {
                      const formattedValue = `${value} km/h`;
                      const driver = name === 'primarySpeed' ? selectedDriver : comparisonDriver;
                      return [formattedValue, driver];
                    }}
                    labelFormatter={(value) => `Distance: ${value}m`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="primarySpeed" 
                    name="primarySpeed"
                    stroke={primaryColor}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="comparisonSpeed"
                    name="comparisonSpeed" 
                    stroke={comparisonColor}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Additional info */}
      <Card className="bg-gray-900/70 border border-gray-700/80">
        <CardContent className="p-4">
          <div className="text-sm text-gray-400">
            <p className="mb-2">
              <strong>How it works:</strong> This analysis uses official F1 track layouts from FastF1 API telemetry data. 
              The track is divided into 25 mini sectors to analyze performance differences between drivers lap times.
            </p>
            <p className="mb-2">
              Colored segments on the track indicate sector dominance - {selectedDriver}'s team color where {selectedDriver} was faster, 
              {comparisonDriver !== 'none' ? ` ${comparisonDriver}'s ` : ' comparison driver\'s '} 
              {needsAlternateColorValue ? 'alternate color (white)' : 'team color'} where they had the advantage.
              {needsAlternateColorValue && ` White color is used for better visibility when drivers are from ${getColorChangeReason()}.`}
            </p>
            <p>
              <strong>💡 Interactive:</strong> Hover over any sector on the track map or bar in the chart to highlight the corresponding location on both visualizations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}