import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

export async function GET(request) {
  try {
    const result = await pool.query(
      'SELECT * FROM finalclassificationdata ORDER BY created_at DESC LIMIT 100'
    );
    return new Response(JSON.stringify(result.rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    //DEBUG: console.error("Error querying finalclassificationdata:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch final classification data" }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
