# Geopolitical Risk Dashboard

A full-stack dashboard for analyzing geopolitical risk exposure across global technology, energy, and cryptocurrency portfolios.

## Prerequisites

- **Node.js 18+** and **npm**
- **Docker** and **Docker Compose** (used to run the SQL Server database locally)

Verify versions:

```bash
node -v
npm -v
docker -v
docker compose version
```

## Installation

From the project root:

```bash
npm install --legacy-peer-deps
```

## Running the App

### 1. Start the database

```bash
docker compose up -d
```

This starts a SQL Server 2022 container on `localhost:1433`. First startup may take 30–60 seconds while the health check passes.

### 2. Start the backend and frontend together

```bash
npm run dev:full
```

This launches the API first (waits for `http://localhost:5001/health`), then the frontend on `http://localhost:5173`. If either process exits, the launcher stops the other.

The backend automatically:
- Connects to SQL Server
- Creates the database schema
- Loads data from `public/datasets.csv`

### Or run them separately

In two terminals:

```bash
# Terminal 1 — backend (http://localhost:5001)
npm run dev:server

# Terminal 2 — frontend (http://localhost:5173)
npm run dev
```

## Using the App

Open `http://localhost:5173` in a browser. The dashboard loads the seeded portfolio automatically.

## Stopping

```bash
# stop dev processes: Ctrl+C in each terminal
docker compose down       # stop the database
docker compose down -v    # stop and wipe the database volume
```

## Running Tests

### Unit tests (no setup required)

```bash
npm test
```

Runs the Jest unit test suite (frontend + backend). No database or running server required. Verified passing: 53 tests across 10 suites.

### API contract tests

```bash
npm run test:contract
```

Runs the live-server API contract tests. Spawns the backend internally — no database required.

### DB-backed integration tests (requires Docker database running)

```bash
docker compose up -d              # if not already running
npm run test:integration:db
```

### End-to-end tests (Playwright)

```bash
npm run playwright:install        # one-time: install Chromium
npm run test:e2e                  # full suite
npm run test:e2e:smoke:ci         # smoke subset only
```

The e2e tests start their own dev server automatically (see `playwright.config.ts`).

## Troubleshooting

- **Port already in use (5001 / 5173 / 1433):** stop the process using that port or change the port via env vars (`SERVER_PORT`, Vite dev server flags, `docker-compose.yml`).
- **Database not ready / connection refused:** wait ~60 seconds after `docker compose up -d`, then retry. Check status with `docker compose ps`.
- **`npm install` fails on peer deps:** ensure `--legacy-peer-deps` is included.
- **Reset the database:** `docker compose down -v && docker compose up -d`, then restart the backend so it re-seeds.

## Project Structure

```
src/        Frontend (React + Vite + TypeScript)
server/     Backend API (Express, MSSQL)
public/     Seed CSVs and static assets
e2e/        Playwright end-to-end tests
```
