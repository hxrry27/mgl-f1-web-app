'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Cookies from 'js-cookie';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from 'lucide-react';

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

export default function SchedulePage() {
  const [schedule, setSchedule] = useState([]);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [editing, setEditing] = useState(null);
  const [newDateTime, setNewDateTime] = useState('');
  const user = Cookies.get('user') ? JSON.parse(Cookies.get('user')) : null;
  const isAdmin = user?.username === 'hxrry27' && user?.is_admin;

  useEffect(() => {
    fetch('/api/schedule')
      .then(res => res.json())
      .then(data => {
        console.log('Schedule Page Data:', data);
        setSchedule(data.schedule || []);
        setCurrentSeason(data.schedule[0]?.season || 'Unknown');
      });
  }, []);

  const handleEdit = (id, currentDate, currentTime) => {
    setEditing(id);
    setNewDateTime(`${currentDate}T${currentTime.slice(0, 5)}`);
  };

  const handleSave = async (id) => {
    const [date, time] = newDateTime.split('T');
    await fetch('/api/schedule/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, date, time }),
    });
    setSchedule(schedule.map(item => item.id === id ? { ...item, date, time } : item));
    setEditing(null);
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-gray-900/30 min-h-screen">
      <div className="flex justify-center mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <Calendar className="h-7 w-7 text-blue-500" />
          Season {currentSeason} Race Schedule
        </h1>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {schedule.map((race) => (
          <Card 
            key={race.id}
            className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden hover:bg-gray-900/80 transition-colors"
          >
            <div className="p-4">
              <h3 className="text-lg font-semibold text-white mb-2">
                {race.track.charAt(0).toUpperCase() + race.track.slice(1).replace(/-/g, ' ')}
              </h3>
              
              <div className="relative h-32 w-full mb-3">
                <Image
                  src={`/images/tracks/${race.track}.png`}
                  alt={`${race.track} Track Map`}
                  fill
                  style={{ objectFit: 'contain' }}
                />
              </div>
              
              {editing === race.id && isAdmin ? (
                <div className="space-y-2">
                  <Input
                    type="datetime-local"
                    value={newDateTime}
                    onChange={(e) => setNewDateTime(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                  <Button 
                    onClick={() => handleSave(race.id)} 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Save
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-gray-200">
                    {formatRaceDateTime(race.date, race.time)}
                  </span>
                  {isAdmin && (
                    <Button 
                      onClick={() => handleEdit(race.id, race.date, race.time)} 
                      size="sm" 
                      variant="ghost" 
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Edit
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}