# SynQueue — Enterprise Queue Management System

> Part of the **SynEdu** ecosystem. A production-ready, realtime digital queue management platform for schools, universities, hospitals, and government offices.

---

## Tech Stack

| Layer       | Technology                              |
|-------------|----------------------------------------|
| Framework   | Next.js 15 (App Router)                |
| Language    | TypeScript                             |
| Styling     | TailwindCSS + custom design system     |
| Animation   | Framer Motion                          |
| Database    | PostgreSQL                             |
| ORM         | Prisma                                 |
| Auth        | NextAuth v4 (JWT + Credentials)        |
| Real-time   | Socket.IO (custom server)              |
| Charts      | Recharts                               |
| QR Codes    | qrcode                                 |
| Deployment  | Railway (server) / Vercel (static)     |

---

## Features

- 🎟 **Public queue page** — select service, optional name, priority category, printable QR ticket
- 📺 **Live display** — TV-mode public screen, realtime, sound alerts, fullscreen
- 🧑‍💼 **Staff console** — call next, recall, skip, complete, cancel, transfer between departments
- ⚙️ **Admin dashboard** — KPI cards, live monitoring, charts, department/counter/user management
- 📊 **Reports** — daily/weekly trends, hourly heatmaps, export CSV
- 🔒 **Audit logs** — full action history
- ⭐ **Priority lanes** — Senior Citizen, PWD, Pregnant, VIP
- 🔄 **Queue transfer** — redirect between departments with full history
- 🧠 **Smart distribution** — priority ratio engine
- 🔔 **Realtime** — Socket.IO events across all panels
- 🌑 **Dark mode** — default dark enterprise theme
- 📱 **Responsive** — mobile, tablet, TV display

---

## Quick Start

### 1. Prerequisites

- Node.js 20+
- PostgreSQL 15+ running locally or on Railway/Supabase

### 2. Clone and install

```bash
cd "queuing system/synqueue"
npm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/synqueue"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-random-32-char-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Generate a secret:
```bash
openssl rand -base64 32
```

### 4. Set up database

```bash
# Push schema and generate Prisma client
npm run db:generate
npm run db:push

# Seed with default departments, users, and settings
npm run db:seed
```

### 5. Run development server

```bash
npm run dev
```

The custom server (with Socket.IO) starts at **http://localhost:3000**

---

## Default Credentials

| Role       | Email                      | Password      |
|------------|---------------------------|---------------|
| Super Admin| superadmin@synqueue.com   | SuperAdmin@123|
| Admin      | admin@synqueue.com        | Admin@123     |
| Staff      | maria@synqueue.com        | Staff@123     |

---

## URL Reference

| URL               | Purpose                          | Auth Required |
|-------------------|----------------------------------|---------------|
| `/`               | Redirects based on role          | —             |
| `/queue`          | Public queue ticket page         | No            |
| `/display`        | TV live display screen           | No            |
| `/login`          | Staff/Admin login                | No            |
| `/staff`          | Staff console                    | STAFF+        |
| `/admin`          | Admin dashboard                  | ADMIN+        |
| `/admin/departments` | Department management         | ADMIN+        |
| `/admin/counters` | Counter management               | ADMIN+        |
| `/admin/users`    | User management                  | ADMIN+        |
| `/admin/reports`  | Analytics and reports            | ADMIN+        |
| `/admin/audit-logs`| System audit trail              | SUPER_ADMIN   |
| `/admin/settings` | System configuration             | ADMIN+        |

---

## API Reference

### Queues
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| POST   | `/api/queues`                   | Generate queue ticket    |
| GET    | `/api/queues`                   | List queues (filterable) |
| POST   | `/api/queues/call-next`         | Call next in queue       |
| POST   | `/api/queues/:id/complete`      | Mark as completed        |
| POST   | `/api/queues/:id/skip`          | Skip current queue       |
| POST   | `/api/queues/:id/cancel`        | Cancel queue             |
| POST   | `/api/queues/:id/transfer`      | Transfer to department   |
| POST   | `/api/queues/:id/recall`        | Re-announce current      |

### Departments / Counters / Users
| Method | Endpoint                     | Description         |
|--------|------------------------------|---------------------|
| GET    | `/api/departments`           | List departments    |
| POST   | `/api/departments`           | Create department   |
| PATCH  | `/api/departments/:id`       | Update department   |
| GET    | `/api/counters`              | List counters       |
| PATCH  | `/api/counters/:id`          | Update counter      |
| GET    | `/api/users`                 | List users          |
| POST   | `/api/users`                 | Create user         |
| PATCH  | `/api/users/:id`             | Update user         |

### Analytics
| Method | Endpoint                          | Description             |
|--------|-----------------------------------|-------------------------|
| GET    | `/api/analytics`                  | Live dashboard stats    |
| GET    | `/api/analytics/reports`          | Date-range report       |
| GET    | `/api/analytics/frontliner`       | Staff performance       |
| GET    | `/api/display`                    | Display screen data     |

---

## Socket.IO Events

| Event               | Direction    | Description                |
|--------------------|--------------|----------------------------|
| `queue:created`    | Server→Client| New ticket generated       |
| `queue:called`     | Server→Client| Queue called to counter    |
| `queue:updated`    | Server→Client| Status changed             |
| `queue:transferred`| Server→Client| Queue transferred          |
| `counter:updated`  | Server→Client| Counter status changed     |
| `display:refresh`  | Server→Client| Display refresh trigger    |
| `join:department`  | Client→Server| Subscribe to dept updates  |
| `join:counter`     | Client→Server| Subscribe to counter       |
| `join:admin`       | Client→Server| Subscribe to all events    |
| `join:display`     | Client→Server| Subscribe to display       |

---

## Database Schema

```
User ──────────── UserDepartment ──── Department ──── Counter
                                           │
                                           │
                                         Queue ──── QueueLog
                                           │
                                      QueueTransfer
```

Full schema in `prisma/schema.prisma`.

---

## Deployment

### Railway (Recommended for full-stack)

1. Create a Railway project
2. Add PostgreSQL plugin
3. Set all environment variables
4. Deploy with:
   ```bash
   railway up
   ```
5. Start command: `npm run start`

### Vercel (Frontend only — no Socket.IO)

Deploy only the Next.js app. You'll need a separate Socket.IO service (Railway) and set `NEXT_PUBLIC_SOCKET_URL` to point to it.

---

## Project Structure

```
synqueue/
├── prisma/
│   ├── schema.prisma          # Full database schema
│   └── seed.ts                # Default data seeder
├── server.ts                  # Custom HTTP server + Socket.IO
├── src/
│   ├── types/index.ts         # Shared TypeScript types
│   ├── lib/
│   │   ├── db.ts              # Prisma singleton
│   │   ├── auth.ts            # NextAuth config
│   │   ├── socket.ts          # Socket.IO helper
│   │   ├── queue-engine.ts    # Core queue logic
│   │   └── utils.ts           # Utilities + API helpers
│   ├── middleware.ts           # Route protection
│   ├── app/
│   │   ├── (auth)/login/      # Login page
│   │   ├── (public)/
│   │   │   ├── queue/         # Public queue ticket page
│   │   │   └── display/       # TV live display
│   │   ├── (dashboard)/
│   │   │   ├── admin/         # Full admin suite
│   │   │   └── staff/         # Staff console
│   │   └── api/               # All API routes
│   ├── components/
│   │   ├── providers/         # SessionProvider, Toaster
│   │   ├── layout/            # Sidebar, Header
│   │   ├── admin/             # DashboardStats, QueueMonitor, Charts
│   │   └── ui/                # Toaster
│   └── hooks/
│       ├── useSocket.ts       # Socket.IO hook
│       └── useQueue.ts        # Queue data hook
└── tailwind.config.ts         # Custom design tokens
```

---

## User Roles

| Role        | Permissions                                              |
|-------------|----------------------------------------------------------|
| SUPER_ADMIN | Everything + audit logs + delete users                   |
| ADMIN       | Dashboard, departments, counters, users, reports, settings|
| STAFF       | Staff console — call, skip, complete, transfer           |
| CLIENT      | Generate queue ticket (public, no login required)        |

---

## Priority Queue Logic

Priority queues (Senior Citizen, PWD, Pregnant, VIP) are served preferentially.

- Default: serve **2 regular** queues → then **1 priority** queue
- Configurable per category in `PrioritySetting` table
- VIP defaults to highest priority (ratio 1:1)
- Staff sees priority badges on queue cards
- Live display shows PRIORITY LANE indicator

---

## Roadmap

- [ ] SMS notifications via Twilio
- [ ] Email notifications
- [ ] QR code scan to check status
- [ ] Analytics heatmap calendar
- [ ] Mobile app (React Native)
- [ ] Multi-branch support
- [ ] AI-powered wait time predictions
- [ ] SynEdu ecosystem integration (Admissions, Finance, HR modules)

---

*SynQueue v1.0 — Built as part of the SynEdu ecosystem*
