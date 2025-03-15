// src/app/drivers/lineups/page.jsx
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import pool from '@/lib/db';
import ClientSeasonSelector from './ClientSeasonSelector';
import { teamColors, lightTeams } from '@/lib/data';

async function getLineupsForSeason(season) {
  try {
    const res = await pool.query(
      'SELECT d.name AS driver, t.name AS team ' +
      'FROM lineups l ' +
      'JOIN drivers d ON l.driver_id = d.id ' +
      'JOIN teams t ON l.team_id = t.id ' +
      'JOIN seasons s ON l.season_id = s.id ' +
      'WHERE s.season = $1 ' +
      'ORDER BY t.name, d.name',
      [season]
    );

    const teamMap = {};
    res.rows.forEach(({ driver, team }) => {
      if (!teamMap[team]) {
        teamMap[team] = { team, driver1: null, driver2: null };
      }
      if (!teamMap[team].driver1) {
        teamMap[team].driver1 = driver;
      } else if (!teamMap[team].driver2) {
        teamMap[team].driver2 = driver;
      } else {
        console.warn(`More than 2 drivers for ${team} in Season ${season}: ${driver}`);
      }
    });

    return Object.values(teamMap).sort((a, b) => a.team.localeCompare(b.team));
  } catch (error) {
    console.error('Error fetching lineups:', error);
    return [];
  }
}

async function getSeasons() {
  try {
    const res = await pool.query('SELECT season FROM seasons ORDER BY CAST(season AS INTEGER) DESC');
    return res.rows.map(row => row.season);
  } catch (error) {
    console.error('Error fetching seasons:', error);
    return [];
  }
}

export default async function DriversLineupsPage({ searchParams }) {
  const seasons = await getSeasons();
  const defaultSeason = seasons[0] || '11'; // Latest season
  const season = searchParams.season || defaultSeason;
  const lineups = await getLineupsForSeason(season);

  return (
    <Box sx={{ pt: 15, pl: 0, pr: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'white' }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>
        Driver Lineups
      </Typography>
      <ClientSeasonSelector seasons={seasons} defaultSeason={season} />
      <Box sx={{ border: '1px solid #444', borderRadius: 1, width: 'fit-content', maxWidth: '100%', overflow: 'hidden' }}>
        <Table sx={{ color: 'white', tableLayout: 'fixed', width: '800px', backgroundColor: '#0a0e27' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'white', borderColor: '#444', fontWeight: 'bold', width: '200px' }}>Team</TableCell>
              <TableCell sx={{ color: 'white', borderColor: '#444', fontWeight: 'bold', width: '200px' }}>Driver 1</TableCell>
              <TableCell sx={{ color: 'white', borderColor: '#444', fontWeight: 'bold', width: '200px' }}>Driver 2</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lineups.map((row, index) => (
              <TableRow key={index} sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' } }}>
                <TableCell sx={{ color: 'white', borderColor: '#444' }}>
                  <Box
                    sx={{
                      backgroundColor: teamColors[row.team] || '#444',
                      color: lightTeams.includes(row.team) ? 'black' : 'white',
                      p: 0.5,
                      borderRadius: 1,
                      display: 'inline-block',
                    }}
                  >
                    {row.team}
                  </Box>
                </TableCell>
                <TableCell sx={{ color: 'white', borderColor: '#444' }}>{row.driver1 || 'N/A'}</TableCell>
                <TableCell sx={{ color: 'white', borderColor: '#444' }}>{row.driver2 || 'N/A'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}

export const dynamic = 'force-dynamic'; // Ensure fresh data