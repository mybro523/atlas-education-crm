# Atlas CRM

CRM system for an **educational center** — a **network of 3 branches**. Atlas CRM unifies the
learning process (courses, groups, schedule, gradebook, attendance), sales (omnichannel
WhatsApp / Instagram chats), finance (income / expenses, salaries, analytics) and automated
notifications (Telegram bots, SMS) into a single platform with role-based access.

> **Stage 1 — Foundation.** This repository currently contains the root infrastructure
> (Docker services, environment templates, dev scripts, tooling config). The `backend/` and
> `frontend/` applications are built on top of this foundation by their respective packages.

---

## Roles (RBAC)

Five roles, in ascending order of privileges:

| Role | Description |
|------|-------------|
| `STUDENT` | Sees own profile, grades, attendance and schedule. |
| `TEACHER` | Manages own groups, gradebook, attendance and remarks. |
| `SALES_MANAGER` | Handles omnichannel chats (WhatsApp / Instagram) and sales. |
| `ADMIN` | CRUD for teachers / students / groups / courses, schedules, staff, SMS. **No access to finance or chats.** |
| `FOUNDER` | Full access, including finance (income / expenses / salaries / analytics). |

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS 10 (TypeScript) + Prisma ORM + PostgreSQL. REST API on port `3000`, global prefix `/api`. |
| **Auth** | JWT access token (15m) + refresh token (7d, stored **hashed**). Passwords hashed with bcrypt. RBAC via guard + `@Roles()`. |
| **Cache / queues** | Redis (cache, rate-limit, task queue for broadcasts & cron). |
| **Frontend** | React 18 + Vite + TypeScript, TailwindCSS (`darkMode: 'class'`), TanStack Query (optimistic updates), react-router-dom v6, i18next, Zustand. Dev server on port `5173`. |
| **i18n** | 3 languages: `ru` (default), `tj`, `en`. |
| **Design** | White + Purple palette (primary violet `#7C3AED`), full dark mode, mobile-first responsive (320px–425px). |
| **Currency** | TJS. |

Frontend follows **Feature-Sliced Design (FSD)**: `app > pages > widgets > features > entities > shared`
(imports go downward only; each slice exposes a public API via `index.ts`).

---

## Monorepo layout

```
atlas-crm/
├── backend/            # NestJS API (owned by the backend package)
├── frontend/           # React + Vite SPA (owned by the frontend package)
├── docker-compose.yml  # PostgreSQL 16 + Redis 7 for local development
├── .env.example        # Root env template for the compose services
├── .editorconfig       # utf-8, LF, 2-space indent
├── .gitignore
├── package.json        # Root scripts (dev, install:all, db:up/down)
└── ТЗ.md               # Full product spec (Russian)
```

> This is **not** an npm-workspaces monorepo. Each app manages its own `node_modules`; the root
> `package.json` only orchestrates them via `npm --prefix` and `concurrently`.

---

## Prerequisites

- **Node.js >= 24** (and npm).
- **Docker + Docker Compose** — recommended for the database (see options below).
- A **PostgreSQL** database (see the three options below — Postgres is **not** installed locally).
- Optionally **Redis 7** (also provided by `docker-compose.yml`).

### Database options

PostgreSQL is **not** installed on this machine, so pick one of the following:

**Option A — Docker (recommended).** Use the bundled `docker-compose.yml`; no local install needed:

```bash
cp .env.example .env
npm run db:up          # starts postgres:16 and redis:7-alpine
```

Resulting connection string for `backend/.env`:

```
DATABASE_URL="postgresql://atlas:atlas_dev_password@localhost:5432/atlas_crm?schema=public"
```

**Option B — Local PostgreSQL install.** Install PostgreSQL 16 natively, create a database and user,
then set:

```
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/atlas_crm?schema=public"
```

**Option C — Free cloud database (Neon / Supabase).** Create a free Postgres instance and copy its
connection string (SSL is usually required):

```
DATABASE_URL="postgresql://<user>:<password>@<host>.neon.tech/atlas_crm?sslmode=require"
```

---

## Setup & run

### 1. Clone and configure environment

```bash
git clone <repo-url> atlas-crm
cd atlas-crm

# Root infra env (for docker-compose)
cp .env.example .env

# App-specific env files (each app ships its own template)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Set `DATABASE_URL` in `backend/.env` using one of the database options above.
`frontend/.env` should point `VITE_API_URL` at the backend (default `http://localhost:3000/api`).

### 2. Start infrastructure (if using Docker)

```bash
npm run db:up      # PostgreSQL 16 + Redis 7 in the background
```

### 3. Install dependencies

```bash
npm install        # installs root devDependencies (concurrently)
npm run install:all  # installs backend, then frontend dependencies
```

### 4. Run database migrations & seed (backend)

```bash
npm --prefix backend run prisma:migrate    # apply Prisma migrations
npm --prefix backend run prisma:seed        # optional: seed demo data
```

> Exact backend script names are defined in `backend/package.json`.

### 5. Start the apps

Run both together:

```bash
npm run dev        # backend (:3000) + frontend (:5173) via concurrently
```

Or individually:

```bash
npm run dev:backend    # NestJS on http://localhost:3000/api
npm run dev:frontend   # Vite on http://localhost:5173
```

### Stop infrastructure

```bash
npm run db:down
```

---

## Root npm scripts

| Script | Description |
|--------|-------------|
| `npm run install:all` | Installs backend then frontend dependencies. |
| `npm run dev` | Runs backend + frontend concurrently. |
| `npm run dev:backend` | Runs the NestJS dev server. |
| `npm run dev:frontend` | Runs the Vite dev server. |
| `npm run db:up` | Starts PostgreSQL + Redis via docker compose. |
| `npm run db:down` | Stops the docker compose services. |

---

## Environment variables

### Root (`.env`) — feeds `docker-compose.yml`

| Variable | Default | Purpose |
|----------|---------|---------|
| `POSTGRES_USER` | `atlas` | Postgres superuser for the container. |
| `POSTGRES_PASSWORD` | `atlas_dev_password` | Postgres password. |
| `POSTGRES_DB` | `atlas_crm` | Database name. |
| `POSTGRES_PORT` | `5432` | Host port mapped to Postgres. |
| `REDIS_HOST` | `localhost` | Redis host. |
| `REDIS_PORT` | `6379` | Host port mapped to Redis. |

Backend (`DATABASE_URL`, JWT secrets, etc.) and frontend (`VITE_API_URL`, etc.) variables live in
their own `backend/.env.example` and `frontend/.env.example` files.

---

## Notes

- CORS on the backend allows the frontend origin `http://localhost:5173`.
- All UI strings and notifications are localizable via i18next (`ru` default, plus `tj`, `en`).
- Full product specification (in Russian): [`ТЗ.md`](./ТЗ.md).
- **This repository is the Stage-1 foundation** — infrastructure and tooling that the backend and
  frontend applications build upon.
