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

  // Fetch track info
  const trackQuery = `
    SELECT id, country, name, length, turns, first_grand_prix AS first_grand_prix, laps
    FROM tracks
    WHERE slug = $1
  `;
  const trackResult = await pool.query(trackQuery, [track]);
  console.log(`Track info results: ${trackResult.rows.length} rows found`);
  
  const trackInfo = trackResult.rows[0] || {
    id: null,
    country: 'UNKNOWN',
    name: 'Unknown Circuit',
    length: 'N/A',
    turns: 'N/A',
    first_grand_prix: 'N/A',
    laps: 'N/A',
  };
  console.log(`Track ID: ${trackInfo.id}`);
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

    // Compare with existing fastest lap (if any)
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
      // Convert time to a number to ensure correct comparison
      const time = Number(result.fastestLapData.time);
      if (!fastest || time < fastest.rawTime) {
        return {
          driver: result.fastestLapData.driver,
          time: formatTime(result.fastestLapData.time),
          rawTime: time, // Store as number
          season: result.fastestLapData.season,
          team: result.fastestLapData.team,
          source: result.fastestLapData.source || 'race_results'
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
  const maxPoles = Math.max(...Object.values(poleCounts), 0);
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
  const maxPodiums = Math.max(...Object.values(podiumCounts), 0);
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
  const maxPointsDriver = Math.max(...Object.values(pointsByDriver), 0);
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
  const maxPointsTeam = Math.max(...Object.values(pointsByTeam), 0);
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
    <div className="container mx-auto px-4 py-6 bg-gray-900/30 min-h-screen">
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
            {previousWinners.length > 0 ? (
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
            <p className="text-lg font-medium text-white">{mostSuccessfulDriverText}</p>
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
            <p className="text-lg font-medium text-white">{mostSuccessfulTeamText}</p>
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
            <p className="text-lg font-medium text-white">{mostPolesText}</p>
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
            <p className="text-lg font-medium text-white">{mostPodiumsText}</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-green-500" />
              <CardTitle className="text-md font-semibold text-white">Fastest Race Lap</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {fastestLap ? (
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">{fastestLap.driver}</span>
                <Badge 
                  className="font-medium"
                  style={{ 
                    backgroundColor: teamColors[fastestLap.team] || '#444',
                    color: lightTeams.includes(fastestLap.team) ? 'black' : 'white' 
                  }}
                >
                  {fastestLap.team}
                </Badge>
                <span className="text-gray-300">{fastestLap.time}</span>
                <span className="text-gray-500 text-sm">(S{fastestLap.season})</span>
              </div>
            ) : (
              <p className="text-gray-400">No fastest lap recorded.</p>
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
            <p className="text-lg font-medium text-white">{mostPitsText}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';