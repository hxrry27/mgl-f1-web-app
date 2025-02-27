import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432, // default PostgreSQL port
});

export async function GET(request) {
  try {
    // Query the most recent 100 rows from the cartelemetrydata table
    const result = await pool.query(
      'SELECT * FROM cartelemetrydata ORDER BY created_at DESC LIMIT 100'
    );
    
    return new Response(JSON.stringify(result.rows), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error querying telemetry data:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch telemetry data" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
