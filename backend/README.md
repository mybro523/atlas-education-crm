# Atlas CRM — Backend

NestJS 10 + Prisma + PostgreSQL backend for **Atlas CRM (Education)** — a CRM for
an educational center with a network of 3 branches.

## Stack

- **NestJS 10** (TypeScript), REST API, global prefix `api`, port `3000`.
- **Prisma ORM** + **PostgreSQL**.
- **JWT** auth: access token (15m) + refresh token (7d, stored **hashed** in DB).
- **RBAC** with 5 roles: `FOUNDER, ADMIN, SALES_MANAGER, TEACHER, STUDENT`.
- **nestjs-i18n** — `ru` (default), `tj`, `en`.
- **BullMQ + ioredis** for background jobs (absence SMS, broadcasts).
- Security: `helmet`, global `ValidationPipe` (whitelist + transform), `@nestjs/throttler`.
- CORS allowed origin: `http://localhost:5173`.

## Getting started

```bash
cp .env.example .env          # then fill in DATABASE_URL and secrets
npm install
npm run prisma:generate
npm run prisma:migrate        # creates the schema in your DB
npm run seed                  # 3 branches, a FOUNDER user, course types
npm run start:dev
```

Health check: `GET http://localhost:3000/api/health` → `{ "status": "ok" }`.

### Seeded founder login

```
email:    founder@atlas.local
password: Atlas12345!
```

## Auth endpoints

| Method | Path                | Access  | Body |
|--------|---------------------|---------|------|
| POST   | `/api/auth/register`| public  | `{ email?/phone, password, role?, language?, branchId? }` |
| POST   | `/api/auth/login`   | public  | `{ email?/phone, password }` |
| POST   | `/api/auth/refresh` | public* | `{ refreshToken }` |
| GET    | `/api/auth/me`      | JWT     | — |

`*` `/refresh` validates the refresh JWT and matches it against the hashed token in DB.

All other routes are protected by the global `JwtAuthGuard`; opt out with `@Public()`.
Role restrictions are enforced per-controller with `@Roles()` + `RolesGuard`.

## Scripts

- `build`, `start`, `start:dev`, `start:prod`
- `prisma:generate`, `prisma:migrate`, `prisma:studio`, `seed`
- `lint`, `format`

## Domain modules (stubs)

`branches, students, teachers, courses, groups, schedule, journal, finance,
chats, broadcasts, notifications` — each guarded per the access matrix in `ТЗ.md §3`.
Notable role rules:

- **finance** → `FOUNDER` only (admins have no finance access).
- **chats** → `SALES_MANAGER` + `FOUNDER` (admins have no chat access).
- **broadcasts** → `FOUNDER` + `ADMIN`.
