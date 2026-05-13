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
npm run dev          # Start dev server (next dev)
npm run build        # Build for production
npm run start        # Production server (next start)
npm run lint         # ESLint

npm run db:push      # Push schema to DB (no migration file)
npm run db:migrate   # Create migration file + push
npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:seed      # Seed default departments, users, settings
npm run db:studio    # Open Prisma Studio GUI
npm run db:reset     # Drop and re-apply all migrations (destructive)
```

### Database

The schema (`prisma/schema.prisma`) uses **PostgreSQL**. For local dev, point `DATABASE_URL` to a local or hosted Postgres instance (e.g. Neon free tier). There is no SQLite fallback.

### Environment

Copy `.env.example` to `.env.local`. Required vars:
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` — base URL (e.g. `http://localhost:3000`)
- `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER` — server-side Pusher credentials
- `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER` — client-side Pusher credentials (same values as above)

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

**Real-time flow** (`src/lib/pusher.ts`, `src/lib/socket.ts`):
API route handles request → calls `broadcastQueueEvent()` or targeted `emitTo*()` in `src/lib/socket.ts` → triggers Pusher channels. Clients subscribe via `pusher-js` directly in page components. Channel naming uses hyphens (Pusher doesn't allow colons): `dept-<id>`, `counter-<id>`, `display`, `admin`.

**Pusher channels**:
- `display` — public TV screen
- `admin` — admin dashboard
- `dept-<departmentId>` — per-department updates
- `counter-<counterId>` — per-counter updates

**Shared types** (`src/types/index.ts`):
Defines augmented relation types (`QueueWithRelations`, `CounterWithRelations`, etc.), `ApiResponse<T>`, and `SOCKET_EVENTS` const map. Also defines `Role`, `QueueStatus`, `PriorityType`, `CounterStatus`, `DepartmentStatus` as string union types — these are **not** Prisma-generated enums (the schema uses `String` fields).

### Default seed credentials

| Role        | Email                    | Password        |
|-------------|--------------------------|-----------------|
| Super Admin | superadmin@synqueue.com  | SuperAdmin@123  |
| Admin       | admin@synqueue.com       | Admin@123       |
| Staff       | maria@synqueue.com       | Staff@123       |
