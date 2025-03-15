import { Pool } from 'pg';

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
  });

export async function POST(req) {
  const { userId } = await req.json();

  try {
    await pool.query('DELETE FROM dashboards WHERE user_id = $1', [userId]); // Clear dependent data
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    return new Response(JSON.stringify({ message: 'Account deleted successfully' }), { status: 200 });
  } catch (error) {
    console.error('Delete account error:', error);
    return new Response(JSON.stringify({ message: 'Account deletion failed' }), { status: 500 });
  }
}