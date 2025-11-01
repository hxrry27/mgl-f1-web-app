import React, { useState, useRef } from 'react';
import { useQuery } from 'react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { 
  BarChart3, Download, User, Timer, AlertCircle, Loader2
} from 'lucide-react';

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
      staleTime: 1000 * 60 * 5,
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
      staleTime: 1000 * 60 * 5,
    }
  );

  // Handle driver selection change
  const handleDriverChange = (driver) => {
    setSelectedDriver(driver);
    setSelectedLap('fastest');
    if (shouldLoadChart) {
      setShouldLoadChart(false);
    }
    onDriverChange(driver);
  };

  // Handle lap selection change
  const handleLapChange = (lap) => {
    setSelectedLap(lap);
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
  
  const driverColor = selectedDriver ? getDriverColor(selectedDriver) : '#06b6d4';

  // Render chart content based on state
  const renderContent = () => {
    // Show load button if chart hasn't been loaded yet
    if (!shouldLoadChart) {
      return (
        <div className="w-full h-[280px] flex flex-col items-center justify-center bg-neutral-900/50 rounded-3xl gap-4">
          <p className="text-neutral-400 text-sm">
            Select a driver and click load to view speed data
          </p>
          <Button
            onClick={() => setShouldLoadChart(true)}
            disabled={!selectedDriver}
            className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Load Chart
          </Button>
        </div>
      );
    }
    
    // Show loading spinner
    if (isLoadingSpeedData) {
      return (
        <div className="w-full h-[280px] flex items-center justify-center bg-neutral-900/50 rounded-3xl">
          <Loader2 className="h-12 w-12 text-cyan-500 animate-spin" />
        </div>
      );
    }
    
    // Show error message
    if (speedDataError) {
      return (
        <div className="w-full h-[280px] flex flex-col items-center justify-center bg-neutral-900/50 border border-red-500/30 rounded-3xl p-4">
          <AlertCircle className="w-10 h-10 text-red-400 mb-2" />
          <p className="text-red-400 text-sm">
            {speedDataError.message || 'Error loading speed data'}
          </p>
        </div>
      );
    }
    
    // Show no data message
    if (!speedData || speedData.length === 0) {
      return (
        <div className="w-full h-[280px] flex items-center justify-center bg-neutral-900/50 border border-neutral-700/50 rounded-3xl text-neutral-400">
          No speed telemetry data found for {selectedDriver} lap {selectedLap}.
        </div>
      );
    }

    // Render the chart
    return (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={speedData}
          margin={{ top: 0, right: 10, left: -15, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(115, 115, 115, 0.2)" />
          <XAxis
            dataKey="Distance"
            stroke="rgba(163, 163, 163, 0.5)"
            tick={{ fill: 'rgba(163, 163, 163, 0.9)', fontSize: 12 }}
            tickFormatter={(value) => `${Math.round(value)}m`}
            domain={['dataMin', 'dataMax']}
          />
          <YAxis
            dataKey="Speed"
            stroke="rgba(163, 163, 163, 0.5)"
            tick={{ fill: 'rgba(163, 163, 163, 0.9)', fontSize: 12 }}
            domain={['auto', 'dataMax + 10']}
            tickFormatter={(value) => `${value} km/h`}
            width={50}
          />
          <Tooltip
            formatter={(value) => [`${value} km/h`, 'Speed']}
            labelFormatter={(label) => `Distance: ${label.toFixed(2)}m`}
            contentStyle={{
              backgroundColor: 'rgba(23, 23, 23, 0.95)',
              borderColor: 'rgba(64, 64, 64, 0.5)',
              color: '#ffffff',
              borderRadius: '16px',
              backdropFilter: 'blur(12px)'
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
    <Card ref={chartRef} className="bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50 rounded-3xl overflow-hidden">
      {/* Header with title and controls */}
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-cyan-400" />
            <CardTitle className="text-xl font-black text-white">
              {chartTitle}
            </CardTitle>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {/* Driver Select */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-neutral-400 uppercase tracking-wider font-bold">Driver</Label>
              <Select value={selectedDriver} onValueChange={handleDriverChange}>
                <SelectTrigger className="w-[180px] h-10 bg-neutral-800/80 border-neutral-700 rounded-xl text-white font-bold">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-neutral-500" />
                    <SelectValue placeholder="Select driver" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 backdrop-blur-xl border-neutral-700 rounded-2xl">
                  {availableDrivers.map((driver) => (
                    <SelectItem 
                      key={driver.code || driver} 
                      value={driver.code || driver}
                      className="text-white hover:bg-neutral-800 focus:bg-neutral-800 rounded-xl cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: getDriverColor(driver.code || driver) }}
                        />
                        <span className="font-medium">
                          {driver.code || driver} 
                          {driverTeams[driver.code || driver] && (
                            <span className="text-neutral-400 ml-1">
                              ({driverTeams[driver.code || driver]})
                            </span>
                          )}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Lap Select */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-neutral-400 uppercase tracking-wider font-bold">Lap</Label>
              <Select 
                value={selectedLap} 
                onValueChange={handleLapChange}
                disabled={isLoadingLapNumbers || lapOptions.length <= 1}
              >
                <SelectTrigger className="w-[140px] h-10 bg-neutral-800/80 border-neutral-700 rounded-xl text-white font-bold">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-neutral-500" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 backdrop-blur-xl border-neutral-700 rounded-2xl">
                  {lapOptions.map((lap) => (
                    <SelectItem 
                      key={lap} 
                      value={lap}
                      className="text-white hover:bg-neutral-800 focus:bg-neutral-800 rounded-xl cursor-pointer font-medium"
                    >
                      {lap === 'fastest' ? 'Fastest' : lap}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      
      {/* Chart content */}
      <CardContent className="pt-0">
        {renderContent()}
        
        {/* Download button */}
        {shouldLoadChart && !isLoadingSpeedData && speedData && speedData.length > 0 && (
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={isExporting}
              className="bg-neutral-800/80 hover:bg-neutral-700 text-white border-neutral-700 rounded-xl font-bold"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? "Exporting..." : "Download Chart"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SpeedChart;