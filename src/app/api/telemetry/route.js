export async function GET(request) {
    // Dummy data: an array of telemetry rows
    const dummyData = [
      {
        id: 1,
        session_id: "1234567890",
        index_id: 0,
        speed: 200,
        throttle: 0.85,
        steer: 0.05,
        brake: 0.1,
        gear: 5,
        engine_rpm: 7000,
        drs: 0,
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        session_id: "1234567890",
        index_id: 1,
        speed: 180,
        throttle: 0.8,
        steer: -0.03,
        brake: 0.2,
        gear: 4,
        engine_rpm: 6500,
        drs: 0,
        created_at: new Date().toISOString()
      }
      // Add more rows as needed for testing.
    ];
  
    return new Response(JSON.stringify(dummyData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  