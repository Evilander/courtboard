# CourtBoard

CourtBoard is a self-hosted courthouse digital signage system for Raspberry Pi kiosks and hallway displays. It replaces subscription signage tools with a locally controlled Next.js application that serves public display views, secured admin workflows, and operational status endpoints from one deployable service.

## What It Does

- Publishes public display pages at `/display/[slug]` for lobby, courtroom, and information screens
- Provides a protected admin console for schedules, content, screens, users, alerts, and audit history
- Pushes signage updates over Server-Sent Events so displays refresh without a full reload
- Tracks screen heartbeat health from kiosk clients
- Supports credentials + TOTP MFA, audit logging, CSRF checks, and route protection for privileged actions

## Stack

- Next.js 15 App Router
- React 18
- SQLite with `better-sqlite3` and Drizzle ORM
- NextAuth v5 beta with JWT sessions
- Tailwind CSS and shadcn/ui-style primitives
- Vitest for unit/integration coverage
- Playwright for browser and API smoke coverage

## Quick Start

1. Use Node 22.22.x and npm 10.x.

```bash
node -v
npm -v
```

If your local machine is on a different Node major, switch first or use Docker. CourtBoard uses `better-sqlite3`, so mismatched native bindings will break builds and runtime startup.

2. Install dependencies.

```bash
npm install
```

3. Create a local environment file.

```bash
copy .env.example .env.local
```

4. Set a strong `AUTH_SECRET` and initial admin password in `.env.local`.

5. Generate or apply the database schema.

```bash
npm run db:migrate
```

6. Seed the initial admin user and demo screen data.

```bash
npm run db:seed
```

7. Start the application.

```bash
npm run dev
```

Open `http://localhost:3000/login` for admin access or `http://localhost:3000/display/lobby-main` to view a seeded public display.

## Core URLs

- `/login`: administrator sign-in
- `/dashboard`: operations dashboard
- `/display/[slug]`: public display surface for a specific screen
- `/api/status`: detailed runtime and fleet status
- `/api/ready`: readiness probe for deploy health checks

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | SQLite file URL, usually `file:./data/courtboard.db` |
| `AUTH_SECRET` | Yes | Session signing secret |
| `AUTH_URL` | Yes | Canonical application origin |
| `COURTHOUSE_NAME` | No | Branding text shown on displays and admin screens |
| `INITIAL_ADMIN_USERNAME` | Seed only | Initial administrator username |
| `INITIAL_ADMIN_EMAIL` | Seed only | Initial administrator email |
| `INITIAL_ADMIN_PASSWORD` | Seed only | Initial administrator password |
| `INITIAL_ADMIN_TOTP_SECRET` | Optional | Fixed TOTP seed for deterministic bring-up |
| `SESSION_MAX_AGE_SECONDS` | No | Session lifetime |
| `IDLE_TIMEOUT_MINUTES` | No | Admin inactivity timeout target surfaced to operators |
| `MAX_FAILED_ATTEMPTS` | No | Account lockout threshold |
| `ACCOUNT_LOCKOUT_MINUTES` | No | Lockout window after repeated failures |
| `AUTH_RATE_LIMIT_WINDOW_SECONDS` | No | Authentication rate-limit window |
| `AUTH_RATE_LIMIT_MAX_ATTEMPTS` | No | Authentication rate-limit max requests |
| `UPLOAD_MAX_BYTES` | No | Maximum allowed image upload size in bytes |
| `TZ` | No | Timezone for schedule date calculations (default: `America/Chicago`) |

See [.env.example](./.env.example) for a full local template.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start local development server |
| `npm run build` | Production build |
| `npm run start` | Run the production server after build |
| `npm run lint` | ESLint validation |
| `npm run test:unit` | Vitest unit and integration suites |
| `npm run test:integration` | Vitest unit and integration suites |
| `npm run test:e2e` | Playwright browser and API checks |
| `npm run check` | Lint + Vitest + production build |
| `npm run db:migrate` | Apply Drizzle migrations |
| `npm run db:seed` | Seed admin user and demo courthouse data |

## Production Deployment

### Docker Compose

1. Copy `.env.example` to `.env`.
2. Set production-safe values for `AUTH_SECRET`, `AUTH_URL`, and the initial admin credentials.
3. Start the stack:

```bash
docker compose up -d --build
```

The container runs migrations on startup and exposes a health check through `/api/ready`.

The included Dockerfile is the preferred production path because it locks the runtime to Node 22 and avoids local native-module drift.

### Raspberry Pi Kiosk

Use the included setup helper:

```bash
./scripts/pi-setup.sh --url http://courtboard.local:3000/display/lobby-main
```

The display client registers a service worker for offline resilience, sends heartbeats every 60 seconds with a signed display session cookie, and reconnects to SSE updates with exponential backoff.

## Operational Expectations

- Admin traffic should be served over HTTPS in production.
- The SQLite database should live on encrypted storage and be backed up regularly.
- Public displays are intentionally unauthenticated, but all admin mutations require authentication and CSRF protection.
- `/api/status` is intended for operators and monitoring on the trusted network. Do not expose the admin surface directly to the public internet without a reverse proxy and TLS.

## Verification Gates

Run these before calling a deployment ready:

```bash
npm run check
npm run test:e2e
```

Then confirm:

- `GET /api/ready` returns HTTP 200
- `GET /api/status` reports expected screen and record counts
- an admin can sign in and edit content
- a display page receives heartbeat updates and reconnects cleanly after a network interruption

## Project Layout

```text
src/
  app/
    (admin)/         authenticated admin routes
    api/             JSON APIs, SSE, heartbeat, readiness, status
    display/         public signage routes
    login/           admin authentication
  components/        admin, auth, and UI components
  lib/
    auth/            credentials, TOTP, roles, session helpers
    data/            entity CRUD and queries
    db/              schema and SQLite client
    security/        middleware request guard, CSRF, route matching
    sse/             in-memory display update bus
tests/
  e2e/               Playwright runtime coverage
  integration/       API and data-layer tests
  unit/              focused unit tests
```

## Current Production Notes

- This is a single-process deployment model. The in-memory SSE bus does not fan out across multiple application instances.
- The app is optimized for a courthouse-sized fleet, not horizontal web-scale traffic.
- Uploaded images are stored on local disk under `public/uploads`.

## License

No license file is currently included. Add one before distributing outside the current organization.
