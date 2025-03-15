'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Grid, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveLine } from '@nivo/line';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveRadar } from '@nivo/radar';

const defaultBarData = [{ driver: 'hxrry27', wins: 5 }];
const defaultLineData = [{ id: 'Position', data: [{ x: 1, y: 1 }] }];
const defaultPieData = [{ id: 'Wins', value: 10 }, { id: 'Podiums', value: 19 }, { id: 'DNFs', value: 0 }];
const defaultRadarData = [{ race: 'Bahrain', value: 8 }];
const defaultDropOffData = [{ id: 'Soft-1', data: [{ x: 1, y: 90 }] }];
const defaultAreaData = [{ id: 'hxrry27', data: [{ x: 1, y: 10 }] }];
const defaultTyreData = [{ driver: 'hxrry27', compound: 'Soft', startLap: 1, endLap: 10 }];

const compoundColors = {
  'Soft': '#ff4444',
  'Medium': '#ffff00',
  'Hard': '#ffffff',
  'Intermediate': '#00cc00',
  'Wet': '#00b7eb',
};

export default function DashboardClient({ user }) {
  const [dashboardData, setDashboardData] = useState({
    barData: defaultBarData,
    lineData: defaultLineData,
    pieData: defaultPieData,
    radarData: defaultRadarData,
    dropOffData: defaultDropOffData,
    areaData: defaultAreaData,
    tyreData: defaultTyreData,
    season: '10',
  });
  const [allTyreData, setAllTyreData] = useState(defaultTyreData);
  const [drivers, setDrivers] = useState([]);
  const [races, setRaces] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedRace, setSelectedRace] = useState('');

  useEffect(() => {
    if (!drivers.length || !races.length) {
      fetchDriversAndRaces();
      fetchAllTyreData();
    }
  }, []);

  useEffect(() => {
    if (drivers.length && races.length) {
      const isDriver = drivers.includes(user.username);
      const defaultDriver = isDriver ? user.username : drivers[0] || 'hxrry27';
      const defaultRace = races[races.length - 1]?.slug || '';
      setSelectedDriver(defaultDriver);
      setSelectedRace(defaultRace);
      fetchDashboardData(defaultDriver, defaultRace);
    }
  }, [drivers, races]);

  const fetchDriversAndRaces = async () => {
    try {
      const response = await fetch('/api/dashboard-stats?allDrivers=true', { credentials: 'include' });
      const data = await response.json();
      console.log('Full API response:', data);
      if (response.ok) {
        if (data.seasonDrivers) {
          setDrivers(data.seasonDrivers);
          console.log('Setting drivers:', data.seasonDrivers);
        }
        if (data.races) {
          setRaces(data.races);
          console.log('Setting races:', data.races);
        }
      }
    } catch (error) {
      console.error('Error fetching drivers and races:', error);
    }
  };

  const fetchDashboardData = async (driver, raceSlug) => {
    try {
      const url = raceSlug
        ? `/api/dashboard-stats?username=${encodeURIComponent(driver)}&raceSlug=${encodeURIComponent(raceSlug)}`
        : `/api/dashboard-stats?username=${encodeURIComponent(driver)}`;
      const response = await fetch(url, { credentials: 'include' });
      const data = await response.json();
      console.log('Dashboard data:', data);
      if (response.ok) {
        const allDropOffPoints = data.dropOffData.flatMap(stint => stint.data.map(d => d.y));
        const avgLapTime = allDropOffPoints.reduce((sum, val) => sum + val, 0) / allDropOffPoints.length || 90;
        const yMin = avgLapTime - 40; // Kept for filtering outliers
        const yMax = avgLapTime + 40; // Kept for filtering outliers

        const filteredDropOffData = data.dropOffData.map(stint => ({
          ...stint,
          data: stint.data
            .filter((point, idx, arr) => idx !== arr.length - 1 || point.x !== Math.max(...data.tyreData.map(t => t.endLap)))
            .filter(point => point.y >= yMin && point.y <= yMax),
        }));

        const newDashboardData = {
          barData: data.barData.length ? data.barData : defaultBarData,
          lineData: data.lineData[0].data.length ? data.lineData : defaultLineData,
          pieData: data.pieData.some(d => d.value > 0) ? data.pieData : defaultPieData,
          radarData: data.radarData.length ? data.radarData : defaultRadarData,
          dropOffData: filteredDropOffData.length ? filteredDropOffData : defaultDropOffData,
          areaData: data.areaData[0].data.length ? data.areaData : defaultAreaData,
          tyreData: data.tyreData.length ? data.tyreData : defaultTyreData,
          season: data.season || '10',
        };
        setDashboardData(newDashboardData);
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    }
  };

  const fetchAllTyreData = async () => {
    try {
      const response = await fetch(`/api/dashboard-stats?allDrivers=true${selectedRace ? `&raceSlug=${encodeURIComponent(selectedRace)}` : ''}`, { credentials: 'include' });
      const data = await response.json();
      console.log('All tyre data response:', data);
      if (response.ok && data.tyreData) {
        setAllTyreData(data.tyreData);
      }
    } catch (error) {
      console.error('All tyre fetch error:', error);
    }
  };

  const handleDriverChange = (event) => {
    const newDriver = event.target.value;
    setSelectedDriver(newDriver);
    fetchDashboardData(newDriver, selectedRace);
  };

  const handleRaceChange = (event) => {
    const newRace = event.target.value;
    setSelectedRace(newRace);
    fetchDashboardData(selectedDriver, newRace);
    fetchAllTyreData();
  };

  const totalLaps = Math.max(...allTyreData.map(stint => stint.endLap), 27);
  const barData = Array.from(new Map(allTyreData.map(stint => [stint.driver, stint])).keys()).map(driver => ({
    driver,
    ...Object.fromEntries(
      allTyreData.filter(stint => stint.driver === driver).map(stint => [stint.compound, stint.endLap - stint.startLap + 1])
    ),
  }));
  const barKeys = Array.from(new Set(allTyreData.map(stint => stint.compound)));

  // Dynamic y-axis scaling for Tyre Drop-Off
  const dropOffPoints = dashboardData.dropOffData.flatMap(stint => stint.data.map(d => d.y));
  const minLapTime = dropOffPoints.length ? Math.min(...dropOffPoints) : 80; // Default min if no data
  const maxLapTime = dropOffPoints.length ? Math.max(...dropOffPoints) : 120; // Default max if no data
  const yPadding = 5; // Padding in seconds
  const yScaleMin = minLapTime - yPadding;
  const yScaleMax = maxLapTime + yPadding;

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#fff', backgroundColor: '#0a0e27', p: 4 }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>{user.username}'s Dashboard - Season {dashboardData.season}</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel sx={{ color: '#fff' }}>Select Driver</InputLabel>
          <Select value={selectedDriver} onChange={handleDriverChange} label="Select Driver" sx={{ color: '#fff', backgroundColor: '#1a1f3b', '& .MuiSvgIcon-root': { color: '#fff' } }}>
            {drivers.map(driver => (
              <MenuItem key={driver} value={driver}>{driver}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel sx={{ color: '#fff' }}>Select Race</InputLabel>
          <Select value={selectedRace} onChange={handleRaceChange} label="Select Race" sx={{ color: '#fff', backgroundColor: '#1a1f3b', '& .MuiSvgIcon-root': { color: '#fff' } }}>
            {races.map(race => (
              <MenuItem key={race.slug} value={race.slug}>
                {`${race.name} (${race.slug.replace(/-/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')})`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Grid container spacing={4} sx={{ maxWidth: '100vw' }}>
        <Grid item xs={12} md={4}>
          <Box sx={{ height: '40vh', border: '1px solid #444', borderRadius: 1, py: 2, pb: 6, px: 2, backgroundColor: '#0a0e27' }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#fff' }}>Season Stats</Typography>
            <ResponsivePie
              data={dashboardData.pieData}
              margin={{ top: 20, right: 80, bottom: 80, left: 80 }}
              innerRadius={0.5}
              padAngle={0.7}
              cornerRadius={3}
              colors={['#ff4444', '#ffff00', '#00b7eb']}
              arcLinkLabelsTextColor="#fff"
              arcLinkLabelsThickness={2}
              arcLinkLabelsColor={{ from: 'color' }}
              theme={{ labels: { text: { fill: '#fff' } }, tooltip: { container: { background: '#fff', color: '#000' } } }}
            />
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box sx={{ height: '40vh', border: '1px solid #444', borderRadius: 1, py: 2, pb: 6, px: 2, backgroundColor: '#0a0e27' }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#fff' }}>Driver Performance</Typography>
            <ResponsiveLine
              data={dashboardData.lineData}
              margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
              xScale={{ type: 'linear' }}
              yScale={{ type: 'linear', min: 1, max: 'auto', reverse: true }}
              axisBottom={{ legend: 'Race Number', legendOffset: 36 }}
              axisLeft={{ legend: 'Position', legendOffset: -40 }}
              colors={['#00b7eb']}
              pointSize={10}
              theme={{ axis: { ticks: { text: { fill: '#fff' } }, legend: { text: { fill: '#fff' } } }, tooltip: { container: { background: '#fff', color: '#000' } } }}
            />
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box sx={{ height: '40vh', border: '1px solid #444', borderRadius: 1, py: 2, pb: 6, px: 2, backgroundColor: '#0a0e27' }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#fff' }}>Race Strategies</Typography>
            <ResponsiveBar
              data={barData}
              keys={barKeys}
              indexBy="driver"
              layout="horizontal"
              margin={{ top: 20, right: 20, bottom: 50, left: 100 }}
              padding={0.3}
              innerPadding={2}
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={({ id }) => compoundColors[id] || '#888'}
              axisBottom={{ legend: 'Laps', legendOffset: 36 }}
              axisLeft={{ legend: 'Driver', legendOffset: -80 }}
              enableLabel={false}
              theme={{ axis: { ticks: { text: { fill: '#fff' } }, legend: { text: { fill: '#fff' } } }, tooltip: { container: { background: '#fff', color: '#000' } } }}
            />
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box sx={{ height: '40vh', border: '1px solid #444', borderRadius: 1, py: 2, pb: 6, px: 2, backgroundColor: '#0a0e27' }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#fff' }}>Driver Consistency (Last 5 Races)</Typography>
            <ResponsiveRadar
              data={dashboardData.radarData}
              keys={['value']}
              indexBy="race"
              margin={{ top: 50, right: 80, bottom: 50, left: 80 }}
              colors={['#00cc00']}
              maxValue={10}
              gridLabelOffset={36}
              dotSize={10}
              dotColor={{ theme: 'background' }}
              dotBorderWidth={2}
              theme={{ textColor: '#fff', tooltip: { container: { background: '#fff', color: '#000' } } }}
            />
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box sx={{ height: '40vh', border: '1px solid #444', borderRadius: 1, py: 2, pb: 6, px: 2, backgroundColor: '#0a0e27' }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#fff' }}>Tyre Drop-Off</Typography>
            <ResponsiveLine
              data={dashboardData.dropOffData}
              margin={{ top: 20, right: 80, bottom: 50, left: 60 }}
              xScale={{ type: 'linear', min: 1, max: 'auto' }}
              yScale={{ type: 'linear', min: yScaleMin, max: yScaleMax }} // Dynamic scaling
              axisBottom={{ legend: 'Lap Number', legendOffset: 36 }}
              axisLeft={{ legend: 'Lap Time (sec)', legendOffset: -40 }}
              colors={['#ff4444', '#ffff00', '#ffffff', '#00cc00', '#00b7eb']}
              pointSize={8}
              pointColor={{ theme: 'background' }}
              pointBorderWidth={2}
              pointBorderColor={{ from: 'serieColor' }}
              enableArea={false}
              theme={{ axis: { ticks: { text: { fill: '#fff' } }, legend: { text: { fill: '#fff' } } }, tooltip: { container: { background: '#fff', color: '#000' } } }}
            />
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box sx={{ height: '40vh', border: '1px solid #444', borderRadius: 1, py: 2, pb: 6, px: 2, backgroundColor: '#0a0e27' }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#fff' }}>Points Progression</Typography>
            <ResponsiveLine
              data={dashboardData.areaData}
              margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
              xScale={{ type: 'linear' }}
              yScale={{ type: 'linear', min: 0, max: 'auto' }}
              enableArea={true}
              axisBottom={{ legend: 'Race Round', legendOffset: 36 }}
              axisLeft={{ legend: 'Points', legendOffset: -40 }}
              colors={['#ff4444']}
              theme={{ axis: { ticks: { text: { fill: '#fff' } }, legend: { text: { fill: '#fff' } } }, tooltip: { container: { background: '#fff', color: '#000' } } }}
            />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}