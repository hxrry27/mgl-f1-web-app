import Image from 'next/image';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, Zap, Flag } from 'lucide-react';
import pool from '@/lib/db';
import { teamColors, lightTeams } from '@/lib/data';
import { cn } from "@/lib/utils";

const pointsSystem = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

// Track data with full GP names and countries
const trackData = {
  'bahrain': { 
    gpName: 'FORMULA 1 GULF AIR BAHRAIN GRAND PRIX',
    circuit: 'Bahrain International Circuit',
    country: 'Bahrain',
    flag: 'bahrain'
  },
  'jeddah': { 
    gpName: 'FORMULA 1 STC SAUDI ARABIAN GRAND PRIX',
    circuit: 'Jeddah Corniche Circuit',
    country: 'Jeddah',
    flag: 'saudi_arabia'
  },
  'melbourne': { 
    gpName: 'FORMULA 1 ROLEX AUSTRALIAN GRAND PRIX',
    circuit: 'Albert Park Grand Prix Circuit',
    country: 'Melbourne',
    flag: 'australia'
  },
  'suzuka': { 
    gpName: 'FORMULA 1 HONDA JAPANESE GRAND PRIX',
    circuit: 'Suzuka International Racing Course',
    country: 'Suzuka',
    flag: 'japan'
  },
  'shanghai': { 
    gpName: 'FORMULA 1 LENOVO CHINESE GRAND PRIX',
    circuit: 'Shanghai International Circuit',
    country: 'Shanghai',
    flag: 'china'
  },
  'miami': { 
    gpName: 'FORMULA 1 CRYPTO.COM MIAMI GRAND PRIX',
    circuit: 'Miami International Autodrome',
    country: 'Miami',
    flag: 'united_states_of_america'
  },
  'monaco': { 
    gpName: 'FORMULA 1 GRAND PRIX DE MONACO',
    circuit: 'Circuit de Monaco',
    country: 'Monaco',
    flag: 'monaco'
  },
  'montreal': { 
    gpName: 'FORMULA 1 AWS GRAND PRIX DU CANADA',
    circuit: 'Circuit Gilles Villeneuve',
    country: 'Montreal',
    flag: 'canada'
  },
  'barcelona': { 
    gpName: 'FORMULA 1 ARAMCO GRAN PREMIO DE ESPAÑA',
    circuit: 'Circuit de Barcelona-Catalunya',
    country: 'Barcelona',
    flag: 'spain'
  },
  'spielberg': { 
    gpName: 'FORMULA 1 QATAR AIRWAYS AUSTRIAN GRAND PRIX',
    circuit: 'Red Bull Ring',
    country: 'Spielberg',
    flag: 'austria'
  },
  'silverstone': { 
    gpName: 'FORMULA 1 ARAMCO BRITISH GRAND PRIX',
    circuit: 'Silverstone Circuit',
    country: 'Silverstone',
    flag: 'united_kingdom'
  },
  'hungaroring': { 
    gpName: 'FORMULA 1 MAGYAR NAGYDÍJ',
    circuit: 'Hungaroring',
    country: 'Budapest',
    flag: 'hungary'
  },
  'spa-francorchamps': { 
    gpName: 'FORMULA 1 ROLEX BELGIAN GRAND PRIX',
    circuit: 'Circuit de Spa-Francorchamps',
    country: 'Spa',
    flag: 'belgium'
  },
  'zandvoort': { 
    gpName: 'FORMULA 1 HEINEKEN DUTCH GRAND PRIX',
    circuit: 'Circuit Zandvoort',
    country: 'Zandvoort',
    flag: 'netherlands'
  },
  'monza': { 
    gpName: 'FORMULA 1 PIRELLI GRAN PREMIO D\'ITALIA',
    circuit: 'Autodromo Nazionale Monza',
    country: 'Monza',
    flag: 'italy'
  },
  'baku': { 
    gpName: 'FORMULA 1 AZERBAIJAN GRAND PRIX',
    circuit: 'Baku City Circuit',
    country: 'Baku',
    flag: 'azerbaijan'
  },
  'singapore': { 
    gpName: 'FORMULA 1 SINGAPORE AIRLINES SINGAPORE GRAND PRIX',
    circuit: 'Marina Bay Street Circuit',
    country: 'Singapore',
    flag: 'singapore'
  },
  'austin': { 
    gpName: 'FORMULA 1 ARAMCO UNITED STATES GRAND PRIX',
    circuit: 'Circuit of The Americas',
    country: 'Austin',
    flag: 'united_states_of_america'
  },
  'mexico': { 
    gpName: 'FORMULA 1 GRAN PREMIO DE LA CIUDAD DE MÉXICO',
    circuit: 'Autódromo Hermanos Rodríguez',
    country: 'Mexico City',
    flag: 'mexico'
  },
  'interlagos': { 
    gpName: 'FORMULA 1 ROLEX GRANDE PRÊMIO DE SÃO PAULO',
    circuit: 'Autódromo José Carlos Pace',
    country: 'São Paulo',
    flag: 'brazil'
  },
  'las-vegas': { 
    gpName: 'FORMULA 1 HEINEKEN SILVER LAS VEGAS GRAND PRIX',
    circuit: 'Las Vegas Strip Circuit',
    country: 'Las Vegas',
    flag: 'united_states_of_america'
  },
  'losail': { 
    gpName: 'FORMULA 1 QATAR AIRWAYS QATAR GRAND PRIX',
    circuit: 'Lusail International Circuit',
    country: 'Lusail',
    flag: 'qatar'
  },
  'yas-marina': { 
    gpName: 'FORMULA 1 ETIHAD AIRWAYS ABU DHABI GRAND PRIX',
    circuit: 'Yas Marina Circuit',
    country: 'Abu Dhabi',
    flag: 'united_arab_emirates'
  },
  'imola': { 
    gpName: 'FORMULA 1 ROLEX GRAN PREMIO DELL\'EMILIA-ROMAGNA',
    circuit: 'Autodromo Enzo e Dino Ferrari',
    country: 'Imola',
    flag: 'italy'
  },
  'portimao': { 
    gpName: 'FORMULA 1 HEINEKEN PORTUGUESE GRAND PRIX',
    circuit: 'Algarve International Circuit',
    country: 'Portimão',
    flag: 'portugal'
  },
  'paul-ricard': { 
    gpName: 'FORMULA 1 LENOVO FRENCH GRAND PRIX',
    circuit: 'Circuit Paul Ricard',
    country: 'Paul Ricard',
    flag: 'france'
  }
};

// Format gap time
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

// Parse stints into tyre types
function parseStints(stintsRaw) {
  if (!stintsRaw) return [];
  return stintsRaw.split(',').map(stint => stint.charAt(0).toLowerCase());
}

// Map status to display format
function mapStatus(status) {
  if (!status || status === 'OK' || status === 'Ok' || status === 'ok' || status === 'Finished') return null;
  const statusMap = { 'Dnf': 'DNF', 'Dsq': 'DSQ', 'Dns': 'DNS' };
  return statusMap[status] || status;
}

// Tyre component
function TyreIndicator({ compound }) {
  const tyreColors = {
    's': 'bg-red-500',
    'm': 'bg-yellow-500',
    'h': 'bg-gray-200',
    'i': 'bg-green-500',
    'w': 'bg-blue-500'
  };
  
  return (
    <div className={cn("w-3 h-3 rounded-full border border-neutral-600", tyreColors[compound] || 'bg-neutral-500')} />
  );
}

export default async function RaceResultsPage({ params }) {
  const { season, race } = await params;

  // Get track info
  const trackInfo = trackData[race] || {
    gpName: race.replace(/-/g, ' ').toUpperCase(),
    circuit: race.replace(/-/g, ' '),
    country: race,
    flag: 'default'
  };

  let results, isUpcoming, raceDate;
  
  try {
    const seasonRes = await pool.query('SELECT id FROM seasons WHERE season = $1', [season]);
    const seasonId = seasonRes.rows[0]?.id;
    if (!seasonId) throw new Error('Season not found');

    const raceRes = await pool.query(
      'SELECT r.id, r.date FROM races r JOIN tracks t ON r.track_id = t.id WHERE r.season_id = $1 AND t.slug = $2',
      [seasonId, race]
    );
    const raceData = raceRes.rows[0];
    isUpcoming = !raceData;
    raceDate = raceData?.date;

    if (raceData) {
      // Check for session mapping
      const sessionMappingRes = await pool.query(
        'SELECT session_uid FROM session_race_mapping WHERE race_id = $1 ORDER BY created_at DESC LIMIT 1',
        [raceData.id]
      );

      let resultsRes;
      if (sessionMappingRes.rows.length > 0) {
        resultsRes = await pool.query(
          'SELECT rr.position, rr.adjusted_position, d.name AS driver, t.name AS team, rr.time_int, rr.fastest_lap_time_int, ' +
          'rr.grid_position, rr.penalty_secs_ingame, rr.post_race_penalty_secs, rr.stints_raw, rr.status ' +
          'FROM race_results rr ' +
          'JOIN drivers d ON rr.driver_id = d.id ' +
          'JOIN lineups l ON rr.driver_id = l.driver_id AND l.season_id = $1 ' +
          'JOIN teams t ON l.team_id = t.id ' +
          'WHERE rr.race_id = $2 ' +
          'ORDER BY COALESCE(rr.adjusted_position, rr.position)',
          [seasonId, raceData.id]
        );
      } else {
        resultsRes = await pool.query(
          'SELECT rr.position, rr.adjusted_position, d.name AS driver, t.name AS team, rr.time_int, rr.fastest_lap_time_int, ' +
          'rr.grid_position, rr.penalty_secs_ingame, rr.post_race_penalty_secs, rr.stints_raw, rr.status ' +
          'FROM race_results rr ' +
          'JOIN drivers d ON rr.driver_id = d.id ' +
          'JOIN lineups l ON rr.driver_id = l.driver_id AND l.season_id = $1 ' +
          'JOIN teams t ON l.team_id = t.id ' +
          'WHERE rr.race_id = $2 ' +
          'ORDER BY COALESCE(rr.adjusted_position, rr.position)',
          [seasonId, raceData.id]
        );
      }

      const fastestLapTime = Math.min(...resultsRes.rows.map(r => r.fastest_lap_time_int || Infinity).filter(t => t !== Infinity));
      let leaderTime = resultsRes.rows[0]?.time_int || 0;
      console.log('Fastest lap time:', fastestLapTime);
      console.log('Fastest lap type:', typeof fastestLapTime);

      results = resultsRes.rows.map((row, idx) => {
        const displayPos = row.adjusted_position || row.position;
        let points = displayPos <= 10 ? pointsSystem[displayPos - 1] : 0;
        
        // Add fastest lap point (only for seasons < 12, and only if driver finished in top 10)
        const hasFastestLap = parseInt(row.fastest_lap_time_int) === fastestLapTime;
        if (parseInt(season) < 12 && hasFastestLap && displayPos <= 10) {
          points += 1;
        }
        
        const totalPenalty = (row.penalty_secs_ingame || 0) + (row.post_race_penalty_secs || 0);
        const posChange = row.grid_position ? row.grid_position - displayPos : 0;
        const status = mapStatus(row.status);
        
        let gap;
        if (status) {
          gap = status;
        } else if (idx === 0) {
          gap = 'Winner';
        } else {
          gap = formatGap(row.time_int - leaderTime);
        }

        return {
          position: displayPos,
          driver: row.driver,
          team: row.team,
          gap,
          fastestLap: formatTime(row.fastest_lap_time_int),
          isFastestLap: hasFastestLap,
          posChange,
          points,
          penalties: totalPenalty > 0 ? `+${totalPenalty}s` : null,
          stints: parseStints(row.stints_raw)
        };
      });
    }
  } catch (error) {
  console.error('Error fetching race results:', error);
  console.error('Season:', season, 'Race:', race);
  console.error('Error details:', error.message, error.stack);
  results = [];
  isUpcoming = true;
}

  // Format date
  const formattedDate = raceDate 
    ? new Date(raceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'TBD';

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Header with GP Name and Flag */}
        <div className="mb-8">
          <div className="flex items-start gap-6 mb-4">
            <div className="relative w-20 h-14 flex-shrink-0">
              <Image
                src={`/images/flags/${trackInfo.flag}.png`}
                alt={`${trackInfo.country} flag`}
                fill
                className="object-cover rounded-lg"
              />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white mb-2 uppercase tracking-tight">
                {trackInfo.gpName} {season > 2000 ? season : `20${season}`}
              </h1>
              <p className="text-cyan-400 font-bold text-lg mb-1">{formattedDate}</p>
              <p className="text-neutral-400">{trackInfo.circuit}, {trackInfo.country}</p>
            </div>
          </div>
        </div>

        {/* Session Tabs */}
        <Tabs defaultValue="race" className="w-full">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-4 gap-2 bg-transparent p-1 mb-8">
            <TabsTrigger 
              value="race"
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all",
                "bg-neutral-800/50 border border-neutral-700/50",
                "hover:bg-neutral-700/50 hover:border-neutral-600",
                "data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-teal-500",
                "data-[state=active]:text-black data-[state=active]:border-transparent",
                "data-[state=inactive]:text-neutral-400"
              )}
            >
              <Trophy className="h-4 w-4" />
              <span>Race</span>
            </TabsTrigger>
            <TabsTrigger 
              value="qualifying"
              disabled
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all",
                "bg-neutral-800/50 border border-neutral-700/50",
                "opacity-50 cursor-not-allowed",
                "data-[state=inactive]:text-neutral-500"
              )}
            >
              <Clock className="h-4 w-4" />
              <span>Qualifying</span>
            </TabsTrigger>
            <TabsTrigger 
              value="sprint-quali"
              disabled
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all",
                "bg-neutral-800/50 border border-neutral-700/50",
                "opacity-50 cursor-not-allowed",
                "data-[state=inactive]:text-neutral-500"
              )}
            >
              <Zap className="h-4 w-4" />
              <span>Sprint Quali</span>
            </TabsTrigger>
            <TabsTrigger 
              value="sprint"
              disabled
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all",
                "bg-neutral-800/50 border border-neutral-700/50",
                "opacity-50 cursor-not-allowed",
                "data-[state=inactive]:text-neutral-500"
              )}
            >
              <Flag className="h-4 w-4" />
              <span>Sprint</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="race" className="mt-0">
            {isUpcoming ? (
              <Card className="bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50">
                <CardContent className="p-12 text-center">
                  <Trophy className="h-16 w-16 text-neutral-600 mx-auto mb-4" />
                  <p className="text-neutral-400 text-lg font-bold">
                    Results will be available after the race
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-neutral-800">
                          <th className="text-left p-4 text-neutral-400 font-bold uppercase tracking-wider text-xs">Pos</th>
                          <th className="text-left p-4 text-neutral-400 font-bold uppercase tracking-wider text-xs">Driver</th>
                          <th className="text-left p-4 text-neutral-400 font-bold uppercase tracking-wider text-xs">Team</th>
                          <th className="text-left p-4 text-neutral-400 font-bold uppercase tracking-wider text-xs">Gap</th>
                          <th className="text-left p-4 text-neutral-400 font-bold uppercase tracking-wider text-xs">Fastest Lap</th>
                          <th className="text-center p-4 text-neutral-400 font-bold uppercase tracking-wider text-xs">Pos +/-</th>
                          <th className="text-center p-4 text-neutral-400 font-bold uppercase tracking-wider text-xs">Points</th>
                          <th className="text-left p-4 text-neutral-400 font-bold uppercase tracking-wider text-xs">Penalties</th>
                          <th className="text-left p-4 text-neutral-400 font-bold uppercase tracking-wider text-xs">Strategy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((result, index) => (
                          <tr key={index} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                            <td className="p-4">
                              <span className={cn(
                                "text-xl font-black",
                                index === 0 && "text-yellow-400",
                                index === 1 && "text-neutral-300",
                                index === 2 && "text-orange-400",
                                index > 2 && "text-white"
                              )}>
                                {result.position}
                              </span>
                            </td>
                            <td className="p-4">
                              <p className="text-white font-bold">{result.driver}</p>
                            </td>
                            <td className="p-4">
                              <Badge 
                                className="font-bold px-3 py-1 text-xs uppercase tracking-wider border-2"
                                style={{ 
                                  backgroundColor: teamColors[result.team] || '#404040',
                                  color: lightTeams.includes(result.team) ? 'black' : 'white',
                                  borderColor: lightTeams.includes(result.team) ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'
                                }}
                              >
                                {result.team}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <span className={cn(
                                "font-bold",
                                ['DNF', 'DNS', 'DSQ'].includes(result.gap) ? "text-red-400" : 
                                result.gap === 'Winner' ? "text-cyan-400" :
                                "text-neutral-300"
                              )}>
                                {result.gap}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={cn(
                                "font-bold",
                                result.isFastestLap ? "text-purple-400" : "text-neutral-400"
                              )}>
                                {result.fastestLap}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              {result.posChange !== 0 && (
                                <span className={cn(
                                  "font-bold",
                                  result.posChange > 0 ? "text-green-400" : "text-red-400"
                                )}>
                                  {result.posChange > 0 ? `+${result.posChange}` : result.posChange}
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <span className="text-cyan-400 font-black text-lg">
                                {result.points}
                              </span>
                            </td>
                            <td className="p-4">
                              {result.penalties && (
                                <span className="text-red-400 font-bold">{result.penalties}</span>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex gap-1">
                                {result.stints.map((stint, idx) => (
                                  <TyreIndicator key={idx} compound={stint} />
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';