import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import pool from '@/lib/db';
import ClientSeasonSelector from './ClientSeasonSelector';
import { teamColors, lightTeams } from '@/lib/data';

async function getLineupsForSeason(season) {
  try {
    const res = await pool.query(
      'SELECT d.name AS driver, t.name AS team ' +
      'FROM lineups l ' +
      'JOIN drivers d ON l.driver_id = d.id ' +
      'JOIN teams t ON l.team_id = t.id ' +
      'JOIN seasons s ON l.season_id = s.id ' +
      'WHERE s.season = $1 ' +
      'ORDER BY t.name, d.name',
      [season]
    );
    
    const teamMap = {};
    res.rows.forEach(({ driver, team }) => {
      if (!teamMap[team]) {
        teamMap[team] = { team, driver1: null, driver2: null };
      }
      if (!teamMap[team].driver1) {
        teamMap[team].driver1 = driver;
      } else if (!teamMap[team].driver2) {
        teamMap[team].driver2 = driver;
      } else {
        console.warn(`More than 2 drivers for ${team} in Season ${season}: ${driver}`);
      }
    });
    
    return Object.values(teamMap).sort((a, b) => a.team.localeCompare(b.team));
  } catch (error) {
    console.error('Error fetching lineups:', error);
    return [];
  }
}

async function getSeasons() {
  try {
    const res = await pool.query('SELECT season FROM seasons ORDER BY CAST(season AS INTEGER) DESC');
    return res.rows.map(row => row.season);
  } catch (error) {
    console.error('Error fetching seasons:', error);
    return [];
  }
}

export default async function LineupsPage({ searchParams }) {
  const seasons = await getSeasons();
  const defaultSeason = seasons[0] || '11'; // Latest season
  const season = searchParams.season || defaultSeason;
  const lineups = await getLineupsForSeason(season);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col items-center">
        <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
          <Users className="h-6 w-6 text-blue-500" />
          Driver Lineups
        </h1>
        
        <ClientSeasonSelector seasons={seasons} defaultSeason={season} />
        
        <Card className="bg-gray-900/70 border border-gray-700/80 backdrop-blur-sm overflow-hidden w-full max-w-3xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl text-white">
              Season {season} Teams
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-white w-1/3">Team</TableHead>
                  <TableHead className="text-white w-1/3">Driver 1</TableHead>
                  <TableHead className="text-white w-1/3">Driver 2</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineups.map((row, index) => (
                  <TableRow key={index} className="hover:bg-gray-800/50 border-gray-800">
                    <TableCell>
                      <Badge 
                        className="font-medium"
                        style={{ 
                          backgroundColor: teamColors[row.team] || '#444',
                          color: lightTeams.includes(row.team) ? 'black' : 'white',
                        }}
                      >
                        {row.team}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white">{row.driver1 || 'N/A'}</TableCell>
                    <TableCell className="text-white">{row.driver2 || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic'; // Ensure fresh data