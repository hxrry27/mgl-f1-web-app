// src/app/api/auth/verify/route.js
import { Pool } from 'pg';

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
  });

  export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
  
    try {
      const res = await pool.query(
        'UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE verification_token = $1 AND is_verified = FALSE RETURNING id',
        [token]
      );
      if (res.rowCount === 0) {
        return new Response(JSON.stringify({ message: 'Invalid or expired verification token' }), { status: 400 });
      }
      return new Response(JSON.stringify({ message: 'Account verified—please log in' }), { status: 200 });
    } catch (error) {
      console.error('Verification error:', error);
      return new Response(JSON.stringify({ message: 'Verification failed' }), { status: 500 });
    }
  }