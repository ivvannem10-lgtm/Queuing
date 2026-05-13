# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

```
queuing system/
├── index.html          # Static marketing/landing page (no build step)
└── synqueue/           # Next.js application (the actual queue system)
```

## synqueue — Next.js app

### Commands (run from `synqueue/`)

```bash
npm run dev          # Start dev server (tsx watch server.ts — NOT next dev)
npm run build        # Build for production
npm run start        # Production server
npm run lint         # ESLint

npm run db:push      # Push schema to DB (no migration file)
npm run db:migrate   # Create migration file + push
npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:seed      # Seed default departments, users, settings
npm run db:studio    # Open Prisma Studio GUI
npm run db:reset     # Drop and re-apply all migrations (destructive)
```

### Custom server — critical detail

`npm run dev` runs `tsx watch server.ts`, not `next dev`. Socket.IO is attached to the same HTTP server that handles Next.js requests. **Never use `next dev` directly** — real-time events won't work. The Socket.IO instance is stored as `global.__io` and retrieved in API routes via `getIO()` from `src/lib/socket.ts`.

### Database

The schema (`prisma/schema.prisma`) is configured for **SQLite** in local dev (`file:./dev.db`). The README mentions PostgreSQL, but the active `.env.local` uses SQLite. Switch to PostgreSQL by changing `provider` in `schema.prisma` and updating `DATABASE_URL`.

### Environment

Copy `.env.example` to `.env.local`. Required vars:
- `DATABASE_URL` — SQLite path or PostgreSQL connection string
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` — base URL (e.g. `http://localhost:3000`)

### Architecture

**Route groups** (`src/app/`):
- `(auth)/login` — login page
- `(public)/queue` — public ticket generation (no auth)
- `(public)/display` — TV live display screen (no auth)
- `(dashboard)/staff` — staff console (STAFF+ role)
- `(dashboard)/admin` — admin suite (ADMIN+ role)

**Auth & roles** (`src/lib/auth.ts`, `src/middleware.ts`):
NextAuth v4 with JWT credentials provider, 8-hour sessions. Roles: `SUPER_ADMIN > ADMIN > STAFF > CLIENT`. Middleware enforces role checks; public API routes (`/api/queues`, `/api/display`, `/api/departments`, `/api/analytics`, `/api/settings`) are explicitly allow-listed without auth.

**Queue engine** (`src/lib/queue-engine.ts`):
All queue business logic lives here. Key functions:
- `generateQueueNumber` — atomic daily counter per department, format `PREFIX-001` / `PREFIX-P001`
- `getNextQueue` — priority-ratio serving (serves N regular before 1 priority, ratio from `PrioritySetting` table)
- `transferQueue` — marks original TRANSFERRED, creates new queue in target dept, writes `QueueTransfer` record
- `updateFrontlinerStats` / `updateCounterStats` — upsert daily statistics

**Real-time flow**: API route handles request → calls `broadcastQueueEvent()` or targeted `emitTo*()` → Socket.IO emits to rooms (`display`, `admin`, `dept:<id>`, `counter:<id>`). Clients join rooms on connect via `join:department`, `join:counter`, `join:admin`, `join:display` events.

**Socket.IO rooms** (`server.ts`):
- `display` — public TV screen
- `admin` — admin dashboard
- `dept:<departmentId>` — per-department updates
- `counter:<counterId>` — per-counter updates

### Shared types

`src/types/index.ts` re-exports Prisma types and defines augmented relation types (`QueueWithRelations`, `CounterWithRelations`, etc.), `ApiResponse<T>`, socket event payload interfaces, and `SOCKET_EVENTS` const map.

### Default seed credentials

| Role        | Email                    | Password        |
|-------------|--------------------------|-----------------|
| Super Admin | superadmin@synqueue.com  | SuperAdmin@123  |
| Admin       | admin@synqueue.com       | Admin@123       |
| Staff       | maria@synqueue.com       | Staff@123       |
