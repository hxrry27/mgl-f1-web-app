// src/app/schedule/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Grid, TextField, Button } from '@mui/material';
import Image from 'next/image';
import Cookies from 'js-cookie';

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
    <Box sx={{ pl: { xs: 2, md: 80 }, pr: { xs: 2, md: 80 }, py: 2, color: 'white', textAlign: 'center'}}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>
        Season {currentSeason} Race Schedule
      </Typography>
      <Grid container spacing={3} justifyContent="center">
        {schedule.map((race) => (
          <Grid item xs={12} sm={6} md={4} key={race.id}>
            <Box
              sx={{
                border: '1px solid #444',
                borderRadius: 1,
                p: 2,
                backgroundColor: '#0a0e27',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
              }}
            >
              <Typography variant="h6" sx={{ mb: 1 }}>
                {race.track.charAt(0).toUpperCase() + race.track.slice(1).replace(/-/g, ' ')}
              </Typography>
              <Box sx={{ position: 'relative', height: { xs: 100, md: 150 }, width: '100%' }}>
                <Image
                  src={`/images/tracks/${race.track}.png`}
                  alt={`${race.track} Track Map`}
                  layout="fill"
                  objectFit="contain"
                />
              </Box>
              {editing === race.id && isAdmin ? (
                <>
                  <TextField
                    type="datetime-local"
                    value={newDateTime}
                    onChange={(e) => setNewDateTime(e.target.value)}
                    sx={{ mt: 1, input: { color: 'white' }, label: { color: 'white' }, width: '100%' }}
                  />
                  <Button onClick={() => handleSave(race.id)} sx={{ mt: 1, backgroundColor: '#00A0F0' }}>
                    Save
                  </Button>
                </>
              ) : (
                <Typography sx={{ mt: 1, color: 'white' }}>
                  {formatRaceDateTime(race.date, race.time)}
                  {isAdmin && (
                    <Button onClick={() => handleEdit(race.id, race.date, race.time)} sx={{ ml: 1, color: '#00A0F0' }}>
                      Edit
                    </Button>
                  )}
                </Typography>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}