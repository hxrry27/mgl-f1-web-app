import React, { useState, useRef } from 'react';
import { useQuery } from 'react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import { 
  Box, Typography, FormControl, InputLabel, Select, MenuItem, 
  CircularProgress, Button, Alert
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import DownloadIcon from '@mui/icons-material/Download';
import PersonIcon from '@mui/icons-material/Person';
import TimerIcon from '@mui/icons-material/Timer';

// API functions
const fetchLapNumbers = async (year, event, session, driver) => {
  const response = await fetch(
    `/api/lap-numbers?year=${year}&event=${event}&session=${session}&driver=${driver}`,
    { credentials: 'include' }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch lap numbers');
  }
  
  const data = await response.json();
  return data.lapNumbers || [];
};

const fetchSpeedData = async (year, event, session, driver, lap) => {
  const response = await fetch(
    `/api/telemetry-speed?year=${year}&event=${event}&session=${session}&driver=${driver}&lap=${lap}`,
    { credentials: 'include' }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch speed data');
  }
  
  const data = await response.json();
  return data.speedData || [];
};

// Function to export chart as image
const exportChartAsImage = (chartRef, filename = 'chart') => {
  if (!chartRef.current) return;
  
  // Create a canvas from the SVG
  const svgElement = chartRef.current.querySelector('.recharts-wrapper svg');
  if (!svgElement) return;
  
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    // Convert to data URL and download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataUrl;
    link.click();
  };
  
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
};

/**
 * SpeedChart Component with React Query
 * Displays a speed trace chart for a specific driver and lap
 */
const SpeedChart = ({
  year,
  event,
  session,
  availableDrivers,
  driverTeams,
  initialDriver = '',
  initialLap = 'fastest',
  onDriverChange = () => {},
  getDriverColor,
}) => {
  const chartRef = useRef(null);
  const [selectedDriver, setSelectedDriver] = useState(initialDriver);
  const [selectedLap, setSelectedLap] = useState(initialLap);
  const [shouldLoadChart, setShouldLoadChart] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch lap numbers query
  const { 
    data: lapNumbers = [], 
    isLoading: isLoadingLapNumbers 
  } = useQuery(
    ['lapNumbers', year, event, session, selectedDriver],
    () => fetchLapNumbers(year, event, session, selectedDriver),
    {
      enabled: !!year && !!event && !!session && !!selectedDriver,
      staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    }
  );

  // Format lap options
  const lapOptions = ['fastest', ...lapNumbers];

  // Fetch speed data query
  const { 
    data: speedData = [], 
    isLoading: isLoadingSpeedData,
    error: speedDataError
  } = useQuery(
    ['speedData', year, event, session, selectedDriver, selectedLap],
    () => fetchSpeedData(year, event, session, selectedDriver, selectedLap),
    {
      enabled: !!year && !!event && !!session && !!selectedDriver && !!selectedLap && shouldLoadChart,
      staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    }
  );

  // Handle driver selection change
  const handleDriverChange = (event) => {
    const driver = event.target.value;
    setSelectedDriver(driver);
    setSelectedLap('fastest');
    if (shouldLoadChart) {
      setShouldLoadChart(false);
    }
    onDriverChange(driver);
  };

  // Handle lap selection change
  const handleLapChange = (event) => {
    setSelectedLap(event.target.value);
  };

  // Handle chart download
  const handleDownload = () => {
    setIsExporting(true);
    try {
      exportChartAsImage(
        chartRef, 
        `${event.toLowerCase().replace(/\s+/g, '-')}_${selectedDriver}_${selectedLap === 'fastest' ? 'fastest' : `lap${selectedLap}`}_speed`
      );
    } catch (error) {
      console.error('Failed to export chart:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const chartTitle = selectedDriver 
    ? `${selectedDriver}'s ${selectedLap === 'fastest' ? 'Fastest Lap' : `Lap ${selectedLap}`} Speed Trace`
    : "Speed Trace";
  
  const driverColor = selectedDriver ? getDriverColor(selectedDriver) : '#ff4444';

  // Render chart content based on state
  const renderContent = () => {
    // Show load button if chart hasn't been loaded yet
    if (!shouldLoadChart) {
      return (
        <Box sx={{ 
          width: '100%', 
          height: '280px', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          bgcolor: 'rgba(10, 14, 39, 0.5)', 
          borderRadius: 2,
          gap: 4
        }}>
          <Typography variant="body2" color="text.secondary">
            Select a driver and click load to view speed data
          </Typography>
          <Button
            variant="contained"
            startIcon={<BarChartIcon />}
            onClick={() => setShouldLoadChart(true)}
            disabled={!selectedDriver}
            sx={{ bgcolor: '#1a1f3b', '&:hover': { bgcolor: '#2d355b' } }}
          >
            Load Chart
          </Button>
        </Box>
      );
    }
    
    // Show loading spinner
    if (isLoadingSpeedData) {
      return (
        <Box sx={{ 
          width: '100%', 
          height: '280px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          bgcolor: 'rgba(10, 14, 39, 0.5)',
          borderRadius: 2 
        }}>
          <CircularProgress />
        </Box>
      );
    }
    
    // Show error message
    if (speedDataError) {
      return (
        <Box sx={{ 
          width: '100%', 
          height: '280px', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          bgcolor: 'rgba(10, 14, 39, 0.5)',
          border: '1px solid rgba(255, 0, 0, 0.3)',
          borderRadius: 2, 
          p: 2
        }}>
          <Alert severity="error" sx={{ bgcolor: 'transparent', color: '#ff6b6b' }}>
            {speedDataError.message || 'Error loading speed data'}
          </Alert>
        </Box>
      );
    }
    
    // Show no data message
    if (!speedData || speedData.length === 0) {
      return (
        <Box sx={{ 
          width: '100%', 
          height: '280px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          bgcolor: 'rgba(10, 14, 39, 0.5)',
          border: '1px solid rgba(100, 100, 100, 0.5)',
          borderRadius: 2, 
          color: 'text.secondary' 
        }}>
          No speed telemetry data found for {selectedDriver} lap {selectedLap}.
        </Box>
      );
    }

    // Render the chart
    return (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={speedData}
          margin={{ top: 0, right: 10, left: -15, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(100, 116, 139, 0.3)" />
          <XAxis
            dataKey="Distance"
            stroke="rgba(156, 163, 175, 0.7)"
            tick={{ fill: 'rgba(156, 163, 175, 0.9)', fontSize: 12 }}
            tickFormatter={(value) => `${Math.round(value)}m`}
            domain={['dataMin', 'dataMax']}
          />
          <YAxis
            dataKey="Speed"
            stroke="rgba(156, 163, 175, 0.7)"
            tick={{ fill: 'rgba(156, 163, 175, 0.9)', fontSize: 12 }}
            domain={['auto', 'dataMax + 10']}
            tickFormatter={(value) => `${value} km/h`}
            width={50}
          />
          <Tooltip
            formatter={(value) => [`${value} km/h`, 'Speed']}
            labelFormatter={(label) => `Distance: ${label.toFixed(2)}m`}
            contentStyle={{
              backgroundColor: 'rgba(31, 41, 55, 0.9)',
              borderColor: 'rgba(100, 116, 139, 0.5)',
              color: '#E5E7EB',
              borderRadius: 1
            }}
          />
          <Line
            type="monotone"
            dataKey="Speed"
            stroke={driverColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 1, stroke: 'rgba(255,255,255,0.5)', fill: driverColor }}
            name={selectedDriver}
            connectNulls={true}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Box ref={chartRef} sx={{ 
      width: '100%', 
      bgcolor: 'rgba(10, 14, 39, 0.7)', 
      border: '1px solid rgba(68, 68, 68, 0.8)', 
      borderRadius: 3, 
      p: 2, 
      backdropFilter: 'blur(4px)',
      overflow: 'hidden' 
    }}>
      {/* Header with title and controls */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        mb: 2, 
        gap: 2 
      }}>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold' }}>
          {chartTitle}
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <FormControl sx={{ minWidth: 150 }} size="small">
            <InputLabel id="driver-select-label" sx={{ color: '#fff' }}>Driver</InputLabel>
            <Select
              labelId="driver-select-label"
              value={selectedDriver}
              onChange={handleDriverChange}
              label="Driver"
              startAdornment={<PersonIcon sx={{ mr: 1, opacity: 0.7, color: '#fff' }} />}
              sx={{ 
                color: '#fff', 
                bgcolor: '#1a1f3b', 
                '& .MuiSvgIcon-root': { color: '#fff' } 
              }}
            >
              {availableDrivers.map((driver) => (
                <MenuItem key={driver.code || driver} value={driver.code || driver}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box 
                      sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        bgcolor: getDriverColor(driver.code || driver), 
                        mr: 1 
                      }} 
                    />
                    {driver.code || driver} {driverTeams[driver.code || driver] ? `(${driverTeams[driver.code || driver]})` : ''}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl sx={{ minWidth: 120 }} size="small">
            <InputLabel id="lap-select-label" sx={{ color: '#fff' }}>Lap</InputLabel>
            <Select
              labelId="lap-select-label"
              value={selectedLap}
              onChange={handleLapChange}
              label="Lap"
              startAdornment={<TimerIcon sx={{ mr: 1, opacity: 0.7, color: '#fff' }} />}
              disabled={isLoadingLapNumbers || lapOptions.length <= 1}
              sx={{ 
                color: '#fff', 
                bgcolor: '#1a1f3b', 
                '& .MuiSvgIcon-root': { color: '#fff' } 
              }}
            >
              {lapOptions.map((lap) => (
                <MenuItem key={lap} value={lap}>
                  {lap === 'fastest' ? 'Fastest' : lap}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>
      
      {/* Chart content */}
      {renderContent()}
      
      {/* Download button */}
      {shouldLoadChart && !isLoadingSpeedData && speedData && speedData.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            disabled={isExporting}
            sx={{ 
              color: '#fff', 
              borderColor: 'rgba(255, 255, 255, 0.3)',
              '&:hover': { 
                borderColor: '#fff', 
                bgcolor: 'rgba(255, 255, 255, 0.1)' 
              }
            }}
          >
            {isExporting ? "Exporting..." : "Download Chart"}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default SpeedChart;