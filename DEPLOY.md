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
   - **Builder**: Railpack (по умолчанию; сам выполнит `npm install` и `npm run build`).
   - **Custom Start Command**: `npx prisma migrate deploy && node dist/main`
   - **Restart Policy**: On Failure, 10 попыток.
   - **Watch Paths**: `/backend/**` (коммиты только во фронт не передеплоивают бэкенд).

   > `railway.json` в репозитории нет: Config as Code в Railway устарел, а сборщик Nixpacks,
   > который он включал, на новых сервисах падает. Все настройки задаются в самом сервисе.
3. **Variables** (Settings → Variables) — задай:
   | Переменная | Значение |
   |---|---|
   | `DATABASE_URL` | ссылка на Postgres: `${{Postgres.DATABASE_URL}}` (Reference) |
   | `NODE_ENV` | `production` (тогда без JWT-секретов бэкенд откажется стартовать, а не возьмёт небезопасные дефолты) |
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
- Seed (3 филиала + owner/founder/демо-аккаунты, пароль `Atlas12345!`) — разово. У Postgres на
  Railway по умолчанию нет публичного адреса, поэтому:
  1. временно открыть доступ: `railway tcp-proxy create --port 5432 --service Postgres`;
  2. собрать URL из `PGUSER` / `PGPASSWORD` / `PGDATABASE` и адреса прокси, затем
     `DATABASE_URL="postgresql://<user>:<password>@<proxy-host>:<proxy-port>/<db>" npm --prefix backend run seed`;
  3. закрыть доступ: `railway tcp-proxy delete <proxy-id> --service Postgres --yes`.
- Seed идемпотентный (upsert), повторный запуск ничего не ломает.
- После seed смени пароль `owner@atlas.local` и `founder@atlas.local`.

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
