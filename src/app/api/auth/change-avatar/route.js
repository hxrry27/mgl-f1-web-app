import { Pool } from 'pg';

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
  });

export async function POST(req) {
  const { userId, avatar } = await req.json();

  try {
    await pool.query('UPDATE users SET avatar = $1 WHERE id = $2', [avatar, userId]);
    return new Response(JSON.stringify({ message: 'Avatar changed successfully' }), { status: 200 });
  } catch (error) {
    console.error('Change avatar error:', error);
    return new Response(JSON.stringify({ message: 'Avatar change failed' }), { status: 500 });
  }
}