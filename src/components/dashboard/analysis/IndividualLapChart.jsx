import React, { useState, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, CircularProgress, Button } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PersonIcon from '@mui/icons-material/Person';
import TimerIcon from '@mui/icons-material/Timer';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

export default function IndividualLapChart({
  isLoading,
  lapTelemetry, // Now expecting the pre-processed telemetry for a specific lap
  lapTelemetryData,
  selectedDriver,
  selectedLap,
  maxLapNumber,
  drivers,
  driverTeams,
  driverColorMap,
  onDriverSelect,
  onLapSelect,
  showRawLapData,
  setShowRawLapData,
  trackData
}) {
  const chartRef = useRef(null);
  const [chartType, setChartType] = useState('speed'); // 'speed', 'throttle', 'brake'
  const [isExporting, setIsExporting] = useState(false);

  const generateTicks = (trackLength) => {
    // Default to 5000m if no track length available
    const length = Math.round(trackLength || 5000);
    
    // Generate approximately 10 ticks, evenly spaced
    const interval = Math.ceil(length / 10);
    const roundedInterval = Math.ceil(interval / 500) * 500; // Round to nearest 500m
    
    // Create array of ticks
    const ticks = [];
    for (let i = 0; i <= length; i += roundedInterval) {
      ticks.push(i);
    }
    
    // Make sure the last tick is the track length
    if (ticks[ticks.length - 1] !== length) {
      ticks.push(length);
    }
    
    return ticks;
  };

  // Custom tooltip component for telemetry data
  const TelemetryTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    
    const getValueAndUnit = () => {
      if (chartType === 'speed') {
        return [`${payload[0].value} km/h`, 'Speed'];
      } else if (chartType === 'throttle') {
        return [`${payload[0].value}%`, 'Throttle'];
      } else if (chartType === 'brake') {
        return [`${payload[0].value}%`, 'Brake'];
      }
      return [payload[0].value, payload[0].name];
    };
    
    const [value, name] = getValueAndUnit();
    
    return (
      <Box sx={{ 
        bgcolor: 'rgba(31, 41, 55, 0.9)',
        color: '#E5E7EB', 
        p: 1.5, 
        borderRadius: 1,
        boxShadow: '0 4px 8px rgba(0,0,0,0.5)',
        border: '1px solid rgba(100, 116, 139, 0.5)'
      }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
          Distance: {label.toFixed(2)}m
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Box 
            sx={{ 
              width: 12, 
              height: 12, 
              borderRadius: '50%', 
              bgcolor: getChartColor(), 
              mr: 1 
            }} 
          />
          <Typography variant="body2">
            {name}: {value}
          </Typography>
        </Box>
      </Box>
    );
  };

  const getChartColor = () => {
    switch(chartType) {
      case 'speed': return driverColorMap?.[selectedDriver] || '#1e88e5';
      case 'throttle': return '#4ade80'; // Green
      case 'brake': return '#ef4444'; // Red
      default: return '#1e88e5'; // Blue
    }
  };

  const getChartData = () => {
    console.log(`getChartData called for chart type: ${chartType}`);
    console.log(`lapTelemetryData has ${lapTelemetryData?.length || 0} points`);
    
    if (!lapTelemetryData || lapTelemetryData.length === 0) {
      console.warn("No lap telemetry data available");
      return [];
    }
    
    // Log the first data point to understand its structure
    console.log("First telemetry data point:", lapTelemetryData[0]);
    
    // Check for critical fields
    if (chartType === 'speed' && lapTelemetryData[0].speed === undefined) {
      console.warn("Missing 'speed' data in telemetry");
    } else if (chartType === 'throttle' && lapTelemetryData[0].throttle === undefined) {
      console.warn("Missing 'throttle' data in telemetry");
    } else if (chartType === 'brake' && lapTelemetryData[0].brake === undefined) {
      console.warn("Missing 'brake' data in telemetry");
    }
    
    // Check if we have distance values
    if (lapTelemetryData[0].distance === undefined) {
      console.warn("Missing 'distance' values in telemetry data");
    }
    
    // Get all data points with correct values based on chartType
    try {
      const rawData = lapTelemetryData.map((point, index) => {
        // Handle missing distance by using index position
        const distance = point.distance !== undefined 
          ? point.distance 
          : (index / lapTelemetryData.length) * (trackData?.length_meters || 5000);
        
        // Handle different data types for each chart type
        let value;
        if (chartType === 'speed') {
          value = point.speed !== undefined ? point.speed : 0;
        } else if (chartType === 'throttle') {
          // Check if throttle is already a percentage or needs conversion
          value = point.throttle !== undefined 
            ? (point.throttle > 1 ? point.throttle : point.throttle * 100)
            : 0;
        } else { // brake
          // Check if brake is already a percentage or needs conversion
          value = point.brake !== undefined 
            ? (point.brake > 1 ? point.brake : point.brake * 100)
            : 0;
        }
        
        return {
          Distance: distance,
          [chartType === 'speed' ? 'Speed' : chartType === 'throttle' ? 'Throttle' : 'Brake']: value
        };
      });
      
      console.log(`Processed ${rawData.length} data points for charting`);
      if (rawData.length > 0) {
        console.log("Sample chart data point:", rawData[0]);
      }
      
      // Sort by distance to ensure proper rendering
      const sortedData = rawData.sort((a, b) => a.Distance - b.Distance);
      
      // Look for null/undefined/NaN values that might break the chart
      const invalidPoints = sortedData.filter(point => {
        const dataKey = Object.keys(point).find(key => key !== 'Distance');
        return point.Distance === undefined || point.Distance === null || isNaN(point.Distance) ||
               point[dataKey] === undefined || point[dataKey] === null || isNaN(point[dataKey]);
      });
      
      if (invalidPoints.length > 0) {
        console.warn(`Found ${invalidPoints.length} invalid data points that may break the chart`);
        console.log("First invalid point:", invalidPoints[0]);
        
        // Remove invalid points
        const cleanedData = sortedData.filter(point => {
          const dataKey = Object.keys(point).find(key => key !== 'Distance');
          return point.Distance !== undefined && point.Distance !== null && !isNaN(point.Distance) &&
                 point[dataKey] !== undefined && point[dataKey] !== null && !isNaN(point[dataKey]);
        });
        
        console.log(`Cleaned data: ${cleanedData.length} points (removed ${sortedData.length - cleanedData.length} invalid points)`);
        return cleanedData;
      }
      
      return sortedData;
    } catch (error) {
      console.error("Error processing chart data:", error);
      return [];
    }
  };

  const getYAxisProps = () => {
    switch(chartType) {
      case 'speed':
        return {
          dataKey: 'Speed',
          domain: [0, 'auto'],
          tickFormatter: (value) => `${value} km/h`,
          label: { value: 'Speed (km/h)', angle: -90, position: 'insideLeft', offset: -5, fill: '#ccc' }
        };
      case 'throttle':
        return {
          dataKey: 'Throttle',
          domain: [0, 100],
          tickFormatter: (value) => `${value}%`,
          label: { value: 'Throttle %', angle: -90, position: 'insideLeft', offset: -5, fill: '#ccc' }
        };
      case 'brake':
        return {
          dataKey: 'Brake',
          domain: [0, 100],
          tickFormatter: (value) => `${value}%`,
          label: { value: 'Brake %', angle: -90, position: 'insideLeft', offset: -5, fill: '#ccc' }
        };
      default:
        return {
          dataKey: 'Speed',
          domain: [0, 'auto'],
          tickFormatter: (value) => `${value} km/h`,
          label: { value: 'Speed (km/h)', angle: -90, position: 'insideLeft', offset: -5, fill: '#ccc' }
        };
    }
  };

  const handleDownload = () => {
    // Placeholder for chart export functionality
    console.log('Download chart functionality would go here');
    alert('Chart download functionality would be implemented here');
  };

  const renderContent = () => {
    console.log("renderContent called");
    console.log(`isLoading: ${isLoading}, lapTelemetryData length: ${lapTelemetryData?.length || 0}`);
    
    if (isLoading) {
      return (
        <Box sx={{ 
          width: '100%', 
          height: '280px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          bgcolor: 'rgba(17, 24, 39, 0.5)', 
          borderRadius: 1
        }}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (!lapTelemetryData || lapTelemetryData.length === 0) {
      console.warn("No lap telemetry data to display");
      return (
        <Box sx={{ 
          width: '100%', 
          height: '280px', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          bgcolor: 'rgba(17, 24, 39, 0.8)', 
          border: '1px solid rgba(220, 38, 38, 0.3)', 
          borderRadius: 1,
          color: 'rgba(248, 113, 113, 1)'
        }}>
          <ErrorOutlineIcon sx={{ width: 40, height: 40, mb: 1 }} />
          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
            No telemetry data available
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(156, 163, 175, 1)', mt: 0.5 }}>
            No {chartType} data found for {selectedDriver} lap {selectedLap}
          </Typography>
        </Box>
      );
    }
  
    const chartData = getChartData();
    console.log(`chartData has ${chartData.length} points`);
    
    if (chartData.length === 0) {
      console.warn("No chart data after processing");
      return (
        <Box sx={{ 
          width: '100%', 
          height: '280px', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          bgcolor: 'rgba(17, 24, 39, 0.8)', 
          border: '1px solid rgba(220, 38, 38, 0.3)', 
          borderRadius: 1,
          color: 'rgba(248, 113, 113, 1)'
        }}>
          <ErrorOutlineIcon sx={{ width: 40, height: 40, mb: 1 }} />
          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
            Error processing telemetry data
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(156, 163, 175, 1)', mt: 0.5 }}>
            Could not generate chart data
          </Typography>
        </Box>
      );
    }
    
    const yAxisProps = getYAxisProps();
    const dataKey = yAxisProps.dataKey;
    
    console.log(`Rendering chart with ${chartData.length} points`);
    console.log(`X-axis domain: [0, ${trackData?.length_meters || 5000}]`);
    console.log(`Y-axis props:`, yAxisProps);
  
    try {
      return (
        <ResponsiveContainer width="100%" height={280} className="export-chart-container">
          <LineChart 
            data={chartData} 
            margin={{ top: 0, right: 10, left: -15, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(100, 116, 139, 0.3)" />
            <XAxis 
              type="number" 
              dataKey="Distance" 
              stroke="rgba(156, 163, 175, 0.7)" 
              tick={{ fill: 'rgba(156, 163, 175, 0.9)', fontSize: 12 }} 
              tickFormatter={(value) => `${Math.round(value)}m`}
              domain={[0, trackData?.length_meters || 5000]} // Use actual track length
              label={{ value: 'Distance (m)', position: 'insideBottom', offset: -15, fill: '#ccc' }}
              allowDecimals={false}
            />
            <YAxis 
              {...yAxisProps}
              stroke="rgba(156, 163, 175, 0.7)" 
              tick={{ fill: 'rgba(156, 163, 175, 0.9)', fontSize: 12 }}
              width={50}
            />
            <Tooltip 
              content={<TelemetryTooltip />} 
              isAnimationActive={false}  // Disable animation for more responsive tooltips
              cursor={{ strokeDasharray: '3 3' }} // Make the cursor line more visible
            />
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={getChartColor()} 
              strokeWidth={2} 
              dot={false} 
              isAnimationActive={false} // Disable animation for more responsive chart
              activeDot={{ 
                r: 4, 
                strokeWidth: 1, 
                stroke: 'rgba(255,255,255,0.5)', 
                fill: getChartColor() 
              }} 
              connectNulls={true} 
            />
          </LineChart>
        </ResponsiveContainer>
      );
    } catch (error) {
      console.error("Error rendering chart:", error);
      return (
        <Box sx={{ 
          width: '100%', 
          height: '280px', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          bgcolor: 'rgba(17, 24, 39, 0.8)', 
          border: '1px solid rgba(220, 38, 38, 0.3)', 
          borderRadius: 1,
          color: 'rgba(248, 113, 113, 1)'
        }}>
          <ErrorOutlineIcon sx={{ width: 40, height: 40, mb: 1 }} />
          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
            Error rendering chart
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(156, 163, 175, 1)', mt: 0.5 }}>
            {error.message}
          </Typography>
        </Box>
      );
    }
  };

  const chartTitle = `${selectedDriver ? `${selectedDriver}'s ` : ''}${
    selectedLap === 'fastest' ? 'Fastest Lap' : `Lap ${selectedLap}`
  } ${chartType.charAt(0).toUpperCase() + chartType.slice(1)}`;

  return (
    <Card 
      ref={chartRef} 
      sx={{ 
        bgcolor: 'rgba(17, 24, 39, 0.7)', 
        border: '1px solid rgba(75, 85, 99, 0.8)', 
        borderRadius: 2,
        backdropFilter: 'blur(8px)',
        overflow: 'hidden'
      }}
    >
      <CardHeader 
        title={
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'semibold' }}>
            {chartTitle}
          </Typography>
        }
        sx={{ pb: 1 }}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel id="chart-type-label" sx={{ color: '#ccc' }}>Chart Type</InputLabel>
              <Select
                labelId="chart-type-label"
                value={chartType}
                label="Chart Type"
                onChange={(e) => setChartType(e.target.value)}
                sx={{ 
                  color: '#fff', 
                  bgcolor: 'rgba(31, 41, 55, 0.8)', 
                  '.MuiOutlinedInput-notchedOutline': { 
                    borderColor: 'rgba(75, 85, 99, 0.8)' 
                  }
                }}
              >
                <MenuItem value="speed">Speed</MenuItem>
                <MenuItem value="throttle">Throttle</MenuItem>
                <MenuItem value="brake">Brake</MenuItem>
              </Select>
            </FormControl>
          </Box>
        }
      />
      <CardContent sx={{ pt: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="driver-select-label" sx={{ color: '#ccc' }}>
                <PersonIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} />
                Driver
              </InputLabel>
              <Select
                labelId="driver-select-label"
                value={selectedDriver}
                label="Driver"
                onChange={(e) => onDriverSelect(e.target.value)}
                sx={{ 
                  color: '#fff', 
                  bgcolor: 'rgba(31, 41, 55, 0.8)', 
                  '.MuiOutlinedInput-notchedOutline': { 
                    borderColor: 'rgba(75, 85, 99, 0.8)' 
                  }
                }}
                disabled={isLoading}
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
            
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel id="lap-select-label" sx={{ color: '#ccc' }}>
                <TimerIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} />
                Lap
              </InputLabel>
              <Select
                labelId="lap-select-label"
                value={selectedLap}
                label="Lap"
                onChange={(e) => onLapSelect(e.target.value)}
                sx={{ 
                  color: '#fff', 
                  bgcolor: 'rgba(31, 41, 55, 0.8)', 
                  '.MuiOutlinedInput-notchedOutline': { 
                    borderColor: 'rgba(75, 85, 99, 0.8)' 
                  }
                }}
                disabled={isLoading || maxLapNumber <= 0}
              >
                {maxLapNumber > 0 && (
                  <MenuItem value="fastest">Fastest</MenuItem>
                )}
                {Array.from({ length: maxLapNumber }, (_, i) => (
                  <MenuItem key={i + 1} value={i + 1}>
                    {i + 1}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          {/* Toggle Raw Data - optional */}
          {showRawLapData !== undefined && (
            <Button 
              size="small"
              variant="outlined"
              onClick={() => setShowRawLapData(!showRawLapData)}
              sx={{ 
                color: '#ccc', 
                borderColor: 'rgba(75, 85, 99, 0.8)',
                '&:hover': { 
                  borderColor: '#fff',
                  bgcolor: 'rgba(55, 65, 81, 0.3)'
                } 
              }}
            >
              {showRawLapData ? 'Hide Raw Data' : 'Show Raw Data'}
            </Button>
          )}
        </Box>
        
        {/* Debug panel for raw data */}
        {showRawLapData && (
          <Box sx={{ 
            maxHeight: '300px', 
            overflowY: 'auto', 
            mb: 2, 
            p: 2, 
            border: '1px solid rgba(75, 85, 99, 0.8)',
            borderRadius: 1,
            bgcolor: 'rgba(17, 24, 39, 0.5)'
          }}>
            <Typography variant="subtitle2" sx={{ color: '#fff', mb: 2 }}>
              Debug Information
            </Typography>
            
            <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#ccc' }}>
              Selected Driver: {selectedDriver}, Lap: {selectedLap}, Max Laps: {maxLapNumber}
            </Typography>
            
            <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#ccc' }}>
              Telemetry Points: {lapTelemetry?.length || 0} 
            </Typography>
            
            {lapTelemetry && lapTelemetry.length > 0 && (
              <>
                <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#ccc' }}>
                  Sample Data Point:
                </Typography>
                <pre style={{ fontSize: '0.75rem', color: '#aaa' }}>
                  {JSON.stringify(lapTelemetry[0], null, 2)}
                </pre>
              </>
            )}
          </Box>
        )}
        
        {renderContent()}
        
        {lapTelemetry && lapTelemetry.length > 0 && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="outlined" 
              size="small" 
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
              disabled={isExporting}
              sx={{ 
                color: '#ccc', 
                borderColor: 'rgba(75, 85, 99, 0.8)',
                '&:hover': { 
                  borderColor: '#fff',
                  bgcolor: 'rgba(55, 65, 81, 0.3)'
                } 
              }}
            >
              {isExporting ? "Exporting..." : "Download Chart"}
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}