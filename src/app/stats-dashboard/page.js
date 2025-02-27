'use client';

import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';

const fetcher = (url) => fetch(url).then((res) => res.json());

function DataTable({ title, data, columns }) {
  return (
    <div style={{ marginBottom: '40px' }}>
      <h4>{title}</h4>
      <table
        border="1"
        cellPadding="5"
        style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}
      >
        <thead style={{ backgroundColor: '#f0f0f0' }}>
          <tr>
            {columns.map((col) => (
              <th key={col} style={{ textTransform: 'capitalize' }}>
                {col.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              {columns.map((col) => (
                <td key={col}>
                  {col === 'created_at'
                    ? new Date(row[col]).toLocaleString()
                    : row[col]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function RaceStatsPage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'telemetry';

  let endpoint = '';
  let title = '';
  let columns = [];

  switch (tab) {
    case 'telemetry':
      endpoint = '/api/telemetry';
      title = 'Car Telemetry Data';
      columns = [
        'id',
        'session_id',
        'index_id',
        'speed',
        'throttle',
        'steer',
        'brake',
        'clutch',
        'gear',
        'engine_rpm',
        'drs',
        'rev_lights_percent',
        'rev_lights_bit_value',
        'created_at'
      ];
      break;
    case 'carmotion':
      endpoint = '/api/carmotion';
      title = 'Car Motion Data';
      columns = [
        'id',
        'session_id',
        'index_id',
        'world_position_x',
        'world_position_y',
        'world_position_z',
        'yaw',
        'pitch',
        'roll',
        'created_at'
      ];
      break;
    case 'session':
      endpoint = '/api/session';
      title = 'Session Data';
      columns = [
        'id',
        'session_id',
        'weather',
        'track_temperature',
        'air_temperature',
        'total_laps',
        'track_length',
        'session_type',
        'created_at'
      ];
      break;
    case 'lap':
      endpoint = '/api/lap';
      title = 'Lap Data';
      columns = [
        'id',
        'session_id',
        'index_id',
        'last_lap_time_ms',
        'current_lap_time_ms',
        'lap_distance',
        'total_distance',
        'created_at'
      ];
      break;
    case 'event':
      endpoint = '/api/event';
      title = 'Event Data';
      columns = ['id', 'session_id', 'event_type', 'created_at'];
      break;
    case 'final':
      endpoint = '/api/finalclassification';
      title = 'Final Classification Data';
      columns = [
        'id',
        'session_id',
        'index_id',
        'race_number',
        'driver_name',
        'position',
        'num_laps',
        'grid_position',
        'points',
        'num_pit_stops',
        'created_at'
      ];
      break;
    default:
      endpoint = '/api/telemetry';
      title = 'Car Telemetry Data';
      columns = [
        'id',
        'session_id',
        'index_id',
        'speed',
        'throttle',
        'steer',
        'brake',
        'clutch',
        'gear',
        'engine_rpm',
        'drs',
        'rev_lights_percent',
        'rev_lights_bit_value',
        'created_at'
      ];
  }

  const { data, error } = useSWR(endpoint, fetcher);

  if (error) return <div>Error loading data from {endpoint}.</div>;
  if (!data) return <div>Loading data...</div>;

  return (
    <div>
      <h2>{title}</h2>
      <DataTable title={title} data={data} columns={columns} />
    </div>
  );
}
