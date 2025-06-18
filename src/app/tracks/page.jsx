'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Globe, Trophy, Zap, Calendar, Flag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// amCharts imports
import * as am5 from "@amcharts/amcharts5";
import * as am5map from "@amcharts/amcharts5/map";
import am5geodata_worldLow from "@amcharts/amcharts5-geodata/worldLow";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import am5themes_Dark from "@amcharts/amcharts5/themes/Dark";

// Track data with precise coordinates
const trackLocations = {
  // Europe
  'monaco': { lat: 43.7347, lng: 7.4206, region: 'Europe' },
  'silverstone': { lat: 52.0786, lng: -1.0169, region: 'Europe' },
  'spa-francorchamps': { lat: 50.4372, lng: 5.9714, region: 'Europe' },
  'zandvoort': { lat: 52.3888, lng: 4.5408, region: 'Europe' },
  'monza': { lat: 45.6156, lng: 9.2811, region: 'Europe' },
  'hungaroring': { lat: 47.5789, lng: 19.2486, region: 'Europe' },
  'spielberg': { lat: 47.2197, lng: 14.7647, region: 'Europe' },
  'barcelona': { lat: 41.5700, lng: 2.2611, region: 'Europe' },
  'imola': { lat: 44.3439, lng: 11.7167, region: 'Europe' },
  'portimao': { lat: 37.2272, lng: -8.6267, region: 'Europe' },
  'paul-ricard': { lat: 43.2506, lng: 5.7919, region: 'Europe' },

  // Middle East
  'bahrain': { lat: 26.0325, lng: 50.5106, region: 'Middle East' },
  'jeddah': { lat: 21.6319, lng: 39.1044, region: 'Middle East' },
  'yas-marina': { lat: 24.4672, lng: 54.6031, region: 'Middle East' },
  'baku': { lat: 40.3725, lng: 49.8533, region: 'Middle East' },
  'losail': { lat: 25.4900, lng: 51.4542, region: 'Middle East' },

  // Asia Pacific
  'suzuka': { lat: 34.8431, lng: 136.5411, region: 'Asia Pacific' },
  'shanghai': { lat: 31.3389, lng: 121.2197, region: 'Asia Pacific' },
  'singapore': { lat: 1.2911, lng: 103.7639, region: 'Asia Pacific' },
  'melbourne': { lat: -37.8497, lng: 144.9681, region: 'Asia Pacific' },

  // Americas
  'montreal': { lat: 45.5000, lng: -73.5228, region: 'Americas' },
  'austin': { lat: 30.1328, lng: -97.6411, region: 'Americas' },
  'las-vegas': { lat: 36.1147, lng: -115.1728, region: 'Americas' },
  'miami': { lat: 25.9581, lng: -80.2389, region: 'Americas' },
  'mexico': { lat: 19.4042, lng: -99.0907, region: 'Americas' },
  'interlagos': { lat: -23.7036, lng: -46.6997, region: 'Americas' }
};

const trackNames = {
  'bahrain': 'Bahrain International Circuit',
  'jeddah': 'Jeddah Corniche Circuit',
  'yas-marina': 'Yas Marina Circuit',
  'melbourne': 'Albert Park Circuit',
  'suzuka': 'Suzuka International Racing Course',
  'shanghai': 'Shanghai International Circuit',
  'baku': 'Baku City Circuit',
  'miami': 'Miami International Autodrome',
  'monaco': 'Circuit de Monaco',
  'montreal': 'Circuit Gilles Villeneuve',
  'barcelona': 'Circuit de Barcelona-Catalunya',
  'spielberg': 'Red Bull Ring',
  'silverstone': 'Silverstone Circuit',
  'hungaroring': 'Hungaroring',
  'spa-francorchamps': 'Circuit de Spa-Francorchamps',
  'zandvoort': 'Circuit Zandvoort',
  'monza': 'Autodromo Nazionale Monza',
  'singapore': 'Marina Bay Street Circuit',
  'austin': 'Circuit of The Americas',
  'mexico': 'Autodromo Hermanos Rodriguez',
  'interlagos': 'Autodromo Jose Carlos Pace',
  'las-vegas': 'Las Vegas Strip Circuit',
  'losail': 'Lusail International Circuit',
  'imola': 'Autodromo Enzo e Dino Ferrari',
  'portimao': 'Algarve International Circuit',
  'paul-ricard': 'Circuit Paul Ricard'
};

const trackCountries = {
  'bahrain': 'Bahrain',
  'jeddah': 'Saudi Arabia',
  'yas-marina': 'Abu Dhabi',
  'melbourne': 'Australia',
  'suzuka': 'Japan',
  'shanghai': 'China',
  'baku': 'Azerbaijan',
  'miami': 'Miami',
  'monaco': 'Monaco',
  'montreal': 'Canada',
  'barcelona': 'Spain',
  'spielberg': 'Austria',
  'silverstone': 'Great Britain',
  'hungaroring': 'Hungary',
  'spa-francorchamps': 'Belgium',
  'zandvoort': 'Netherlands',
  'monza': 'Italy',
  'singapore': 'Singapore',
  'austin': 'Texas',
  'mexico': 'Mexico',
  'interlagos': 'Brazil',
  'las-vegas': 'Las Vegas',
  'losail': 'Qatar',
  'imola': 'Emilia-Romagna',
  'portimao': 'Portugal',
  'paul-ricard': 'France'
};

// F1 Car SVG path for animation
const f1CarPath = "M12,2C13.1,2 14,2.9 14,4C14,5.1 13.1,6 12,6C10.9,6 10,5.1 10,4C10,2.9 10.9,2 12,2M21,9V7L15,5.5C14.8,4.1 13.8,3 12.5,3C11.2,3 10.2,4.1 10,5.5L4,7V9H1V11H4L6,19H8L10,11H14L16,19H18L20,11H23V9H21Z";

function WorldMapChart({ onTrackClick, hoveredTrack, setHoveredTrack }) {
  const chartRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    if (chartRef.current && !rootRef.current) {
      const root = am5.Root.new(chartRef.current);
      rootRef.current = root;

      root.setThemes([
        am5themes_Animated.new(root),
        am5themes_Dark.new(root)
      ]);

      const chart = root.container.children.push(
        am5map.MapChart.new(root, {
          panX: "rotateX",
          panY: "rotateY",
          projection: am5map.geoOrthographic(),
          wheelable: true,
          interactive: true
        })
      );

      const polygonSeries = chart.series.push(
        am5map.MapPolygonSeries.new(root, {
          geoJSON: am5geodata_worldLow,
          exclude: ["AQ"]
        })
      );

      polygonSeries.mapPolygons.template.setAll({
        fill: am5.color("#374151"),
        stroke: am5.color("#1f2937"),
        strokeWidth: 0.5,
        interactive: false
      });

      const pointSeries = chart.series.push(
        am5map.MapPointSeries.new(root, {
          cursorOverStyle: "pointer"
        })
      );

      pointSeries.mapPoints.template.setAll({
        interactive: true,
        cursorOverStyle: "pointer"
      });

      // ✅ Correct click handler inside bullet creation
      pointSeries.bullets.push(function (root, series, dataItem) {
        const circle = am5.Circle.new(root, {
          radius: 8,
          fill: am5.color("#ef4444"),
          stroke: am5.color("#ffffff"),
          strokeWidth: 2,
          tooltipText: "{fullName}",
          interactive: true,
          cursorOverStyle: "pointer"
        });

        circle.states.create("hover", {
          scale: 1.3,
          fill: am5.color("#fbbf24")
        });

        // ✅ Attach click directly to bullet circle
        circle.events.on("click", function () {
          const trackData = dataItem.dataContext;
          const trackSlug = trackData.id || trackData.slug;
          console.log("✅ Circle clicked:", trackSlug);
          if (trackSlug && onTrackClick) {
            onTrackClick(trackSlug);
          }
        });

        return am5.Bullet.new(root, {
          sprite: circle
        });
      });

      const trackData = Object.entries(trackLocations).map(([slug, location]) => ({
        geometry: { type: "Point", coordinates: [location.lng, location.lat] },
        id: slug,
        url: `/tracks/${slug}`,
        name: trackCountries[slug],
        fullName: trackNames[slug],
        slug: slug,
        region: location.region
      }));

      pointSeries.data.setAll(trackData);

      pointSeries.mapPoints.template.on("pointerover", function (e) {
        const dataItem = e.target.dataItem;
        if (dataItem && dataItem.dataContext) {
          const trackData = dataItem.dataContext;
          setHoveredTrack({
            slug: trackData.id || trackData.slug,
            name: trackData.fullName,
            country: trackData.name
          });
        }
      });

      pointSeries.mapPoints.template.on("pointerout", function () {
        setHoveredTrack(null);
      });

      return () => {
        if (rootRef.current) {
          rootRef.current.dispose();
          rootRef.current = null;
        }
      };
    }
  }, [onTrackClick, setHoveredTrack]);

  useEffect(() => {
    return () => {
      if (rootRef.current) {
        rootRef.current.dispose();
        rootRef.current = null;
      }
    };
  }, []);

  return <div ref={chartRef} className="w-full h-[500px]" />;
}



export default function TracksPage() {
  const router = useRouter();
  const [hoveredTrack, setHoveredTrack] = useState(null);

  const handleTrackClick = (trackSlug) => {
    console.log('handleTrackClick called with:', trackSlug);
    router.push(`/tracks/${trackSlug}`);
  };

  const totalTracks = Object.keys(trackLocations).length;
  
  // Calculate track statistics (example data - you can replace with real data)
  const trackStats = {
    totalCircuits: totalTracks,
    totalCorners: 312, // Estimated based on known F1 tracks
    totalDistance: 142.8, // Total km of all tracks combined
    averageLength: 4.9, // Average track length in km
    longestTrack: "Spa-Francorchamps (7.0km)",
    shortestTrack: "Monaco (3.3km)",
    mostCorners: "Suzuka (18 corners)",
    fewestCorners: "Monza (11 corners)"
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-gray-900/30 min-h-screen">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
          <Globe className="h-8 w-8 text-blue-500" />
          Formula 1 Circuits Around the World
        </h1>
        <p className="text-gray-400 text-lg">
          Click on any track location to explore detailed statistics and information
        </p>
        <p className="text-gray-500 text-sm mt-2">
          {totalTracks} circuits worldwide
        </p>
      </div>

      {/* Interactive World Map */}
      <div className="relative mb-8">
        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-0">
            <WorldMapChart 
              onTrackClick={handleTrackClick}
              hoveredTrack={hoveredTrack}
              setHoveredTrack={setHoveredTrack}
            />
          </CardContent>
        </Card>
        
        {/* Hover info card */}
        {hoveredTrack && (
          <div className="absolute top-4 right-4 z-10">
            <Card className="bg-gray-900/95 border border-gray-700/80 backdrop-blur-sm">
              <CardContent className="p-4">
                <h3 className="text-white font-semibold mb-1">{hoveredTrack.name}</h3>
                <p className="text-gray-400 text-sm mb-2">{hoveredTrack.country}</p>
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-blue-400" />
                  <p className="text-blue-400 text-xs">Click to view details</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Main Stats */}
      <div className="mb-8">
        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="w-6 w-6 text-yellow-500" />
                <div className="text-3xl font-bold text-white">{trackStats.totalCircuits}</div>
              </div>
              <div className="text-gray-400">Formula 1 Circuits Worldwide</div>
              <p className="text-gray-500 text-sm mt-2">
                From Monaco's tight streets to Monza's high speeds
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats Grid */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              <div className="text-2xl font-bold text-white">{trackStats.totalCorners}</div>
            </div>
            <div className="text-gray-400 text-sm">Total Corners</div>
            <p className="text-gray-500 text-xs mt-1">Across all circuits</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Flag className="w-5 h-5 text-green-500" />
              <div className="text-2xl font-bold text-white">{trackStats.totalDistance}</div>
            </div>
            <div className="text-gray-400 text-sm">Total Distance (km)</div>
            <p className="text-gray-500 text-xs mt-1">Combined circuit length</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-purple-500" />
              <div className="text-2xl font-bold text-white">{trackStats.averageLength}</div>
            </div>
            <div className="text-gray-400 text-sm">Average Length (km)</div>
            <p className="text-gray-500 text-xs mt-1">Per circuit</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-orange-500" />
              <div className="text-lg font-bold text-white">7.0</div>
            </div>
            <div className="text-gray-400 text-sm">Longest Track (km)</div>
            <p className="text-gray-500 text-xs mt-1">Spa-Francorchamps</p>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}