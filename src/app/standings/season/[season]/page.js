// src/app/standings/season/[season]/page.jsx
'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Tabs, Tab } from '@mui/material';
import { seasons, teams } from '@/lib/data';

const teamColors = {
  'Williams': '#00A0F0',
  'Renault': '#FFF500',
  'McLaren': '#FF8700',
  'Haas': '#FFFFFF',
  'Alfa Romeo': '#900000',
  'Alpha Tauri': '#2B4562',
  'Aston Martin': '#006F62',
  'Alpine': '#2293D1',
  'Mercedes': '#00D2BE',
  'Ferrari': '#DC0000',
  'Red Bull': '#1E41FF',
  'Racing Point': '#F596C8',
  'Toro Rosso': '#0000FF',
};

const lightTeams = ['Haas', 'Mercedes', 'Renault'];

export default function SeasonStandingsPage() {
  const params = useParams();
  const season = params.season;

  const [tabValue, setTabValue] = useState(0);

  const calculateOverallStandings = () => {
    const driverPoints = {};
    const constructorPoints = {};

    Object.values(seasons).forEach((seasonData) => {
      // Handle driver points and teams from standings and lineups
      if (seasonData.standings && Array.isArray(seasonData.standings.drivers)) {
        seasonData.standings.drivers.forEach(({ driver, points }) => {
          if (!driverPoints[driver]) {
            driverPoints[driver] = { points: 0, teams: new Set() };
          }
          driverPoints[driver].points += points || 0;
        });
      }

      // Add teams from lineups if available
      if (seasonData.lineups && typeof seasonData.lineups === 'object') {
        Object.entries(seasonData.lineups).forEach(([driver, teamString]) => {
          if (!driverPoints[driver]) {
            driverPoints[driver] = { points: 0, teams: new Set() };
          }
          teamString.split('/').filter(Boolean).forEach((team) => {
            driverPoints[driver].teams.add(team);
          });
        });
      }

      // Handle constructor points
      if (seasonData.standings && Array.isArray(seasonData.standings.constructors)) {
        seasonData.standings.constructors.forEach(({ constructor, points }) => {
          constructorPoints[constructor] = (constructorPoints[constructor] || 0) + (points || 0);
        });
      }
    });

    const overallDrivers = Object.entries(driverPoints)
      .map(([driver, { points, teams }]) => ({
        driver,
        points,
        teams: Array.from(teams),
      }))
      .sort((a, b) => b.points - a.points)
      .map((driver, index) => ({
        ...driver,
        position: `P${index + 1}`,
      }));

    const overallConstructors = Object.entries(constructorPoints)
      .map(([constructor, points]) => ({
        constructor,
        points,
      }))
      .sort((a, b) => b.points - a.points)
      .map((constructor, index) => ({
        ...constructor,
        position: `P${index + 1}`,
      }));

    return { drivers: overallDrivers, constructors: overallConstructors };
  };

  const isOverall = season.toLowerCase() === 'overall';
  console.log('Season:', season, 'Is Overall:', isOverall);
  const rawSeasonData = isOverall ? calculateOverallStandings() : (seasons[season] || seasons[parseInt(season)] || {});
  const seasonData = isOverall ? rawSeasonData : (rawSeasonData.standings || { drivers: [], constructors: [] });
  console.log('Season Data:', seasonData);
  const { drivers, constructors } = seasonData;

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        p: 2,
      }}
    >
      <Typography variant="h4" gutterBottom>
        {isOverall ? 'Overall Standings' : `Season ${season} Standings`}
      </Typography>

      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        sx={{
          mb: 2,
          '& .MuiTabs-indicator': { backgroundColor: '#00A0F0' },
          '& .MuiTab-root': { color: 'white', fontWeight: 'bold' },
          '& .Mui-selected': { color: '#00A0F0' },
        }}
      >
        <Tab label="Drivers" />
        <Tab label="Constructors" />
      </Tabs>

      <Box
        sx={{
          border: '1px solid #444',
          p: 1,
          borderRadius: 1,
          width: 'fit-content',
          maxWidth: '100%',
        }}
      >
        {tabValue === 0 && (
          <>
            <Table sx={{ color: 'white', tableLayout: 'fixed' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'white', borderColor: '#444', width: '60px' }}>Position</TableCell>
                  <TableCell sx={{ color: 'white', borderColor: '#444', width: '180px' }}>Gamertag</TableCell>
                  <TableCell sx={{ color: 'white', borderColor: '#444', width: '200px' }}>Team(s)</TableCell>
                  <TableCell sx={{ color: 'white', borderColor: '#444', width: '100px' }}>Points</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {drivers.map((driver, index) => {
                  const teamList = isOverall
                    ? driver.teams
                    : (rawSeasonData.lineups && rawSeasonData.lineups[driver.driver]
                      ? rawSeasonData.lineups[driver.driver].split('/').filter(Boolean)
                      : driver.team.split('/').filter(Boolean));

                  return (
                    <TableRow key={index}>
                      <TableCell sx={{ color: 'white', borderColor: '#444' }}>{driver.position}</TableCell>
                      <TableCell sx={{ color: 'white', borderColor: '#444' }}>{driver.driver}</TableCell>
                      <TableCell sx={{ color: 'white', borderColor: '#444' }}>
                        {teamList.map((team, idx) => (
                          <Box
                            key={idx}
                            sx={{
                              backgroundColor: teamColors[team] || '#444',
                              color: lightTeams.includes(team) ? 'black' : 'white',
                              p: 0.5,
                              borderRadius: 1,
                              display: 'inline-block',
                              mr: teamList.length > 1 && idx < teamList.length - 1 ? 0.5 : 0,
                              mb: 0.5,
                            }}
                          >
                            {team}
                          </Box>
                        ))}
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: '#444' }}>{driver.points || 'Unavailable'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}

        {tabValue === 1 && (
          <>
            <Table sx={{ color: 'white', tableLayout: 'fixed' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'white', borderColor: '#444', width: '60px' }}>Position</TableCell>
                  <TableCell sx={{ color: 'white', borderColor: '#444', width: '180px' }}>Constructor</TableCell>
                  <TableCell sx={{ color: 'white', borderColor: '#444', width: '100px' }}>Points</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {constructors.map((constructor, index) => (
                  <TableRow key={index}>
                    <TableCell sx={{ color: 'white', borderColor: '#444' }}>{constructor.position}</TableCell>
                    <TableCell sx={{ color: 'white', borderColor: '#444' }}>
                      <Box
                        sx={{
                          backgroundColor: teamColors[constructor.constructor] || '#444',
                          color: lightTeams.includes(constructor.constructor) ? 'black' : 'white',
                          p: 0.5,
                          borderRadius: 1,
                          display: 'inline-block',
                        }}
                      >
                        {constructor.constructor}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: 'white', borderColor: '#444' }}>{constructor.points || 'Unavailable'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </Box>
    </Box>
  );
}