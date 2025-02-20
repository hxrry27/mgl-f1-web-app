'use client';

import useSWR from 'swr';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function RaceStats() {
  // Fetch telemetry data from our API route
  const { data, error } = useSWR('/api/telemetry', fetcher);

  if (error) return <div>Error loading telemetry data.</div>;
  if (!data) return <div>Loading telemetry data...</div>;

  return (
    <div>
      <h2>Race Stats Dashboard</h2>
      <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Session ID</th>
            <th>Index</th>
            <th>Speed</th>
            <th>Throttle</th>
            <th>Steer</th>
            <th>Brake</th>
            <th>Gear</th>
            <th>Engine RPM</th>
            <th>DRS</th>
            <th>Created At</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{row.session_id}</td>
              <td>{row.index_id}</td>
              <td>{row.speed}</td>
              <td>{row.throttle}</td>
              <td>{row.steer}</td>
              <td>{row.brake}</td>
              <td>{row.gear}</td>
              <td>{row.engine_rpm}</td>
              <td>{row.drs}</td>
              <td>{new Date(row.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
