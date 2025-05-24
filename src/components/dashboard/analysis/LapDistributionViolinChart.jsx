"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, SelectContent, SelectGroup, SelectItem, 
  SelectLabel, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { User, Download, BarChart3, AlertCircle, Filter } from 'lucide-react';
import { cn } from "@/lib/utils";

// Tire compound colors (F1 standard)
const tireColors = {
  'Soft': '#DC2626',
  'Medium': '#EAB308', 
  'Hard': '#F8FAFC',
  'Intermediate': '#16A34A',
  'Wet': '#2563EB',
  'UNKNOWN': '#6B7280'
};

export default function LapDistributionViolinChart({
  className,
  isLoading = false,
  lapData = [],
  drivers = [],
  driverTeams = {},
  driverColorMap = {},
  selectedSeason,
  selectedRace,
  selectedSessionType
}) {
  const svgRef = useRef(null);
  const chartRef = useRef(null);
  const [selectedDrivers, setSelectedDrivers] = useState([]);
  const [minLapsRequired, setMinLapsRequired] = useState(5);
  const [excludeOutliers, setExcludeOutliers] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Team order for driver grouping (matching your existing pattern)
  const teamOrder = [
    'Racing Bulls', 'Aston Martin', 'Alpine', 'Red Bull', 
    'Mercedes', 'McLaren', 'Ferrari', 'Williams', 'Haas', 'Kick Sauber'
  ];

  // Group drivers by team
  const teamGroups = {};
  teamOrder.forEach(team => {
    teamGroups[team] = [];
  });
  
  drivers.forEach(driver => {
    const team = driverTeams[driver] || 'Unknown Team';
    if (teamGroups[team]) {
      teamGroups[team].push(driver);
    } else {
      teamGroups['Unknown Team'] = teamGroups['Unknown Team'] || [];
      teamGroups['Unknown Team'].push(driver);
    }
  });

  // Process lap data for violin plots
  const processedData = useMemo(() => {
    if (!lapData || lapData.length === 0) return null;

    console.log('Processing lap data:', lapData.length, 'total laps');

    const driverLaps = {};
    lapData.forEach(lap => {
      if (!driverLaps[lap.driver]) {
        driverLaps[lap.driver] = [];
      }

      if (lap.lap_time_int && lap.lap_time_int > 0 && lap.lap_time_int < 200000) {
        driverLaps[lap.driver].push({
          lapTime: lap.lap_time_int / 1000,
          compound: lap.tyre_compound || 'UNKNOWN',
          lapNumber: lap.lap_number,
          isOutlap: lap.isOutlap || false,
          isInlap: lap.isInlap || false
        });
      }
    });

    // Filter drivers with minimum laps and outlier removal
    const filteredDrivers = {};
    Object.keys(driverLaps).forEach(driver => {
      const laps = driverLaps[driver];
      
      if (laps.length >= minLapsRequired) {
        let processedLaps = laps;
        
        if (excludeOutliers) {
          const times = laps.map(l => l.lapTime).sort((a, b) => a - b);
          const q1 = times[Math.floor(times.length * 0.25)];
          const q3 = times[Math.floor(times.length * 0.75)];
          const iqr = q3 - q1;
          const lowerBound = q1 - (1.5 * iqr);
          const upperBound = q3 + (1.5 * iqr);
          
          processedLaps = laps.filter(lap => 
            lap.lapTime >= lowerBound && lap.lapTime <= upperBound
          );
        }
        
        if (processedLaps.length >= Math.max(3, minLapsRequired - 2)) {
          filteredDrivers[driver] = processedLaps;
        }
      }
    });

    console.log('Processed drivers:', Object.keys(filteredDrivers));
    return filteredDrivers;
  }, [lapData, minLapsRequired, excludeOutliers]);

  // Create D3 violin chart
  useEffect(() => {
    if (!processedData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const driversToShow = selectedDrivers.length > 0 ? selectedDrivers : Object.keys(processedData);
    if (driversToShow.length === 0) return;

    // Chart dimensions
    const margin = { top: 20, right: 30, bottom: 60, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Create main chart group
    const chartGroup = svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Get all lap times for y-scale
    const allTimes = [];
    driversToShow.forEach(driver => {
      if (processedData[driver]) {
        allTimes.push(...processedData[driver].map(lap => lap.lapTime));
      }
    });

    if (allTimes.length === 0) return;

    // Scales
    const xScale = d3.scaleBand()
      .domain(driversToShow)
      .range([0, width])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(allTimes))
      .nice()
      .range([height, 0]);

    // Create violin for each driver
    driversToShow.forEach(driver => {
      const driverData = processedData[driver];
      if (!driverData || driverData.length === 0) return;

      const times = driverData.map(lap => lap.lapTime);
      const driverColor = driverColorMap[driver] || '#636EFA';

      // Create kernel density estimate
      const kde = kernelDensityEstimator(kernelEpanechnikov(0.5), yScale.ticks(50));
      const density = kde(times);

      // Scale for violin width
      const maxDensity = d3.max(density, d => d[1]);
      const violinWidth = xScale.bandwidth() * 0.8;
      const xOffset = xScale(driver) + xScale.bandwidth() / 2;

      // Create violin path
      const area = d3.area()
        .x0(d => xOffset - (d[1] / maxDensity) * (violinWidth / 2))
        .x1(d => xOffset + (d[1] / maxDensity) * (violinWidth / 2))
        .y(d => yScale(d[0]))
        .curve(d3.curveBasis);

      // Draw violin shape
      chartGroup.append("path")
        .datum(density)
        .attr("d", area)
        .attr("fill", driverColor)
        .attr("fill-opacity", 0.3)
        .attr("stroke", driverColor)
        .attr("stroke-width", 2);

      // Add center line (median)
      const median = d3.median(times);
      chartGroup.append("line")
        .attr("x1", xOffset - violinWidth/6)
        .attr("x2", xOffset + violinWidth/6)
        .attr("y1", yScale(median))
        .attr("y2", yScale(median))
        .attr("stroke", driverColor)
        .attr("stroke-width", 3);

      // Add compound dots
      const compoundGroups = d3.group(driverData, d => d.compound);
      
      compoundGroups.forEach((laps, compound) => {
        // Add some jitter to x position
        const jitterWidth = violinWidth * 0.3;
        
        chartGroup.selectAll(`.dot-${driver}-${compound}`)
          .data(laps)
          .enter()
          .append("circle")
          .attr("class", `dot-${driver}-${compound}`)
          .attr("cx", () => xOffset + (Math.random() - 0.5) * jitterWidth)
          .attr("cy", d => yScale(d.lapTime))
          .attr("r", 4)
          .attr("fill", tireColors[compound] || tireColors.UNKNOWN)
          .attr("stroke", "#fff")
          .attr("stroke-width", 1)
          .attr("opacity", 0.8)
          .on("mouseover", function(event, d) {
            // Tooltip on hover
            const tooltip = d3.select("body").append("div")
              .attr("class", "tooltip")
              .style("position", "absolute")
              .style("background", "rgba(17, 24, 39, 0.95)")
              .style("color", "#F3F4F6")
              .style("padding", "8px 12px")
              .style("border-radius", "6px")
              .style("border", "1px solid rgba(75, 85, 99, 0.5)")
              .style("font-size", "12px")
              .style("pointer-events", "none")
              .style("z-index", "1000")
              .html(`
                <div><strong>${driver}</strong></div>
                <div>Lap ${d.lapNumber}: ${d.lapTime.toFixed(3)}s</div>
                <div>Compound: ${compound}</div>
              `);
            
            tooltip.style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 10) + "px");
          })
          .on("mouseout", function() {
            d3.selectAll(".tooltip").remove();
          });
      });
    });

    // X-axis
    chartGroup.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("fill", "#9CA3AF")
      .style("font-size", "11px");

    // Y-axis  
    chartGroup.append("g")
      .call(d3.axisLeft(yScale).tickFormat(d => {
        const minutes = Math.floor(d / 60);
        const seconds = (d % 60).toFixed(1);
        return `${minutes}:${seconds.padStart(4, '0')}`;
      }))
      .selectAll("text")
      .style("fill", "#9CA3AF")
      .style("font-size", "11px");

    // Axis labels
    chartGroup.append("text")
      .attr("x", width / 2)
      .attr("y", height + 40)
      .style("text-anchor", "middle")
      .style("fill", "#9CA3AF")
      .style("font-size", "12px")
      .text("Driver");

    chartGroup.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -40)
      .style("text-anchor", "middle")
      .style("fill", "#9CA3AF")
      .style("font-size", "12px")
      .text("Lap Time (s)");

    // Grid lines
    chartGroup.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(yScale)
        .tickSize(-width)
        .tickFormat("")
      )
      .selectAll("line")
      .style("stroke", "rgba(156, 163, 175, 0.1)")
      .style("stroke-dasharray", "3,3");

  }, [processedData, selectedDrivers, driverColorMap]);

  // Kernel density estimation functions
  function kernelDensityEstimator(kernel, X) {
    return function(V) {
      return X.map(function(x) {
        return [x, d3.mean(V, function(v) { return kernel(x - v); })];
      });
    };
  }

  function kernelEpanechnikov(k) {
    return function(v) {
      return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
    };
  }

  const handleDownload = () => {
    if (!svgRef.current) return;
    
    // Simple download implementation
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = document.createElement("img");
    
    img.onload = function() {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const png = canvas.toDataURL("image/png");
      
      const downloadLink = document.createElement("a");
      downloadLink.href = png;
      downloadLink.download = `lap_distribution_${selectedRace}_${selectedSessionType}.png`;
      downloadLink.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-900/50 rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    if (!lapData || lapData.length === 0) {
      return (
        <div className="w-full h-full bg-gray-900/80 border border-red-500/30 rounded-lg flex flex-col items-center justify-center text-red-400">
          <AlertCircle className="w-10 h-10 mb-2" />
          <p className="font-semibold">No lap data available</p>
          <p className="text-xs text-gray-500 mt-1">
            No lap data found for {selectedRace} {selectedSessionType}
          </p>
        </div>
      );
    }

    if (!processedData || Object.keys(processedData).length === 0) {
      return (
        <div className="w-full h-full bg-gray-900/80 border border-red-500/30 rounded-lg flex flex-col items-center justify-center text-red-400">
          <AlertCircle className="w-10 h-10 mb-2" />
          <p className="font-semibold">No data meets criteria</p>
          <p className="text-xs text-gray-500 mt-1">
            Try reducing minimum laps requirement or disabling outlier filtering
          </p>
        </div>
      );
    }
    
    return (
      <div className="w-full h-full bg-gray-800/30 rounded-lg p-4" style={{ minHeight: '420px' }}>
        <svg ref={svgRef} width="100%" height="100%" style={{ maxWidth: '100%', height: '400px' }} />
      </div>
    );
  };

  const chartTitle = selectedDrivers.length > 0 
    ? `Lap Time Distribution - ${selectedDrivers.join(', ')}`
    : 'Lap Time Distribution Analysis';

  return (
    <Card 
      ref={chartRef} 
      className={cn("chart-container bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden h-[600px]", className)}
    >
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold text-white">{chartTitle}</CardTitle>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={minLapsRequired.toString()}
              onValueChange={(value) => setMinLapsRequired(parseInt(value))}
            >
              <SelectTrigger className="w-full sm:w-[120px] bg-gray-800/80 border-gray-700 text-gray-200 text-sm h-9">
                <BarChart3 className="w-4 h-4 mr-2 opacity-70"/>
                <SelectValue placeholder="Min Laps" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700 text-gray-200">
                <SelectGroup>
                  <SelectLabel className="text-xs text-gray-500">Min Laps</SelectLabel>
                  <SelectItem value="3" className="text-sm">3+ laps</SelectItem>
                  <SelectItem value="5" className="text-sm">5+ laps</SelectItem>
                  <SelectItem value="10" className="text-sm">10+ laps</SelectItem>
                  <SelectItem value="15" className="text-sm">15+ laps</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <Button
              variant={excludeOutliers ? "default" : "outline"}
              size="sm"
              onClick={() => setExcludeOutliers(!excludeOutliers)}
              className="h-9 bg-gray-800/80 hover:bg-gray-700 text-gray-200 border border-gray-700"
            >
              <Filter className="w-4 h-4 mr-2" />
              {excludeOutliers ? 'Filter On' : 'Filter Off'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex-grow flex flex-col">
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Driver selection */}
          <Select
            value={selectedDrivers.length > 0 ? selectedDrivers[0] : "all"}
            onValueChange={(value) => setSelectedDrivers(value === "all" ? [] : [value])}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full sm:w-[180px] bg-gray-800/80 border-gray-700 text-gray-200 text-sm h-9">
              <User className="w-4 h-4 mr-2 opacity-70"/>
              <SelectValue placeholder="All Drivers" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700 text-gray-200 max-h-[300px]">
              <SelectGroup>
                <SelectLabel className="text-xs text-gray-500">Filter Drivers</SelectLabel>
                <SelectItem value="all" className="text-sm">All Drivers</SelectItem>
              </SelectGroup>
              {Object.entries(teamGroups).map(([team, teamDrivers]) => (
                teamDrivers.length > 0 && (
                  <SelectGroup key={team}>
                    <SelectLabel className="text-xs text-gray-500">{team}</SelectLabel>
                    {teamDrivers.map(driver => (
                      <SelectItem key={driver} value={driver} className="text-sm">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: driverColorMap?.[driver] || '#888' }}
                          />
                          {driver}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tire compound legend */}
        {processedData && Object.keys(processedData).length > 0 && (
          <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-300">Tire Compounds & Violin Shapes:</p>
              <span className="text-xs text-gray-400">
                Wider sections = more laps clustered at that time
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {Object.entries(tireColors).filter(([compound]) => compound !== 'UNKNOWN').map(([compound, color]) => (
                <div key={compound} className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full border border-gray-600" 
                    style={{ backgroundColor: color }}
                  ></div>
                  <span className="text-xs text-gray-300 font-medium">{compound}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Violin width shows lap time clustering • White line shows median • Dots show individual laps by compound
            </p>
          </div>
        )}
        
        {/* Chart content */}
        <div className="flex-grow" style={{ minHeight: '420px', height: 'calc(100% - 120px)' }}>
          {renderContent()}
        </div>
        
        {/* Download button */}
        {processedData && Object.keys(processedData).length > 0 && (
          <div className="mt-4 flex justify-end">
            <Button 
              variant="secondary" 
              size="sm" 
              className="h-7 px-2.5 text-xs bg-gray-800 hover:bg-gray-700 text-white flex items-center gap-1.5 border border-gray-700"
              onClick={handleDownload}
              disabled={isExporting}
            >
              <Download className="h-3.5 w-3.5" />
              {isExporting ? "Exporting..." : "Download Chart"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}