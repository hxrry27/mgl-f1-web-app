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

function WorldMapChart({ onTrackClick, hoveredTrack, setHoveredTrack, selectedRegion }) {
  const chartRef = useRef(null);
  const rootRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const router = useRouter();

  // Define zoom bounds for each region
  const regionBounds = {
    'All': { longitude: 0, latitude: 20, zoomLevel: 1.2 },
    'Europe': { longitude: 10, latitude: 54, zoomLevel: 4 },
    'Middle East': { longitude: 45, latitude: 25, zoomLevel: 5 },
    'Asia Pacific': { longitude: 120, latitude: 10, zoomLevel: 3 },
    'Americas': { longitude: -90, latitude: 20, zoomLevel: 3 }
  };

  useEffect(() => {
    if (chartRef.current && !rootRef.current) {
      // Create root element
      const root = am5.Root.new(chartRef.current);
      rootRef.current = root;

      // Set themes
      root.setThemes([
        am5themes_Animated.new(root),
        am5themes_Dark.new(root)
      ]);

      // Create the map chart
      const chart = root.container.children.push(
        am5map.MapChart.new(root, {
          panX: "rotateX",
          panY: "translateY",
          projection: am5map.geoMercator(),
          homeZoomLevel: 1.2,
          homeGeoPoint: { longitude: 0, latitude: 20 }
        })
      );
      
      // Store chart instance for later use
      chartInstanceRef.current = chart;

      // Create main polygon series for countries
      const polygonSeries = chart.series.push(
        am5map.MapPolygonSeries.new(root, {
          geoJSON: am5geodata_worldLow,
          exclude: ["AQ"] // Exclude Antarctica
        })
      );

      // Style the countries
      polygonSeries.mapPolygons.template.setAll({
        fill: am5.color("#374151"),
        stroke: am5.color("#1f2937"),
        strokeWidth: 0.5,
        interactive: false
      });

      // Create point series for F1 tracks
      const pointSeries = chart.series.push(
        am5map.MapPointSeries.new(root, {})
      );

      // Style the track markers
      pointSeries.bullets.push(function() {
        const circle = am5.Circle.new(root, {
          radius: 8,
          fill: am5.color("#3b82f6"),
          stroke: am5.color("#ffffff"),
          strokeWidth: 2,
          cursorOverStyle: "pointer",
          tooltipText: "{name}",
          scale: 1
        });

        // Add hover effects
        circle.states.create("hover", {
          scale: 1.3,
          fill: am5.color("#fbbf24")
        });

        // Add click handler to the circle
        circle.on("click", function(e) {
          const dataItem = e.target.dataItem;
          if (dataItem) {
            const trackSlug = dataItem.dataContext.slug;
            onTrackClick(trackSlug);
          }
        });

        // Add hover handlers to the circle
        circle.on("pointerover", function(e) {
          const dataItem = e.target.dataItem;
          if (dataItem) {
            setHoveredTrack({
              slug: dataItem.dataContext.slug,
              name: dataItem.dataContext.fullName,
              country: dataItem.dataContext.name
            });
          }
        });

        circle.on("pointerout", function() {
          setHoveredTrack(null);
        });

        return am5.Bullet.new(root, {
          sprite: circle
        });
      });

      // Add F1 car bullet for animation
      const f1CarBullet = pointSeries.bullets.push(function() {
        const f1Car = am5.Graphics.new(root, {
          svgPath: f1CarPath,
          fill: am5.color("#ef4444"),
          stroke: am5.color("#ffffff"),
          strokeWidth: 1,
          scale: 0.8,
          centerX: am5.p50,
          centerY: am5.p50,
          visible: false
        });

        return am5.Bullet.new(root, {
          sprite: f1Car
        });
      });

      // Filter tracks based on selected region
      const filteredTracks = selectedRegion === 'All' 
        ? trackLocations 
        : Object.fromEntries(
            Object.entries(trackLocations).filter(([, data]) => data.region === selectedRegion)
          );

      // Add track data points
      const trackData = Object.entries(filteredTracks).map(([slug, location]) => ({
        geometry: { type: "Point", coordinates: [location.lng, location.lat] },
        name: trackCountries[slug],
        fullName: trackNames[slug],
        slug: slug,
        region: location.region
      }));

      pointSeries.data.setAll(trackData);

      // Cleanup function
      return () => {
        if (rootRef.current) {
          rootRef.current.dispose();
          rootRef.current = null;
        }
      };
    }
  }, [selectedRegion, onTrackClick, setHoveredTrack]);

  // Handle region zoom changes
  useEffect(() => {
    if (chartInstanceRef.current && regionBounds[selectedRegion]) {
      const bounds = regionBounds[selectedRegion];
      chartInstanceRef.current.animate({
        key: "rotationX",
        to: -bounds.longitude,
        duration: 1000,
        easing: am5.ease.out(am5.ease.cubic)
      });
      chartInstanceRef.current.animate({
        key: "rotationY", 
        to: -bounds.latitude,
        duration: 1000,
        easing: am5.ease.out(am5.ease.cubic)
      });
      chartInstanceRef.current.animate({
        key: "zoomLevel",
        to: bounds.zoomLevel,
        duration: 1000,
        easing: am5.ease.out(am5.ease.cubic)
      });
    }
  }, [selectedRegion]);

  // Cleanup on unmount
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
  const [selectedRegion, setSelectedRegion] = useState('All');

  const handleTrackClick = (trackSlug) => {
    router.push(`/tracks/${trackSlug}`);
  };

  const regions = ['All', 'Europe', 'Middle East', 'Asia Pacific', 'Americas'];
  
  const getTracksByRegion = (region) => {
    return Object.entries(trackLocations)
      .filter(([, data]) => data.region === region)
      .map(([slug]) => slug);
  };

  const totalTracks = Object.keys(trackLocations).length;
  const europeTracks = getTracksByRegion('Europe').length;
  const americasTracks = getTracksByRegion('Americas').length;
  const asiaPacificTracks = getTracksByRegion('Asia Pacific').length + getTracksByRegion('Middle East').length;

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
      </div>

      {/* Region Filter */}
      <div className="flex justify-center mb-8">
        <div className="flex gap-2 p-2 bg-gray-900/50 border border-gray-700/60 rounded-lg backdrop-blur-sm">
          {regions.map((region) => (
            <Button
              key={region}
              onClick={() => setSelectedRegion(region)}
              variant={selectedRegion === region ? "default" : "ghost"}
              size="sm"
              className={`${
                selectedRegion === region
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {region}
            </Button>
          ))}
        </div>
      </div>

      {/* Interactive World Map */}
      <div className="relative mb-8">
        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-0">
            <WorldMapChart 
              onTrackClick={handleTrackClick}
              hoveredTrack={hoveredTrack}
              setHoveredTrack={setHoveredTrack}
              selectedRegion={selectedRegion}
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

      {/* Quick Stats Bar */}
      <div className="mb-8">
        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <div className="text-2xl font-bold text-white">{totalTracks}</div>
                </div>
                <div className="text-gray-400 text-sm">Total Circuits</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Flag className="w-5 h-5 text-blue-500" />
                  <div className="text-2xl font-bold text-white">{europeTracks}</div>
                </div>
                <div className="text-gray-400 text-sm">European Tracks</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-green-500" />
                  <div className="text-2xl font-bold text-white">{americasTracks}</div>
                </div>
                <div className="text-gray-400 text-sm">American Tracks</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-purple-500" />
                  <div className="text-2xl font-bold text-white">{asiaPacificTracks}</div>
                </div>
                <div className="text-gray-400 text-sm">Asia-Pacific & Middle East</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regional Track Lists - Compact Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {regions.slice(1).map((region) => (
          <Card key={region} className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <MapPin className="h-4 w-4 text-blue-500" />
                {region}
                <Badge variant="secondary" className="ml-auto text-xs">
                  {getTracksByRegion(region).length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 max-h-64 overflow-y-auto">
              {getTracksByRegion(region).map((trackSlug) => (
                <Button
                  key={trackSlug}
                  variant="ghost"
                  onClick={() => handleTrackClick(trackSlug)}
                  className="w-full justify-start text-left p-2 h-auto hover:bg-gray-800/50 transition-colors group"
                >
                  <div className="flex flex-col items-start gap-1">
                    <div className="text-white text-sm font-medium group-hover:text-blue-400 transition-colors">
                      {trackCountries[trackSlug]}
                    </div>
                    <div className="text-gray-400 text-xs truncate w-full">
                      {trackNames[trackSlug]}
                    </div>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}