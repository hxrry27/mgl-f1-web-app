import pool from '@/lib/db';

// Track names mapping for better display
const trackNames = {
  'bahrain': 'Bahrain',
  'jeddah': 'Saudi Arabia',
  'albert-park': 'Australia',
  'suzuka': 'Japan',
  'shanghai': 'China',
  'miami': 'United States (Miami)',
  'imola': 'Emilia Romagna',
  'monaco': 'Monaco',
  'catalunya': 'Spain',
  'montreal': 'Canada',
  'red-bull-ring': 'Austria',
  'silverstone': 'Great Britain',
  'hungaroring': 'Hungary',
  'spa-francorchamps': 'Belgium',
  'zandvoort': 'Netherlands',
  'monza': 'Italy',
  'baku': 'Azerbaijan',
  'marina-bay': 'Singapore',
  'cota': 'United States (Austin)',
  'mexico-city': 'Mexico',
  'interlagos': 'Brazil',
  'las-vegas': 'Las Vegas',
  'lusail': 'Qatar',
  'yas-marina': 'Abu Dhabi',
  'paul-ricard': 'France',
  'portimao': 'Portugal',
  'mugello': 'Italy (Mugello)',
  'sochi': 'Russia',
  'nurburgring': 'Germany',
  'hockenheim': 'Germany (Hockenheim)'
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const seasonParam = searchParams.get('season');
  
  if (!seasonParam) {
    return Response.json({ error: 'Season parameter is required' }, { status: 400 });
  }

  try {
    // Query races for the given season with lap data
    const racesRes = await pool.query(
      'SELECT DISTINCT r.id, t.slug, r.date ' +
      'FROM races r ' +
      'JOIN tracks t ON r.track_id = t.id ' +
      'JOIN seasons s ON r.season_id = s.id ' +
      'JOIN lap_times lt ON lt.race_id = r.id ' + // Only include races with lap data
      'WHERE s.season = $1 ' +
      'GROUP BY r.id, t.slug, r.date ' +
      'ORDER BY r.date ASC',
      [seasonParam]
    );
    
    const races = racesRes.rows.map(row => ({
      id: row.id,
      slug: row.slug,
      name: trackNames[row.slug] || row.slug.replace(/-/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      date: row.date.toISOString().split('T')[0]
    }));
    
    return Response.json({ races });
    
  } catch (error) {
    console.error('Error fetching races:', error);
    return Response.json({ error: 'Failed to load races' }, { status: 500 });
  }
}