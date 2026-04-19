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

This uses a supervised launcher that starts the API first, waits for `http://localhost:5001/health`, then starts the frontend.
If either process exits unexpectedly, the launcher stops the other process and returns a non-zero exit code.
If the API is already running on port 5001, the launcher reuses it and only starts the frontend.

## API Endpoints

- `GET /api/health` - Server health check
- `GET /api/admin/metrics` - Runtime process + DB metrics (admin role)
- `GET /api/admin/observability` - Request volume/error/latency aggregates (admin role)
- `GET /api/admin/alerts` - Active observability-derived alerts (admin role)
- `GET /api/admin/audit-trail` - Recent admin/release audit events (admin role)
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

Copy `server/.env.example` to `server/.env` for a complete baseline config.

Additional runtime controls:
- `DB_CONNECT_STRICT` - when `true`, backend startup fails if DB connection fails.
- `DB_INIT_ENABLED` - when `true`, schema/data initialization runs during startup.
- `AUTH_REQUIRED` + `API_TOKEN` - enables token auth on `/api/*` routes.
- `EXPENSIVE_READ_*` / `EXPENSIVE_WRITE_*` - abuse protection limits for expensive endpoints.
- `ADMIN_RATE_LIMIT_*` - admin endpoint abuse protection.
- `AUDIT_TRAIL_MAX_ENTRIES` - retention depth for in-memory audit trail endpoint.

Integration runtime wiring:
- `INTEGRATION_WEBHOOK_URL` - optional outbound webhook sink for integration events.
- `BLOOMBERG_PORTFOLIO_API_URL` - optional portfolio source endpoint.
- `BLOOMBERG_API_TOKEN` - optional bearer token for Bloomberg source.
- `PIPELINE_SOURCE_URLS` - comma-separated upstream pipeline source URLs.
- `PIPELINE_SOURCE_AUTH_TOKEN` - optional bearer token for upstream pipeline calls.

Pipeline sync workflow wiring (GitHub Actions):
- Set repository/environment secrets `PIPELINE_SYNC_URL` and `PIPELINE_SYNC_API_KEY` for `.github/workflows/pipeline-sync.yml`.

## Security Hardening Controls

- Secret scanning enforcement workflow: `.github/workflows/secret-scan.yml`
- Dependency audit workflow: `.github/workflows/security-audit.yml`
- Dependabot policy: `.github/dependabot.yml` + `.github/DEPENDENCY_UPDATE_POLICY.md`
- Stricter backend security headers/CSP via Helmet policy in `server/server.js`
- Release workflow emits `release-audit` artifact for each deploy execution
- Operational audit sink runbook: `SECURITY_AUDIT_RUNBOOK.md`

## Performance Guardrails

- Route/component-level lazy loading is used for heavy non-default tabs and panels in `src/app/App.tsx`.
- Vite manual chunk strategy is defined in `vite.config.ts` for stable vendor chunking.
- Bundle budgets are enforced with `npm run perf:budget` (also executed in CI after build).

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

Development CORS note:
- In development mode, localhost and 127.0.0.1 origins are allowed across ports.
- In production, keep `ALLOWED_ORIGINS` explicit and restrictive.

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
