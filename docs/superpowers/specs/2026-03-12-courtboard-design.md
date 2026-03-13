# CourtBoard — Design Specification

**Date:** 2026-03-12
**Status:** Draft
**Purpose:** Replace ScreenSeed.io ($4K/year) with a self-hosted courthouse digital signage system.

---

## Problem

The county pays ~$4K/year for ScreenSeed.io to display court schedules and images on ~10 screens. The actual need is simple: serve HTML pages on the county network that Raspberry Pi 5s open in a browser on Frame TVs. No interactive kiosks, no visitor management, no forms.

## Solution

**CourtBoard** — a self-hosted Next.js web app that serves display pages for courthouse screens and provides an admin panel for managing content. Runs on any machine on the county network.

## Hardware Setup (existing)

- ~10 Raspberry Pi 5 units connected to Samsung Frame TVs (or similar)
- Each Pi runs a script that opens Chromium to a URL and hides the cursor
- Pis are on the county network with internet access
- One server (spare PC, VM, or Pi) hosts the CourtBoard app
- Additionally tested on an all-in-one PC

## Screen Zones

| Zone | Count | Content |
|------|-------|---------|
| Lobby/Terminal | 1-2 | Full daily docket, welcome message, building hours |
| Courtroom Doors | 4-5 | That courtroom's schedule, judge name, case status |
| General Info | 3-4 | Voting info, county announcements, rotating images |

Each screen is assigned a zone and gets a unique display URL:
- `/display/lobby-main`
- `/display/courtroom-1`
- `/display/info-hallway-2`

## Architecture

### Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 14 (App Router) | SSR display pages, API routes, admin UI — one deploy |
| Language | TypeScript | Type safety, better DX |
| Styling | Tailwind CSS + shadcn/ui | Fast, consistent UI for admin panel |
| Database | SQLite via Drizzle ORM | Zero setup, single file, perfect for 10 screens |
| Auth | NextAuth.js v5 | Session management, role-based access |
| MFA | TOTP (authenticator app) | CJIS requirement for admin access |
| Real-time | Server-Sent Events (SSE) | Admin changes push instantly to display screens |
| Offline | Service Worker | Screens cache and display last content if server unreachable |
| Images | Local upload + sharp | Resize/optimize on upload, serve optimized |
| Deployment | Docker + docker-compose | One command deploy on any Linux/Windows machine |

### Data Model

```
Screen
  - id, name, slug, zone (lobby|courtroom|info), location_description
  - rotation_interval_seconds (for multi-content cycling)
  - is_active, last_seen_at (heartbeat from display page)

ScheduleEntry
  - id, screen_id (nullable = show on all courtroom screens)
  - case_number, case_title, case_type
  - judge_name, courtroom
  - scheduled_time, estimated_duration
  - status (scheduled|in_progress|completed|continued|cancelled)
  - date

ContentItem
  - id, type (image|announcement|html)
  - title, body (markdown or HTML)
  - image_path (for images)
  - display_order, zone_filter
  - starts_at, expires_at (scheduling)
  - is_emergency (overrides everything, red banner)

AuditLog
  - id, user_id, action, entity_type, entity_id
  - details (JSON), ip_address, timestamp

User
  - id, username, password_hash, role (admin|editor|viewer)
  - totp_secret, totp_enabled
  - last_login_at, failed_attempts, locked_until
```

### Display Page Behavior

1. Pi opens Chromium to `http://courtboard.local/display/courtroom-1`
2. Page renders current schedule entries for that screen's zone
3. If multiple content items assigned, auto-rotates on configured interval
4. SSE connection listens for updates — page refreshes content without full reload
5. Service worker caches last response — if server goes down, screen keeps showing last content
6. Heartbeat pings server every 60s so admin dashboard shows online/offline status
7. Emergency alerts override everything — full-screen red banner with message

### Admin Panel Features

1. **Dashboard** — all screens with online/offline status, current content preview
2. **Schedule Manager** — add/edit/delete schedule entries, bulk import via CSV
3. **Content Manager** — upload images, create announcements, set display windows
4. **Screen Manager** — configure screens, assign zones, set rotation intervals
5. **Emergency Alert** — one-click push alert to all screens (or selected zones)
6. **Audit Log** — searchable log of all admin actions
7. **User Management** — add/remove users, enforce MFA, manage roles
8. **CSV Import** — upload JIMS schedule export, map columns, preview, import
9. **Settings** — courthouse name, logo, theme colors, display defaults

### Data Input Methods

1. **Manual entry** (primary) — admin types schedule into web form
2. **CSV upload** (step-up) — export from JIMS, upload, map columns, import
3. **Recurring schedules** — templates for regular court dates
4. **Future:** API endpoint for direct JIMS integration if Goodin Associates ever provides one

## Advantages Over ScreenSeed

| Feature | ScreenSeed | CourtBoard |
|---------|-----------|------------|
| Cost | ~$4K/year | $0 |
| Emergency Alerts | Unknown | Instant push to all/selected screens |
| Screen Health | Unknown | Live online/offline dashboard |
| Offline Resilience | Cloud-dependent | Service worker cache |
| Content Scheduling | Basic | Time-window rules per item |
| Data Ownership | Vendor cloud | Local, self-hosted |
| Customization | Limited | Full source code access |
| CJIS Ready | Unclear | MFA, audit logs, encryption, RBAC |

## CJIS Compliance

Court schedules are public record — we're not handling CJI (Criminal Justice Information) directly. But we build CJIS-ready:

- **Authentication:** MFA via TOTP on all admin accounts
- **Access Control:** Role-based (admin/editor/viewer), least-privilege
- **Audit Logging:** Every action logged with user, timestamp, IP, details
- **Encryption in Transit:** HTTPS (TLS 1.2+) — self-signed cert or Let's Encrypt
- **Encryption at Rest:** SQLite on encrypted volume (BitLocker/LUKS)
- **Session Security:** Auto-timeout (15 min idle), no concurrent sessions
- **Input Validation:** All user input sanitized, parameterized queries via ORM
- **Account Lockout:** Lock after 5 failed attempts, 15-minute cooldown
- **Password Policy:** Minimum 12 chars, complexity requirements
- **No PII Storage:** Only public schedule data and uploaded images

## Security Hardening

- Content Security Policy headers
- CORS restricted to same-origin
- Rate limiting on auth endpoints
- Helmet.js security headers
- No secrets in codebase — environment variables only
- Display pages are read-only, no auth required (public info)
- Admin routes behind auth + MFA
- SQL injection prevention via Drizzle ORM parameterized queries
- XSS prevention via React's built-in escaping + CSP
- CSRF protection via NextAuth
- Dependency audit in CI

## Testing Strategy

### End-to-End Tests (Playwright)
1. Full admin login flow with MFA
2. Create schedule entry → verify it appears on display page
3. Emergency alert → verify all display pages show alert
4. CSV import flow
5. Screen health monitoring (heartbeat)

### Integration Tests (10 minimum)
1. Auth: Login with valid credentials
2. Auth: MFA TOTP verification
3. Auth: Account lockout after failed attempts
4. Schedule: CRUD operations via API
5. Content: Image upload and optimization
6. Display: SSE real-time update delivery
7. Display: Offline fallback (service worker)
8. CSV: Import with column mapping
9. Emergency: Alert broadcast to all screens
10. Audit: All admin actions logged correctly

### Unit Tests
- Schedule entry validation
- CSV parsing and column mapping
- Date/time formatting for display
- Role-based permission checks
- TOTP generation and verification

## Deployment

### Server (any machine on county network)
```bash
docker-compose up -d
```

### Raspberry Pi Display Client
```bash
#!/bin/bash
# courtboard-display.sh
xdotool mousemove 9999 9999  # hide cursor
chromium-browser --kiosk --noerrdialogs --disable-infobars \
  --no-first-run http://courtboard.local/display/SCREEN_SLUG
```

### Environment Variables
```
DATABASE_URL=file:./courtboard.db
NEXTAUTH_SECRET=<generated>
NEXTAUTH_URL=http://courtboard.local:3000
ADMIN_USERNAME=<initial admin>
ADMIN_PASSWORD=<initial admin password>
```

## File Structure

```
courtboard/
├── src/
│   ├── app/
│   │   ├── (admin)/          # Admin panel routes (authenticated)
│   │   │   ├── dashboard/
│   │   │   ├── schedules/
│   │   │   ├── content/
│   │   │   ├── screens/
│   │   │   ├── alerts/
│   │   │   ├── audit-log/
│   │   │   ├── users/
│   │   │   └── settings/
│   │   ├── display/          # Display routes (public, no auth)
│   │   │   └── [slug]/
│   │   ├── api/              # API routes
│   │   │   ├── auth/
│   │   │   ├── schedules/
│   │   │   ├── content/
│   │   │   ├── screens/
│   │   │   ├── alerts/
│   │   │   ├── import/
│   │   │   └── heartbeat/
│   │   └── login/
│   ├── components/
│   │   ├── admin/            # Admin UI components
│   │   ├── display/          # Display rendering components
│   │   └── ui/               # shadcn/ui components
│   ├── lib/
│   │   ├── db/               # Drizzle schema + migrations
│   │   ├── auth/             # NextAuth config + TOTP
│   │   ├── sse/              # Server-Sent Events
│   │   └── utils/
│   └── middleware.ts          # Auth + security middleware
├── public/
│   ├── uploads/              # Uploaded images
│   └── sw.js                 # Service worker for offline
├── drizzle/                  # Migration files
├── tests/
│   ├── e2e/                  # Playwright E2E tests
│   ├── integration/          # Integration tests
│   └── unit/                 # Unit tests
├── scripts/
│   ├── pi-setup.sh           # Raspberry Pi kiosk setup
│   └── seed.sh               # Seed demo data
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── package.json
```

## Implementation Order

1. **Database schema + seed** — Drizzle + SQLite + initial migration
2. **Auth system** — NextAuth + TOTP MFA + roles
3. **Admin panel** — Dashboard, schedule CRUD, content CRUD
4. **Display pages** — SSR rendered, auto-rotation, responsive
5. **Real-time updates** — SSE from admin → display pages
6. **Emergency alerts** — One-click broadcast
7. **CSV import** — Upload, map columns, preview, import
8. **Screen health** — Heartbeat + dashboard status
9. **Offline mode** — Service worker caching
10. **Security hardening** — CSP, rate limiting, headers, audit log
11. **Testing** — Unit, integration, E2E
12. **Docker** — Containerized deployment
13. **Pi setup script** — Automated kiosk configuration
