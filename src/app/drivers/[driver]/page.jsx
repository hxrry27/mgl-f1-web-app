import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Trophy, 
  Flag, 
  Clock, 
  Car, 
  User,
  Medal,
  MapPin,
  TrendingUp,
  TrendingDown,
  Target,
  Eye
} from 'lucide-react';
import pool from '@/lib/db';
import { teamColors, lightTeams } from '@/lib/data';
import DriverSelector from './DriverSelector';
import { cn } from "@/lib/utils";

const pointsSystem = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

// Stat Card Component with Dialog
function StatCard({ title, value, icon, breakdownData, driverName, description }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="bg-neutral-800/50 border border-neutral-700/60 rounded-2xl p-4 flex flex-col items-center cursor-pointer hover:bg-neutral-700/50 hover:border-cyan-500/50 transition-all group">
          <div className="flex items-center gap-2 mb-2 text-neutral-400 text-sm group-hover:text-cyan-400 transition-colors">
            {icon}
            <span className="font-bold uppercase tracking-wider">{title}</span>
            <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-3xl font-black text-white">{value}</p>
        </div>
      </DialogTrigger>
      <DialogContent className="bg-neutral-900 border-neutral-700 backdrop-blur-xl max-w-2xl max-h-[80vh] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-white font-black flex items-center gap-2">
            {icon}
            {driverName} - {title}
          </DialogTitle>
          <p className="text-neutral-400 text-sm">{description}</p>
        </DialogHeader>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {breakdownData && breakdownData.length > 0 ? (
            breakdownData.map((item, idx) => (
              <div 
                key={idx}
                className="flex justify-between items-center p-4 bg-neutral-800/50 rounded-xl border-l-4 border-l-cyan-500 hover:bg-neutral-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-white font-bold">{item.track_name}</span>
                  <span className="text-neutral-500 text-sm">S{item.season}</span>
                </div>
                <div className="text-right">
                  {item.position !== undefined && (
                    <>
                      <p className="text-white font-black">
                        {title === 'Wins' ? '🏆 Victory' : 
                         title === 'Podiums' ? `${item.position === 1 ? '🥇' : item.position === 2 ? '🥈' : '🥉'} P${item.position}` :
                         title === 'Poles' ? '🏁 Pole' :
                         `P${item.position}`}
                      </p>
                      {item.grid_position && (
                        <p className="text-neutral-400 text-xs">
                          {title === 'Poles' ? `Race: P${item.position}` : `From P${item.grid_position}`}
                        </p>
                      )}
                    </>
                  )}
                  {item.time && (
                    <p className="text-green-400 font-black">⚡ {item.time}</p>
                  )}
                  {item.points !== undefined && title === 'Points' && (
                    <>
                      <p className="text-cyan-400 font-black">{item.points} pts</p>
                      <p className="text-neutral-400 text-xs">
                        P{item.position}{item.fastestLapBonus ? ' + FL' : ''}
                      </p>
                    </>
                  )}
                  {item.points !== undefined && title === 'Races' && (
                    <p className="text-neutral-400 text-xs">
                      Grid: P{item.grid_position} • {item.points} pts
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-neutral-400 text-center py-8">No {title.toLowerCase()} recorded</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Track Performance Card
function TrackPerformanceCard({ title, icon, tracks, allTracks, driverName, sortLabel, isQualifying = false }) {
  return (
    <Card className="bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50 rounded-3xl overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-xl text-white">
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-black">{title}</span>
          </div>
          {allTracks?.length > 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <button className="flex items-center gap-1 text-sm text-neutral-400 hover:text-cyan-400 transition-colors bg-neutral-800/50 hover:bg-neutral-700/50 px-3 py-2 rounded-xl font-bold uppercase tracking-wider">
                  <Eye className="w-3 h-3" />
                  View All
                </button>
              </DialogTrigger>
              <DialogContent className="bg-neutral-900 border-neutral-700 backdrop-blur-xl max-w-lg rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-white font-black">All Tracks - {driverName}</DialogTitle>
                  <p className="text-neutral-400 text-sm">{sortLabel}</p>
                </DialogHeader>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {allTracks.map((track, index) => (
                    <div 
                      key={index}
                      className="flex justify-between items-center p-3 bg-neutral-800/50 rounded-xl border-l-4 hover:bg-neutral-700/50 transition-colors" 
                      style={{ 
                        borderLeftColor: index < 3 ? '#10b981' : 
                                        index >= allTracks.length - 3 ? '#ef4444' : 
                                        '#525252' 
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-white font-black w-8">#{index + 1}</span>
                        <span className="text-white">{track.track_name}</span>
                      </div>
                      <div className="text-right">
                        {isQualifying ? (
                          <>
                            <p className="text-white font-black">
                              {typeof track.avg_grid_position === 'string' ? 
                                track.avg_grid_position : 
                                `P${track.avg_grid_position.toFixed(1)}`}
                            </p>
                            <p className="text-neutral-400 text-xs">{track.grid_positions.length} qualifyings</p>
                          </>
                        ) : (
                          <>
                            <p className="text-white font-black">{track.total_points} pts</p>
                            <p className="text-neutral-400 text-xs">{track.races_count} races</p>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>
        <p className="text-neutral-400 text-xs uppercase tracking-wider font-bold">{sortLabel}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Best Tracks */}
        <div>
          <h3 className="flex items-center gap-2 text-lg font-black text-white mb-3">
            <TrendingUp className="h-4 w-4 text-green-400" />
            Best {isQualifying ? 'Qualifying' : 'Tracks'}
          </h3>
          <div className="space-y-2">
            {tracks.best.map((track, index) => (
              <div 
                key={index}
                className="flex items-center justify-between bg-neutral-800/50 rounded-xl p-4 border border-neutral-700/50 hover:bg-neutral-700/50 hover:border-green-500/50 transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="text-green-400 font-black text-lg">#{index + 1}</span>
                  <span className="text-white font-bold">{track.track_name}</span>
                </div>
                <div className="text-right">
                  {isQualifying ? (
                    <>
                      <p className="text-white font-black">
                        {typeof track.avg_grid_position === 'string' ? 
                          track.avg_grid_position : 
                          `P${track.avg_grid_position.toFixed(1)}`}
                      </p>
                      <p className="text-neutral-400 text-xs">{track.grid_positions.length} qualifyings</p>
                    </>
                  ) : (
                    <>
                      <p className="text-white font-black">{track.total_points} pts</p>
                      <p className="text-neutral-400 text-xs">{track.races_count} races</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Worst Tracks */}
        <div>
          <h3 className="flex items-center gap-2 text-lg font-black text-white mb-3">
            <TrendingDown className="h-4 w-4 text-red-400" />
            Worst {isQualifying ? 'Qualifying' : 'Tracks'}
          </h3>
          <div className="space-y-2">
            {tracks.worst.map((track, index) => (
              <div 
                key={index}
                className="flex items-center justify-between bg-neutral-800/50 rounded-xl p-4 border border-neutral-700/50 hover:bg-neutral-700/50 hover:border-red-500/50 transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="text-red-400 font-black text-lg">#{index + 1}</span>
                  <span className="text-white font-bold">{track.track_name}</span>
                </div>
                <div className="text-right">
                  {isQualifying ? (
                    <>
                      <p className="text-white font-black">
                        {typeof track.avg_grid_position === 'string' ? 
                          track.avg_grid_position : 
                          `P${track.avg_grid_position.toFixed(1)}`}
                      </p>
                      <p className="text-neutral-400 text-xs">{track.grid_positions.length} qualifyings</p>
                    </>
                  ) : (
                    <>
                      <p className="text-white font-black">{track.total_points} pts</p>
                      <p className="text-neutral-400 text-xs">{track.races_count} races</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DriverPage({ params }) {
  const { driver } = await params;
  const driverSlug = driver.trim();

  let driverData, driverName, driverId;
  
  try {
    const driverRes = await pool.query(
      'SELECT name, id FROM drivers WHERE LOWER(REPLACE(name, \' \', \'-\')) = LOWER($1)',
      [driverSlug]
    );
    driverData = driverRes.rows[0];
    if (!driverData) {
      throw new Error('Driver not found');
    }
    driverName = driverData.name;
    driverId = driverData.id;
  } catch (error) {
    return (
      <div className="min-h-screen bg-neutral-950">
        <div className="max-w-[1400px] mx-auto px-6 py-8">
          <Card className="bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50 rounded-3xl">
            <CardContent className="flex flex-col items-center justify-center py-20 text-neutral-500">
              <User className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-bold">Driver not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Fetch season stats
  const driverStats = {
    seasons: {},
    career: { races: 0, wins: 0, podiums: 0, poles: 0, fastestLaps: 0, points: 0 },
    detailedBreakdowns: {
      races: [],
      wins: [],
      podiums: [],
      poles: [],
      fastestLaps: [],
      points: []
    }
  };

  // Get stats from standings table (seasons 6-10)
  try {
    const seasonStatsRes = await pool.query(
      'SELECT s.season, STRING_AGG(DISTINCT t.name, \'/\') AS team, st.points ' +
      'FROM seasons s ' +
      'LEFT JOIN lineups l ON l.season_id = s.id AND l.driver_id = $1 ' +
      'LEFT JOIN teams t ON l.team_id = t.id ' +
      'LEFT JOIN standings st ON st.season_id = s.id AND st.driver_id = $1 AND st.type = $2 ' +
      'WHERE CAST(s.season AS INTEGER) >= 6 AND CAST(s.season AS INTEGER) <= 10 ' +
      'GROUP BY s.season, st.points ' +
      'ORDER BY s.season DESC',
      [driverId, 'drivers']
    );

    seasonStatsRes.rows.forEach((row) => {
      driverStats.seasons[row.season] = {
        team: row.team || "Didn't Race",
        points: row.points !== null ? row.points : "Didn't Race",
      };
      if (row.points !== null) driverStats.career.points += parseInt(row.points, 10) || 0;
    });
  } catch (error) {
    console.error('Error fetching season stats:', error);
  }

  // Get calculated points for seasons 11+
  try {
    const calculatedPointsRes = await pool.query(
      `SELECT 
        s.season,
        STRING_AGG(DISTINCT t.name, '/') AS team, 
        SUM(
          CASE 
            WHEN COALESCE(rr.adjusted_position, rr.position) <= 10 
              AND rr.status != 'DSQ' AND rr.status != 'DNS'
            THEN 
              (ARRAY[25, 18, 15, 12, 10, 8, 6, 4, 2, 1])[COALESCE(rr.adjusted_position, rr.position)]
            ELSE 0
          END + 
          CASE 
            WHEN rr.fastest_lap_time_int > 0 
              AND rr.fastest_lap_time_int = (
                SELECT MIN(rr2.fastest_lap_time_int) 
                FROM race_results rr2 
                WHERE rr2.race_id = rr.race_id AND rr2.fastest_lap_time_int > 0
              ) 
              AND COALESCE(rr.adjusted_position, rr.position) <= 10
              AND rr.status != 'DSQ' AND rr.status != 'DNS'
              AND CAST(s.season AS INTEGER) < 12
            THEN 1 
            ELSE 0 
          END
        ) AS points
      FROM race_results rr
      JOIN races r ON rr.race_id = r.id
      JOIN seasons s ON r.season_id = s.id
      JOIN teams t ON rr.team_id = t.id
      WHERE CAST(s.season AS INTEGER) >= 11
      AND rr.driver_id = $1
      GROUP BY s.season
      ORDER BY s.season DESC`,
      [driverId]
    );

    calculatedPointsRes.rows.forEach((row) => {
      driverStats.seasons[row.season] = {
        team: row.team || "Didn't Race",
        points: row.points || 0,
      };
      driverStats.career.points += parseInt(row.points, 10) || 0;
    });
  } catch (error) {
    console.error('Error fetching calculated points:', error);
  }

  // Get race results and detailed breakdowns
  try {
    const raceStatsRes = await pool.query(
      'SELECT ' +
      '  rr.race_id, ' +
      '  rr.position, ' +
      '  rr.adjusted_position, ' +
      '  rr.grid_position, ' +
      '  rr.fastest_lap_time_int, ' +
      '  rr.status, ' +
      '  s.season, ' +
      '  t.name AS track_name, ' +
      '  t.id AS track_id, ' +
      '  tm.name AS team_name ' +
      'FROM race_results rr ' +
      'JOIN races r ON rr.race_id = r.id ' +
      'JOIN seasons s ON r.season_id = s.id ' +
      'JOIN tracks t ON r.track_id = t.id ' +
      'JOIN teams tm ON rr.team_id = tm.id ' +
      'WHERE rr.driver_id = $1 ' +
      'AND CAST(s.season AS INTEGER) >= 6',
      [driverId]
    );
    const raceResults = raceStatsRes.rows;

    // Get fastest laps
    const fastestLapsRes = await pool.query(
      'SELECT ' +
      '  rr.race_id, ' +
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
    const fastestLapRaces = fastestLapsRes.rows;

    driverStats.career.races = raceResults.length;
    
    raceResults.forEach(row => {
      const effectivePosition = row.adjusted_position !== null ? row.adjusted_position : row.position;
      
      const racePoints = effectivePosition <= 10 && row.status !== 'DSQ' && row.status !== 'DNS' ? 
        pointsSystem[effectivePosition - 1] || 0 : 0;
      const fastestLapBonus = fastestLapRaces.find(fl => fl.race_id === row.race_id) && 
                              effectivePosition <= 10 && 
                              parseInt(row.season) < 12 ? 1 : 0;
      
      driverStats.detailedBreakdowns.races.push({
        track_name: row.track_name,
        season: row.season,
        position: effectivePosition,
        grid_position: row.grid_position,
        status: row.status,
        points: racePoints + fastestLapBonus
      });
      
      if (racePoints + fastestLapBonus > 0) {
        driverStats.detailedBreakdowns.points.push({
          track_name: row.track_name,
          season: row.season,
          points: racePoints + fastestLapBonus,
          position: effectivePosition,
          fastestLapBonus: fastestLapBonus > 0
        });
      }
      
      if (effectivePosition === 1) {
        driverStats.career.wins += 1;
        driverStats.detailedBreakdowns.wins.push({
          track_name: row.track_name,
          season: row.season,
          grid_position: row.grid_position,
          position: effectivePosition
        });
      }
      
      if (effectivePosition <= 3) {
        driverStats.career.podiums += 1;
        driverStats.detailedBreakdowns.podiums.push({
          track_name: row.track_name,
          season: row.season,
          position: effectivePosition,
          grid_position: row.grid_position
        });
      }
      
      if (row.grid_position === 1) {
        driverStats.career.poles += 1;
        driverStats.detailedBreakdowns.poles.push({
          track_name: row.track_name,
          season: row.season,
          position: effectivePosition,
          grid_position: row.grid_position
        });
      }
    });
    
    driverStats.career.fastestLaps = fastestLapRaces.length;
    fastestLapRaces.forEach(lap => {
      driverStats.detailedBreakdowns.fastestLaps.push({
        track_name: lap.track_name,
        season: lap.season,
        time: lap.fastest_lap_time_int ? 
          `${Math.floor(lap.fastest_lap_time_int / 60000)}:${((lap.fastest_lap_time_int % 60000) / 1000).toFixed(3).padStart(6, '0')}` : 
          'N/A'
      });
    });

    // Sort all breakdowns
    Object.keys(driverStats.detailedBreakdowns).forEach(key => {
      driverStats.detailedBreakdowns[key].sort((a, b) => {
        if (a.season !== b.season) return parseInt(b.season) - parseInt(a.season);
        return a.track_name.localeCompare(b.track_name);
      });
    });
  } catch (error) {
    console.error('Error fetching race stats:', error);
  }

  // Calculate track performance
  let trackStats = { 
    best: [], 
    worst: [], 
    bestQualifying: [], 
    worstQualifying: [],
    allTracksByPoints: [],
    allTracksByQualifying: []
  };

  try {
    const raceStatsRes = await pool.query(
      'SELECT ' +
      '  rr.race_id, ' +
      '  rr.position, ' +
      '  rr.adjusted_position, ' +
      '  rr.grid_position, ' +
      '  rr.fastest_lap_time_int, ' +
      '  rr.status, ' +
      '  s.season, ' +
      '  t.name AS track_name, ' +
      '  t.id AS track_id ' +
      'FROM race_results rr ' +
      'JOIN races r ON rr.race_id = r.id ' +
      'JOIN seasons s ON r.season_id = s.id ' +
      'JOIN tracks t ON r.track_id = t.id ' +
      'WHERE rr.driver_id = $1 ' +
      'AND CAST(s.season AS INTEGER) >= 6',
      [driverId]
    );
    const raceResults = raceStatsRes.rows;

    const fastestLapsRes = await pool.query(
      'SELECT ' +
      '  rr.race_id, ' +
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
      ')',
      [driverId]
    );
    const fastestLapRaces = fastestLapsRes.rows;

    const trackDataMap = {};
    
    raceResults.forEach(race => {
      const trackName = race.track_name;
      if (!trackDataMap[trackName]) {
        trackDataMap[trackName] = {
          track_name: trackName,
          track_id: race.track_id,
          total_points: 0,
          grid_positions: [],
          races_count: 0
        };
      }
      
      const effectivePosition = race.adjusted_position !== null ? race.adjusted_position : race.position;
      let racePoints = 0;
      
      if (effectivePosition <= 10 && race.status !== 'DSQ' && race.status !== 'DNS') {
        racePoints += pointsSystem[effectivePosition - 1] || 0;
      }
      
      const fastestLapAtTrack = fastestLapRaces.find(fl => 
        fl.track_name === trackName && 
        fl.race_id === race.race_id
      );
      if (fastestLapAtTrack && effectivePosition <= 10 && race.status !== 'DSQ' && race.status !== 'DNS' && parseInt(race.season) < 12) {
        racePoints += 1;
      }
      
      trackDataMap[trackName].total_points += racePoints;
      
      if (race.grid_position && race.grid_position > 0) {
        trackDataMap[trackName].grid_positions.push(race.grid_position);
      }
      
      trackDataMap[trackName].races_count += 1;
    });
    
    const trackStatsArray = Object.values(trackDataMap).map(track => ({
      ...track,
      avg_grid_position: track.grid_positions.length > 0 ? 
        track.grid_positions.reduce((sum, pos) => sum + pos, 0) / track.grid_positions.length : null
    }));
    
    const qualifyingTracks = trackStatsArray.filter(track => track.grid_positions.length >= 4);
    const pointsTracks = trackStatsArray.filter(track => track.races_count >= 4);
    
    trackStats.allTracksByPoints = pointsTracks.sort((a, b) => b.total_points - a.total_points);
    trackStats.allTracksByQualifying = qualifyingTracks.sort((a, b) => a.avg_grid_position - b.avg_grid_position);
    
    trackStats.best = trackStats.allTracksByPoints.slice(0, 3);
    trackStats.worst = trackStats.allTracksByPoints.slice(-3).reverse();
    trackStats.bestQualifying = trackStats.allTracksByQualifying.slice(0, 3);
    trackStats.worstQualifying = trackStats.allTracksByQualifying.slice(-3).reverse();
  } catch (error) {
    console.error('Error calculating track stats:', error);
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-5xl font-black text-white flex items-center gap-3">
            <User className="h-10 w-10 text-cyan-400" />
            {driverName}
          </h1>
          <DriverSelector currentDriver={driver} />
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Season-by-Season Stats */}
          <Card className="bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50 rounded-3xl overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl text-white font-black">
                <Car className="h-5 w-5 text-cyan-400" />
                Season-by-Season Stats
              </CardTitle>
              <p className="text-neutral-400 text-xs uppercase tracking-wider font-bold">From Season 6 onwards</p>
            </CardHeader>
            <CardContent className="p-0 max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-neutral-900/95 backdrop-blur-sm">
                  <tr className="border-b border-neutral-800">
                    <th className="text-left p-4 text-neutral-400 font-bold uppercase tracking-wider text-xs">Season</th>
                    <th className="text-left p-4 text-neutral-400 font-bold uppercase tracking-wider text-xs">Team</th>
                    <th className="text-right p-4 text-neutral-400 font-bold uppercase tracking-wider text-xs">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(driverStats.seasons).map(([season, stats], index) => (
                    <tr
                      key={season}
                      className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors"
                    >
                      <td className="p-4">
                        <span className="text-white font-black">S{season}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {stats.team.split('/').map((team, idx) => (
                            <Badge 
                              key={idx}
                              className="font-bold px-3 py-1 text-xs uppercase tracking-wider border-2"
                              style={{ 
                                backgroundColor: team === "Didn't Race" ? '#404040' : teamColors[team] || '#404040',
                                color: team === "Didn't Race" ? '#888' : (lightTeams.includes(team) ? 'black' : 'white'),
                                borderColor: team === "Didn't Race" ? 'rgba(136,136,136,0.2)' : (lightTeams.includes(team) ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)')
                              }}
                            >
                              {team}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        {typeof stats.points === 'string' ? (
                          <span className="text-neutral-500 italic text-sm">{stats.points}</span>
                        ) : (
                          <span className="text-cyan-400 font-black text-lg">{stats.points}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          
          {/* Career Stats */}
          <Card className="bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50 rounded-3xl overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl text-white font-black">
                <Trophy className="h-5 w-5 text-yellow-400" />
                Career Stats
              </CardTitle>
              <p className="text-neutral-400 text-xs uppercase tracking-wider font-bold">From Season 6 onwards</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  title="Races"
                  value={driverStats.career.races}
                  icon={<Car className="h-4 w-4 text-cyan-400" />}
                  breakdownData={driverStats.detailedBreakdowns.races}
                  driverName={driverName}
                  description="All race participations"
                />
                <StatCard
                  title="Wins"
                  value={driverStats.career.wins}
                  icon={<Trophy className="h-4 w-4 text-yellow-400" />}
                  breakdownData={driverStats.detailedBreakdowns.wins}
                  driverName={driverName}
                  description="All race victories"
                />
                <StatCard
                  title="Podiums"
                  value={driverStats.career.podiums}
                  icon={<Medal className="h-4 w-4 text-orange-400" />}
                  breakdownData={driverStats.detailedBreakdowns.podiums}
                  driverName={driverName}
                  description="All podium finishes (1st-3rd)"
                />
                <StatCard
                  title="Poles"
                  value={driverStats.career.poles}
                  icon={<Flag className="h-4 w-4 text-purple-400" />}
                  breakdownData={driverStats.detailedBreakdowns.poles}
                  driverName={driverName}
                  description="All pole positions"
                />
                <StatCard
                  title="Fastest Laps"
                  value={driverStats.career.fastestLaps}
                  icon={<Clock className="h-4 w-4 text-green-400" />}
                  breakdownData={driverStats.detailedBreakdowns.fastestLaps}
                  driverName={driverName}
                  description="All fastest lap achievements"
                />
                <StatCard
                  title="Points"
                  value={driverStats.career.points}
                  icon={<Trophy className="h-4 w-4 text-cyan-400" />}
                  breakdownData={driverStats.detailedBreakdowns.points}
                  driverName={driverName}
                  description="All points scored"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Track Analysis Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TrackPerformanceCard
            title="Track Performance"
            icon={<MapPin className="h-5 w-5 text-green-400" />}
            tracks={{ best: trackStats.best, worst: trackStats.worst }}
            allTracks={trackStats.allTracksByPoints}
            driverName={driverName}
            sortLabel="Ranked by total points scored"
            isQualifying={false}
          />

          <TrackPerformanceCard
            title="Qualifying Performance"
            icon={<Target className="h-5 w-5 text-purple-400" />}
            tracks={{ best: trackStats.bestQualifying, worst: trackStats.worstQualifying }}
            allTracks={trackStats.allTracksByQualifying}
            driverName={driverName}
            sortLabel="Ranked by average grid position (lower is better)"
            isQualifying={true}
          />
        </div>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';