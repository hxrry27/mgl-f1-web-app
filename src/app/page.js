import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h2>Welcome to MGL F1 Dashboard</h2>
      <p>Your one-stop dashboard for race telemetry and stats.</p>
      <Link href="/race-stats">
        <button style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}>
          Race Stats
        </button>
      </Link>
    </div>
  );
}
