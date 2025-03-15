// src/app/results/season/[season]/[race]/page.jsx
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Tabs, Tab } from '@mui/material';
import Image from 'next/image';
import pool from '@/lib/db';
import { teamColors, lightTeams } from '@/lib/data';

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
  'imola' : 'Autodromo Enzo e Dino Ferrari',
  'portimao' : 'Algarve International Circuit',
  'paul-ricard' : 'Circuit Paul Ricard'
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
  const { season, race } = await params;

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
    isUpcoming = !raceData; // No race ID means it hasn’t happened yet

    if (raceData) {
      const resultsRes = await pool.query(
        'SELECT rr.position, rr.adjusted_position, d.name AS driver, t.name AS team, rr.time_int, rr.fastest_lap_time_int, ' +
        'rr.grid_position, rr.penalty_secs_ingame, rr.post_race_penalty_secs, rr.stints_raw, rr.status ' +
        'FROM race_results rr ' +
        'JOIN drivers d ON rr.driver_id = d.id ' +
        'JOIN teams t ON rr.team_id = t.id ' +
        'WHERE rr.race_id = $1',
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
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', p: 2, overflowX: 'hidden' }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'white', fontWeight: 'bold' }}>
        {raceName} - Season {season}
      </Typography>

      {isUpcoming && (
        <Typography sx={{ color: '#888', mb: 2 }}>
          This race has not yet occurred. Results will be available after the event.
        </Typography>
      )}

      <Tabs value={0} sx={{ mb: 2, '& .MuiTabs-indicator': { backgroundColor: '#00A0F0' }, '& .MuiTab-root': { color: 'white', fontWeight: 'bold' }, '& .Mui-selected': { color: '#00A0F0' } }}>
        <Tab label="Race Results" />
        <Tab label="Qualifying" disabled />
      </Tabs>

      <Box sx={{ border: '1px solid #444', p: 1, borderRadius: 1, width: 'fit-content', maxWidth: '100%', backgroundColor: '#0a0e27', overflowX: 'auto' }}>
        <Table sx={{ color: 'white', tableLayout: 'fixed', width: '1100px' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'white', borderColor: '#444', width: '60px', fontWeight: 'bold' }}>Pos</TableCell>
              <TableCell sx={{ color: 'white', borderColor: '#444', width: '180px', fontWeight: 'bold' }}>Driver</TableCell>
              <TableCell sx={{ color: 'white', borderColor: '#444', width: '140px', fontWeight: 'bold' }}>Team</TableCell>
              <TableCell sx={{ color: 'white', borderColor: '#444', width: '100px', fontWeight: 'bold' }}>Gap</TableCell>
              <TableCell sx={{ color: 'white', borderColor: '#444', width: '100px', fontWeight: 'bold' }}>Fastest Lap</TableCell>
              <TableCell sx={{ color: 'white', borderColor: '#444', width: '100px', fontWeight: 'bold' }}>Pos +/-</TableCell>
              <TableCell sx={{ color: 'white', borderColor: '#444', width: '60px', fontWeight: 'bold' }}>Points</TableCell>
              <TableCell sx={{ color: 'white', borderColor: '#444', width: '100px', fontWeight: 'bold' }}>Penalties</TableCell>
              <TableCell sx={{ color: 'white', borderColor: '#444', width: '160px', fontWeight: 'bold' }}>Strategy</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {results.map((result, index) => (
              <TableRow key={index} sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' } }}>
                <TableCell sx={{ color: 'white', borderColor: '#444' }}>{`P${result.position}`}</TableCell>
                <TableCell sx={{ color: 'white', borderColor: '#444' }}>{result.driver}</TableCell>
                <TableCell sx={{ color: 'white', borderColor: '#444' }}>
                  <Box
                    sx={{
                      backgroundColor: teamColors[result.team] || '#444',
                      color: lightTeams.includes(result.team) ? 'black' : 'white',
                      p: 0.5,
                      borderRadius: 1,
                      display: 'inline-block',
                    }}
                  >
                    {result.team}
                  </Box>
                </TableCell>
                <TableCell sx={{ 
                  color: ['DNF', 'DNS', 'DSQ', 'Lapped'].includes(result.gap) ? '#888' : 'white', 
                  borderColor: '#444',
                  fontStyle: result.gap === 'Lapped' ? 'italic' : 'normal'
                }}>
                  {result.gap}
                </TableCell>
                <TableCell sx={{ 
                  color: result.isFastestLap ? '#800080' : 'white', 
                  borderColor: '#444', 
                  fontWeight: result.isFastestLap ? 'bold' : 'normal' 
                }}>
                  {formatTime(result.fastest_lap)}
                </TableCell>
                <TableCell sx={{ borderColor: '#444', textAlign: 'center' }}>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Image
                      src={`/images/misc/${result.positions_changed > 0 ? 'up' : result.positions_changed < 0 ? 'down' : 'equal'}.png`}
                      alt={result.positions_changed > 0 ? 'Up' : result.positions_changed < 0 ? 'Down' : 'Equal'}
                      width={16}
                      height={16}
                      style={{ marginRight: '4px' }}
                    />
                    <Box sx={{ color: result.positions_changed > 0 ? '#00FF00' : result.positions_changed < 0 ? '#FF0000' : 'white' }}>
                      {Math.abs(result.positions_changed)}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell sx={{ 
                  color: result.isFastestLap ? '#800080' : 'white', 
                  borderColor: '#444', 
                  fontWeight: result.isFastestLap ? 'bold' : 'normal' 
                }}>
                  {result.points}
                </TableCell>
                <TableCell sx={{ color: result.penalties === null ? '#888' : 'white', borderColor: '#444' }}>
                  {result.penalties === null ? '-' : `${result.penalties}s`}
                </TableCell>
                <TableCell sx={{ borderColor: '#444' }}>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                    {result.strategy.length > 0 ? result.strategy.map((tyre, i) => (
                      <Image
                        key={i}
                        src={`/images/tyres/${tyre}.png`}
                        alt={`${tyre} tyre`}
                        width={25}
                        height={25}
                        style={{ marginRight: '1px' }}
                      />
                    )) : <Box sx={{ color: 'white' }}>N/A</Box>}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}

export const dynamic = 'force-dynamic';