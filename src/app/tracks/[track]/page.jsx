import { Pool } from 'pg';
import Image from 'next/image';
import { teamColors } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Trophy, Flag, MapPin, Timer, GitBranch, 
  Users, UsersRound, Medal
} from 'lucide-react';
import TrackSelector from './TrackSelector';

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

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
  console.log(`Looking up track with slug: ${track}`);

  let trackInfo, rawResults, lapHistoryData;
  let previousWinners, fastestLap, top3FastestLaps, mostSuccessfulDriverText, mostSuccessfulTeamText, mostPolesText, mostPodiumsText, mostPitsText;
  let topDrivers = [], topTeams = [], topPoleDrivers = [], topPodiumDrivers = [], topPitDrivers = [];
  let databaseError = false;

  try {
    // Fetch track info
    const trackQuery = `
      SELECT id, country, name, length, turns, first_grand_prix AS first_grand_prix, laps
      FROM tracks
      WHERE slug = $1
    `;
    const trackResult = await pool.query(trackQuery, [track]);
    console.log(`Track info results: ${trackResult.rows.length} rows found`);
    
    trackInfo = trackResult.rows[0] || {
      id: null,
      country: 'UNKNOWN',
      name: 'Unknown Circuit',
      length: 'N/A',
      turns: 'N/A',
      first_grand_prix: 'N/A',
      laps: 'N/A',
    };
    console.log(`Track ID: ${trackInfo.id}`);

    // Step 1: Find race sessions for this track
    const raceSessionsQuery = `
      SELECT session_uid, season
      FROM sessions
      WHERE track_id = $1 AND session_type = 10
    `;
    const raceSessionsResult = await pool.query(raceSessionsQuery, [trackInfo.id]);
  console.log(`Found ${raceSessionsResult.rows.length} race sessions for track_id=${trackInfo.id}`);
  
  // Extract session UIDs
  const sessionUIDs = raceSessionsResult.rows.map(row => row.session_uid);
  console.log('Session UIDs:', sessionUIDs);

  // Step 2: Fetch results from race_results (original method)
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

  // Step 3: Fetch lap data for each session individually
  let lapHistoryData = [];
  
  // Process each session individually
  for (const sessionUID of sessionUIDs) {
    const singleSessionQuery = `
      SELECT 
        s.season,
        p.driver_name AS driver,
        t.name AS team,
        MIN(lhbd.lap_time_ms) AS fastest_lap_time,
        lhbd.session_uid
      FROM lap_history_bulk_data lhbd
      JOIN sessions s ON lhbd.session_uid = s.session_uid
      JOIN participants p ON lhbd.session_uid = p.session_uid AND lhbd.car_index = p.car_index
      JOIN teams t ON CAST(p.team_id AS INTEGER) = t.id
      WHERE lhbd.session_uid = $1 AND lhbd.lap_time_ms > 0
      GROUP BY s.season, p.driver_name, t.name, lhbd.session_uid
      ORDER BY MIN(lhbd.lap_time_ms) ASC
    `;
    try {
      const singleResult = await pool.query(singleSessionQuery, [sessionUID]);
      console.log(`Found ${singleResult.rows.length} results for session ${sessionUID}`);
      lapHistoryData = [...lapHistoryData, ...singleResult.rows];
    } catch (err) {
      console.error(`Error querying session ${sessionUID}:`, err);
    }
  }

  // FALLBACK: Try also checking the specific session directly
  const specificSessionUID = -5092816217294772112;
  if (!sessionUIDs.includes(specificSessionUID)) {
    const specificSessionQuery = `
      SELECT 
        s.season,
        p.driver_name AS driver,
        t.name AS team,
        MIN(lhbd.lap_time_ms) AS fastest_lap_time,
        lhbd.session_uid
      FROM lap_history_bulk_data lhbd
      JOIN sessions s ON lhbd.session_uid = s.session_uid
      JOIN participants p ON lhbd.session_uid = p.session_uid AND lhbd.car_index = p.car_index
      JOIN teams t ON CAST(p.team_id AS INTEGER) = t.id
      WHERE lhbd.session_uid = $1 AND lhbd.lap_time_ms > 0
      GROUP BY s.season, p.driver_name, t.name, lhbd.session_uid
      ORDER BY MIN(lhbd.lap_time_ms) ASC
    `;
    try {
      const specificResult = await pool.query(specificSessionQuery, [specificSessionUID]);
      console.log(`Found ${specificResult.rows.length} results for specific session ${specificSessionUID}`);
      lapHistoryData = [...lapHistoryData, ...specificResult.rows];
    } catch (err) {
      console.error(`Error querying specific session ${specificSessionUID}:`, err);
    }
  }

  // Process results into historical data
  const historicalResults = [];
  const seasonMap = new Map();
  const allFastestLaps = []; // Collect all fastest laps across all seasons

  // First process the race_results data
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
    
    // Collect ALL fastest lap times for later ranking
    if (row.fastest_lap_time_int && row.fastest_lap_time_int > 0) {
      allFastestLaps.push({
        driver: row.driver,
        time: row.fastest_lap_time_int,
        season,
        team: row.team,
        source: 'race_results'
      });
    }

    // Also keep the per-season fastest lap for historical results display
    if (row.fastest_lap_time_int && row.fastest_lap_time_int > 0 && (!seasonData.fastestLap || row.fastest_lap_time_int < seasonData.fastestLap.time)) {
      seasonData.fastestLap = {
        driver: row.driver,
        time: row.fastest_lap_time_int,
        season,
        team: row.team,
        source: 'race_results'
      };
    }
  });

  // Then process lap_history_bulk_data and update fastest laps if faster
  lapHistoryData.forEach(lap => {
    const season = lap.season;
    if (!seasonMap.has(season)) {
      seasonMap.set(season, { podium: [], winner: null, team: null, fastestLap: null, pole: null });
    }
    const seasonData = seasonMap.get(season);

    // Collect ALL fastest lap times for later ranking
    if (lap.fastest_lap_time > 0) {
      allFastestLaps.push({
        driver: lap.driver,
        time: lap.fastest_lap_time,
        season,
        team: lap.team,
        source: 'lap_history_bulk_data',
        session_uid: lap.session_uid
      });
    }

    // Compare with existing fastest lap (if any) for per-season display
    if (lap.fastest_lap_time > 0 && (!seasonData.fastestLap || lap.fastest_lap_time < seasonData.fastestLap.time)) {
      seasonData.fastestLap = {
        driver: lap.driver,
        time: lap.fastest_lap_time,
        season,
        team: lap.team,
        source: 'lap_history_bulk_data',
        session_uid: lap.session_uid
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
  previousWinners = significantResults
    .filter(result => result.winner)
    .map(result => ({
      driver: result.winner,
      team: result.team,
      season: `${result.season}`,
    }));

  // Get top 3 fastest laps overall across all seasons
  top3FastestLaps = allFastestLaps
    .sort((a, b) => a.time - b.time) // Sort by time ascending (fastest first)
    .slice(0, 3) // Take top 3
    .map(lap => ({
      driver: lap.driver,
      time: formatTime(lap.time),
      rawTime: lap.time,
      season: lap.season,
      team: lap.team,
      source: lap.source
    }));

  // For backward compatibility, keep the fastest lap as the first one
  const fastestLap = top3FastestLaps.length > 0 ? top3FastestLaps[0] : null;

  // Most Poles - Top 3
  const poleCounts = significantResults.reduce((acc, result) => {
    if (result.pole && result.pole !== 'N/A') {
      acc[result.pole] = (acc[result.pole] || 0) + 1;
    }
    return acc;
  }, {});
  
  topPoleDrivers = Object.entries(poleCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([driver, poles]) => ({ driver, poles }));
  
  const mostPolesText = topPoleDrivers.length > 0
    ? topPoleDrivers.map(({driver, poles}) => `${driver} (${poles})`).join(' • ')
    : 'No poles recorded';

  // Most Podiums - Top 3
  const podiumCounts = significantResults.reduce((acc, result) => {
    result.podium.forEach(driver => {
      acc[driver] = (acc[driver] || 0) + 1;
    });
    return acc;
  }, {});
  
  topPodiumDrivers = Object.entries(podiumCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([driver, podiums]) => ({ driver, podiums }));
  
  const mostPodiumsText = topPodiumDrivers.length > 0
    ? topPodiumDrivers.map(({driver, podiums}) => `${driver} (${podiums})`).join(' • ')
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
  
  // Get top 3 drivers by points
  topDrivers = Object.entries(pointsByDriver)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([driver, points]) => ({ driver, points }));
  
  const mostSuccessfulDriverText = topDrivers.length > 0 
    ? topDrivers.map(({driver, points}) => `${driver} (${points})`).join(' • ')
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
  
  // Get top 3 teams by points
  topTeams = Object.entries(pointsByTeam)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([team, points]) => ({ team, points }));
  
  const mostSuccessfulTeamText = topTeams.length > 0
    ? topTeams.map(({team, points}) => `${team} (${points})`).join(' • ')
    : 'No points recorded';

  // Most Pit Stops - Top 3
  const pitCounts = rawResults.reduce((acc, row) => {
    if (row.pits_count && row.pits_count > 0) {
      acc[row.driver] = (acc[row.driver] || 0) + row.pits_count;
    }
    return acc;
  }, {});
  
  topPitDrivers = Object.entries(pitCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([driver, pits]) => ({ driver, pits }));
  
  const mostPitsText = topPitDrivers.length > 0
    ? topPitDrivers.map(({driver, pits}) => `${driver} (${pits})`).join(' • ')
    : 'No pit stops recorded';

  } catch (error) {
    console.error('Database error in TrackPage:', error);
    databaseError = true;
    
    // Fallback data when database fails
    trackInfo = {
      country: track.toUpperCase().replace(/-/g, ' '),
      name: `${track.replace(/-/g, ' ')} Circuit`,
      length: '5.412',
      turns: '17',
      first_grand_prix: '2024',
      laps: '55',
    };
    
    rawResults = [];
    lapHistoryData = [];
    
    // Generate some realistic test data
    const testDrivers = ['Lewis Hamilton', 'Max Verstappen', 'Charles Leclerc', 'Lando Norris', 'Oscar Piastri'];
    const testTeams = ['Mercedes', 'Red Bull Racing', 'Ferrari', 'McLaren', 'McLaren'];
    
    previousWinners = testDrivers.slice(0, 3).map((driver, index) => ({
      driver,
      team: testTeams[index],
      season: `${2024 - index}`
    }));
    
    fastestLap = {
      driver: 'Max Verstappen',
      time: '1:32.567',
      season: '2024',
      team: 'Red Bull Racing'
    };

    // Test data for top 3 fastest laps
    top3FastestLaps = [
      { driver: 'Max Verstappen', time: '1:32.567', season: '2024', team: 'Red Bull Racing' },
      { driver: 'Lewis Hamilton', time: '1:32.789', season: '2023', team: 'Mercedes' },
      { driver: 'Charles Leclerc', time: '1:33.124', season: '2024', team: 'Ferrari' }
    ];
    
    // Create test data objects for fallback
    topDrivers = [
      { driver: 'Max Verstappen', points: 75 },
      { driver: 'Lewis Hamilton', points: 62 },
      { driver: 'Charles Leclerc', points: 45 }
    ];
    
    topTeams = [
      { team: 'Red Bull Racing', points: 125 },
      { team: 'Mercedes', points: 89 },
      { team: 'Ferrari', points: 67 }
    ];
    
    topPoleDrivers = [
      { driver: 'Max Verstappen', poles: 3 },
      { driver: 'Lewis Hamilton', poles: 2 },
      { driver: 'Charles Leclerc', poles: 1 }
    ];
    
    topPodiumDrivers = [
      { driver: 'Lewis Hamilton', podiums: 4 },
      { driver: 'Max Verstappen', podiums: 3 },
      { driver: 'Charles Leclerc', podiums: 2 }
    ];
    
    topPitDrivers = [
      { driver: 'Charles Leclerc', pits: 8 },
      { driver: 'Max Verstappen', pits: 6 },
      { driver: 'Lewis Hamilton', pits: 5 }
    ];
  }

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

  return (
    <div className="container mx-auto px-4 py-6 bg-gray-900/30 min-h-screen">
      {/* Track Selector */}
      <div className="flex justify-end mb-6">
        <TrackSelector currentTrack={track} />
      </div>

      {/* Database Error Banner */}
      {databaseError && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-700/60 rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-3 text-red-400">
            <Trophy className="w-5 h-5" />
            <div>
              <p className="font-semibold">Database Connection Issue</p>
              <p className="text-sm text-red-300">Showing test data for demonstration</p>
            </div>
          </div>
        </div>
      )}

      {/* Track Header Section */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <h1 className="text-5xl font-formula1 font-bold text-white">
              {trackInfo.country}
            </h1>
          </div>
          <div className="relative w-24 h-24">
            <Image
              src={`/images/flags/${flagCountry}.png`}
              alt={`${trackInfo.country} Flag`}
              fill
              style={{ objectFit: 'contain' }}
              className="object-contain"
            />
          </div>
        </div>
      </div>

      {/* Track Info Section */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <Card className="flex-1 bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-md font-semibold text-white">Circuit Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Track Name</span>
                <span className="font-semibold text-white">{trackInfo.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Circuit Length</span>
                <span className="font-semibold text-white">{trackInfo.length} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Turns</span>
                <span className="font-semibold text-white">{trackInfo.turns}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">First Grand Prix</span>
                <span className="font-semibold text-white">{trackInfo.first_grand_prix}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Race Laps (50%)</span>
                <span className="font-semibold text-white">{halfLaps}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex-1 relative aspect-video md:h-auto min-h-64">
          <Image
            src={`/images/tracks/${track}.png`}
            alt={`${trackInfo.name} Track Map`}
            fill
            className="object-contain"
          />
        </div>
      </div>

      <Separator className="my-8 bg-gray-700" />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Previous Winners Card */}
        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden md:row-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-md font-semibold text-white">Previous Winners</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {previousWinners && previousWinners.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {previousWinners.map((win, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                    <div className="flex-1 truncate font-medium text-white">{win.driver}</div>
                    <div className="px-2">
                      <Badge 
                        className="font-medium"
                        style={{ 
                          backgroundColor: teamColors[win.team] || '#444',
                          color: lightTeams.includes(win.team) ? 'black' : 'white' 
                        }}
                      >
                        {win.team}
                      </Badge>
                    </div>
                    <div className="text-gray-500 text-sm w-14 text-right">S{win.season}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No previous winners recorded.</p>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-md font-semibold text-white">Most Successful Driver</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {topDrivers.length > 0 ? (
              <div className="space-y-2">
                {topDrivers.map((driver, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-lg">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                    <span className="text-white font-medium">{driver.driver}</span>
                    <span className="text-gray-400">({driver.points} pts)</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No points recorded</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-red-500" />
              <CardTitle className="text-md font-semibold text-white">Most Successful Constructor</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {topTeams.length > 0 ? (
              <div className="space-y-2">
                {topTeams.map((team, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-lg">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                    <span className="text-white font-medium">{team.team}</span>
                    <span className="text-gray-400">({team.points} pts)</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No points recorded</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-purple-500" />
              <CardTitle className="text-md font-semibold text-white">Most Pole Positions</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {topPoleDrivers.length > 0 ? (
              <div className="space-y-2">
                {topPoleDrivers.map((driver, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-lg">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                    <span className="text-white font-medium">{driver.driver}</span>
                    <span className="text-gray-400">({driver.poles} poles)</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No poles recorded</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Medal className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-md font-semibold text-white">Most Podiums</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {topPodiumDrivers.length > 0 ? (
              <div className="space-y-2">
                {topPodiumDrivers.map((driver, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-lg">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                    <span className="text-white font-medium">{driver.driver}</span>
                    <span className="text-gray-400">({driver.podiums} podiums)</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No podiums recorded</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-green-500" />
              <CardTitle className="text-md font-semibold text-white">Fastest Race Laps</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {top3FastestLaps && top3FastestLaps.length > 0 ? (
              <div className="space-y-2">
                {top3FastestLaps.map((lap, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-bold w-4">#{index + 1}</span>
                      <span className="font-medium text-white">{lap.driver}</span>
                      <Badge 
                        className="font-medium"
                        style={{ 
                          backgroundColor: teamColors[lap.team] || '#444',
                          color: lightTeams.includes(lap.team) ? 'black' : 'white' 
                        }}
                      >
                        {lap.team}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300 font-mono">{lap.time}</span>
                      <span className="text-gray-500 text-sm">(S{lap.season})</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No fastest laps recorded.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-cyan-500" />
              <CardTitle className="text-md font-semibold text-white">Most Pit Stops</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {topPitDrivers.length > 0 ? (
              <div className="space-y-2">
                {topPitDrivers.map((driver, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-lg">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                    <span className="text-white font-medium">{driver.driver}</span>
                    <span className="text-gray-400">({driver.pits} pit stops)</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No pit stops recorded</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';