import { Pool } from 'pg';

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
  });

export async function POST(req) {
  const { userId, newUsername } = await req.json();

  try {
    const checkRes = await pool.query('SELECT id FROM users WHERE username = $1 AND id != $2', [newUsername, userId]);
    if (checkRes.rows.length > 0) {
      return new Response(JSON.stringify({ message: 'Username already exists' }), { status: 409 });
    }

    await pool.query('UPDATE users SET username = $1 WHERE id = $2', [newUsername, userId]);
    return new Response(JSON.stringify({ message: 'Username changed successfully' }), { status: 200 });
  } catch (error) {
    console.error('Change username error:', error);
    return new Response(JSON.stringify({ message: 'Username change failed' }), { status: 500 });
  }
}