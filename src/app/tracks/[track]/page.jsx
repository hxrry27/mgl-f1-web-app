// src/app/tracks/[track]/page.jsx
import { Pool } from 'pg';
import { Box, Typography, Divider, Grid, List, ListItem } from '@mui/material';
import Image from 'next/image';

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

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
const pointsSystem = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

// Format full time for fastest lap
function formatTime(ms) {
  if (ms === 0) return 'N/A';
  if (!ms) return '--:--.--';
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(3).padStart(6, '0');
  return `${minutes}:${seconds}`;
}

export default async function TrackPage({ params }) {
  const track = params.track;

  // Fetch track info
  const trackQuery = `
    SELECT country, name, length, turns, first_grand_prix AS first_grand_prix, laps
    FROM tracks
    WHERE slug = $1
  `;
  const trackResult = await pool.query(trackQuery, [track]);
  const trackInfo = trackResult.rows[0] || {
    country: 'UNKNOWN',
    name: 'Unknown Circuit',
    length: 'N/A',
    turns: 'N/A',
    first_grand_prix: 'N/A',
    laps: 'N/A',
  };
  const halfLaps = trackInfo.laps !== 'N/A' ? Math.round(trackInfo.laps / 2) : 'N/A';

  const countryFlagMap = {
    'GREAT BRITAIN': 'united_kingdom',
    'EMILIA-ROMAGNA': 'italy',
    'LAS VEGAS': 'united_states_of_america',
    'AUSTIN': 'united_states_of_america',
    'MIAMI': 'united_states_of_america',
    'SAUDI ARABIA': 'saudi_arabia',
    'ABU DHABI': 'united_arab_emirates',
  };

  // Normalize country name for flag filename
  const flagCountry = countryFlagMap[trackInfo.country] || trackInfo.country.toLowerCase().replace(/\s+/g, '');

  // Fetch all race results for this track across seasons
  const resultsQuery = `
    SELECT 
      s.season,
      rr.position,
      rr.adjusted_position,
      d.name AS driver,
      t.name AS team,
      rr.fastest_lap_time_int,
      rr.grid_position,
      rr.status,
      rr.pits_count
    FROM races r
    JOIN tracks tr ON r.track_id = tr.id
    JOIN seasons s ON r.season_id = s.id
    JOIN race_results rr ON rr.race_id = r.id
    JOIN drivers d ON rr.driver_id = d.id
    JOIN teams t ON rr.team_id = t.id
    WHERE tr.slug = $1
    ORDER BY s.season DESC, rr.adjusted_position ASC
  `;
  const resultsResult = await pool.query(resultsQuery, [track]);
  const rawResults = resultsResult.rows;

  // Process results into historical data
  const historicalResults = [];
  const seasonMap = new Map();

  rawResults.forEach(row => {
    const season = row.season;
    if (!seasonMap.has(season)) {
      seasonMap.set(season, { podium: [], winner: null, team: null, fastestLap: null, pole: null });
    }
    const seasonData = seasonMap.get(season);

    const effectivePosition = row.adjusted_position !== null ? row.adjusted_position : row.position;
    if (effectivePosition <= 3) {
      seasonData.podium[effectivePosition - 1] = row.driver;
    }
    if (effectivePosition === 1) {
      seasonData.winner = row.driver;
      seasonData.team = row.team;
    }
    if (row.grid_position === 1) {
      seasonData.pole = row.driver;
    }
    if (row.fastest_lap_time_int && row.fastest_lap_time_int > 0 && (!seasonData.fastestLap || row.fastest_lap_time_int < seasonData.fastestLap.time)) {
      seasonData.fastestLap = {
        driver: row.driver,
        time: row.fastest_lap_time_int,
        season,
        team: row.team,
      };
    }
  });

  seasonMap.forEach((data, season) => {
    historicalResults.push({
      season,
      winner: data.winner,
      team: data.team || 'N/A',
      podium: data.podium.filter(Boolean),
      fastestLap: data.fastestLap ? `${data.fastestLap.driver} (${formatTime(data.fastestLap.time)})` : 'N/A',
      pole: data.pole || 'N/A',
      fastestLapData: data.fastestLap,
    });
  });
  historicalResults.sort((a, b) => Number(b.season) - Number(a.season));

  const significantResults = historicalResults.filter(result => 
    result.podium.length > 0 || result.fastestLap !== 'N/A' || result.pole !== 'N/A'
  );

  // Previous Winners
  const previousWinners = significantResults
    .filter(result => result.winner)
    .map(result => ({
      driver: result.winner,
      team: result.team,
      season: `${result.season}`,
    }));

  // Fastest Historical Race Lap
  const fastestLap = significantResults
    .filter(result => result.fastestLapData && result.fastestLapData.time > 0)
    .reduce((fastest, result) => {
      const time = result.fastestLapData.time;
      if (!fastest || time < fastest.time) {
        return {
          driver: result.fastestLapData.driver,
          time: formatTime(result.fastestLapData.time),
          season: result.fastestLapData.season,
          team: result.fastestLapData.team,
        };
      }
      return fastest;
    }, null);

  // Most Poles
  const poleCounts = significantResults.reduce((acc, result) => {
    if (result.pole && result.pole !== 'N/A') {
      acc[result.pole] = (acc[result.pole] || 0) + 1;
    }
    return acc;
  }, {});
  const maxPoles = Math.max(...Object.values(poleCounts));
  const mostPoleDrivers = Object.entries(poleCounts)
    .filter(([, poles]) => poles === maxPoles)
    .map(([driver]) => driver)
    .sort((a, b) => a.localeCompare(b));
  const mostPolesText = mostPoleDrivers.length > 0
    ? `${mostPoleDrivers.join(' / ')} - ${maxPoles} pole${maxPoles !== 1 ? 's' : ''}`
    : 'No poles recorded';

  // Most Podiums
  const podiumCounts = significantResults.reduce((acc, result) => {
    result.podium.forEach(driver => {
      acc[driver] = (acc[driver] || 0) + 1;
    });
    return acc;
  }, {});
  const maxPodiums = Math.max(...Object.values(podiumCounts));
  const mostPodiumDrivers = Object.entries(podiumCounts)
    .filter(([, podiums]) => podiums === maxPodiums)
    .map(([driver]) => driver)
    .sort((a, b) => a.localeCompare(b));
  const mostPodiumsText = mostPodiumDrivers.length > 0
    ? `${mostPodiumDrivers.join(' / ')} - ${maxPodiums} podium${maxPodiums !== 1 ? 's' : ''}`
    : 'No podiums recorded';

  // Most Successful Driver (by points, including fastest lap)
  const pointsByDriver = rawResults.reduce((acc, row) => {
    const effectivePosition = row.adjusted_position !== null ? row.adjusted_position : row.position;
    const basePoints = effectivePosition <= 10 && row.status !== 'DSQ' && row.status !== 'DNS' ? pointsSystem[effectivePosition - 1] : 0;
    const seasonFastestLap = seasonMap.get(row.season)?.fastestLap?.driver;
    const fastestLapPoint = seasonFastestLap === row.driver && effectivePosition <= 10 ? 1 : 0;
    acc[row.driver] = (acc[row.driver] || 0) + basePoints + fastestLapPoint;
    return acc;
  }, {});
  const maxPointsDriver = Math.max(...Object.values(pointsByDriver));
  const mostSuccessfulDrivers = Object.entries(pointsByDriver)
    .filter(([, points]) => points === maxPointsDriver)
    .map(([driver]) => driver)
    .sort((a, b) => a.localeCompare(b));
  const mostSuccessfulDriverText = mostSuccessfulDrivers.length > 0
    ? `${mostSuccessfulDrivers.join(' / ')} - ${maxPointsDriver} point${maxPointsDriver !== 1 ? 's' : ''}`
    : 'No points recorded';

  // Most Successful Constructor (by points, including fastest lap)
  const pointsByTeam = rawResults.reduce((acc, row) => {
    const effectivePosition = row.adjusted_position !== null ? row.adjusted_position : row.position;
    const basePoints = effectivePosition <= 10 && row.status !== 'DSQ' && row.status !== 'DNS' ? pointsSystem[effectivePosition - 1] : 0;
    const seasonFastestLap = seasonMap.get(row.season)?.fastestLap?.team;
    const fastestLapPoint = seasonFastestLap === row.team && effectivePosition <= 10 ? 1 : 0;
    acc[row.team] = (acc[row.team] || 0) + basePoints + fastestLapPoint;
    return acc;
  }, {});
  const maxPointsTeam = Math.max(...Object.values(pointsByTeam));
  const mostSuccessfulTeams = Object.entries(pointsByTeam)
    .filter(([, points]) => points === maxPointsTeam)
    .map(([team]) => team)
    .sort((a, b) => a.localeCompare(b));
  const mostSuccessfulTeamText = mostSuccessfulTeams.length > 0
    ? `${mostSuccessfulTeams.join(' / ')} - ${maxPointsTeam} point${maxPointsTeam !== 1 ? 's' : ''}`
    : 'No points recorded';

  // Most Pit Stops
  const pitCounts = rawResults.reduce((acc, row) => {
    if (row.pits_count && row.pits_count > 0) {
      acc[row.driver] = (acc[row.driver] || 0) + row.pits_count;
    }
    return acc;
  }, {});
  const maxPits = Math.max(...Object.values(pitCounts), 0);
  const mostPitDrivers = Object.entries(pitCounts)
    .filter(([, pits]) => pits === maxPits)
    .map(([driver]) => driver)
    .sort((a, b) => a.localeCompare(b));
  const mostPitsText = mostPitDrivers.length > 0
    ? `${mostPitDrivers.join(' / ')} - ${maxPits} pit stop${maxPits !== 1 ? 's' : ''}`
    : 'No pit stops recorded';

  return (
    <Box sx={{ pt: '5vh', pl: '15vw', pr: '15vw' }}>
      {/* Full-width Title Box */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography
            variant="h4"
            sx={{
              fontSize: 80,
              fontFamily: 'Formula1',
              color: 'white',
              mr: 2,
              whiteSpace: 'nowrap',
            }}
          >
            {trackInfo.country}
          </Typography>
          <Box sx={{ position: 'relative', width: 100, height: 95 }}>
            <Image
              src={`/images/flags/${flagCountry}.png`}
              alt={`${trackInfo.country} Flag`}
              fill
              style={{ objectFit: 'contain' }}
            />
          </Box>
        </Box>
      </Box>

<Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 3, mb: 3, alignItems: 'flex-start' }}>
  
  <Box sx={{ flex: '1 1 33%', minWidth: 300 }}>
    <Typography sx={{ color: 'white' }}>
      <Typography component="span" variant="h6" sx={{ fontSize: 26, color: 'white' }}>Track Name - </Typography>
      <Typography component="span" variant="h6" sx={{ fontSize: 26, color: 'white' }}>{trackInfo.name}</Typography>
    </Typography>
    <Typography sx={{ color: 'white' }}>
      <Typography component="span" variant="h6" sx={{ fontSize: 26, color: 'white' }}>Circuit Length - </Typography> 
      <Typography component="span" variant="h6" sx={{ fontSize: 26, color: 'white' }}>{trackInfo.length} km</Typography>
    </Typography>
    <Typography sx={{ color: 'white' }}>
      <Typography component="span" variant="h6" sx={{ fontSize: 26, color: 'white' }}>Turns - </Typography> 
      <Typography component="span" variant="h6" sx={{ fontSize: 26, color: 'white' }}>{trackInfo.turns}</Typography>
    </Typography>
    <Typography sx={{ color: 'white' }}>
      <Typography component="span" variant="h6" sx={{ fontSize: 26, color: 'white' }}>First Grand Prix - </Typography> 
      <Typography component="span" variant="h6" sx={{ fontSize: 26, color: 'white' }}>{trackInfo.first_grand_prix}</Typography>
    </Typography>
    <Typography sx={{ color: 'white' }}>
      <Typography component="span" variant="h6" sx={{ fontSize: 26, color: 'white' }}>Laps (50%) - </Typography> 
      <Typography component="span" variant="h6" sx={{ fontSize: 26, color: 'white' }}>{halfLaps}</Typography>
    </Typography>
    
  </Box>

  <Box sx={{ flex: '1 1 67%', minWidth: 300, position: 'relative', height: 500 }}>
    <Image
      src={`/images/tracks/${track}.png`}
      alt={`${trackInfo.name} Track Map`}
      fill
      style={{ objectFit: 'contain' }}
    />
  </Box>

</Box>

<Divider sx={{ my: 3, borderColor: '#444' }} />

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Box sx={{ backgroundColor: '#1a1e37', border: '1px solid #444', borderRadius: 1, p: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>Previous Winners</Typography>
            {previousWinners.length > 0 ? (
              <List dense sx={{ maxHeight: 300, overflowY: 'auto' }}>
                {previousWinners.map((win, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                      }}
                    >
                      <Typography sx={{ color: 'white', width: '55%', pr: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {win.driver}
                      </Typography>
                      <Box
                        sx={{
                          backgroundColor: teamColors[win.team] || '#444',
                          color: lightTeams.includes(win.team) ? 'black' : 'white',
                          px: 0.5,
                          py: 0.2,
                          borderRadius: 1,
                          width: '30%',
                          textAlign: 'center',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {win.team}
                      </Box>
                      <Typography
                        component="span"
                        sx={{
                          color: '#888',
                          width: '15%',
                          textAlign: 'right',
                          pl: 1,
                        }}
                      >
                        S{win.season}
                      </Typography>
                    </Box>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography sx={{ color: 'white' }}>No previous winners recorded.</Typography>
            )}
          </Box>
        </Grid>

        <Grid item xs={12} md={8}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <Box sx={{ backgroundColor: '#1a1e37', border: '1px solid #444', borderRadius: 1, p: 2, height: '10vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>Most Successful Driver</Typography>
                <Typography sx={{ color: 'white' }}>{mostSuccessfulDriverText}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Box sx={{ backgroundColor: '#1a1e37', border: '1px solid #444', borderRadius: 1, p: 2, height: '10vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>Most Successful Constructor</Typography>
                <Typography sx={{ color: 'white' }}>{mostSuccessfulTeamText}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Box sx={{ backgroundColor: '#1a1e37', border: '1px solid #444', borderRadius: 1, p: 2, height: '10vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>Most Pole Positions</Typography>
                <Typography sx={{ color: 'white' }}>{mostPolesText}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Box sx={{ backgroundColor: '#1a1e37', border: '1px solid #444', borderRadius: 1, p: 2, height: '10vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>Most Podiums</Typography>
                <Typography sx={{ color: 'white' }}>{mostPodiumsText}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Box sx={{ backgroundColor: '#1a1e37', border: '1px solid #444', borderRadius: 1, p: 2, height: '10vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>Fastest Race Lap</Typography>
                {fastestLap ? (
                  <Typography sx={{ display: 'flex', alignItems: 'center', color: 'white' }}>
                    {fastestLap.driver}{' '}
                    <Box
                      sx={{
                        backgroundColor: teamColors[fastestLap.team] || '#444',
                        color: lightTeams.includes(fastestLap.team) ? 'black' : 'white',
                        px: 0.5,
                        py: 0.2,
                        borderRadius: 1,
                        ml: 1,
                        mr: 1,
                        fontSize: '0.8rem',
                      }}
                    >
                      {fastestLap.team}
                    </Box>
                    - {fastestLap.time} (S{fastestLap.season})
                  </Typography>
                ) : (
                  <Typography sx={{ color: 'white' }}>No fastest lap recorded.</Typography>
                )}
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Box sx={{ backgroundColor: '#1a1e37', border: '1px solid #444', borderRadius: 1, p: 2, height: '10vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>Most Pit Stops</Typography>
                <Typography sx={{ color: 'white' }}>{mostPitsText}</Typography>
              </Box>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}

export const dynamic = 'force-dynamic';