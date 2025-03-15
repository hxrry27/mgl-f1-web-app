// src/app/drivers/[driver]/page.jsx
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Grid } from '@mui/material';
import pool from '@/lib/db';
import { teamColors, lightTeams } from '@/lib/data';

const pointsSystem = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

const normalizeDriverName = (name) => {
  return typeof name === 'string' ? name.trim().toLowerCase().replace(/\s+/g, '-') : '';
};

export default async function DriverPage({ params }) {
  const { driver } = await params;
  const driverGamertag = driver.trim();

  const driverRes = await pool.query('SELECT name, id FROM drivers WHERE LOWER(name) = LOWER($1)', [driverGamertag.replace(/-/g, ' ')]);
  const driverData = driverRes.rows[0];
  if (!driverData) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>
        <Typography variant="body1" sx={{ color: 'white' }}>Driver not found.</Typography>
      </Box>
    );
  }
  const { name: driverName, id: driverId } = driverData;

  //console.log(`Driver ${driverName} loaded, fetching stats...`);

  // Season-by-season stats (S6+)
  const seasonStatsRes = await pool.query(
    'SELECT s.season, STRING_AGG(t.name, \'/\') AS teams, st.points ' +
    'FROM seasons s ' +
    'LEFT JOIN lineups l ON l.season_id = s.id AND l.driver_id = $1 ' +
    'LEFT JOIN teams t ON l.team_id = t.id ' +
    'LEFT JOIN standings st ON st.season_id = s.id AND st.driver_id = $1 AND st.type = $2 ' +
    'WHERE CAST(s.season AS INTEGER) >= 6 ' +
    'GROUP BY s.season, st.points ' +
    'ORDER BY s.season DESC',
    [driverId, 'drivers']
  );

  const driverStats = {
    seasons: {},
    career: { races: 0, wins: 0, podiums: 0, poles: 0, fastestLaps: 0, points: 0 },
  };

  seasonStatsRes.rows.forEach((row) => {
    driverStats.seasons[row.season] = {
      team: row.teams || "Didn't Race",
      points: row.points !== null ? row.points : 'Unavailable',
    };
    if (row.points !== null) driverStats.career.points += parseInt(row.points, 10) || 0;
  });

  // Fetch race results for career stats (S6+)
  const raceStatsRes = await pool.query(
    'SELECT ' +
    '  rr.race_id, ' +
    '  rr.position, ' +
    '  rr.adjusted_position, ' +
    '  rr.grid_position, ' +
    '  rr.fastest_lap_time_int, ' +
    '  rr.status, ' +
    '  s.season ' +
    'FROM race_results rr ' +
    'JOIN races r ON rr.race_id = r.id ' +
    'JOIN seasons s ON r.season_id = s.id ' +
    'WHERE rr.driver_id = $1 ' +
    'AND CAST(s.season AS INTEGER) >= 6',
    [driverId]
  );
  const raceResults = raceStatsRes.rows;

  // Fetch all race results with fastest laps logic (S6+)
  const allRaceResultsRes = await pool.query(
    'SELECT ' +
    '  rr.race_id, ' +
    '  rr.driver_id, ' +
    '  rr.fastest_lap_time_int, ' +
    '  s.season, ' +
    '  t.name AS track_name ' +
    'FROM race_results rr ' +
    'JOIN races r ON rr.race_id = r.id ' +
    'JOIN seasons s ON r.season_id = s.id ' +
    'JOIN tracks t ON r.track_id = t.id ' +
    'WHERE rr.fastest_lap_time_int > 0 ' +
    'AND rr.driver_id = $1 ' +
    'AND CAST(s.season AS INTEGER) >= 6 ' +
    'AND rr.fastest_lap_time_int = (' +
    '  SELECT MIN(rr2.fastest_lap_time_int) ' +
    '  FROM race_results rr2 ' +
    '  WHERE rr2.race_id = rr.race_id ' +
    '  AND rr2.fastest_lap_time_int > 0' +
    ') ' +
    'ORDER BY s.season DESC, rr.race_id',
    [driverId]
  );
  const fastestLapRaces = allRaceResultsRes.rows;

  // Process career stats (all from S6+)
  driverStats.career.races = raceResults.length; // Now only S6+
  raceResults.forEach(row => {
    const effectivePosition = row.adjusted_position !== null ? row.adjusted_position : row.position;
    if (effectivePosition === 1) driverStats.career.wins += 1;
    if (effectivePosition <= 3) driverStats.career.podiums += 1;
    if (row.grid_position === 1) driverStats.career.poles += 1;
  });
  driverStats.career.fastestLaps = fastestLapRaces.length; // Now only S6+

  // // Debug logging
  // console.log('Hxrry27 Fastest Lap Races:', fastestLapRaces.map(r => ({
  //   race_id: r.race_id,
  //   season: r.season,
  //   track_name: r.track_name,
  //   fastest_lap_time_int: r.fastest_lap_time_int,
  // })));
  // console.log('Hxrry27 Race Results (for races count):', raceResults.map(r => ({
  //   race_id: r.race_id,
  //   season: r.season,
  //   position: r.position,
  // })));
  // console.log('Driver Stats:', driverStats);

  // Calculate Stats by Season height
  const seasonCount = Object.keys(driverStats.seasons).length;
  const statsBySeasonHeight = 64 + (seasonCount * 48);

  return (
    <Box sx={{ p: 2, width: '100%', mx: 'auto' }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'white', textAlign: 'center', fontWeight: 'bold', mb: 4 }}>
        {driverName}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={3}></Grid>
        <Grid item xs={3}>
          <Box sx={{ border: '1px solid #444', borderRadius: 1, p: 2, backgroundColor: '#0a0e27', minHeight: statsBySeasonHeight }}>
            <Typography variant="h6" sx={{ color: 'white' }}>Career Stats</Typography>
            <Typography variant="subtitle2" sx={{ color: 'grey', fontStyle: 'italic', mb: 1 }}>these run from S6 onwards</Typography>
            <Table sx={{ color: 'white', tableLayout: 'fixed', width: '100%' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'white', borderColor: '#444', width: '25%', fontWeight: 'bold' }}>Season</TableCell>
                  <TableCell sx={{ color: 'white', borderColor: '#444', width: '50%', fontWeight: 'bold' }}>Team</TableCell>
                  <TableCell sx={{ color: 'white', borderColor: '#444', width: '25%', fontWeight: 'bold' }}>Points</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(driverStats.seasons).map(([season, stats]) => (
                  <TableRow key={season}>
                    <TableCell sx={{ color: 'white', borderColor: '#444' }}>{season}</TableCell>
                    <TableCell sx={{ color: 'white', borderColor: '#444' }}>
                      {stats.team.split('/').map((team, index) => (
                        <Box
                          key={index}
                          sx={{
                            backgroundColor: team === "Didn't Race" ? '#444' : teamColors[team] || '#444',
                            p: 0.5,
                            borderRadius: 1,
                            display: 'inline-block',
                            color: team === "Didn't Race" ? '#888' : (lightTeams.includes(team) ? 'black' : 'white'),
                            fontStyle: team === "Didn't Race" ? 'italic' : 'normal',
                            mr: stats.team.split('/').length > 1 && index < stats.team.split('/').length - 1 ? 0.5 : 0,
                            mb: 0.5,
                          }}
                        >
                          {team}
                        </Box>
                      ))}
                    </TableCell>
                    <TableCell sx={{ color: 'white', borderColor: '#444' }}>
                      {typeof stats.points === 'string' ? (
                        <Typography sx={{ color: '#888', fontStyle: 'italic' }}>{stats.points}</Typography>
                      ) : (
                        stats.points
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Grid>
        <Grid item xs={3}>
          <Box sx={{ border: '1px solid #444', borderRadius: 1, p: 2, backgroundColor: '#0a0e27', height: 385 }}>
            <Typography variant="h6" sx={{ color: 'white' }}>Career Stats</Typography>
            <Typography variant="subtitle2" sx={{ color: 'grey', fontStyle: 'italic', mb: 1 }}>these run from S6 onwards</Typography>
            <Grid container spacing={2}>
              {[
                { title: 'Career Races', value: driverStats.career.races },
                { title: 'Career Wins', value: driverStats.career.wins },
                { title: 'Career Podiums', value: driverStats.career.podiums },
                { title: 'Career Poles', value: driverStats.career.poles },
                { title: 'Career Fastest Laps', value: driverStats.career.fastestLaps },
                { title: 'Career Points', value: driverStats.career.points },
              ].map((stat, index) => (
                <Grid item xs={6} key={index}>
                  <Box
                    sx={{
                      border: '1px solid #444',
                      borderRadius: 1,
                      p: 1,
                      height: (statsBySeasonHeight - 64 - (2 * 16)) / 3,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      backgroundColor: '#1a1e37',
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ color: 'white', fontSize: '0.9rem' }}>{stat.title}</Typography>
                    <Typography sx={{ color: 'white' }}>{stat.value}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Grid>
        <Grid item xs={3}></Grid>
      </Grid>
    </Box>
  );
}

export const dynamic = 'force-dynamic';