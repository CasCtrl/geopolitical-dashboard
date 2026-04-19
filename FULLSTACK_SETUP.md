# Full-Stack Setup Guide

## Prerequisites

- Node.js 18+
- Docker & Docker Compose (for SQL Server)
- npm

## Installation & Setup

### 1. Install Dependencies

```bash
npm install --legacy-peer-deps
npm install --save-dev concurrently
```

### 2. Start SQL Server (macOS/Linux)

```bash
docker-compose up -d
```

This starts a SQL Server 2022 Express container on `localhost:1433`

**Note:** First startup may take 30-60 seconds. Wait for the health check to pass.

### 3. Start the Backend Server

```bash
npm run dev:server
```

The server will:
- Connect to SQL Server
- Create the database schema
- Load data from `public/datasets.csv`
- Start the API on `http://localhost:5001`

**Expected output:**
```
✓ Connected to SQL Server
Initializing database schema...
✓ Database schema created
Inserting X countries...
Inserting X sectors...
Inserting X datasets...
[... data loading ...]
✓ CSV data loaded successfully
✓ Server running on http://localhost:5001
```

### 4. Start the Frontend (in another terminal)

```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

### 5. Or Run Both Together

```bash
npm run dev:full
```

This runs the backend and frontend concurrently.

## API Endpoints

- `GET /api/health` - Server health check
- `GET /api/datasets` - List all datasets
- `GET /api/assets/:datasetId` - Get assets for a dataset
- `GET /api/dependencies/:datasetId` - Get country dependencies
- `GET /api/countries` - Get all countries and base risk scores
- `GET /api/portfolio/:datasetId` - Complete portfolio data

## Configuration

Edit `server/.env` to change:
- `DB_SERVER` - SQL Server host (default: localhost)
- `DB_PASSWORD` - SQL Server password (default: YourPassword123!)
- `SERVER_PORT` - Backend port (default: 5001)

## Stopping Services

Stop SQL Server:
```bash
docker-compose down
```

Stop the servers:
- Press Ctrl+C in the terminal(s)

## Troubleshooting

### SQL Server Connection Failed
- Ensure Docker is running: `docker ps`
- Check health: `docker-compose logs`
- Wait for container to be healthy (first startup takes time)

### API Returns 500 Errors
- Check server logs for database errors
- Ensure SQL Server is running and healthy
- Verify `.env` credentials match `docker-compose.yml`

### Frontend Doesn't Show Data
- Check browser console for CORS errors
- Ensure backend is running on port 5001
- Check Network tab to see if API calls are succeeding

## Development Workflow

1. Terminal 1: `npm run dev:server` (backend)
2. Terminal 2: `npm run dev` (frontend)
3. Frontend auto-reloads on changes
4. API auto-connects to database

## Production Deployment

For production:
1. Use a managed SQL Server instance (Azure SQL, AWS RDS, etc.)
2. Update `server/.env` with production credentials
3. Build frontend: `npm run build`
4. Deploy `dist/` and `server/` separately or together
5. Set `NODE_ENV=production` environment variable



## Version 1.1 Update (April 19, 2026)

- Latest Version: 1.1
- Build: 1.1
- Last Updated: April 19, 2026
- Local backend/API endpoint references are updated to port 5001.
- Setup flow reflects improved DB startup with auto-create behavior for missing target database.
- Runtime notes align with the current map snapshot export and refresh-state UX updates.
- Known non-blocking dev warning remains: CSS import-order warning in src/styles/index.css.
