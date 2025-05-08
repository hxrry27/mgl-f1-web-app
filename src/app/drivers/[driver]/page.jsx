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
import { 
  Trophy, 
  Flag, 
  Clock, 
  Car, 
  User,
  Medal
} from 'lucide-react';
import pool from '@/lib/db';
import { teamColors, lightTeams } from '@/lib/data';

const pointsSystem = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

const normalizeDriverName = (name) => {
  return typeof name === 'string' ? name.trim().toLowerCase().replace(/\s+/g, '-') : '';
};

export default async function DriverPage({ params }) {
  const { driver } = params;
  const driverGamertag = driver.trim();

  const driverRes = await pool.query('SELECT name, id FROM drivers WHERE LOWER(name) = LOWER($1)', [driverGamertag.replace(/-/g, ' ')]);
  const driverData = driverRes.rows[0];
  if (!driverData) {
    return (
      <div className="flex flex-col items-center">
        <p className="text-white">Driver not found.</p>
      </div>
    );
  }
  
  const { name: driverName, id: driverId } = driverData;

  // Season-by-season stats (S6 to 10, which are done this way because theyre based off of the standings table, which is legacy)
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

  // Season-by-season stats (s11 onwards, done this way to avoid having a seperate standalone table for standings, just dynamically calculates instead. this DOES account for adjusted position post penalties)
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
    WHERE CAST(s.season AS INTEGER) >= 11
    AND rr.driver_id = $1
    GROUP BY s.season
    ORDER BY s.season DESC`,
    [driverId]
  );

  const driverStats = {
    seasons: {},
    career: { races: 0, wins: 0, podiums: 0, poles: 0, fastestLaps: 0, points: 0 },
  };

  // adding the data from the standings table (s6 - s10)
  seasonStatsRes.rows.forEach((row) => {
    driverStats.seasons[row.season] = {
      team: row.teams || "Didn't Race",
      points: row.points !== null ? row.points : 'Unavailable',
    };
    if (row.points !== null) driverStats.career.points += parseInt(row.points, 10) || 0;
  });

  //adding the data from the calculated season standings (s11 onwards)
  calculatedPointsRes.rows.forEach((row) => {
    driverStats.seasons[row.season] = {
      team: row.teams || "Didn't Race",
      points: row.points || 0,
    };
    driverStats.career.points += parseInt(row.points, 10) || 0;
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

  return (
    <div className="container mx-auto px-4 max-w-5xl">
      <h1 className="text-3xl font-bold text-white text-center mb-8 flex items-center justify-center gap-2">
        <User className="h-7 w-7 text-blue-500" />
        {driverName}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        {/* Empty column for spacing on larger screens */}
        <div className="hidden md:block md:col-span-1"></div>
        
        {/* Season-by-Season Stats */}
        <div className="md:col-span-2">
          <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xl text-white">
                <Car className="h-5 w-5 text-blue-500" />
                Season-by-Season Stats
              </CardTitle>
              <p className="text-gray-400 text-xs italic">From Season 6 onwards</p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-white w-24">Season</TableHead>
                    <TableHead className="text-white">Team</TableHead>
                    <TableHead className="text-white w-24">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(driverStats.seasons).map(([season, stats]) => (
                    <TableRow key={season} className="hover:bg-gray-800/50 border-gray-800">
                      <TableCell className="text-white font-medium">
                        {season}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {stats.team.split('/').map((team, index) => (
                            <Badge 
                              key={index}
                              className={`font-medium ${team === "Didn't Race" ? "italic" : ""}`}
                              style={{ 
                                backgroundColor: team === "Didn't Race" ? '#444' : teamColors[team] || '#444',
                                color: team === "Didn't Race" ? '#888' : (lightTeams.includes(team) ? 'black' : 'white'),
                              }}
                            >
                              {team}
                            </Badge>
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
        </div>
        
        {/* Career Stats */}
        <div className="md:col-span-2">
          <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden h-full">
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
                  { title: 'Career Races', value: driverStats.career.races, icon: <Car className="h-4 w-4 text-blue-400" /> },
                  { title: 'Career Wins', value: driverStats.career.wins, icon: <Trophy className="h-4 w-4 text-yellow-400" /> },
                  { title: 'Career Podiums', value: driverStats.career.podiums, icon: <Medal className="h-4 w-4 text-amber-400" /> },
                  { title: 'Career Poles', value: driverStats.career.poles, icon: <Flag className="h-4 w-4 text-purple-400" /> },
                  { title: 'Career Fastest Laps', value: driverStats.career.fastestLaps, icon: <Clock className="h-4 w-4 text-green-400" /> },
                  { title: 'Career Points', value: driverStats.career.points, icon: <Trophy className="h-4 w-4 text-blue-400" /> },
                ].map((stat, index) => (
                  <div 
                    key={index} 
                    className="bg-gray-800/70 border border-gray-700 rounded-lg p-3 flex flex-col items-center"
                  >
                    <div className="flex items-center gap-2 mb-1 text-gray-300 text-sm">
                      {stat.icon}
                      <span>{stat.title}</span>
                    </div>
                    <p className="text-xl font-semibold text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Empty column for spacing on larger screens */}
        <div className="hidden md:block md:col-span-1"></div>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';