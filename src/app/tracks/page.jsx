'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Flag, Globe, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
// REGION SECTION COMPONENT
// ============================================================================
function RegionSection({ title, tracks, icon, color, delay }) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="mb-8"
    >
      <div className="relative card-glass overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-neutral-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`${color}`}>
                {icon}
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">{title}</h2>
            </div>
            <Badge className="bg-neutral-800/80 text-neutral-400 border-neutral-700/50">
              {tracks.length} Circuits
            </Badge>
          </div>
        </div>

        {/* Track Grid */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tracks.map((track, index) => (
              <motion.button
                key={track.slug}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: delay + 0.1 + index * 0.05 }}
                whileHover={{ scale: 1.02, y: -4 }}
                onClick={() => router.push(`/tracks/${track.slug}`)}
                className="relative bg-neutral-800/50 rounded-2xl p-6 hover:bg-neutral-800 transition-all text-left group border border-neutral-700/30 hover:border-cyan-500/50"
              >
                {/* Track Info */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative w-12 h-8 flex-shrink-0">
                    <Image
                      src={`/images/flags/${track.flagFile}.png`}
                      alt={`${track.country} Flag`}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold text-lg group-hover:text-cyan-400 transition-colors mb-1">
                      {track.name}
                    </div>
                    <div className="text-neutral-400 text-sm truncate">
                      {track.country}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-neutral-500">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    <span>{track.length} km</span>
                  </div>
                  <span>•</span>
                  <span>{track.corners} corners</span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function TracksPage() {
  return (
    <div className="relative min-h-screen bg-primary">
      {/* Content Container */}
      <div className="relative z-10 px-8 lg:px-16 xl:px-24 py-8">
        <div className="max-w-[1400px] mx-auto">
          
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <div className="flex items-center gap-4 mb-4">
              <Flag className="h-10 w-10 text-cyan-400" />
              <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight">
                Formula 1 Circuits
              </h1>
            </div>
            <p className="text-xl text-neutral-400 max-w-3xl">
              Explore the legendary circuits that define Formula 1 racing, from historic European tracks to cutting-edge street circuits around the globe.
            </p>
          </motion.div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex gap-12 mb-16"
          >
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-neutral-500 mb-2">
                <Globe className="h-5 w-5" />
                <span className="text-sm uppercase tracking-wider">Total Circuits</span>
              </div>
              <span className="text-4xl font-black text-white">
                {allTracks.europe.length + allTracks.americas.length + allTracks.asia_me.length}
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-neutral-500 mb-2">
                <MapPin className="h-5 w-5" />
                <span className="text-sm uppercase tracking-wider">Countries</span>
              </div>
              <span className="text-4xl font-black text-white">25</span>
            </div>
          </motion.div>

          {/* Region Sections */}
          <RegionSection
            title="European Tracks"
            tracks={allTracks.europe}
            icon={<Globe className="h-6 w-6" />}
            color="text-cyan-400"
            delay={0.6}
          />

          <RegionSection
            title="Americas Tracks"
            tracks={allTracks.americas}
            icon={<Globe className="h-6 w-6" />}
            color="text-teal-400"
            delay={0.8}
          />

          <RegionSection
            title="Asia & Middle East Tracks"
            tracks={allTracks.asia_me}
            icon={<Globe className="h-6 w-6" />}
            color="text-cyan-500"
            delay={1.0}
          />
        </div>
      </div>
    </div>
  );
}