'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronRight, Trophy, Car, MapPin } from 'lucide-react';
import { trackData } from '@/lib/data';

function isBST(date) {
  const year = date.getUTCFullYear();
  // Last Sunday of March
  const marchLastSunday = new Date(Date.UTC(year, 2, 31 - ((new Date(year, 2, 31).getUTCDay() + 7) % 7), 2));
  // Last Saturday (day before)
  const marchLastSaturday = new Date(marchLastSunday);
  marchLastSaturday.setUTCDate(marchLastSunday.getUTCDate() - 1);
  const octLastSunday = new Date(Date.UTC(year, 9, 31 - ((new Date(year, 9, 31).getUTCDay() + 7) % 7), 2));
  console.log('isBST Debug:', {
    date: date.toISOString(),
    marchLastSaturday: marchLastSaturday.toISOString(),
    octLastSunday: octLastSunday.toISOString(),
    isBST: date.getTime() >= marchLastSaturday.getTime() && date.getTime() < octLastSunday.getTime()
  });
  return date.getTime() >= marchLastSaturday.getTime() && date.getTime() < octLastSunday.getTime();
}

function formatRaceDateTime(isoDate, time) {
  try {
    const dateParts = isoDate.split('-');
    const date = new Date(Date.UTC(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10)));
    if (isNaN(date.getTime())) throw new Error('Invalid Date');

    const [hours, minutes] = (time || '19:00:00').split(':');
    let utcHours = parseInt(hours, 10);
    date.setUTCHours(utcHours, parseInt(minutes, 10), 0, 0);

    // Adjust for BST to keep UK local time consistent
    if (isBST(date)) utcHours -= 1;
    date.setUTCHours(utcHours, parseInt(minutes, 10), 0, 0);

    const userTime = date.toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    const day = date.getUTCDate();
    const month = date.toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' });
    const year = date.getUTCFullYear();
    const ordinal = (d) => {
      if (d > 3 && d < 21) return 'th';
      switch (d % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };

    return `${day}${ordinal(day)} ${month} ${year} - ${userTime}`;
  } catch (error) {
    console.error('Date Format Error:', error, { isoDate, time });
    return 'TBD';
  }
}

// Map slugs to full track names
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
  'catalunya': 'Circuit de Barcelona-Catalunya',
  'red-bull-ring': 'Red Bull Ring',
  'silverstone': 'Silverstone Circuit',
  'hungaroring': 'Hungaroring',
  'spa': 'Circuit de Spa-Francorchamps',
  'zandvoort': 'Circuit Zandvoort',
  'monza': 'Autodromo Nazionale Monza',
  'marina-bay': 'Marina Bay Street Circuit',
  'austin': 'Circuit of The Americas',
  'mexico': 'Autodromo Hermanos Rodriguez',
  'interlagos': 'Autodromo Jose Carlos Pace',
  'las-vegas': 'Las Vegas Strip Circuit',
  'lusail': 'Lusail International Circuit',
  'portimao': 'Algarve International Circuit',
  'paul-ricard': 'Circuit Paul Ricard',
  'spielberg': 'Red Bull Ring',
  'barcelona': 'Circuit de Barcelona-Catalunya',
};

export default function HomePage() {
  const [nextRace, setNextRace] = useState({
    track: 'bahrain',
    season: '11',
    date: 'TBD',
    trackName: 'Bahrain International Circuit',
    country: 'BAHRAIN'
  });
  const [lastSeasonPodium, setLastSeasonPodium] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch the next race
        const nextRaceRes = await fetch('/api/schedule/next-race');
        const nextRaceData = await nextRaceRes.json();
        const track = nextRaceData.track || 'bahrain';
        const season = nextRaceData.season || '11';
        
        // Get track info
        const country = trackData[track]?.country || track.toUpperCase();
        const trackName = trackNames[track] || track.replace(/-/g, ' ');
        
        // Fetch schedule details for the race
        const scheduleRes = await fetch(`/api/schedule?season=${season}&track=${track}`);
        const scheduleData = await scheduleRes.json();
        console.log('Homepage Schedule Data:', scheduleData);
        
        // Format the date
        const formattedDate = scheduleData.date && scheduleData.date !== 'TBD'
          ? formatRaceDateTime(scheduleData.date, scheduleData.time)
          : 'TBD';
        
        // Set the next race info
        setNextRace({
          track: track,
          season: season,
          date: formattedDate,
          trackName: trackName,
          country: country
        });

        // Fetch last season's podium for this track
        const lastSeason = parseInt(season) - 1;
        const podiumRes = await fetch(`/api/results/${lastSeason}/${track}`);
        const podiumData = await podiumRes.json();
        setLastSeasonPodium(podiumData.slice(0, 3).map(row => row.driver) || []);
      } catch (err) {
        console.error('Fetch error:', err);
        // Fallback to default values
        setNextRace({
          track: 'bahrain',
          season: '11',
          date: 'TBD',
          trackName: 'Bahrain International Circuit',
          country: 'BAHRAIN'
        });
        setLastSeasonPodium([]);
      }
    };
    
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 bg-opacity-90 flex justify-center items-center px-4">
      <div className="container flex flex-col md:flex-row justify-between items-center max-w-6xl gap-8 py-12">
        {/* Left content */}
        <div className="w-full md:w-1/2 space-y-6">
          <div className="space-y-2">
            <h1 className="text-5xl font-bold text-white">
              MGL<span className="text-blue-500">F1</span>
            </h1>
            <h2 className="text-xl text-gray-300">
              Speed, Performance, Trophies. Something none of us really see.
            </h2>
          </div>
          
          <p className="text-gray-400">
            A work in progress site, to track all our stats, seasons, and shitbox performances over the last 4 years in the F1 series of games by C*demasters and EASp*rts
          </p>
          
          <div className="flex gap-4">
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href="/standings/season/11">
                <span className="flex items-center gap-2">
                  Current Season <ChevronRight className="h-4 w-4" />
                </span>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="border-gray-700 hover:bg-gray-800">
              <Link href="/dashboard">
                <span className="flex items-center gap-2">
                  <Car className="h-4 w-4" /> Dashboard
                </span>
              </Link>
            </Button>
          </div>
        </div>
        
        {/* Right content - Next Race Card */}
        <Link 
          href={`/tracks/${nextRace.track}`} 
          className="w-full md:w-1/2 block no-underline"
        >
          <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden transform transition-transform hover:scale-[1.02] hover:border-blue-500/50">
            <CardHeader className="pb-2 space-y-1">
              <div className="flex justify-between items-start">
                <Badge className="bg-blue-600 text-white mb-2">Next Race</Badge>
                <Badge className="bg-gray-800 text-gray-300">Season {nextRace.season}</Badge>
              </div>
              <CardTitle className="flex items-center gap-2 text-xl text-white">
                <MapPin className="h-5 w-5 text-blue-500" />
                {nextRace.country} - {nextRace.trackName}
              </CardTitle>
              <div className="flex items-center text-gray-400 text-sm">
                <Calendar className="h-4 w-4 mr-1" />
                {nextRace.date}
              </div>
            </CardHeader>
            
            <div className="relative w-full h-64">
              <Image 
                src={`/images/tracks/${nextRace.track}.png`} 
                alt={`${nextRace.trackName} Track Map`} 
                fill
                style={{ objectFit: 'contain' }}
                onError={(e) => {
                  console.log(`${nextRace.track} track map not found`);
                  e.target.src = "/images/tracks/default.png";
                }} 
              />
            </div>
            
            <CardContent className="pt-4">
              <div className="space-y-2">
                <h3 className="flex items-center text-sm font-medium text-gray-300">
                  <Trophy className="h-4 w-4 mr-1 text-yellow-500" />
                  Last Season Podium (S{parseInt(nextRace.season) - 1}):
                </h3>
                {lastSeasonPodium.length > 0 ? (
                  <div className="space-y-1">
                    {lastSeasonPodium.map((driver, index) => (
                      <div key={index} className="flex items-center text-white">
                        <Badge className={`mr-2 w-6 h-6 flex items-center justify-center rounded-full 
                          ${index === 0 ? 'bg-yellow-500 text-black' : 
                            index === 1 ? 'bg-gray-300 text-black' : 
                              'bg-amber-700 text-white'}`}
                        >
                          {index + 1}
                        </Badge>
                        {driver}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No podium recorded for S{parseInt(nextRace.season) - 1}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}