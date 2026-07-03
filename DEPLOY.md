# Деплой Atlas CRM

Backend + PostgreSQL → **Railway**, Frontend → **Vercel**.
Репозиторий: https://github.com/mybro523/atlas-education-crm

---

## 1. Railway — PostgreSQL + Backend

### 1.1. Проект и база
1. https://railway.app → **New Project** → **Deploy PostgreSQL** (или New Project → Empty, затем **+ New → Database → PostgreSQL**).
2. (Опционально, для очередей/рассылок) **+ New → Database → Redis**.

### 1.2. Backend-сервис
1. В проекте: **+ New → GitHub Repo** → выбери `mybro523/atlas-education-crm`.
2. Открой сервис → **Settings**:
   - **Root Directory**: `backend`
   - Build/Start берутся из `backend/railway.json` (Nixpacks; старт = `prisma migrate deploy && node dist/main`).
3. **Variables** (Settings → Variables) — задай:
   | Переменная | Значение |
   |---|---|
   | `DATABASE_URL` | ссылка на Postgres: `${{Postgres.DATABASE_URL}}` (Reference) |
   | `JWT_ACCESS_SECRET` | случайная строка (48+ символов) |
   | `JWT_REFRESH_SECRET` | другая случайная строка |
   | `JWT_ACCESS_TTL` | `15m` |
   | `JWT_REFRESH_TTL` | `7d` |
   | `CORS_ORIGIN` | URL фронта на Vercel (заполнить после шага 2) |
   | `DEFAULT_LANGUAGE` | `ru` |
   | `TELEGRAM_BOT_TOKEN` | токен бота @atlaaas1_bot |
   | `REDIS_HOST` / `REDIS_PORT` | из Redis-сервиса (если добавлен) |
   | `PAYOM_TJ_API_KEY` | ключ payom.tj (когда будет) |
   | `META_*` | ключи Meta (когда будут) |

   > `PORT` Railway подставляет сам — приложение читает `process.env.PORT`.

4. **Networking → Generate Domain** → получишь публичный URL бэкенда, напр. `https://atlas-backend.up.railway.app`.

### 1.3. Миграции и seed
- Миграции применяются автоматически при старте (`prisma migrate deploy`).
- Seed (3 филиала + аккаунт основателя) — разово: локально с Railway URL
  `DATABASE_URL="<railway public url>" npm --prefix backend run seed`
  или через Railway one-off command.

---

## 2. Vercel — Frontend

1. https://vercel.com → **Add New → Project** → импортируй `mybro523/atlas-education-crm`.
2. **Root Directory**: `frontend` (Framework: Vite — определится автоматически; настройки в `frontend/vercel.json`).
3. **Environment Variables**:
   | Переменная | Значение |
   |---|---|
   | `VITE_API_URL` | `https://<backend>.up.railway.app/api` |
4. **Deploy** → получишь URL, напр. `https://atlas-crm.vercel.app`.
5. Вернись в Railway → впиши этот URL в `CORS_ORIGIN` бэкенда → бэкенд перезапустится.

---

## 3. После деплоя
- Открой фронт → войди аккаунтом основателя (из seed) → проверь разделы по ролям.
- Telegram: страница «Настройки» → «Подключить Telegram» → `/start` у бота.
- Meta webhooks (когда будут ключи): callback URL `https://<backend>/api/chats/webhook`, verify token = `META_VERIFY_TOKEN`.
