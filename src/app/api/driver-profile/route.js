import pool from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const driverSlug = searchParams.get('driver');
  
  if (!driverSlug) {
    return Response.json({ error: 'Driver parameter required' }, { status: 400 });
  }

  try {
    const driverName = driverSlug.replace(/-/g, ' ');
    
    const driverRes = await pool.query(
      'SELECT name, id FROM drivers WHERE LOWER(name) = LOWER($1)',
      [driverName]
    );
    
    if (driverRes.rows.length === 0) {
      return Response.json({ error: 'Driver not found' }, { status: 404 });
    }
    
    const { name: actualDriverName, id: driverId } = driverRes.rows[0];
    
    // Seasons 6-10
    const seasonStatsRes = await pool.query(
      'SELECT s.season, STRING_AGG(t.name, \'/\') AS teams, st.points ' +
      'FROM seasons s ' +
      'LEFT JOIN lineups l ON l.season_id = s.id AND l.driver_id = $1 ' +
      'LEFT JOIN teams t ON l.team_id = t.id ' +
      'LEFT JOIN standings st ON st.season_id = s.id AND st.driver_id = $1 AND st.type = $2 ' +
      'WHERE CAST(s.season AS INTEGER) >= 6 AND CAST(s.season AS INTEGER) <= 10 ' +
      'GROUP BY s.season, st.points ' +
      'ORDER BY s.season DESC',
      [driverId, 'drivers']
    );
    
    // Seasons 11+
    const calculatedPointsRes = await pool.query(
      `SELECT 
        s.season,
        STRING_AGG(DISTINCT t.name, '/') AS teams, 
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
            THEN 1 
            ELSE 0 
          END
        ) AS points
      FROM race_results rr
      JOIN races r ON rr.race_id = r.id
      JOIN seasons s ON r.season_id = s.id
      JOIN teams t ON rr.team_id = t.id
      WHERE CAST(s.season AS INTEGER) >= 11 AND rr.driver_id = $1
      GROUP BY s.season
      ORDER BY s.season DESC`,
      [driverId]
    );
    
    // All race results
    const raceStatsRes = await pool.query(
      'SELECT rr.race_id, rr.position, rr.adjusted_position, rr.grid_position, ' +
      'rr.fastest_lap_time_int, rr.status, s.season, t.name AS track_name, t.id AS track_id ' +
      'FROM race_results rr ' +
      'JOIN races r ON rr.race_id = r.id ' +
      'JOIN seasons s ON r.season_id = s.id ' +
      'JOIN tracks t ON r.track_id = t.id ' +
      'WHERE rr.driver_id = $1 AND CAST(s.season AS INTEGER) >= 6',
      [driverId]
    );
    
    // All fastest laps
    const fastestLapRes = await pool.query(
      'SELECT rr.race_id, rr.fastest_lap_time_int, s.season, t.name AS track_name ' +
      'FROM race_results rr ' +
      'JOIN races r ON rr.race_id = r.id ' +
      'JOIN seasons s ON r.season_id = s.id ' +
      'JOIN tracks t ON r.track_id = t.id ' +
      'WHERE rr.fastest_lap_time_int > 0 AND rr.driver_id = $1 ' +
      'AND CAST(s.season AS INTEGER) >= 6 ' +
      'AND rr.fastest_lap_time_int = (' +
      '  SELECT MIN(rr2.fastest_lap_time_int) FROM race_results rr2 ' +
      '  WHERE rr2.race_id = rr.race_id AND rr2.fastest_lap_time_int > 0' +
      ') ORDER BY s.season DESC, rr.race_id',
      [driverId]
    );
    
    const driverStats = buildDriverStats(
      seasonStatsRes.rows,
      calculatedPointsRes.rows,
      raceStatsRes.rows,
      fastestLapRes.rows
    );
    
    const trackStats = buildTrackStats(raceStatsRes.rows, fastestLapRes.rows);
    
    return Response.json({
      driverName: actualDriverName,
      driverStats,
      trackStats
    });
    
  } catch (error) {
    console.error('Error fetching driver profile:', error);
    return Response.json({ error: 'Failed to fetch driver profile', details: error.message }, { status: 500 });
  }
}

function buildDriverStats(seasonStats, calculatedPoints, raceResults, fastestLaps) {
  const stats = {
    seasons: {},
    career: { races: 0, wins: 0, podiums: 0, poles: 0, fastestLaps: 0, points: 0 },
    detailedBreakdowns: {
      races: [], wins: [], podiums: [], poles: [], fastestLaps: [], points: []
    }
  };
  
  // Process seasons 6-10
  seasonStats.forEach(row => {
    stats.seasons[row.season] = {
      team: row.teams || "Didn't Race",
      points: row.points !== null ? row.points : 'Unavailable'
    };
    if (row.points !== null) stats.career.points += parseInt(row.points, 10) || 0;
  });
  
  // Process seasons 11+
  calculatedPoints.forEach(row => {
    stats.seasons[row.season] = {
      team: row.teams || "Didn't Race",
      points: row.points || 0
    };
    stats.career.points += parseInt(row.points, 10) || 0;
  });
  
  stats.career.races = raceResults.length;
  
  // Process race results
  raceResults.forEach(row => {
    const effectivePosition = row.adjusted_position !== null ? row.adjusted_position : row.position;
    const racePoints = effectivePosition <= 10 && row.status !== 'DSQ' && row.status !== 'DNS' ? 
      [25, 18, 15, 12, 10, 8, 6, 4, 2, 1][effectivePosition - 1] || 0 : 0;
    const fastestLapBonus = fastestLaps.find(fl => fl.race_id === row.race_id) && effectivePosition <= 10 ? 1 : 0;
    
    stats.detailedBreakdowns.races.push({
      track_name: row.track_name,
      season: row.season,
      position: effectivePosition,
      grid_position: row.grid_position,
      status: row.status,
      points: racePoints + fastestLapBonus
    });
    
    if (racePoints + fastestLapBonus > 0) {
      stats.detailedBreakdowns.points.push({
        track_name: row.track_name,
        season: row.season,
        points: racePoints + fastestLapBonus,
        position: effectivePosition,
        fastestLapBonus: fastestLapBonus > 0
      });
    }
    
    if (effectivePosition === 1) {
      stats.career.wins++;
      stats.detailedBreakdowns.wins.push({
        track_name: row.track_name,
        season: row.season,
        grid_position: row.grid_position
      });
    }
    
    if (effectivePosition <= 3) {
      stats.career.podiums++;
      stats.detailedBreakdowns.podiums.push({
        track_name: row.track_name,
        season: row.season,
        position: effectivePosition,
        grid_position: row.grid_position
      });
    }
    
    if (row.grid_position === 1) {
      stats.career.poles++;
      stats.detailedBreakdowns.poles.push({
        track_name: row.track_name,
        season: row.season,
        race_position: effectivePosition
      });
    }
  });
  
  stats.career.fastestLaps = fastestLaps.length;
  fastestLaps.forEach(lap => {
    stats.detailedBreakdowns.fastestLaps.push({
      track_name: lap.track_name,
      season: lap.season,
      time: lap.fastest_lap_time_int ? 
        `${Math.floor(lap.fastest_lap_time_int / 60000)}:${((lap.fastest_lap_time_int % 60000) / 1000).toFixed(3).padStart(6, '0')}` : 
        'N/A'
    });
  });
  
  // Sort breakdowns
  Object.keys(stats.detailedBreakdowns).forEach(key => {
    stats.detailedBreakdowns[key].sort((a, b) => {
      if (a.season !== b.season) return parseInt(b.season) - parseInt(a.season);
      return a.track_name.localeCompare(b.track_name);
    });
  });
  
  return stats;
}

function buildTrackStats(raceResults, fastestLaps) {
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
      racePoints = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1][effectivePosition - 1] || 0;
    }
    
    const fastestLapBonus = fastestLaps.find(fl => fl.track_name === trackName && fl.race_id === race.race_id) && 
                           effectivePosition <= 10 ? 1 : 0;
    
    trackDataMap[trackName].total_points += racePoints + fastestLapBonus;
    
    if (race.grid_position && race.grid_position > 0) {
      trackDataMap[trackName].grid_positions.push(race.grid_position);
    }
    
    trackDataMap[trackName].races_count++;
  });
  
  const trackStatsArray = Object.values(trackDataMap).map(track => ({
    ...track,
    avg_grid_position: track.grid_positions.length > 0 ? 
      track.grid_positions.reduce((sum, pos) => sum + pos, 0) / track.grid_positions.length : null
  }));
  
  const qualifyingTracks = trackStatsArray.filter(track => track.grid_positions.length >= 2);
  const pointsTracks = trackStatsArray.filter(track => track.races_count >= 2);
  
  return {
    bestTracks: pointsTracks.sort((a, b) => b.total_points - a.total_points).slice(0, 3),
    worstTracks: pointsTracks.sort((a, b) => a.total_points - b.total_points).slice(0, 3),
    bestQualifyingTracks: qualifyingTracks.sort((a, b) => a.avg_grid_position - b.avg_grid_position).slice(0, 3),
    worstQualifyingTracks: qualifyingTracks.sort((a, b) => b.avg_grid_position - a.avg_grid_position).slice(0, 3),
    allTracksByPoints: pointsTracks.sort((a, b) => b.total_points - a.total_points),
    allTracksByQualifying: qualifyingTracks.sort((a, b) => a.avg_grid_position - b.avg_grid_position)
  };
}