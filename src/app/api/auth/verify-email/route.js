import { Pool } from 'pg';

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
  });

export async function POST(req) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  try {
    const res = await pool.query(
      'UPDATE users SET email = $1, verification_token = NULL WHERE verification_token = $2 RETURNING id',
      [email, token]
    );
    if (res.rowCount === 0) {
      return new Response(JSON.stringify({ message: 'Invalid or expired token' }), { status: 400 });
    }
    return new Response(JSON.stringify({ message: 'Email changed successfully' }), { status: 200 });
  } catch (error) {
    console.error('Verify email error:', error);
    return new Response(JSON.stringify({ message: 'Email verification failed' }), { status: 500 });
  }
}