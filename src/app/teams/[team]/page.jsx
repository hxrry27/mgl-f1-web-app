import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Trophy, 
  Flag, 
  Clock, 
  Car, 
  UsersRound,
  Medal,
  MapPin,
  TrendingUp,
  TrendingDown,
  Target,
  Eye
} from 'lucide-react';
import pool from '@/lib/db';
import { teamColors, lightTeams } from '@/lib/data';
import TeamSelector from './TeamSelector';

const pointsSystem = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

const normalizeTeamName = (name) => {
  return typeof name === 'string' ? name.trim().toLowerCase().replace(/\s+/g, '-') : '';
};

export default async function TeamPage({ params }) {
  const { team } = params;
  const teamGamertag = team.trim();

  let teamData, teamName, teamId;
  
  try {
    const teamRes = await pool.query('SELECT name, id FROM teams WHERE LOWER(name) = LOWER($1)', [teamGamertag.replace(/-/g, ' ')]);
    teamData = teamRes.rows[0];
    if (!teamData) {
      return (
        <div className="flex flex-col items-center">
          <p className="text-white">Team not found.</p>
        </div>
      );
    }
    teamName = teamData.name;
    teamId = teamData.id;
  } catch (error) {
    // Database connection failed - use test data
    teamName = teamGamertag.replace(/-/g, ' ');
    teamId = 'test-id';
  }

  let seasonStatsRes;
  try {
    // Season-by-season stats (S6 to 10, which are done this way because they're based off of the standings table, which is legacy)
    seasonStatsRes = await pool.query(
      'SELECT s.season, STRING_AGG(DISTINCT d.name, \'/\') AS drivers, st.points ' +
      'FROM seasons s ' +
      'LEFT JOIN lineups l ON l.season_id = s.id AND l.team_id = $1 ' +
      'LEFT JOIN drivers d ON l.driver_id = d.id ' +
      'LEFT JOIN standings st ON st.season_id = s.id AND st.team_id = $1 AND st.type = $2 ' +
      'WHERE CAST(s.season AS INTEGER) >= 6 AND CAST(s.season AS INTEGER) <= 10 ' +
      'GROUP BY s.season, st.points ' +
      'ORDER BY s.season DESC',
      [teamId, 'constructors']
    );
  } catch (error) {
    // Database connection failed - use test data
    seasonStatsRes = { rows: [] };
  }

  let calculatedPointsRes;
  try {
    // Season-by-season stats (s11 onwards, done this way to avoid having a separate standalone table for standings, just dynamically calculates instead. this DOES account for adjusted position post penalties)
    calculatedPointsRes = await pool.query(
      `SELECT 
        s.season,
        STRING_AGG(DISTINCT d.name, '/') AS drivers, 
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
      JOIN drivers d ON rr.driver_id = d.id
      WHERE CAST(s.season AS INTEGER) >= 11
      AND rr.team_id = $1
      GROUP BY s.season
      ORDER BY s.season DESC`,
      [teamId]
    );
  } catch (error) {
    // Database connection failed - use test data
    calculatedPointsRes = { rows: [] };
  }

  const teamStats = {
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

  if (teamId === 'test-id') {
    // Use test data when database is down
    teamStats.seasons = {
      '12': { drivers: 'Test Data', points: 'Test Data' },
      '11': { drivers: 'Test Data', points: 'Test Data' },
      '10': { drivers: 'Test Data', points: 'Test Data' },
    };
    teamStats.career = {
      races: 'Test Data',
      wins: 'Test Data',
      podiums: 'Test Data',
      poles: 'Test Data',
      fastestLaps: 'Test Data',
      points: 'Test Data'
    };
    teamStats.detailedBreakdowns = {
      races: [
        { track_name: 'Monaco', season: '11', driver: 'Test Driver 1', position: 3, grid_position: 2, status: 'Finished' },
        { track_name: 'Monaco', season: '11', driver: 'Test Driver 2', position: 5, grid_position: 4, status: 'Finished' },
        { track_name: 'Silverstone', season: '11', driver: 'Test Driver 1', position: 1, grid_position: 1, status: 'Finished' }
      ],
      wins: [
        { track_name: 'Silverstone', season: '11', driver: 'Test Driver 1', grid_position: 1 },
        { track_name: 'Monaco', season: '10', driver: 'Test Driver 2', grid_position: 2 }
      ],
      podiums: [
        { track_name: 'Monaco', season: '11', driver: 'Test Driver 1', position: 3, grid_position: 2 },
        { track_name: 'Silverstone', season: '11', driver: 'Test Driver 1', position: 1, grid_position: 1 },
        { track_name: 'Spa-Francorchamps', season: '10', driver: 'Test Driver 2', position: 2, grid_position: 4 }
      ],
      poles: [
        { track_name: 'Silverstone', season: '11', driver: 'Test Driver 1' },
        { track_name: 'Monaco', season: '10', driver: 'Test Driver 2' }
      ],
      fastestLaps: [
        { track_name: 'Monaco', season: '11', driver: 'Test Driver 1', time: '1:12.345' },
        { track_name: 'Silverstone', season: '10', driver: 'Test Driver 2', time: '1:23.456' }
      ],
      points: [
        { track_name: 'Monaco', season: '11', driver: 'Test Driver 1', points: 15, position: 3 },
        { track_name: 'Silverstone', season: '11', driver: 'Test Driver 1', points: 26, position: 1 },
        { track_name: 'Spa-Francorchamps', season: '10', driver: 'Test Driver 2', points: 18, position: 2 }
      ]
    };
  } else {
    // adding the data from the standings table (s6 - s10)
    seasonStatsRes.rows.forEach((row) => {
      teamStats.seasons[row.season] = {
        drivers: row.drivers || "No Drivers",
        points: row.points !== null ? row.points : 'Unavailable',
      };
      if (row.points !== null) teamStats.career.points += parseInt(row.points, 10) || 0;
    });

    //adding the data from the calculated season standings (s11 onwards)
    calculatedPointsRes.rows.forEach((row) => {
      teamStats.seasons[row.season] = {
        drivers: row.drivers || "No Drivers",
        points: row.points || 0,
      };
      teamStats.career.points += parseInt(row.points, 10) || 0;
    });
  }

  let trackStats = { bestTracks: [], worstTracks: [], bestQualifyingTracks: [], worstQualifyingTracks: [] };

  if (teamId !== 'test-id') {
    let raceStatsRes, allRaceResultsRes;
    try {
      // Fetch race results for career stats (S6+)
      raceStatsRes = await pool.query(
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
        '  d.name AS driver_name ' +
        'FROM race_results rr ' +
        'JOIN races r ON rr.race_id = r.id ' +
        'JOIN seasons s ON r.season_id = s.id ' +
        'JOIN tracks t ON r.track_id = t.id ' +
        'JOIN drivers d ON rr.driver_id = d.id ' +
        'WHERE rr.team_id = $1 ' +
        'AND CAST(s.season AS INTEGER) >= 6',
        [teamId]
      );
      const raceResults = raceStatsRes.rows;

      // Fetch all race results with fastest laps logic (S6+)
      allRaceResultsRes = await pool.query(
        'SELECT ' +
        '  rr.race_id, ' +
        '  rr.driver_id, ' +
        '  rr.fastest_lap_time_int, ' +
        '  s.season, ' +
        '  t.name AS track_name, ' +
        '  d.name AS driver_name ' +
        'FROM race_results rr ' +
        'JOIN races r ON rr.race_id = r.id ' +
        'JOIN seasons s ON r.season_id = s.id ' +
        'JOIN tracks t ON r.track_id = t.id ' +
        'JOIN drivers d ON rr.driver_id = d.id ' +
        'WHERE rr.fastest_lap_time_int > 0 ' +
        'AND rr.team_id = $1 ' +
        'AND CAST(s.season AS INTEGER) >= 6 ' +
        'AND rr.fastest_lap_time_int = (' +
        '  SELECT MIN(rr2.fastest_lap_time_int) ' +
        '  FROM race_results rr2 ' +
        '  WHERE rr2.race_id = rr.race_id ' +
        '  AND rr2.fastest_lap_time_int > 0' +
        ') ' +
        'ORDER BY s.season DESC, rr.race_id',
        [teamId]
      );
      const fastestLapRaces = allRaceResultsRes.rows;

      // Process career stats (all from S6+)
      teamStats.career.races = raceResults.length; // Now only S6+
      
      // Build detailed breakdowns
      raceResults.forEach(row => {
        const effectivePosition = row.adjusted_position !== null ? row.adjusted_position : row.position;
        
        // All races
        const racePoints = effectivePosition <= 10 && row.status !== 'DSQ' && row.status !== 'DNS' ? 
          [25, 18, 15, 12, 10, 8, 6, 4, 2, 1][effectivePosition - 1] || 0 : 0;
        const fastestLapBonus = fastestLapRaces.find(fl => fl.race_id === row.race_id && fl.driver_name === row.driver_name) && effectivePosition <= 10 ? 1 : 0;
        
        teamStats.detailedBreakdowns.races.push({
          track_name: row.track_name,
          season: row.season,
          driver: row.driver_name,
          position: effectivePosition,
          grid_position: row.grid_position,
          status: row.status,
          points: racePoints + fastestLapBonus
        });
        
        // Points breakdown
        if (racePoints + fastestLapBonus > 0) {
          teamStats.detailedBreakdowns.points.push({
            track_name: row.track_name,
            season: row.season,
            driver: row.driver_name,
            points: racePoints + fastestLapBonus,
            position: effectivePosition,
            fastestLapBonus: fastestLapBonus > 0
          });
        }
        
        // Wins
        if (effectivePosition === 1) {
          teamStats.career.wins += 1;
          teamStats.detailedBreakdowns.wins.push({
            track_name: row.track_name,
            season: row.season,
            driver: row.driver_name,
            grid_position: row.grid_position
          });
        }
        
        // Podiums
        if (effectivePosition <= 3) {
          teamStats.career.podiums += 1;
          teamStats.detailedBreakdowns.podiums.push({
            track_name: row.track_name,
            season: row.season,
            driver: row.driver_name,
            position: effectivePosition,
            grid_position: row.grid_position
          });
        }
        
        // Poles
        if (row.grid_position === 1) {
          teamStats.career.poles += 1;
          teamStats.detailedBreakdowns.poles.push({
            track_name: row.track_name,
            season: row.season,
            driver: row.driver_name,
            race_position: effectivePosition
          });
        }
      });
      
      // Fastest laps
      teamStats.career.fastestLaps = fastestLapRaces.length; // Now only S6+
      fastestLapRaces.forEach(lap => {
        teamStats.detailedBreakdowns.fastestLaps.push({
          track_name: lap.track_name,
          season: lap.season,
          driver: lap.driver_name,
          time: lap.fastest_lap_time_int ? `${Math.floor(lap.fastest_lap_time_int / 60000)}:${((lap.fastest_lap_time_int % 60000) / 1000).toFixed(3).padStart(6, '0')}` : 'N/A'
        });
      });
      
      // Calculate total points from detailed breakdown
      teamStats.career.points = teamStats.detailedBreakdowns.points.reduce((total, race) => total + race.points, 0);
      
      // Sort all breakdowns by season and track
      Object.keys(teamStats.detailedBreakdowns).forEach(key => {
        teamStats.detailedBreakdowns[key].sort((a, b) => {
          if (a.season !== b.season) return parseInt(b.season) - parseInt(a.season);
          return a.track_name.localeCompare(b.track_name);
        });
      });

      // Calculate track-specific stats
      const trackDataMap = {};
      
      // Process each race result
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
        
        // Calculate points for this race
        const effectivePosition = race.adjusted_position !== null ? race.adjusted_position : race.position;
        let racePoints = 0;
        
        // Points for finishing position (top 10 get points)
        if (effectivePosition <= 10 && race.status !== 'DSQ' && race.status !== 'DNS') {
          const pointsArray = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
          racePoints += pointsArray[effectivePosition - 1] || 0;
        }
        
        // Check if driver got fastest lap point (only if they finished in top 10)
        const fastestLapAtTrack = fastestLapRaces.find(fl => fl.track_name === trackName && fl.race_id === race.race_id && fl.driver_name === race.driver_name);
        if (fastestLapAtTrack && effectivePosition <= 10 && race.status !== 'DSQ' && race.status !== 'DNS') {
          racePoints += 1;
        }
        
        trackDataMap[trackName].total_points += racePoints;
        
        // Add grid position if available
        if (race.grid_position && race.grid_position > 0) {
          trackDataMap[trackName].grid_positions.push(race.grid_position);
        }
        
        trackDataMap[trackName].races_count += 1;
      });
      
      // Convert to arrays and calculate averages
      const trackStatsArray = Object.values(trackDataMap).map(track => ({
        ...track,
        avg_grid_position: track.grid_positions.length > 0 ? 
          track.grid_positions.reduce((sum, pos) => sum + pos, 0) / track.grid_positions.length : null
      }));
      
      // Filter tracks with at least 2 races for meaningful statistics
      const qualifyingTracks = trackStatsArray.filter(track => track.grid_positions.length >= 4); // At least 2 races with both drivers
      const pointsTracks = trackStatsArray.filter(track => track.races_count >= 4); // At least 2 races with both drivers
      
      // Sort and get top/bottom 3
      trackStats.bestTracks = pointsTracks
        .sort((a, b) => b.total_points - a.total_points)
        .slice(0, 3);
      
      trackStats.worstTracks = pointsTracks
        .sort((a, b) => a.total_points - b.total_points)
        .slice(0, 3);
      
      // For qualifying, lower average grid position is better
      trackStats.bestQualifyingTracks = qualifyingTracks
        .sort((a, b) => a.avg_grid_position - b.avg_grid_position)
        .slice(0, 3);
      
      trackStats.worstQualifyingTracks = qualifyingTracks
        .sort((a, b) => b.avg_grid_position - a.avg_grid_position)
        .slice(0, 3);

      // Save full rankings for popups
      trackStats.allTracksByPoints = pointsTracks
        .sort((a, b) => b.total_points - a.total_points);
      
      trackStats.allTracksByQualifying = qualifyingTracks
        .sort((a, b) => a.avg_grid_position - b.avg_grid_position);
      
    } catch (error) {
      // Database connection failed - stats already set to test data above
    }
  } else {
    // Test data for track stats
    const testTracksByPoints = [
      { track_name: 'Monaco', total_points: 45, races_count: 6 },
      { track_name: 'Silverstone', total_points: 38, races_count: 8 },
      { track_name: 'Spa-Francorchamps', total_points: 32, races_count: 6 },
      { track_name: 'Monza', total_points: 28, races_count: 8 },
      { track_name: 'Suzuka', total_points: 22, races_count: 6 },
      { track_name: 'Interlagos', total_points: 18, races_count: 6 },
      { track_name: 'Barcelona', total_points: 15, races_count: 8 },
      { track_name: 'Austria', total_points: 12, races_count: 6 },
      { track_name: 'Hungary', total_points: 8, races_count: 6 },
      { track_name: 'Singapore', total_points: 4, races_count: 4 }
    ];

    const testTracksByQualifying = [
      { track_name: 'Monaco', avg_grid_position: 2.3, grid_positions: [1, 2, 4, 3] },
      { track_name: 'Silverstone', avg_grid_position: 3.5, grid_positions: [2, 3, 5, 4, 2, 3, 5, 4] },
      { track_name: 'Spa-Francorchamps', avg_grid_position: 4.0, grid_positions: [3, 4, 5, 4] },
      { track_name: 'Monza', avg_grid_position: 5.2, grid_positions: [4, 5, 6, 6, 4, 5, 6, 6] },
      { track_name: 'Suzuka', avg_grid_position: 6.7, grid_positions: [6, 7, 7, 6] },
      { track_name: 'Interlagos', avg_grid_position: 7.3, grid_positions: [7, 8, 7, 7] },
      { track_name: 'Barcelona', avg_grid_position: 8.5, grid_positions: [8, 9, 8, 9, 8, 9, 8, 9] },
      { track_name: 'Austria', avg_grid_position: 9.0, grid_positions: [9, 9, 9, 9] },
      { track_name: 'Hungary', avg_grid_position: 10.3, grid_positions: [10, 11, 10, 10] },
      { track_name: 'Singapore', avg_grid_position: 12.0, grid_positions: [12, 12, 12, 12] }
    ];

    trackStats = {
      bestTracks: testTracksByPoints.slice(0, 3),
      worstTracks: testTracksByPoints.slice(-3).reverse(),
      bestQualifyingTracks: testTracksByQualifying.slice(0, 3),
      worstQualifyingTracks: testTracksByQualifying.slice(-3).reverse(),
      allTracksByPoints: testTracksByPoints,
      allTracksByQualifying: testTracksByQualifying
    };
  }

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      {/* Team Selector */}
      <div className="flex justify-end mb-6">
        <TeamSelector currentTeam={team} />
      </div>
      
      <h1 className="text-3xl font-bold text-white text-center mb-8 flex items-center justify-center gap-2">
        <UsersRound className="h-7 w-7 text-red-500" />
        {teamName}
      </h1>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Season-by-Season Stats */}
        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xl text-white">
              <Car className="h-5 w-5 text-blue-500" />
              Season-by-Season Stats
            </CardTitle>
            <p className="text-gray-400 text-xs italic">From Season 6 onwards</p>
          </CardHeader>
          <CardContent className="p-0 max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-white w-24">Season</TableHead>
                  <TableHead className="text-white">Drivers</TableHead>
                  <TableHead className="text-white w-24">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(teamStats.seasons).map(([season, stats]) => (
                  <TableRow key={season} className="hover:bg-gray-800/50 border-gray-800">
                    <TableCell className="text-white font-medium">
                      {season}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {stats.drivers.split('/').map((driver, index) => (
                          <span key={index} className="text-white text-sm">
                            {driver.trim()}{index < stats.drivers.split('/').length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-white">
                      {typeof stats.points === 'string' ? (
                        <span className="text-gray-400 italic">{stats.points}</span>
                      ) : (
                        stats.points
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {/* Career Stats */}
        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xl text-white">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Career Stats
            </CardTitle>
            <p className="text-gray-400 text-xs italic">From Season 6 onwards</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[
                { 
                  title: 'Races', 
                  value: teamStats.career.races, 
                  icon: <Car className="h-4 w-4 text-blue-400" />,
                  key: 'races',
                  description: 'All race participations'
                },
                { 
                  title: 'Wins', 
                  value: teamStats.career.wins, 
                  icon: <Trophy className="h-4 w-4 text-yellow-400" />,
                  key: 'wins',
                  description: 'All race victories'
                },
                { 
                  title: 'Podiums', 
                  value: teamStats.career.podiums, 
                  icon: <Medal className="h-4 w-4 text-amber-400" />,
                  key: 'podiums',
                  description: 'All podium finishes (1st-3rd)'
                },
                { 
                  title: 'Poles', 
                  value: teamStats.career.poles, 
                  icon: <Flag className="h-4 w-4 text-purple-400" />,
                  key: 'poles',
                  description: 'All pole positions'
                },
                { 
                  title: 'Fastest Laps', 
                  value: teamStats.career.fastestLaps, 
                  icon: <Clock className="h-4 w-4 text-green-400" />,
                  key: 'fastestLaps',
                  description: 'All fastest lap achievements'
                },
                { 
                  title: 'Points', 
                  value: teamStats.career.points, 
                  icon: <Trophy className="h-4 w-4 text-blue-400" />,
                  key: 'points',
                  description: 'All points scored'
                },
              ].map((stat, index) => (
                <Dialog key={index}>
                  <DialogTrigger asChild>
                    <div className="bg-gray-800/70 border border-gray-700 rounded-lg p-3 flex flex-col items-center cursor-pointer hover:bg-gray-700/70 transition-colors group">
                      <div className="flex items-center gap-2 mb-1 text-gray-300 text-sm group-hover:text-white transition-colors">
                        {stat.icon}
                        <span>{stat.title}</span>
                        <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-xl font-semibold text-white">{stat.value}</p>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                      <DialogTitle className="text-white flex items-center gap-2">
                        {stat.icon}
                        {teamName} - {stat.title}
                      </DialogTitle>
                      <p className="text-gray-400 text-sm">{stat.description}</p>
                    </DialogHeader>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {teamStats.detailedBreakdowns[stat.key] && teamStats.detailedBreakdowns[stat.key].length > 0 ? (
                        teamStats.detailedBreakdowns[stat.key].map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-gray-800/50 rounded border-l-4 border-l-red-500">
                            <div className="flex items-center gap-3">
                              <span className="text-white font-medium">{item.track_name}</span>
                              <span className="text-gray-400 text-sm">S{item.season}</span>
                              <span className="text-blue-400 text-sm">{item.driver}</span>
                            </div>
                            <div className="text-right">
                              {stat.key === 'races' && (
                                <>
                                  <p className="text-white font-semibold">P{item.position}</p>
                                  <p className="text-gray-400 text-xs">
                                    Grid: P{item.grid_position} | {item.points} pts
                                  </p>
                                </>
                              )}
                              {stat.key === 'wins' && (
                                <>
                                  <p className="text-yellow-400 font-semibold">🏆 Victory</p>
                                  <p className="text-gray-400 text-xs">From P{item.grid_position}</p>
                                </>
                              )}
                              {stat.key === 'podiums' && (
                                <>
                                  <p className="text-amber-400 font-semibold">
                                    {item.position === 1 ? '🥇' : item.position === 2 ? '🥈' : '🥉'} P{item.position}
                                  </p>
                                  <p className="text-gray-400 text-xs">From P{item.grid_position}</p>
                                </>
                              )}
                              {stat.key === 'poles' && (
                                <>
                                  <p className="text-purple-400 font-semibold">🏁 Pole</p>
                                  <p className="text-gray-400 text-xs">Race: P{item.race_position}</p>
                                </>
                              )}
                              {stat.key === 'fastestLaps' && (
                                <>
                                  <p className="text-green-400 font-semibold">⚡ Fastest</p>
                                  <p className="text-gray-400 text-xs">{item.time}</p>
                                </>
                              )}
                              {stat.key === 'points' && (
                                <>
                                  <p className="text-blue-400 font-semibold">{item.points} pts</p>
                                  <p className="text-gray-400 text-xs">
                                    P{item.position}{item.fastestLapBonus ? ' + FL' : ''}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400 text-center py-8">No {stat.title.toLowerCase()} recorded</p>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Track Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best and Worst Tracks */}
        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-xl text-white">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-500" />
                Track Performance
              </div>
              {trackStats.allTracksByPoints?.length > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="flex items-center gap-1 text-sm text-gray-400 hover:text-blue-400 transition-colors bg-gray-800/50 hover:bg-gray-700/50 px-2 py-1 rounded-md">
                      <Eye className="w-3 h-3" />
                      View All
                    </button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900 border-gray-700 max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="text-white">All Tracks - {teamName} Performance</DialogTitle>
                      <p className="text-gray-400 text-sm">Ranked by total points scored</p>
                    </DialogHeader>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {trackStats.allTracksByPoints.map((track, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-800/50 rounded border-l-4" 
                             style={{ borderLeftColor: index < 3 ? '#10b981' : index >= trackStats.allTracksByPoints.length - 3 ? '#ef4444' : '#6b7280' }}>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold w-8">#{index + 1}</span>
                            <span className="text-white">{track.track_name}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-semibold">{track.total_points} pts</p>
                            <p className="text-gray-400 text-xs">{track.races_count} races</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardTitle>
            <p className="text-gray-400 text-xs italic">Based on total points scored</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Best Tracks */}
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-3">
                <TrendingUp className="h-4 w-4 text-green-400" />
                Best Tracks
              </h3>
              <div className="space-y-2">
                {trackStats.bestTracks.map((track, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 font-bold">#{index + 1}</span>
                      <span className="text-white">{track.track_name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">{track.total_points} pts</p>
                      <p className="text-gray-400 text-xs">{track.races_count} races</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Worst Tracks */}
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-3">
                <TrendingDown className="h-4 w-4 text-red-400" />
                Worst Tracks
              </h3>
              <div className="space-y-2">
                {trackStats.worstTracks.map((track, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 font-bold">#{index + 1}</span>
                      <span className="text-white">{track.track_name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">{track.total_points} pts</p>
                      <p className="text-gray-400 text-xs">{track.races_count} races</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Best and Worst Qualifying Tracks */}
        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-xl text-white">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-500" />
                Qualifying Performance
              </div>
              {trackStats.allTracksByQualifying?.length > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="flex items-center gap-1 text-sm text-gray-400 hover:text-blue-400 transition-colors bg-gray-800/50 hover:bg-gray-700/50 px-2 py-1 rounded-md">
                      <Eye className="w-3 h-3" />
                      View All
                    </button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900 border-gray-700 max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="text-white">All Tracks - {teamName} Qualifying</DialogTitle>
                      <p className="text-gray-400 text-sm">Ranked by average grid position (lower is better)</p>
                    </DialogHeader>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {trackStats.allTracksByQualifying.map((track, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-800/50 rounded border-l-4" 
                             style={{ borderLeftColor: index < 3 ? '#10b981' : index >= trackStats.allTracksByQualifying.length - 3 ? '#ef4444' : '#6b7280' }}>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold w-8">#{index + 1}</span>
                            <span className="text-white">{track.track_name}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-semibold">
                              {typeof track.avg_grid_position === 'string' ? track.avg_grid_position : `P${track.avg_grid_position.toFixed(1)}`}
                            </p>
                            <p className="text-gray-400 text-xs">{track.grid_positions.length} qualifyings</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardTitle>
            <p className="text-gray-400 text-xs italic">Based on average grid position</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Best Qualifying Tracks */}
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-3">
                <TrendingUp className="h-4 w-4 text-green-400" />
                Best Qualifying
              </h3>
              <div className="space-y-2">
                {trackStats.bestQualifyingTracks.map((track, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 font-bold">#{index + 1}</span>
                      <span className="text-white">{track.track_name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">
                        {typeof track.avg_grid_position === 'string' ? track.avg_grid_position : `P${track.avg_grid_position.toFixed(1)}`}
                      </p>
                      <p className="text-gray-400 text-xs">{track.grid_positions.length} qualifyings</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Worst Qualifying Tracks */}
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-3">
                <TrendingDown className="h-4 w-4 text-red-400" />
                Worst Qualifying
              </h3>
              <div className="space-y-2">
                {trackStats.worstQualifyingTracks.map((track, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 font-bold">#{index + 1}</span>
                      <span className="text-white">{track.track_name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">
                        {typeof track.avg_grid_position === 'string' ? track.avg_grid_position : `P${track.avg_grid_position.toFixed(1)}`}
                      </p>
                      <p className="text-gray-400 text-xs">{track.grid_positions.length} qualifyings</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';