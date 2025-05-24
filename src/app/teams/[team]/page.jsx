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
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy, Flag, Clock, Car } from "lucide-react";
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
      <div className="flex flex-col items-center">
        <p className="text-white">Team not found.</p>
      </div>
    );
  }
  const { id: teamId, name: teamNameFormatted } = teamData;

  // Season-by-season stats (S6 - S10)
  const seasonStatsRes = await pool.query(
    'SELECT s.season, STRING_AGG(d.name, \', \') AS drivers, st.points ' +
    'FROM seasons s ' +
    'LEFT JOIN lineups l ON l.season_id = s.id AND l.team_id = $1 ' +
    'LEFT JOIN drivers d ON l.driver_id = d.id ' +
    'LEFT JOIN standings st ON st.season_id = s.id AND st.team_id = $1 AND st.type = $2 ' +
    'WHERE CAST(s.season AS INTEGER) >= 6 AND CAST(s.season AS INTEGER) <= 10 ' + // Added upper limit
    'GROUP BY s.season, st.points ' +
    'ORDER BY s.season DESC',
    [teamId, 'constructors']
  );

  //New query for season 11 onwards to help with the retirement of the seasons standings table
  const calculatedPointsRes = await pool.query(
    `SELECT 
      s.season,
      STRING_AGG(DISTINCT d.name, ', ') AS drivers, 
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

  const teamStats = {
    seasons: {},
    career: { races: 0, wins: 0, podiums: 0, poles: 0, fastestLaps: 0, points: 0 },
  };

  // Data from seasons 6 through 10
  seasonStatsRes.rows.forEach((row) => {
    teamStats.seasons[row.season] = {
      drivers: row.drivers || "No Drivers",
      points: row.points !== null ? row.points : 'Unavailable',
    };
    if (row.points !== null) teamStats.career.points += parseInt(row.points, 10) || 0;
  });

  // Data from seasons 11 onwards
  calculatedPointsRes.rows.forEach((row) => {
    teamStats.seasons[row.season] = {
      drivers: row.drivers || "No Drivers",
      points: row.points || 0,
    };
    teamStats.career.points += parseInt(row.points, 10) || 0;
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

  // Calculate Stats by Season height
  const seasonCount = Object.keys(teamStats.seasons).length;

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-3xl font-bold text-white text-center mb-8">
        {teamNameFormatted}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        {/* Empty column for spacing on larger screens */}
        <div className="hidden md:block md:col-span-1"></div>
        
        {/* Season-by-Season Stats */}
        <div className="md:col-span-2">
          <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xl text-white">
                <Users className="h-5 w-5 text-blue-500" />
                Season-by-Season Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
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
                      <TableCell className="text-white">{season}</TableCell>
                      <TableCell>
                        <Badge 
                          className="font-medium"
                          style={{ 
                            backgroundColor: stats.drivers === "No Drivers" ? '#444' : teamColors[teamNameFormatted] || '#444',
                            color: stats.drivers === "No Drivers" ? '#888' : (lightTeams.includes(teamNameFormatted) ? 'black' : 'white'),
                            fontStyle: stats.drivers === "No Drivers" ? 'italic' : 'normal',
                          }}
                        >
                          {stats.drivers}
                        </Badge>
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
              <p className="text-gray-400 text-xs italic">these run from S6 onwards</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { title: 'Career Races', value: teamStats.career.races, icon: <Car className="h-4 w-4 text-blue-400" /> },
                  { title: 'Career Wins', value: teamStats.career.wins, icon: <Trophy className="h-4 w-4 text-yellow-400" /> },
                  { title: 'Career Podiums', value: teamStats.career.podiums, icon: <Trophy className="h-4 w-4 text-amber-400" /> },
                  { title: 'Career Poles', value: teamStats.career.poles, icon: <Flag className="h-4 w-4 text-purple-400" /> },
                  { title: 'Career Fastest Laps', value: teamStats.career.fastestLaps, icon: <Clock className="h-4 w-4 text-green-400" /> },
                  { title: 'Career Points', value: teamStats.career.points, icon: <Trophy className="h-4 w-4 text-blue-400" /> },
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