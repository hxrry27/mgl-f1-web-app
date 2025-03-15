import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Grid } from '@mui/material';
import pool from '@/lib/db';
import { teamColors, lightTeams } from '@/lib/data';

const normalizeTeamName = (name) => {
  return typeof name === 'string' ? name.trim().toLowerCase().replace(/\s+/g, '-') : '';
};

export default async function TeamPage({ params }) {
  const { team } = params;
  const teamName = team.trim().replace(/-/g, ' ');

  // Fetch team ID and basic info
  const teamRes = await pool.query('SELECT id, name FROM teams WHERE LOWER(name) = LOWER($1)', [teamName]);
  const teamData = teamRes.rows[0];
  if (!teamData) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>
        <Typography variant="body1" sx={{ color: 'white' }}>Team not found.</Typography>
      </Box>
    );
  }
  const { id: teamId, name: teamNameFormatted } = teamData;

  //console.log(`Team ${teamNameFormatted} loaded, fetching stats...`);

  // Season-by-season stats (S6+)
  const seasonStatsRes = await pool.query(
    'SELECT s.season, STRING_AGG(d.name, \', \') AS drivers, st.points ' +
    'FROM seasons s ' +
    'LEFT JOIN lineups l ON l.season_id = s.id AND l.team_id = $1 ' +
    'LEFT JOIN drivers d ON l.driver_id = d.id ' +
    'LEFT JOIN standings st ON st.season_id = s.id AND st.team_id = $1 AND st.type = $2 ' +
    'WHERE CAST(s.season AS INTEGER) >= 6 ' +
    'GROUP BY s.season, st.points ' +
    'ORDER BY s.season DESC',
    [teamId, 'constructors']
  );

  const teamStats = {
    seasons: {},
    career: { races: 0, wins: 0, podiums: 0, poles: 0, fastestLaps: 0, points: 0 },
  };

  seasonStatsRes.rows.forEach((row) => {
    teamStats.seasons[row.season] = {
      drivers: row.drivers || "No Drivers",
      points: row.points !== null ? row.points : 'Unavailable',
    };
    if (row.points !== null) teamStats.career.points += parseInt(row.points, 10) || 0;
  });

  // Fetch unique races where the team participated
  const uniqueRacesRes = await pool.query(
    'SELECT COUNT(DISTINCT r.id) AS unique_races ' +
    'FROM races r ' +
    'JOIN seasons s ON r.season_id = s.id ' +
    'JOIN lineups l ON r.season_id = l.season_id AND l.team_id = $1 ' +
    'WHERE CAST(s.season AS INTEGER) >= 6',
    [teamId]
  );
  const uniqueRaces = uniqueRacesRes.rows[0].unique_races || 0;

  // Multiply by 2 to account for both cars
  teamStats.career.races = uniqueRaces * 2;

  // Fetch wins
  const winsRes = await pool.query(
    'SELECT DISTINCT rr.race_id, ' +
    'CASE WHEN rr.adjusted_position IS NOT NULL THEN rr.adjusted_position ELSE rr.position END AS final_position, ' +
    'd.name AS driver_name, t.name AS team_name ' +
    'FROM race_results rr ' +
    'JOIN races r ON rr.race_id = r.id ' +
    'JOIN seasons s ON r.season_id = s.id ' +
    'JOIN drivers d ON rr.driver_id = d.id ' +
    'JOIN teams t ON rr.team_id = t.id ' +
    'WHERE (CASE WHEN rr.adjusted_position IS NOT NULL THEN rr.adjusted_position ELSE rr.position END) = 1 ' +
    'AND CAST(s.season AS INTEGER) >= 6 ' +
    'AND t.id = $1',
    [teamId]
  );
  teamStats.career.wins = winsRes.rows.length || 0;

  // // Debug logging for wins
  // winsRes.rows.forEach(row => {
  //   console.log(
  //     `Win: Race ${row.race_id}, Driver ${row.driver_name}, Team ${row.team_name}, Position ${row.position}, Adjusted Position ${row.adjusted_position}`
  //   );
  // });

  // Fetch podiums
  const podiumsRes = await pool.query(
    'SELECT DISTINCT rr.race_id, ' +
    'CASE WHEN rr.adjusted_position IS NOT NULL THEN rr.adjusted_position ELSE rr.position END AS final_position, ' +
    'd.name AS driver_name, t.name AS team_name ' +
    'FROM race_results rr ' +
    'JOIN races r ON rr.race_id = r.id ' +
    'JOIN seasons s ON r.season_id = s.id ' +
    'JOIN drivers d ON rr.driver_id = d.id ' +
    'JOIN teams t ON rr.team_id = t.id ' +
    'WHERE (CASE WHEN rr.adjusted_position IS NOT NULL THEN rr.adjusted_position ELSE rr.position END) <= 3 ' +
    'AND CAST(s.season AS INTEGER) >= 6 ' +
    'AND t.id = $1',
    [teamId]
  );
  teamStats.career.podiums = podiumsRes.rows.length || 0;

  // // Debug logging for podiums
  // podiumsRes.rows.forEach(row => {
  //   console.log(
  //     `Podium: Race ${row.race_id}, Driver ${row.driver_name}, Team ${row.team_name}, Position ${row.position}, Adjusted Position ${row.adjusted_position}`
  //   );
  // });

  // Fetch poles
  const polesRes = await pool.query(
    'SELECT DISTINCT rr.race_id, rr.grid_position, d.name AS driver_name, t.name AS team_name ' +
    'FROM race_results rr ' +
    'JOIN races r ON rr.race_id = r.id ' +
    'JOIN seasons s ON r.season_id = s.id ' +
    'JOIN drivers d ON rr.driver_id = d.id ' +
    'JOIN teams t ON rr.team_id = t.id ' +
    'WHERE rr.grid_position = 1 ' +
    'AND CAST(s.season AS INTEGER) >= 6 ' +
    'AND t.id = $1',
    [teamId]
  );
  teamStats.career.poles = polesRes.rows.length || 0;

  // // Debug logging for poles
  // polesRes.rows.forEach(row => {
  //   console.log(
  //     `Pole: Race ${row.race_id}, Driver ${row.driver_name}, Team ${row.team_name}, Grid Position ${row.grid_position}`
  //   );
  // });

  const fastestLapsRes = await pool.query(
    'SELECT rr.race_id, rr.fastest_lap_time_int, d.name AS driver_name, t.name AS team_name ' +
    'FROM race_results rr ' +
    'JOIN races r ON rr.race_id = r.id ' +
    'JOIN seasons s ON r.season_id = s.id ' +
    'JOIN drivers d ON rr.driver_id = d.id ' +
    'JOIN teams t ON rr.team_id = t.id ' +
    'WHERE rr.fastest_lap_time_int > 0 ' +
    'AND CAST(s.season AS INTEGER) >= 6 ' +
    'AND rr.fastest_lap_time_int = (' +
    '  SELECT MIN(rr2.fastest_lap_time_int) ' +
    '  FROM race_results rr2 ' +
    '  WHERE rr2.race_id = rr.race_id ' +
    '  AND rr2.fastest_lap_time_int > 0' +
    ') ' +
    'AND t.id = $1',
    [teamId]
  );
  teamStats.career.fastestLaps = fastestLapsRes.rows.length || 0;

  // // Debug logging for fastest laps
  // fastestLapsRes.rows.forEach(row => {
  //   console.log(
  //     `Fastest Lap: Race ${row.race_id}, Driver ${row.driver_name}, Team ${row.team_name}, Fastest Lap Time ${row.fastest_lap_time_int}`
  //   );
  // });

  // // Debug logging for unique races
  // console.log('Unique Races:', uniqueRaces);
  // console.log('Team Participations:', teamStats.career.races);

  // Calculate Stats by Season height
  const seasonCount = Object.keys(teamStats.seasons).length;
  const statsBySeasonHeight = 64 + (seasonCount * 48);

  return (
    <Box sx={{ p: 2, width: '100%', mx: 'auto' }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'white', textAlign: 'center', fontWeight: 'bold', mb: 4 }}>
        {teamNameFormatted}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={3}></Grid>
        <Grid item xs={3}>
          <Box sx={{ border: '1px solid #444', borderRadius: 1, p: 2, backgroundColor: '#0a0e27', minHeight: statsBySeasonHeight }}>
            <Typography variant="h6" sx={{ color: 'white' }}>Season-by-Season Stats</Typography>
            <Table sx={{ color: 'white', tableLayout: 'fixed', width: '100%' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'white', borderColor: '#444', width: '25%', fontWeight: 'bold' }}>Season</TableCell>
                  <TableCell sx={{ color: 'white', borderColor: '#444', width: '50%', fontWeight: 'bold' }}>Drivers</TableCell>
                  <TableCell sx={{ color: 'white', borderColor: '#444', width: '25%', fontWeight: 'bold' }}>Points</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(teamStats.seasons).map(([season, stats]) => (
                  <TableRow key={season}>
                    <TableCell sx={{ color: 'white', borderColor: '#444' }}>{season}</TableCell>
                    <TableCell sx={{ color: 'white', borderColor: '#444' }}>
  <Box
    sx={{
      backgroundColor: stats.drivers === "No Drivers" ? '#444' : teamColors[teamNameFormatted] || '#444',
      p: 0.5,
      borderRadius: 1,
      display: 'inline-block',
      color: stats.drivers === "No Drivers" ? '#888' : (lightTeams.includes(teamNameFormatted) ? 'black' : 'white'),
      fontStyle: stats.drivers === "No Drivers" ? 'italic' : 'normal',
    }}
  >
    {stats.drivers}
  </Box>
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
                { title: 'Career Races', value: teamStats.career.races },
                { title: 'Career Wins', value: teamStats.career.wins },
                { title: 'Career Podiums', value: teamStats.career.podiums },
                { title: 'Career Poles', value: teamStats.career.poles },
                { title: 'Career Fastest Laps', value: teamStats.career.fastestLaps },
                { title: 'Career Points', value: teamStats.career.points },
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