import { Pool } from 'pg';
import Image from 'next/image';
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, Flag, MapPin, Timer, GitBranch, 
  Users, UsersRound, Medal, TrendingUp, Calendar
} from 'lucide-react';
import TrackSelector from './TrackSelector';
import { teamColors, lightTeams } from '@/lib/data';

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

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

// Stat Card Component
function StatCard({ icon: Icon, title, children, delay = 0, iconColor = "text-cyan-400", fillHeight = true }) {
  return (
    <div className={`relative bg-neutral-900/60 backdrop-blur-xl border border-neutral-700/50 rounded-3xl overflow-hidden p-6 ${fillHeight ? 'h-full flex flex-col' : ''}`}>
      <div className="flex items-center gap-3 mb-4">
        <Icon className={`h-5 w-5 ${iconColor}`} />
        <h3 className="text-lg font-bold text-white">{title}</h3>
      </div>
      <div className={`space-y-3 ${fillHeight ? 'flex-1' : ''}`}>
        {children}
      </div>
    </div>
  );
}

// Ranked Item Component (for top 3 lists)
function RankedItem({ rank, name, value, badge, rankColor = "text-cyan-400" }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`font-black w-6 ${rankColor}`}>#{rank}</span>
      <span className="text-white font-bold flex-1">{name}</span>
      {badge && (
        <Badge 
          className="font-medium text-xs"
          style={{ 
            backgroundColor: teamColors[badge] || '#444',
            color: lightTeams.includes(badge) ? 'black' : 'white' 
          }}
        >
          {badge}
        </Badge>
      )}
      <span className="text-neutral-400 text-sm">{value}</span>
    </div>
  );
}

export default async function TrackPage({ params }) {
  const track = params.track;
  console.log(`Looking up track with slug: ${track}`);

  let trackInfo, rawResults, lapHistoryData;
  let previousWinners, fastestLap, top3FastestLaps, allComebacks;
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
    
    const sessionUIDs = raceSessionsResult.rows.map(row => row.session_uid);
    console.log('Session UIDs:', sessionUIDs);

    // Step 2: Fetch results from race_results
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
    rawResults = resultsResult.rows;

    // Step 3: Fetch lap data for each session
    let lapHistoryData = [];
    
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

    // Process results into historical data
    const seasonMap = new Map();
    const allFastestLaps = [];

    // Process race_results data
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
      
      if (row.fastest_lap_time_int && row.fastest_lap_time_int > 0) {
        allFastestLaps.push({
          driver: row.driver,
          time: row.fastest_lap_time_int,
          season,
          team: row.team,
          source: 'race_results'
        });
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

    // Process lap_history_bulk_data
    lapHistoryData.forEach(lap => {
      const season = lap.season;
      if (!seasonMap.has(season)) {
        seasonMap.set(season, { podium: [], winner: null, team: null, fastestLap: null, pole: null });
      }
      const seasonData = seasonMap.get(season);

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

    const historicalResults = [];
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

    // Top 3 fastest laps overall
    top3FastestLaps = allFastestLaps
      .sort((a, b) => a.time - b.time)
      .slice(0, 3)
      .map(lap => ({
        driver: lap.driver,
        time: formatTime(lap.time),
        rawTime: lap.time,
        season: lap.season,
        team: lap.team,
        source: lap.source
      }));

    fastestLap = top3FastestLaps.length > 0 ? top3FastestLaps[0] : null;

    // Biggest Comebacks - Top 3
    allComebacks = rawResults
      .filter(row => {
        const effectivePosition = row.adjusted_position !== null ? row.adjusted_position : row.position;
        return (
          row.season !== '8' &&
          row.grid_position && 
          row.grid_position > 0 && 
          effectivePosition && 
          effectivePosition > 0 &&
          row.status !== 'DNF' && 
          row.status !== 'DSQ' && 
          row.status !== 'DNS' &&
          row.grid_position > effectivePosition
        );
      })
      .map(row => {
        const effectivePosition = row.adjusted_position !== null ? row.adjusted_position : row.position;
        const positionsGained = row.grid_position - effectivePosition;
        return {
          driver: row.driver,
          team: row.team,
          season: row.season,
          gridPosition: row.grid_position,
          finishPosition: effectivePosition,
          positionsGained: positionsGained
        };
      })
      .sort((a, b) => b.positionsGained - a.positionsGained)
      .slice(0, 3);

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

    // Most Successful Driver (by points)
    const pointsByDriver = rawResults.reduce((acc, row) => {
      const effectivePosition = row.adjusted_position !== null ? row.adjusted_position : row.position;
      const basePoints = effectivePosition <= 10 && row.status !== 'DSQ' && row.status !== 'DNS' ? pointsSystem[effectivePosition - 1] : 0;
      const seasonFastestLap = seasonMap.get(row.season)?.fastestLap?.driver;
      const fastestLapPoint = seasonFastestLap === row.driver && effectivePosition <= 10 ? 1 : 0;
      acc[row.driver] = (acc[row.driver] || 0) + basePoints + fastestLapPoint;
      return acc;
    }, {});
    
    topDrivers = Object.entries(pointsByDriver)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([driver, points]) => ({ driver, points }));

    // Most Successful Constructor (by points)
    const pointsByTeam = rawResults.reduce((acc, row) => {
      const effectivePosition = row.adjusted_position !== null ? row.adjusted_position : row.position;
      const basePoints = effectivePosition <= 10 && row.status !== 'DSQ' && row.status !== 'DNS' ? pointsSystem[effectivePosition - 1] : 0;
      const seasonFastestLap = seasonMap.get(row.season)?.fastestLap?.team;
      const fastestLapPoint = seasonFastestLap === row.team && effectivePosition <= 10 ? 1 : 0;
      acc[row.team] = (acc[row.team] || 0) + basePoints + fastestLapPoint;
      return acc;
    }, {});
    
    topTeams = Object.entries(pointsByTeam)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([team, points]) => ({ team, points }));

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

  } catch (error) {
    console.error('Database error in TrackPage:', error);
    databaseError = true;
    
    // Fallback data
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

    top3FastestLaps = [
      { driver: 'Max Verstappen', time: '1:32.567', season: '2024', team: 'Red Bull Racing' },
      { driver: 'Lewis Hamilton', time: '1:32.789', season: '2023', team: 'Mercedes' },
      { driver: 'Charles Leclerc', time: '1:33.124', season: '2024', team: 'Ferrari' }
    ];

    allComebacks = [
      { driver: 'Lewis Hamilton', team: 'Mercedes', season: '2023', gridPosition: 14, finishPosition: 2, positionsGained: 12 },
      { driver: 'Oscar Piastri', team: 'McLaren', season: '2024', gridPosition: 16, finishPosition: 5, positionsGained: 11 },
      { driver: 'Fernando Alonso', team: 'Aston Martin', season: '2024', gridPosition: 18, finishPosition: 8, positionsGained: 10 }
    ];
    
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

  const flagCountry = countryFlagMap[trackInfo.country] || trackInfo.country.toLowerCase().replace(/\s+/g, '');

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-[1400px] mx-auto px-6 py-8">

          {/* Header Row - Selector + Track Info */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex-1">
              <h1 className="text-5xl md:text-5xl font-black text-white tracking-tight mb-2">
                {trackInfo.country}
              </h1>
              <p className="text-xl text-neutral-400 font-bold">{trackInfo.name}</p>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="relative w-20 h-20 flex-shrink-0">
                <Image
                  src={`/images/flags/${flagCountry}.png`}
                  alt={`${trackInfo.country} Flag`}
                  fill
                  className="object-contain"
                />
              </div>
              <TrackSelector currentTrack={track} />
            </div>
          </div>

          {/* Track Info Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16">
            {/* Circuit Information Card */}
            <div className="relative bg-neutral-900/60 backdrop-blur-xl border border-neutral-700/50 rounded-3xl overflow-hidden p-8">
              <div className="flex items-center gap-3 mb-6">
                <MapPin className="h-5 w-5 text-cyan-400" />
                <h2 className="text-xl font-black text-white tracking-tight">Circuit Information</h2>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-neutral-800/50">
                  <span className="text-neutral-400 font-medium">Circuit Length</span>
                  <span className="font-black text-white text-xl">{trackInfo.length} km</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-neutral-800/50">
                  <span className="text-neutral-400 font-medium">Turns</span>
                  <span className="font-black text-white text-xl">{trackInfo.turns}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-neutral-800/50">
                  <span className="text-neutral-400 font-medium">First Grand Prix</span>
                  <span className="font-black text-white text-xl">{trackInfo.first_grand_prix}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-neutral-400 font-medium">Race Laps (50%)</span>
                  <span className="font-black text-white text-xl">{halfLaps}</span>
                </div>
              </div>
            </div>
            
            {/* Track Map */}
            <div className="relative aspect-video bg-neutral-900/60 backdrop-blur-xl border border-neutral-700/50 rounded-3xl overflow-hidden p-4">
              <div className="relative w-full h-full">
                <Image
                  src={`/images/tracks/${track}.png`}
                  alt={`${trackInfo.name} Track Map`}
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Previous Winners - Spans 2 rows */}
            <div className="md:row-span-2">
              <StatCard icon={Trophy} title="Previous Winners" iconColor="text-yellow-500" fillHeight={true}>
                {previousWinners && previousWinners.length > 0 ? (
                  <div className="space-y-3 max-h-full overflow-y-auto pr-2">
                    {previousWinners.map((win, index) => (
                      <div key={index} className="flex items-center gap-3 py-2 border-b border-neutral-800/50 last:border-0">
                        <div className="flex-1 font-bold text-white truncate">{win.driver}</div>
                        <Badge 
                          className="font-bold px-3 py-1 text-xs uppercase tracking-wider border-2"
                          style={{ 
                            backgroundColor: teamColors[win.team] || '#404040',
                            color: lightTeams.includes(win.team) ? 'black' : 'white',
                            borderColor: lightTeams.includes(win.team) ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'
                          }}
                        >
                          {win.team}
                        </Badge>
                        <span className="text-neutral-500 text-sm w-12 text-right">S{win.season}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-neutral-500">No winners recorded</p>
                )}
              </StatCard>
            </div>

            {/* Most Successful Driver */}
            <StatCard icon={Users} title="Most Successful Driver" iconColor="text-cyan-400">
              {topDrivers.length > 0 ? (
                topDrivers.map((driver, index) => (
                  <RankedItem 
                    key={index}
                    rank={index + 1}
                    name={driver.driver}
                    value={`${driver.points} pts`}
                    rankColor="text-cyan-400"
                  />
                ))
              ) : (
                <p className="text-neutral-500">No data recorded</p>
              )}
            </StatCard>

            {/* Most Successful Constructor */}
            <StatCard icon={UsersRound} title="Most Successful Constructor" iconColor="text-teal-400">
              {topTeams.length > 0 ? (
                topTeams.map((team, index) => (
                  <RankedItem 
                    key={index}
                    rank={index + 1}
                    name={team.team}
                    value={`${team.points} pts`}
                    rankColor="text-teal-400"
                  />
                ))
              ) : (
                <p className="text-neutral-500">No data recorded</p>
              )}
            </StatCard>

            {/* Most Pole Positions */}
            <StatCard icon={Flag} title="Most Pole Positions" iconColor="text-purple-400">
              {topPoleDrivers.length > 0 ? (
                topPoleDrivers.map((driver, index) => (
                  <RankedItem 
                    key={index}
                    rank={index + 1}
                    name={driver.driver}
                    value={`${driver.poles} poles`}
                    rankColor="text-purple-400"
                  />
                ))
              ) : (
                <p className="text-neutral-500">No poles recorded</p>
              )}
            </StatCard>

            {/* Most Podiums */}
            <StatCard icon={Medal} title="Most Podiums" iconColor="text-amber-500">
              {topPodiumDrivers.length > 0 ? (
                topPodiumDrivers.map((driver, index) => (
                  <RankedItem 
                    key={index}
                    rank={index + 1}
                    name={driver.driver}
                    value={`${driver.podiums} podiums`}
                    rankColor="text-amber-500"
                  />
                ))
              ) : (
                <p className="text-neutral-500">No podiums recorded</p>
              )}
            </StatCard>

            {/* Fastest Race Laps */}
            <StatCard icon={Timer} title="Fastest Race Laps" iconColor="text-green-500">
              {top3FastestLaps && top3FastestLaps.length > 0 ? (
                <div className="space-y-3">
                  {top3FastestLaps.map((lap, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-green-400 font-black w-6">#{index + 1}</span>
                      <div className="flex-1">
                        <div className="font-bold text-white">{lap.driver}</div>
                        <div className="text-xs text-neutral-500">S{lap.season}</div>
                      </div>
                        <Badge 
                          className="font-bold px-3 py-1 text-xs uppercase tracking-wider border-2"
                          style={{ 
                            backgroundColor: teamColors[lap.team] || '#404040',
                            color: lightTeams.includes(lap.team) ? 'black' : 'white',
                            borderColor: lightTeams.includes(lap.team) ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'
                          }}
                        >
                        {lap.team}
                      </Badge>
                      <span className="text-green-400 font-mono text-sm">{lap.time}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-500">No fastest laps recorded</p>
              )}
            </StatCard>

            {/* Most Pit Stops */}
            <StatCard icon={GitBranch} title="Most Pit Stops" iconColor="text-cyan-500">
              {topPitDrivers.length > 0 ? (
                topPitDrivers.map((driver, index) => (
                  <RankedItem 
                    key={index}
                    rank={index + 1}
                    name={driver.driver}
                    value={`${driver.pits} stops`}
                    rankColor="text-cyan-500"
                  />
                ))
              ) : (
                <p className="text-neutral-500">No pit stops recorded</p>
              )}
            </StatCard>

            {/* Biggest Comebacks */}
            <StatCard icon={TrendingUp} title="Biggest Comebacks" iconColor="text-orange-500">
              {allComebacks && allComebacks.length > 0 ? (
                <div className="space-y-3">
                  {allComebacks.map((comeback, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-orange-400 font-black w-6">#{index + 1}</span>
                      <div className="flex-1">
                        <div className="font-bold text-white">{comeback.driver}</div>
                        <div className="text-xs text-neutral-500">S{comeback.season}</div>
                      </div>
                        <Badge 
                          className="font-bold px-3 py-1 text-xs uppercase tracking-wider border-2"
                          style={{ 
                            backgroundColor: teamColors[comeback.team] || '#404040',
                            color: lightTeams.includes(comeback.team) ? 'black' : 'white',
                            borderColor: lightTeams.includes(comeback.team) ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'
                          }}
                        >
                        {comeback.team}
                      </Badge>
                      <div className="text-right">
                        <div className="text-orange-400 font-black">+{comeback.positionsGained}</div>
                        <div className="text-xs text-neutral-500">P{comeback.gridPosition}→P{comeback.finishPosition}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-500">No comebacks recorded</p>
              )}
            </StatCard>
          </div>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';