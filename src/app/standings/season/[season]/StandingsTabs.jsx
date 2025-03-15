// src/app/standings/season/[season]/StandingsTabs.jsx
"use client";

import { useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Tabs, Tab } from '@mui/material';

export default function StandingsTabs({ season, isOverall, drivers, constructors, error, teamColors, lightTeams }) {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', pl: 80, pr: 80, overflowX: 'hidden' }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'white' }}>
        {isOverall ? 'Overall Standings' : `Season ${season} Standings`}
      </Typography>

      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        sx={{ mb: 2, '& .MuiTabs-indicator': { backgroundColor: '#00A0F0' }, '& .MuiTab-root': { color: 'white', fontWeight: 'bold' }, '& .Mui-selected': { color: '#00A0F0' } }}
      >
        <Tab label="Drivers" />
        <Tab label="Constructors" />
      </Tabs>

      <Box sx={{ border: '1px solid #444', p: 1, borderRadius: 1, width: 'fit-content', maxWidth: '100%', overflowX: 'auto' }}>
        {error ? (
          <Typography sx={{ color: 'white' }}>{error}</Typography>
        ) : (
          <>
            <Table sx={{ color: 'white', tableLayout: 'fixed', display: tabValue === 0 ? 'table' : 'none' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'white', borderColor: '#444', width: '60px' }}>Position</TableCell>
                  <TableCell sx={{ color: 'white', borderColor: '#444', width: '180px' }}>Driver</TableCell>
                  <TableCell sx={{ color: 'white', borderColor: '#444', width: '200px' }}>Team(s)</TableCell>
                  <TableCell sx={{ color: 'white', borderColor: '#444', width: '100px' }}>Points</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {drivers.map((driver, index) => (
                  <TableRow key={index}>
                    <TableCell sx={{ color: 'white', borderColor: '#444' }}>{driver.position}</TableCell>
                    <TableCell sx={{ color: 'white', borderColor: '#444' }}>{driver.driver}</TableCell>
                    <TableCell sx={{ color: 'white', borderColor: '#444' }}>
                      {driver.teams.map((team, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            backgroundColor: teamColors[team] || '#444',
                            color: lightTeams.includes(team) ? 'black' : 'white',
                            p: 0.5,
                            borderRadius: 1,
                            display: 'inline-block',
                            mr: driver.teams.length > 1 && idx < driver.teams.length - 1 ? 0.5 : 0,
                            mb: 0.5,
                          }}
                        >
                          {team}
                        </Box>
                      ))}
                    </TableCell>
                    <TableCell sx={{ color: 'white', borderColor: '#444' }}>{driver.points || '0'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Table sx={{ color: 'white', tableLayout: 'fixed', display: tabValue === 1 ? 'table' : 'none' }}>
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
                    <TableCell sx={{ color: 'white', borderColor: '#444' }}>{constructor.points || '0'}</TableCell>
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