import Image from 'next/image';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock } from 'lucide-react';
import pool from '@/lib/db';
import { teamColors, lightTeams } from '@/lib/data';
import SeasonRaceSelector from './SeasonRaceSelector';

const pointsSystem = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

// Map slugs to full track names
const trackNames = {
  'bahrain': 'Bahrain International Circuit',
  'jeddah': 'Jeddah Corniche Circuit',
  'yas-marina': 'Yas Marina Circuit',
  'melbourne': 'Albert Park Circuit',
  'suzuka': 'Suzuka International Racing Course',
  'shanghai': 'Shanghai International Circuit',
  'baku': 'Baku City Circuit',
  'miami': 'Miami International Autodrome',
  'monaco': 'Circuit de Monaco',
  'montreal': 'Circuit Gilles Villeneuve',
  'barcelona': 'Circuit de Barcelona-Catalunya',
  'spielberg': 'Red Bull Ring',
  'silverstone': 'Silverstone Circuit',
  'hungaroring': 'Hungaroring',
  'spa-francorchamps': 'Circuit de Spa-Francorchamps',
  'zandvoort': 'Circuit Zandvoort',
  'monza': 'Autodromo Nazionale Monza',
  'singapore': 'Marina Bay Street Circuit',
  'austin': 'Circuit of The Americas',
  'mexico': 'Autodromo Hermanos Rodriguez',
  'interlagos': 'Autodromo Jose Carlos Pace',
  'las-vegas': 'Las Vegas Strip Circuit',
  'losail': 'Lusail International Circuit',
  'imola': 'Autodromo Enzo e Dino Ferrari',
  'portimao': 'Algarve International Circuit',
  'paul-ricard': 'Circuit Paul Ricard'
};

// Format gap time in milliseconds to a readable string
function formatGap(ms) {
  if (!ms || ms === null) return '--:--.--';
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `+${minutes}:${seconds.toFixed(3).padStart(6, '0')}` : `+${seconds.toFixed(3)}`;
}

// Format full time for fastest lap
function formatTime(ms) {
  if (ms === 0) return 'N/A';
  if (!ms) return '--:--.--';
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(3).padStart(6, '0');
  return `${minutes}:${seconds}`;
}

// Parse stints_raw into tyre types
function parseStints(stintsRaw) {
  if (!stintsRaw) return [];
  return stintsRaw.split(',').map(stint => stint.charAt(0).toLowerCase());
}

// Map status to display format
function mapStatus(status) {
  if (!status) return null;
  const statusMap = { 'Dnf': 'DNF', 'Dsq': 'DSQ', 'Dns': 'DNS' };
  return statusMap[status] || status;
}

export default async function RaceResultsPage({ params }) {
  const { season, race } = params;

  // Get full track name from slug
  const raceName = trackNames[race] || race.replace(/-/g, ' '); // Fallback to slug with spaces if not mapped

  let results, isUpcoming;
  try {
    const seasonRes = await pool.query('SELECT id FROM seasons WHERE season = $1', [season]);
    const seasonId = seasonRes.rows[0]?.id;
    if (!seasonId) throw new Error('Season not found');

    const raceRes = await pool.query(
      'SELECT r.id FROM races r JOIN tracks t ON r.track_id = t.id WHERE r.season_id = $1 AND t.slug = $2',
      [seasonId, race]
    );
    const raceData = raceRes.rows[0];
    isUpcoming = !raceData; // No race ID means it hasn't happened yet

    if (raceData) {
      const resultsRes = await pool.query(
        'SELECT rr.position, rr.adjusted_position, d.name AS driver, t.name AS team, rr.time_int, rr.fastest_lap_time_int, ' +
        'rr.grid_position, rr.penalty_secs_ingame, rr.post_race_penalty_secs, rr.stints_raw, rr.status ' +
        'FROM race_results rr ' +
        'JOIN drivers d ON rr.driver_id = d.id ' +
        'JOIN teams t ON rr.team_id = t.id ' +
        'JOIN session_race_mapping srm ON rr.race_id = srm.race_id ' +
        'WHERE rr.race_id = $1 ' +
        'AND srm.session_uid = (SELECT session_uid FROM session_race_mapping WHERE race_id = $1 ORDER BY created_at DESC LIMIT 1)',
        [raceData.id]
      );

      const processedResults = resultsRes.rows.map(r => {
        const penalty = r.post_race_penalty_secs || 0;
        const effectivePosition = r.adjusted_position !== null ? r.adjusted_position : r.position;
        return { ...r, effectivePosition, penalty };
      });

      processedResults.sort((a, b) => a.effectivePosition - b.effectivePosition);

      const p1Time = processedResults.find(r => r.effectivePosition === 1)?.time_int || 0;

      const sortedLaps = processedResults
        .filter(r => r.fastest_lap_time_int !== null && r.fastest_lap_time_int !== undefined)
        .sort((a, b) => a.fastest_lap_time_int - b.fastest_lap_time_int);
      const fastestLapDriver = sortedLaps.find(r => r.fastest_lap_time_int > 0) || null;

      let prevGapDisplay = '--:--.--';
      results = processedResults.map((r, index, arr) => {
        const penaltyMs = r.penalty * 1000;
        const rawGap = r.effectivePosition === 1 ? null : (r.time_int - p1Time) + (r.penalty > 0 ? penaltyMs : 0);
        const status = mapStatus(r.status);

        let gapDisplay;
        if (status && ['DNF', 'DNS', 'DSQ'].includes(status)) {
          gapDisplay = status;
        } else if (index === 0) {
          gapDisplay = '--:--.--';
        } else {
          const prevResult = arr[index - 1];
          const prevGap = prevResult.effectivePosition === 1 ? 0 : (prevResult.time_int - p1Time) + (prevResult.penalty > 0 ? prevResult.penalty * 1000 : 0);
          if (prevGapDisplay === 'Lapped' || (rawGap !== null && prevGap > rawGap)) {
            gapDisplay = 'Lapped';
          } else {
            gapDisplay = formatGap(rawGap);
          }
        }

        const basePoints = r.effectivePosition <= 10 && r.status !== 'DSQ' && r.status !== 'DNS' ? pointsSystem[r.effectivePosition - 1] : 0;
        const fastestLapPoint = fastestLapDriver && r.driver === fastestLapDriver.driver && r.effectivePosition <= 10 ? 1 : 0;
        const totalPenalties = (r.penalty_secs_ingame || 0) + r.penalty;

        const isFastestLap = fastestLapDriver && r.driver === fastestLapDriver.driver;

        const result = {
          position: r.effectivePosition,
          driver: r.driver,
          team: r.team,
          gap: gapDisplay,
          fastest_lap: r.fastest_lap_time_int,
          positions_changed: r.grid_position ? r.grid_position - r.effectivePosition : 0,
          points: basePoints + fastestLapPoint,
          penalties: totalPenalties > 0 ? totalPenalties : null,
          strategy: parseStints(r.stints_raw),
          status: status,
          isFastestLap: isFastestLap,
        };

        prevGapDisplay = gapDisplay;
        return result;
      });
    } else {
      // Placeholder for upcoming race
      results = Array(20).fill(null).map((_, index) => ({
        position: index + 1,
        driver: 'TBD',
        team: 'TBD',
        gap: '--:--.--',
        fastest_lap: null,
        positions_changed: 0,
        points: 0,
        penalties: null,
        strategy: [],
        status: null,
        isFastestLap: false,
      }));
    }
  } catch (err) {
    console.error('Error fetching race results:', err);
    results = Array(20).fill(null).map((_, index) => ({
      position: index + 1,
      driver: 'TBD',
      team: 'TBD',
      gap: '--:--.--',
      fastest_lap: null,
      positions_changed: 0,
      points: 0,
      penalties: null,
      strategy: [],
      status: null,
      isFastestLap: false,
    }));
    isUpcoming = true;
  }

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      {/* Season and Race Selector */}
      <div className="flex justify-end mb-6">
        <SeasonRaceSelector currentSeason={season} currentRace={race} />
      </div>
      
      <h1 className="text-3xl font-bold text-white text-center mb-6 flex items-center justify-center gap-2">
        <Trophy className="text-yellow-500 h-6 w-6" />
        {raceName} - Season {season}
      </h1>

      {isUpcoming && (
        <div className="text-gray-400 text-center mb-6 italic">
          This race has not yet occurred. Results will be available after the event.
        </div>
      )}

      <Tabs defaultValue="race" className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-gray-800/60 border border-gray-700/60 mb-6">
          <TabsTrigger value="race" className="data-[state=active]:bg-gray-700">
            Race Results
          </TabsTrigger>
          <TabsTrigger value="qualifying" disabled className="data-[state=active]:bg-gray-700">
            Qualifying
          </TabsTrigger>
        </TabsList>

        <TabsContent value="race" className="mt-0">
          <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-white w-16">Pos</TableHead>
                      <TableHead className="text-white w-40">Driver</TableHead>
                      <TableHead className="text-white w-32">Team</TableHead>
                      <TableHead className="text-white w-32">Gap</TableHead>
                      <TableHead className="text-white w-32">Fastest Lap</TableHead>
                      <TableHead className="text-white w-24">Pos +/-</TableHead>
                      <TableHead className="text-white w-16">Points</TableHead>
                      <TableHead className="text-white w-24">Penalties</TableHead>
                      <TableHead className="text-white w-36">Strategy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result, index) => (
                      <TableRow key={index} className="hover:bg-gray-800/50 border-gray-800">
                        <TableCell className="text-white font-semibold">
                          {`P${result.position}`}
                        </TableCell>
                        <TableCell className="text-white">
                          {result.driver}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className="font-medium"
                            style={{ 
                              backgroundColor: teamColors[result.team] || '#444',
                              color: lightTeams.includes(result.team) ? 'black' : 'white',
                            }}
                          >
                            {result.team}
                          </Badge>
                        </TableCell>
                        <TableCell className={`${['DNF', 'DNS', 'DSQ', 'Lapped'].includes(result.gap) ? 'text-gray-400' : 'text-white'} ${result.gap === 'Lapped' ? 'italic' : ''}`}>
                          {result.gap}
                        </TableCell>
                        <TableCell className={`${result.isFastestLap ? 'text-purple-400 font-semibold' : 'text-white'}`}>
                          {formatTime(result.fastest_lap)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <div className="relative w-4 h-4">
                              <Image
                                src={`/images/misc/${result.positions_changed > 0 ? 'up' : result.positions_changed < 0 ? 'down' : 'equal'}.png`}
                                alt={result.positions_changed > 0 ? 'Up' : result.positions_changed < 0 ? 'Down' : 'Equal'}
                                fill
                                style={{ objectFit: 'contain' }}
                              />
                            </div>
                            <span className={`${result.positions_changed > 0 ? 'text-green-500' : result.positions_changed < 0 ? 'text-red-500' : 'text-white'}`}>
                              {Math.abs(result.positions_changed)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className={`${result.isFastestLap ? 'text-purple-400 font-semibold' : 'text-white'}`}>
                          {result.points}
                        </TableCell>
                        <TableCell className={`${result.penalties === null ? 'text-gray-400' : 'text-white'}`}>
                          {result.penalties === null ? '-' : `${result.penalties}s`}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center">
                            {result.strategy.length > 0 ? result.strategy.map((tyre, i) => (
                              <div key={i} className="relative w-6 h-6 mr-0.5">
                                <Image
                                  src={`/images/tyres/${tyre}.png`}
                                  alt={`${tyre} tyre`}
                                  fill
                                  style={{ objectFit: 'contain' }}
                                />
                              </div>
                            )) : <span className="text-white">N/A</span>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const dynamic = 'force-dynamic';