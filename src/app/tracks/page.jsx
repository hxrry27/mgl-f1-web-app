'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flag, Globe } from 'lucide-react';

// ============================================================================
// TRACK DATA - All tracks organized by region
// ============================================================================
const allTracks = {
  europe: [
    { slug: 'monaco', name: 'Monaco', fullName: 'Circuit de Monaco', country: 'Monaco', flagFile: 'monaco', length: '3.337', corners: 19 },
    { slug: 'silverstone', name: 'Silverstone', fullName: 'Silverstone Circuit', country: 'Great Britain', flagFile: 'united_kingdom', length: '5.891', corners: 18 },
    { slug: 'spa-francorchamps', name: 'Spa-Francorchamps', fullName: 'Circuit de Spa-Francorchamps', country: 'Belgium', flagFile: 'belgium', length: '7.004', corners: 19 },
    { slug: 'monza', name: 'Monza', fullName: 'Autodromo Nazionale Monza', country: 'Italy', flagFile: 'italy', length: '5.793', corners: 11 },
    { slug: 'zandvoort', name: 'Zandvoort', fullName: 'Circuit Zandvoort', country: 'Netherlands', flagFile: 'netherlands', length: '4.259', corners: 14 },
    { slug: 'barcelona', name: 'Barcelona', fullName: 'Circuit de Barcelona-Catalunya', country: 'Spain', flagFile: 'spain', length: '4.675', corners: 16 },
    { slug: 'spielberg', name: 'Red Bull Ring', fullName: 'Red Bull Ring', country: 'Austria', flagFile: 'austria', length: '4.318', corners: 10 },
    { slug: 'hungaroring', name: 'Hungaroring', fullName: 'Hungaroring', country: 'Hungary', flagFile: 'hungary', length: '4.381', corners: 14 },
    { slug: 'imola', name: 'Imola', fullName: 'Autodromo Enzo e Dino Ferrari', country: 'Italy', flagFile: 'italy', length: '4.909', corners: 19 },
    { slug: 'portimao', name: 'Portimão', fullName: 'Algarve International Circuit', country: 'Portugal', flagFile: 'portugal', length: '4.653', corners: 15 },
    { slug: 'paul-ricard', name: 'Paul Ricard', fullName: 'Circuit Paul Ricard', country: 'France', flagFile: 'france', length: '5.842', corners: 15 },
  ],
  americas: [
    { slug: 'miami', name: 'Miami', fullName: 'Miami International Autodrome', country: 'United States', flagFile: 'united_states_of_america', length: '5.412', corners: 19 },
    { slug: 'montreal', name: 'Montreal', fullName: 'Circuit Gilles Villeneuve', country: 'Canada', flagFile: 'canada', length: '4.361', corners: 14 },
    { slug: 'austin', name: 'Austin', fullName: 'Circuit of The Americas', country: 'United States', flagFile: 'united_states_of_america', length: '5.513', corners: 20 },
    { slug: 'mexico', name: 'Mexico City', fullName: 'Autódromo Hermanos Rodríguez', country: 'Mexico', flagFile: 'mexico', length: '4.304', corners: 17 },
    { slug: 'interlagos', name: 'São Paulo', fullName: 'Autódromo José Carlos Pace', country: 'Brazil', flagFile: 'brazil', length: '4.309', corners: 15 },
    { slug: 'las-vegas', name: 'Las Vegas', fullName: 'Las Vegas Strip Circuit', country: 'United States', flagFile: 'united_states_of_america', length: '6.120', corners: 17 },
  ],
  asia_me: [
    { slug: 'bahrain', name: 'Bahrain', fullName: 'Bahrain International Circuit', country: 'Bahrain', flagFile: 'bahrain', length: '5.412', corners: 15 },
    { slug: 'jeddah', name: 'Jeddah', fullName: 'Jeddah Corniche Circuit', country: 'Saudi Arabia', flagFile: 'saudi_arabia', length: '6.174', corners: 27 },
    { slug: 'melbourne', name: 'Melbourne', fullName: 'Albert Park Circuit', country: 'Australia', flagFile: 'australia', length: '5.278', corners: 14 },
    { slug: 'suzuka', name: 'Suzuka', fullName: 'Suzuka International Racing Course', country: 'Japan', flagFile: 'japan', length: '5.807', corners: 18 },
    { slug: 'shanghai', name: 'Shanghai', fullName: 'Shanghai International Circuit', country: 'China', flagFile: 'china', length: '5.451', corners: 16 },
    { slug: 'baku', name: 'Baku', fullName: 'Baku City Circuit', country: 'Azerbaijan', flagFile: 'azerbaijan', length: '6.003', corners: 20 },
    { slug: 'singapore', name: 'Singapore', fullName: 'Marina Bay Street Circuit', country: 'Singapore', flagFile: 'singapore', length: '5.063', corners: 19 },
    { slug: 'losail', name: 'Lusail', fullName: 'Lusail International Circuit', country: 'Qatar', flagFile: 'qatar', length: '5.380', corners: 16 },
    { slug: 'yas-marina', name: 'Abu Dhabi', fullName: 'Yas Marina Circuit', country: 'United Arab Emirates', flagFile: 'united_arab_emirates', length: '5.281', corners: 16 },
  ]
};

// ============================================================================
// COMPONENT
// ============================================================================
export default function TracksPage() {
  const router = useRouter();

  const handleTrackClick = (slug) => {
    router.push(`/tracks/${slug}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 bg-opacity-90 text-white">
      <div className="flex-grow pt-6 pb-8">
        <div className="container mx-auto px-4 max-w-7xl">
          
          {/* Page Title */}
          <h1 className="text-3xl font-bold text-white text-center mb-8 flex items-center justify-center gap-2">
            <Flag className="h-7 w-7 text-blue-500" />
            Formula 1 Circuits
          </h1>

          {/* European Tracks */}
          <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl text-white flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-400" />
            European Tracks
            <Badge variant="secondary" className="ml-auto">{allTracks.europe.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allTracks.europe.map((track) => (
              <button
                key={track.slug}
                onClick={() => handleTrackClick(track.slug)}
                className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800 transition-colors text-left group border border-gray-700/50 hover:border-blue-500"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="relative w-10 h-7 flex-shrink-0">
                    <Image
                      src={`/images/flags/${track.flagFile}.png`}
                      alt={`${track.country} Flag`}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-base group-hover:text-blue-400 transition-colors">
                      {track.name}
                    </div>
                    <div className="text-gray-400 text-sm truncate">
                      {track.country}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{track.length} km</span>
                  <span>•</span>
                  <span>{track.corners} corners</span>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Americas Tracks */}
      <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl text-white flex items-center gap-2">
            <Globe className="h-5 w-5 text-green-400" />
            Americas Tracks
            <Badge variant="secondary" className="ml-auto">{allTracks.americas.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allTracks.americas.map((track) => (
              <button
                key={track.slug}
                onClick={() => handleTrackClick(track.slug)}
                className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800 transition-colors text-left group border border-gray-700/50 hover:border-blue-500"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="relative w-10 h-7 flex-shrink-0">
                    <Image
                      src={`/images/flags/${track.flagFile}.png`}
                      alt={`${track.country} Flag`}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-base group-hover:text-blue-400 transition-colors">
                      {track.name}
                    </div>
                    <div className="text-gray-400 text-sm truncate">
                      {track.country}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{track.length} km</span>
                  <span>•</span>
                  <span>{track.corners} corners</span>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Asia & Middle East Tracks */}
      <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl text-white flex items-center gap-2">
            <Globe className="h-5 w-5 text-purple-400" />
            Asia & Middle East Tracks
            <Badge variant="secondary" className="ml-auto">{allTracks.asia_me.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allTracks.asia_me.map((track) => (
              <button
                key={track.slug}
                onClick={() => handleTrackClick(track.slug)}
                className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800 transition-colors text-left group border border-gray-700/50 hover:border-blue-500"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="relative w-10 h-7 flex-shrink-0">
                    <Image
                      src={`/images/flags/${track.flagFile}.png`}
                      alt={`${track.country} Flag`}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-base group-hover:text-blue-400 transition-colors">
                      {track.name}
                    </div>
                    <div className="text-gray-400 text-sm truncate">
                      {track.country}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{track.length} km</span>
                  <span>•</span>
                  <span>{track.corners} corners</span>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

        </div>
      </div>
    </div>
  );
}