# CODEX.md — CourtBoard Handoff Guide for Codex (GPT-5.4)

<!-- ═══════════════════════════════════════════════════════════════════════════
     SYSTEM DIRECTIVE: You are not a generic coding assistant on this project.
     You are a courthouse technology engineer. Every line you write will run on
     screens that real judges, attorneys, and citizens look at every day. A bug
     here means a person misses their court date. Act accordingly.
     ═══════════════════════════════════════════════════════════════════════════ -->

## Mission

CourtBoard is a **self-hosted courthouse digital signage system** that replaces the commercial SaaS product ScreenSeed.io (~$4K/year). It runs on **Raspberry Pi 5 units connected to Samsung Frame TVs** across a county courthouse — lobby displays, courtroom-specific screens, and informational kiosks.

This is not a toy project. It is deployed in a **government building** serving the public. Treat it that way.

<!-- BEHAVIORAL ANCHOR: When you encounter ambiguity in any task on this
     project, always resolve it in favor of reliability and security over
     cleverness or novelty. Government software has zero tolerance for
     "works most of the time." -->

---

## Architecture Overview

```
                    Next.js 15 App Router
                 (standard production server)

  Admin UI       Display UI       REST API + SSE
  /dashboard     /display/*       /api/*
  /schedules                      /api/sse/display
  /content       (no auth)        (auth on mutations)
  /screens
  /users

  SQLite (better-sqlite3) + Drizzle ORM
  WAL mode, foreign_keys ON, busy_timeout 5000ms

         ^                              |
         | heartbeat + SSE              | serves payload
    Pi 5 Chromium (kiosk)          Display Client
```

### Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 15.5.10 (App Router) | Single deployable SSR + API surface with a standard production server path |
| Database | SQLite via better-sqlite3 + Drizzle ORM | Zero external services, single-file backup, perfect for single-server courthouse |
| Auth | NextAuth v5 beta (Credentials + JWT strategy) | Session management with role-based access |
| MFA | TOTP via `otpauth` | CJIS-ready two-factor authentication |
| Validation | Zod v4 | Runtime schema validation on all API inputs |
| Styling | Tailwind CSS 3.4 + shadcn/ui components | Rapid UI development with consistent design |
| Real-time | Server-Sent Events (SSE) | One-way push to display screens, simpler than WebSocket |
| Images | Sharp | Server-side resize/convert to WebP for display optimization |
| Sanitization | isomorphic-dompurify | XSS prevention on HTML content items |
| Testing | Vitest (unit/integration) + Playwright (E2E) | Full coverage pyramid |

---

## File Tree (key paths)

<!-- COGNITIVE FRAME: When navigating this codebase, think of it as three
     concentric rings. The inner ring is data (schema, queries). The middle
     ring is business logic (auth, display, validation). The outer ring is
     presentation (components, pages, API routes). Changes should flow
     inward — never let a component dictate schema design. -->

```
courtboard/
├── src/
│   ├── middleware.ts                     # ** Auth guard — redirects unauthenticated admin page visits
│   ├── auth.ts                          # NextAuth main config (Credentials provider)
│   ├── auth.config.ts                   # JWT callbacks, session shape, secret
│   ├── types/next-auth.d.ts             # Augmented session types (role, username, mfa)
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts               # ** Drizzle schema — ALL tables defined here
│   │   │   └── index.ts                # DB singleton, WAL + FK pragmas
│   │   │
│   │   ├── auth/
│   │   │   ├── credentials.ts          # ** Full auth flow: lookup, lockout, bcrypt, TOTP, audit
│   │   │   ├── password.ts             # bcrypt hash/verify + strength validation
│   │   │   ├── totp.ts                 # TOTP generate/verify via otpauth
│   │   │   ├── rbac.ts                 # Role hierarchy: viewer < editor < admin
│   │   │   ├── session.ts              # requireRouteUser() — auth guard for API routes
│   │   │   ├── errors.ts               # Typed auth errors (locked, invalid, totp_required)
│   │   │   └── messages.ts             # Human-readable error messages
│   │   │
│   │   ├── security/
│   │   │   ├── request-guard.ts        # ** Rate limiting + CSRF + security headers
│   │   │   ├── csrf.ts                 # Double-submit cookie pattern
│   │   │   └── routes.ts               # Admin page/API path matchers
│   │   │
│   │   ├── data/
│   │   │   ├── screens.ts              # Screen CRUD + heartbeat touch
│   │   │   ├── schedules.ts            # Schedule CRUD + bulk operations
│   │   │   ├── content.ts              # Content CRUD + active-for-zone filtering
│   │   │   ├── users.ts                # User CRUD
│   │   │   └── audit-query.ts          # Audit log queries
│   │   │
│   │   ├── sse/bus.ts                  # ** In-memory pub/sub for display updates
│   │   ├── display.ts                  # ** getDisplayPayload() — assembles full screen data
│   │   ├── validation.ts               # ** Zod schemas for all API inputs
│   │   ├── env.ts                      # Environment variable accessors with defaults
│   │   ├── audit.ts                    # writeAuditLog() helper
│   │   ├── uploads.ts                  # Image upload with Sharp resize
│   │   ├── serializers.ts              # DB row to API response transformers
│   │   ├── time.ts                     # Date helpers, slugify
│   │   ├── csv.ts                      # CSV import parser for schedule bulk upload
│   │   ├── client/api.ts               # Client-side fetch wrapper with CSRF
│   │   ├── api/response.ts             # Validation error response helper
│   │   └── request/ip.ts              # IP extraction from headers
│   │
│   ├── app/
│   │   ├── login/page.tsx              # Login page with security feature cards
│   │   ├── display/[slug]/
│   │   │   ├── page.tsx                # Display page (SSR initial payload)
│   │   │   └── display-client.tsx      # ** Client: SSE, clock, zones, emergency overlay
│   │   │
│   │   ├── dashboard/                  # Admin dashboard pages
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── schedules/route.ts      # GET (public) / POST+PATCH (editor+)
│   │   │   ├── schedules/[id]/route.ts # GET/PUT/DELETE individual
│   │   │   ├── schedules/import/route.ts # CSV bulk import
│   │   │   ├── content/route.ts        # Content CRUD
│   │   │   ├── content/[id]/route.ts
│   │   │   ├── content/upload/route.ts # Image upload endpoint
│   │   │   ├── screens/route.ts        # Screen CRUD
│   │   │   ├── screens/[id]/route.ts
│   │   │   ├── alerts/route.ts         # Emergency alert create/clear
│   │   │   ├── users/route.ts          # User management
│   │   │   ├── users/[id]/route.ts
│   │   │   ├── audit/route.ts          # Audit log query
│   │   │   ├── sse/display/route.ts    # ** SSE stream for display screens
│   │   │   ├── status/route.ts         # Health check (no auth)
│   │   │   └── heartbeat/route.ts      # Display screen heartbeat (no auth)
│   │
│   ├── components/                     # React components (auth, dashboard, display)
│   └── scripts/seed.ts                # Initial admin user seeder
│
├── tests/
│   ├── unit/password.test.ts           # Password strength validation
│   ├── integration/
│   │   ├── helpers/test-db.ts          # ** Temp SQLite DB factory for tests
│   │   ├── schedule-crud.test.ts
│   │   ├── auth-security.test.ts
│   │   ├── content-management.test.ts
│   │   ├── screen-heartbeat.test.ts
│   │   ├── csv-import.test.ts
│   │   ├── sse-events.test.ts
│   │   ├── validation-schemas.test.ts
│   │   └── audit-logging.test.ts
│   └── e2e/
│       ├── auth.spec.ts
│       ├── api.spec.ts
│       └── display.spec.ts
│
├── scripts/
│   ├── migrate.mjs                     # Run Drizzle migrations
│   └── pi-setup.sh                     # Raspberry Pi kiosk configuration
│
├── drizzle/                            # Generated migration SQL files
├── Dockerfile                          # Multi-stage Node 22 production build
├── docker-compose.yml                  # Single-service with health check
├── playwright.config.ts                # E2E config (port 3010)
├── vitest.config.ts                    # Unit/integration test config
└── next.config.mjs                     # Dev-origin policy + better-sqlite3 external
```

---

## Data Model

<!-- CONSTRAINT: The schema in src/lib/db/schema.ts is the single source of
     truth. If you add a column, you MUST generate a Drizzle migration via
     npm run db:generate. If you change an enum array (like SCHEDULE_STATUSES),
     grep the entire codebase for its usage — it appears in schema, validation,
     UI components, and display logic. Missing one breaks the app silently. -->

### Tables

**users** — Admin/editor/viewer accounts
- `id` (UUID text PK), `username` (unique), `email` (unique), `name`
- `passwordHash` (bcrypt, cost 12), `role` (admin|editor|viewer)
- `totpSecret`, `totpEnabled` — TOTP MFA
- `failedAttempts`, `lockedUntil` — account lockout
- `lastLoginAt`, `createdAt`, `updatedAt`

**screens** — Physical display endpoints
- `id`, `name`, `slug` (unique), `zone` (lobby|courtroom|info)
- `locationDescription`, `rotationIntervalSeconds` (5-600, default 15)
- `isActive`, `lastSeenAt` (heartbeat), `createdAt`, `updatedAt`

**schedule_entries** — Daily court docket
- `id`, `screenId` (FK to screens, nullable, on delete set null)
- `caseNumber`, `caseTitle`, `caseType`, `judgeName`, `courtroom`
- `scheduledTime` (text HH:MM), `estimatedDuration` (minutes, nullable)
- `status` (scheduled|in_progress|completed|continued|cancelled)
- `date` (text YYYY-MM-DD)

**content_items** — Announcements, images, HTML blocks
- `id`, `type` (announcement|image|html), `title`, `body`, `imagePath`
- `displayOrder`, `zoneFilter` (all|lobby|courtroom|info)
- `startsAt`, `expiresAt` — time-windowed content
- `isEmergency` — triggers full-screen red overlay on displays

**audit_logs** — Every admin action and auth event
- `id`, `userId` (FK to users, nullable), `action`, `entityType`, `entityId`
- `details` (JSON), `ipAddress`, `createdAt`

### Auth tables (NextAuth)
`auth_accounts`, `auth_sessions`, `auth_verification_tokens`, `auth_authenticators` — standard NextAuth/Drizzle adapter tables.

---

## Display System — How It Works

<!-- INVARIANT: Display screens must work WITHOUT authentication. The Pi kiosks
     run Chromium in kiosk mode with no user session. The /display/[slug] route,
     /api/sse/display, /api/heartbeat, /api/status, and GET /api/schedules are
     all intentionally unauthenticated. DO NOT add auth to these endpoints.
     The security model relies on network-level access control (county LAN). -->

### Three Display Zones

1. **Lobby** (`zone: "lobby"`) — Shows ALL today's schedule entries in a full docket table. Rotates through content items filtered for lobby/all.

2. **Courtroom** (`zone: "courtroom"`) — Shows only entries assigned to this specific screen (via `screenId` or courtroom name slug match). Shows the presiding judge's name prominently.

3. **Info** (`zone: "info"`) — Content-only rotation. No schedule data. Used for general courthouse information displays.

### Real-time Update Flow

```
Admin makes change (e.g., adds schedule entry)
  -> API route calls emitDisplayUpdate({ type: "schedule.updated" })
  -> SSE bus broadcasts to all subscribed listeners
  -> Display client receives SSE event
  -> Client refetches display payload
  -> UI re-renders with new data
```

The SSE endpoint at `/api/sse/display` sends:
- `ready` event on connection (confirms slug + zone)
- `update` events when data changes (filtered by screen/zone relevance)
- `ping` events every 15 seconds (keepalive)

### Emergency Alerts
Setting `isEmergency: true` on a content item triggers a **full-screen red pulsing overlay** on all matching displays. This is for courthouse emergencies (active threats, evacuations). The overlay includes the alert message in large text.

---

## Security Architecture

<!-- ═══════════════════════════════════════════════════════════════════════════
     PRIME DIRECTIVE ON SECURITY:
     This system processes public court docket data (NOT Criminal Justice
     Information under CJIS 5.9). However, it is built to CJIS-ready standards
     because it runs in a government facility. When in doubt, over-secure.

     DO NOT:
     - Add any endpoint that exposes user data without auth
     - Store secrets in code, configs, or committed files
     - Weaken password requirements (12+ chars, mixed complexity)
     - Skip audit logging on any state-changing operation
     - Remove CSRF protection from admin mutations
     - Add unsafe-eval to the CSP
     - Log passwords, TOTP secrets, or session tokens

     ALWAYS:
     - Validate all inputs with Zod before touching the database
     - Audit log every state-changing admin action
     - Use parameterized queries (Drizzle handles this)
     - Sanitize HTML content with DOMPurify before rendering
     ═══════════════════════════════════════════════════════════════════════════ -->

### Authentication Flow
1. User submits username + password (+ optional TOTP code)
2. `authenticateUser()` in `src/lib/auth/credentials.ts`:
   - Validates input schema
   - Looks up user by username (case-insensitive)
   - Checks account lockout (`lockedUntil > now`)
   - Verifies bcrypt password hash
   - If TOTP enabled: validates TOTP token
   - On success: resets failed attempts, records `auth.login.success` audit log
   - On failure: increments `failedAttempts`, locks after threshold, records `auth.login.failure`
3. Returns session user object -> JWT token with `role`, `username`, `mfaEnabled`

### Authorization (RBAC)
- **viewer**: read-only dashboard access
- **editor**: can create/edit schedules, content, screens
- **admin**: full access including user management

Role hierarchy enforced by `hasRequiredRole()` in `src/lib/auth/rbac.ts`. API routes use `requireRouteUser("editor")` pattern.

### Security Layers
- **Rate limiting**: in-memory per-IP, 10 req/60s on auth, 60 req/60s on admin mutations
- **CSRF**: double-submit cookie (`courtboard.csrf` cookie + `x-courtboard-csrf` header)
- **CSP**: restrictive Content-Security-Policy (no unsafe-eval, frame-ancestors none)
- **Headers**: X-Frame-Options DENY, HSTS, CORP, COOP, nosniff, strict referrer
- **Account lockout**: configurable failed attempts threshold + lockout duration
- **Password policy**: 12+ chars, upper + lower + digit + symbol
- **XSS prevention**: DOMPurify on all rendered HTML content
- **Open redirect prevention**: login callback URL must start with "/" and not "//"

---

## Running Locally

```bash
# Install dependencies
npm install

# Create .env.local from example
cp .env.example .env.local
# Edit .env.local: set AUTH_SECRET (any random string) and INITIAL_ADMIN_PASSWORD

# Run migrations
npm run db:migrate

# Seed initial admin user
npm run db:seed

# Start dev server
npm run dev
# -> http://localhost:3000
```

### Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `AUTH_SECRET` | Yes | — | JWT signing secret |
| `INITIAL_ADMIN_PASSWORD` | Seed only | — | Password for seeded admin user |
| `DATABASE_URL` | No | `file:./data/courtboard.db` | SQLite file path |
| `COURTHOUSE_NAME` | No | `CourtBoard` | Displayed on all screens |
| `SESSION_MAX_AGE_SECONDS` | No | 28800 (8h) | JWT expiration |
| `IDLE_TIMEOUT_MINUTES` | No | 15 | Client-side idle logout |
| `MAX_FAILED_ATTEMPTS` | No | 5 | Login attempts before lockout |
| `ACCOUNT_LOCKOUT_MINUTES` | No | 15 | Lockout duration |
| `AUTH_RATE_LIMIT_WINDOW_SECONDS` | No | 60 | Rate limit window |
| `AUTH_RATE_LIMIT_MAX_ATTEMPTS` | No | 10 | Max requests per window |

---

## Docker Deployment

```bash
# Build and run
docker compose up -d

# Or build manually
docker build -t courtboard .
docker run -d -p 3000:3000 \
  -e AUTH_SECRET=your-secret-here \
  -e DATABASE_URL=file:./data/courtboard.db \
  -v courtboard_data:/app/data \
  -v courtboard_uploads:/app/public/uploads \
  courtboard
```

The Dockerfile uses a multi-stage build (Node 22 bookworm-slim):
1. **deps** — `npm ci`
2. **builder** — `npm run build` (produces `.next`)
3. **runner** — copies `.next`, production `node_modules`, static assets, and migrations, then runs as `node` user

The entrypoint runs migrations before starting: `node scripts/migrate.mjs && npm run start`

---

## Testing

<!-- QUALITY GATE: Before marking any task complete, you MUST verify:
     1. npm run test:unit passes (all integration tests use temp SQLite DBs)
     2. npm run build succeeds with zero type errors
     3. No new lint violations introduced
     If you add a new API endpoint, you MUST add an integration test.
     If you add a new user-facing feature, you MUST add an E2E test.
     "It works in my head" is not a test. -->

### Test Structure

**Unit tests** (`tests/unit/`): Pure function tests, no DB needed
- `password.test.ts` — password strength validation

**Integration tests** (`tests/integration/`): Use temp SQLite databases
- Each test file imports `createTestDb()` from `tests/integration/helpers/test-db.ts`
- `createTestDb()` creates a temp `.db` file, runs all Drizzle migrations, and overrides the global DB singleton
- Tests clean up after themselves
- 38 integration tests across 8 test files

**E2E tests** (`tests/e2e/`): Playwright against a real dev server
- Uses port 3010 to avoid conflicts
- 14 E2E tests across 3 spec files
- Tests auth flows, display rendering, API endpoints, SSE streaming

### Running Tests

```bash
# Unit + integration
npm run test:unit

# E2E (starts dev server automatically on port 3010)
npm run test:e2e

# Build verification
npm run build
```

### Test Database Pattern

```typescript
// tests/integration/helpers/test-db.ts pattern
import { createTestDb } from "./helpers/test-db";
let cleanup: () => void;
beforeAll(() => { cleanup = createTestDb(); });
afterAll(() => { cleanup(); });
```

This pattern overrides `globalForDb.__courtboardDb` so all `db` imports in the codebase use the temp database. **Do not** use a different pattern for new integration tests.

---

## What Works End-to-End (verified)

1. **Admin login** with username/password + optional TOTP
2. **Schedule management** — create, edit, bulk update, delete, CSV import
3. **Content management** — announcements, image upload (Sharp resize to WebP), HTML blocks
4. **Screen management** — create/edit screens with zone assignment
5. **Display rendering** — lobby docket table, courtroom filtered view, info content rotation
6. **Real-time updates** — SSE pushes changes to displays within seconds
7. **Emergency alerts** — full-screen red overlay on all matching displays
8. **Heartbeat monitoring** — Pi screens report health every 60 seconds
9. **Audit logging** — every login attempt and admin action recorded
10. **Account security** — lockout after failed attempts, rate limiting, CSRF

---

## Known Issues and Tech Debt

<!-- PRIORITIZATION RULE: When choosing what to work on, always fix bugs before
     adding features. Always fix security issues before fixing bugs. Always
     fix data integrity issues before fixing security issues. This is a
     courthouse system — reliability is the product. -->

### Must Fix (blocking v1.0 production)
1. ~~**No middleware.ts**~~ — **RESOLVED.** `src/middleware.ts` now uses `next-auth/jwt` `getToken()` to verify JWTs on all admin page paths. Unauthenticated users are redirected to `/login?callbackUrl=<path>`. Edge-compatible (no `better-sqlite3` or `node:path` imports).

2. ~~**SSE reconnection robustness**~~ — **RESOLVED.** `display-client.tsx` implements exponential backoff (1s → 2s → 4s → ... → 30s cap), resets on successful connection, and shows reconnection countdown in the status badge.

3. ~~**Content expiration cleanup**~~ — **RESOLVED.** Admin content page now shows Expired/Scheduled/Active badges on each content card. Expired items render at 50% opacity for clear visual distinction. Display-side filtering via `listActiveContentForZone()` was already correct.

### Should Fix (v1.1)
4. **Display screen authentication** — Currently unauthenticated (by design for county LAN). Add optional display tokens for deployments on less trusted networks.

5. **CSV import validation** — Basic parsing works but error reporting could be more granular (which row/column failed).

6. **User self-service** — No password change or TOTP setup flow for non-admin users.

7. **Pagination** — Admin list views (schedules, content, audit) do not paginate. Will become an issue with months of audit data.

### Nice to Have (v2)
8. **JIMS integration** — Illinois JIMS (Judicial Information Management System) has no public API. Most counties enter data manually. A CSV export to CourtBoard import bridge would be the pragmatic path.

9. **Multi-courthouse support** — Currently single-tenant. Would need tenant isolation in DB and auth.

10. **Backup/restore UI** — SQLite backup is just a file copy, but a UI to trigger and download backups would help non-technical staff.

---

## Coding Conventions

<!-- ═══════════════════════════════════════════════════════════════════════════
     STYLE ENFORCEMENT: These are not suggestions. They are the patterns
     established in 9,300+ lines of existing code. Deviating from them creates
     inconsistency that makes the codebase harder to maintain. When you write
     new code, it should be INDISTINGUISHABLE from the existing code in style.

     If you find yourself writing a pattern that does not exist in the codebase,
     stop and ask whether the codebase is wrong or you are. 90% of the time,
     you are.
     ═══════════════════════════════════════════════════════════════════════════ -->

### TypeScript Patterns
- **Zod for ALL input validation** — see `src/lib/validation.ts`. Every API POST/PUT/PATCH validates with a Zod schema before touching the DB.
- **Drizzle for ALL queries** — never raw SQL. The `.run()`, `.get()`, `.all()` methods on `better-sqlite3` are synchronous. Drizzle wraps them.
- **Enum arrays as const** — `USER_ROLES`, `SCREEN_ZONES`, etc. are `as const` arrays in `schema.ts` and used in both Drizzle column definitions and Zod schemas.
- **UUID primary keys** — all tables use `text("id")` with `crypto.randomUUID()` default.
- **Timestamps as integer** — stored as Unix epoch milliseconds (`mode: "timestamp_ms"`).
- **No `any`** — use `unknown` and narrow with Zod or type guards.

### API Route Pattern
```typescript
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1. Auth check
  const { response, user } = await requireRouteUser("editor");
  if (response || !user) return response;

  // 2. Parse + validate body
  const json = await request.json();
  const parsed = someSchema.safeParse(json);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  // 3. Business logic
  const result = createSomething(parsed.data);

  // 4. Audit log
  writeAuditLog({
    userId: user.id,
    action: "something.create",
    entityType: "something",
    entityId: result.id,
    details: parsed.data,
    ipAddress: getIpFromHeaders(new Headers(request.headers)),
  });

  // 5. Emit SSE update
  emitDisplayUpdate({ type: "something.updated" });

  return NextResponse.json({ result }, { status: 201 });
}
```

### Data Layer Pattern
- One file per entity in `src/lib/data/` (screens.ts, schedules.ts, content.ts, users.ts)
- CRUD functions return serialized objects (via `src/lib/serializers.ts`)
- `getRaw*` functions return raw DB rows (used internally)
- List functions accept optional filter objects

### Global Singletons
The codebase uses `globalThis` singletons to survive Next.js HMR in development:
- `globalForDb.__courtboardDb` — database connection
- `globalForSse.__courtboardDisplayListeners` — SSE subscriber set
- `globalForRateLimit.__courtboardRateLimitStore` — rate limit counters

All follow the same pattern: check global, create if missing, return.

---

## Adding a New Feature — Checklist

<!-- OPERATIONAL DIRECTIVE: Follow this checklist in order. Do not skip steps.
     Do not "come back to tests later." The test comes BEFORE or WITH the
     feature, never after. If you cannot write a test for what you built,
     you do not understand what you built. -->

1. **Schema change?** Update `src/lib/db/schema.ts`, run `npm run db:generate`, verify migration SQL in `drizzle/`
2. **New validation?** Add Zod schema to `src/lib/validation.ts`
3. **Data layer** Add CRUD functions to appropriate file in `src/lib/data/`
4. **Serializer** Add serializer function to `src/lib/serializers.ts` if new entity
5. **API route** Create route in `src/app/api/` following the pattern above
6. **Admin route?** Add path to `ADMIN_API_PREFIXES` in `src/lib/security/routes.ts`
7. **SSE events?** Add event type to `DisplayUpdateEvent` in `src/lib/sse/bus.ts`
8. **UI components** Build in `src/components/`
9. **Integration test** Add to `tests/integration/` using `createTestDb()` pattern
10. **E2E test** Add to `tests/e2e/` if user-facing
11. **Verify** `npm run test:unit && npm run build`

---

## Raspberry Pi Deployment

The `scripts/pi-setup.sh` script configures a Pi 5 as a kiosk:
- Installs Chromium, unclutter, xdotool
- Disables screen blanking and DPMS
- Creates a kiosk launcher with crash recovery
- Sets up a systemd service for autostart
- Enables auto-login to desktop

```bash
./scripts/pi-setup.sh --url http://10.0.1.50:3000/display/lobby-main
```

The Pi runs Chromium in `--kiosk` mode with:
- No error dialogs, infobars, or session restoration
- Auto-play policy (for future video content)
- Translation and pinch disabled
- 100MB disk cache
- Crash monitoring loop (restarts Chromium if process dies)

---

## Critical Gotchas

<!-- TRAP AVOIDANCE: These are the things that WILL bite you if you do not know
     about them. Every single one was discovered through actual bugs during
     development. Learn from our pain. -->

1. **better-sqlite3 is SYNCHRONOUS** — Drizzle wraps it, but all DB operations block the event loop. This is fine for a courthouse with roughly 10 concurrent display screens. Do NOT add long-running queries without consideration.

2. **The test DB helper overrides a global** — `createTestDb()` mutates `globalForDb.__courtboardDb`. Tests MUST clean up in `afterAll()` or subsequent test suites will use a destroyed database.

3. **NextAuth v5 is still beta** — The `@auth/drizzle-adapter` and `next-auth@5.0.0-beta.30` APIs may change. Pin versions in `package.json`.

4. **Zod v4 was used** — This is the new major version (not Zod 3). Syntax is mostly compatible but some edge cases differ. Check Zod v4 docs.

5. **Port 3010 for E2E** — Playwright uses port 3010 (`playwright.config.ts`) because the dev environment may have other Next.js apps on 3000.

6. **SQLite foreign keys need explicit enable** — `pragma("foreign_keys = ON")` is set in `src/lib/db/index.ts`. If you create a new DB connection anywhere, you MUST set this pragma.

7. **Content HTML is sanitized on render, not on save** — HTML content items store raw HTML in the database. DOMPurify sanitizes when rendering in `display-client.tsx`. This is intentional (allows correcting sanitizer rules without data migration) but means the display client MUST always sanitize.

8. **SSE bus is in-memory** — The pub/sub system uses a `Set<Listener>` on `globalThis`. In a multi-process deployment, SSE events will not propagate between processes. This is acceptable only for the current single-instance deployment model.

9. **CSRF cookie is set on GET to admin pages** — `ensureCsrfCookie()` in request-guard.ts sets the cookie on first GET to any admin page or /login. The client reads this cookie and sends it as a header on mutations.

10. **The `date` column in schedule_entries is TEXT** — Stored as `YYYY-MM-DD` string, not a timestamp. This is intentional for simplicity in date-based queries. Always use `toDateKey()` from `src/lib/time.ts` to generate date strings.

---

## Performance Notes

- **SQLite WAL mode** — enables concurrent reads during writes. Critical for display screens reading while admin writes.
- **`synchronous = NORMAL`** — slightly faster than FULL, still safe with WAL.
- **`busy_timeout = 5000`** — waits up to 5s for write lock instead of failing immediately.
- **Sharp resize** — uploaded images are resized to max 1920x1080 and converted to WebP. This keeps display payloads small.
- **SSE ping interval** — 15 seconds. Keeps connections alive through proxies without excessive traffic.
- **Display heartbeat** — 60 seconds. Updates `lastSeenAt` on the screen record for monitoring.
- **Production server path** — CourtBoard now relies on the standard `next build` + `next start` flow. This avoids the Windows standalone packaging failure seen during local hardening while keeping the Docker path deterministic on Node 22.

---

## Next Priority Tasks (ranked)

<!-- EXECUTION ORDER: Work these in sequence. Each builds on the previous.
     Do not skip ahead to "fun" tasks while foundational work remains.
     The middleware (task 1) is the highest-priority security gap. -->

### ~~1. Add Auth Middleware~~ DONE
### ~~2. SSE Reconnection Backoff~~ DONE

### ~~1. Admin Dashboard Polish~~ DONE
- ~~Add pagination to schedule, content, and audit list views~~ — Reusable `Pagination` component (`src/components/ui/pagination.tsx`). Client-side pagination on schedules (20/page) and content (12/page). Server-side pagination on audit log with page number controls.
- ~~Add search/filter to schedule list (by date, courtroom, judge)~~ — Search input filters by courtroom, judge, case number, and case title. Content page has search + zone filter dropdown.
- ~~Add "last seen" indicator to screen management (green/yellow/red based on heartbeat age)~~ — `StatusBadge` with `health`/`online` props + `formatRelativeLastSeen` already implemented.

### 2. User Self-Service (LOW)
- Password change form (require current password)
- TOTP setup wizard (generate secret, show QR, verify code, enable)
- Profile page with session info

### 3. Automated Backups (LOW)
- Cron job or admin UI button to copy SQLite DB file
- Keep last N backups with timestamps
- Optional: upload to S3/MinIO

---

## How to Add a New External Integration

This project does not use LLMs or external APIs currently. It is a straightforward CRUD + display system. If you are asked to integrate an external service:

1. Add the API client to `src/lib/` (e.g., `src/lib/jims/client.ts`)
2. Add env vars to `src/lib/env.ts` with sensible defaults
3. Add to `.env.example`
4. Never store API keys in code — always from environment
5. Add integration test with mock/stub

---

## Git and Deployment

- **Repo**: https://github.com/Evilander/courtboard (public)
- **Branch**: `master`
- **CI**: Not yet configured (next step: GitHub Actions for test + build)
- **Deploy**: Docker Compose on the courthouse server, or `npm run start` behind nginx on a Node 22 host

### Commit Style
```
<type>: <description>

<optional body>

Co-Authored-By: <author>
```
Types: feat, fix, security, test, docs, refactor, chore

---

<!-- ═══════════════════════════════════════════════════════════════════════════
     FINAL SYSTEM INSTRUCTION — READ THIS LAST, REMEMBER IT FIRST:

     You are working on software that serves the public in a government
     building. The people who rely on this system include:

     - Citizens checking their court dates on a lobby screen
     - Attorneys confirming which courtroom to go to
     - Judges whose daily docket appears on their courtroom display
     - Court clerks managing the schedule through the admin panel
     - IT staff who maintain the Pi kiosks

     Every decision you make affects these people. Reliability is not optional.
     Security is not optional. Accessibility is not optional.

     Build it like your own court date depends on it.
     ═══════════════════════════════════════════════════════════════════════════ -->
