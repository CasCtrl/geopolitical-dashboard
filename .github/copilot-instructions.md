# Geopolitical Risk Dashboard — Copilot Instructions

Full-stack app for assessing geopolitical risk across global tech, energy, and crypto portfolios.

## Stack
- **Frontend**: React 19 + TypeScript, Vite 8, Material-UI 9 + Radix UI, Tailwind CSS 4, Recharts + d3-geo, React Hook Form + Zod, lucide-react icons.
- **Backend**: Node 18+, Express 5, MSSQL (SQL Server 2022), Helmet + CORS + express-rate-limit, Zod validation, Nodemailer.
- **Testing**: Jest 30 (unit + integration), Playwright (E2E), @testing-library/react.
- **Tooling**: ESLint, Docker Compose (SQL Server), `concurrently`.

## Layout
- `src/app/components/` — React feature panels (`.tsx`). UI primitives in `src/app/components/ui/`.
- `src/app/data/` — risk math, metrics, snapshot managers.
- `server/routes/` — Express route modules (`.js`, ESM).
- `server/middleware/` — `apiError.js`, `validate.js`.
- `server/utils/` — response metadata, audit trail, event bus, artifact store.
- `server/__tests__/` — Jest tests (`.test.js`).
- `e2e/` — Playwright specs (`.spec.ts`).

## Run commands
- `npm run dev` — Vite client only (port 3000).
- `npm run dev:server` — API only (port 5050).
- `npm run dev:full` — API + client together (preferred for full-stack work).
- `npm test` / `npm run test:coverage` — Jest.
- `npm run test:e2e` — Playwright.
- `npm run lint` — ESLint over `src` and `server`.
- `npm run build` — `tsc && vite build`.

## Backend conventions
- ESM everywhere (`import`/`export`, `"type": "module"`).
- Routes are `express.Router()` modules exporting the router.
- Validate input with Zod via `validateParams` / `validateQuery` / `validateBody` from `server/middleware/validate.js`.
- Throw errors with `new ApiError(status, CODE, message, details?)` and pass to `next(...)`; never send raw error text.
- Wrap DB access with `getPool()` and handle the null-pool (DB unavailable) case gracefully with a fallback response.
- Send data through `sendDataWithMeta(res, data, buildMetadata({...}))` from `server/utils/responseMetadata.js` — always attach source/reliability/freshness metadata.
- Preserve the audit-trail and observability patterns already in place.

## Frontend conventions
- Function components with typed `Props` interfaces; named exports.
- Use `useMemo`/`useCallback` for derived data and expensive calcs.
- Compose UI from `src/app/components/ui/` primitives and MUI/Radix; style with Tailwind.
- Keep risk/analytics math in `src/app/data/`, not inside components.
- Charts via Recharts; maps via d3-geo.

## General
- Follow OWASP Top 10; never introduce secrets into source. Config via env (`server/.env`, `server/config/env.js`).
- Match existing style; run `npm run lint` and relevant tests after changes.
- Keep changes scoped to the request; don't add unrequested features or docs.
