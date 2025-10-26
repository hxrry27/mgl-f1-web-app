# MGL F1 Web App

A comprehensive Formula 1 telemetry analysis and visualization platform designed specifically for **EA Sports F1** and **Codemasters F1** game series. This web application works in conjunction with custom UDP telemetry collection tools to provide historical racing data analysis.

## Overview

The MGL F1 Web App transforms raw telemetry data from F1 games into (hopefully) actionable insights through interactive dashboards, detailed race analysis, and comprehensive performance tracking. Built for sim racers, league organizers, and F1 enthusiasts who want to dive deep into their racing data.

## Key Features

### 📊 Race Data Visualization
- **Interactive Charts**: Speed traces, brake points, and racing lines
- **Lap Comparison**: Side-by-side analysis of multiple laps
- **Team Performance**: Comparative analysis across different teams
- **Track Dominance**: Mapping between drivers showing performance across different circuits

### 🏁 Championship Management
- **Season Tracking**: Full championship standings and points calculations
- **Race Results**: Comprehensive race result management and history
- **Driver Profiles**: Individual driver statistics and performance metrics
- **Team Analysis**: Constructor standings and team performance data

## F1 Game Integration

This application is specifically designed to work with:
- **F1 24** (EA Sports)
- **F1 23** (EA Sports) 
- **F1 22** (Codemasters)
- **F1 2021** (Codemasters)
- And other Codemasters F1 titles

### UDP Telemetry Collection

The app integrates seamlessly with custom UDP telemetry collection tools that capture:
- Real-time car telemetry data
- Session information and timing
- Weather and track conditions
- Damage and mechanical data
- Tyre compound and wear information

**Note**: You'll need a compatible UDP telemetry collector to feed data into this application. The app expects telemetry data in a specifically organized format.

## Technology Stack

- **Frontend**: Next.js 15, React 20, Tailwind CSS
- **Data Visualization**: Recharts, ApexCharts, D3.js
- **3D Graphics**: Three.js with React Three Fiber
- **Backend**: Node.js
- **Database**: PostgreSQL for persistent data storage
- **Caching**: Redis for performance optimization

## Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Redis server (optional, for caching)
- UDP telemetry collection tool configured for your F1 game

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/mgl-f1-web-app.git
cd mgl-f1-web-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up your environment variables (create `.env.local`):
```env
DATABASE_URL=postgresql://username:password@localhost:5432/f1_data
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3100](http://localhost:3100) in your browser

### Docker Deployment

For production deployment:

```bash
docker-compose up -d
```

## Data Import

The application expects telemetry data in CSV format. Place your telemetry files in the `public/telemetrycsv/` directory following the naming convention:
- `{track}-telemetry-{team}.csv` (e.g., `silverstone-telemetry-mclaren.csv`)

## Usage

1. **Setup Your Season**: Configure race calendar and team lineups
2. **Import Telemetry**: Upload CSV files from your UDP collector
3. **Analyze Performance**: Use the dashboard to explore your racing data
4. **Track Progress**: Monitor championship standings and race results
5. **Optimize Setup**: Use telemetry insights to improve your racing

## API Endpoints

The application provides RESTful APIs for:
- `/api/telemetry` - Telemetry data access
- `/api/races` - Race information and results
- `/api/seasons` - Championship data
- `/api/drivers` - Driver statistics
- `/api/teams` - Team performance data

## Contributing

This project is designed for the F1 gaming community. Contributions are welcome, especially:
- Additional telemetry data parsers
- New visualization components
- Performance optimizations
- Game compatibility improvements

## License

This project is for educational and personal use. F1 and related trademarks are property of Formula One World Championship Limited.

## Support

For issues related to:
- **Game Integration**: Ensure UDP telemetry is properly configured in your F1 game settings
- **Data Import**: Check CSV file format and naming conventions
- **Performance**: Consider enabling Redis caching for large datasets

---

*Built for the F1 gaming community to maximize racing potential through data-driven insights.*

"<!-- Auto-deploy test $(date) -->"
<-ls Test after auth fix Thu Aug 14 09:43:27 PM CEST 2025 -->
