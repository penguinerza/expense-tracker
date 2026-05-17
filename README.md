# Expense Tracker

Personal expense tracking PWA. Self-hosted on Linux via Docker Compose.

## Stack

- **Backend**: Fastify + TypeScript + Drizzle ORM + SQLite (better-sqlite3)
- **Frontend**: React + Vite + Tailwind CSS + TanStack Query (PWA)
- **Auth**: Google OAuth 2.0 (single-user, server-side token validation)
- **Storage**: Cloudflare R2 for daily snapshots (S3-compatible)
- **Deploy**: Docker Compose + Caddy/Nginx reverse proxy

---

## Setup

### 1. Google OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create an OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `https://yourdomain.com/api/auth/callback`
4. Note your **Client ID** and **Client Secret**

### 2. Find your Google User ID

Sign in once via the OAuth flow and check the backend logs — it logs the Google user ID (`sub` claim). Set that as `AUTHORIZED_GOOGLE_USER_ID`.

Alternatively: decode any Google ID token you've received (it's a JWT) and read the `sub` field.

### 3. Cloudflare R2 setup

1. Create an R2 bucket in Cloudflare dashboard
2. Generate an R2 API token with `Object Read & Write` permission
3. Note your Account ID, Access Key ID, Secret Access Key, and bucket name
4. R2 endpoint format: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

### 4. Configure environment

```bash
cp .env.example .env
# Edit .env with your values
```

Key variables:

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_REDIRECT_URI` | `https://yourdomain.com/api/auth/callback` |
| `AUTHORIZED_GOOGLE_USER_ID` | Your Google `sub` (user ID) |
| `JWT_SECRET` | Random secret ≥32 chars for session signing |
| `COOKIE_DOMAIN` | Your domain (e.g. `yourdomain.com`) |
| `FRONTEND_URL` | `https://yourdomain.com` |
| `R2_ACCOUNT_ID` | Cloudflare Account ID |
| `R2_ACCESS_KEY_ID` | R2 API key ID |
| `R2_SECRET_ACCESS_KEY` | R2 API secret |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |

### 5. Deploy

```bash
docker compose up -d --build
```

### 6. Reverse proxy

See `Caddyfile.example` for Caddy config. With Caddy, HTTPS is automatic.

For Nginx, configure it to proxy `/api/*` → `localhost:3001` and everything else → `localhost:3000`, with SSL via Certbot.

---

## Architecture

```
Browser (PWA)
    │
    ▼
Caddy (HTTPS, port 443)
    │
    ├── /api/*  →  Backend (port 3001)  →  SQLite (Docker volume)
    │                                   →  Cloudflare R2 (daily cron)
    │
    └── /*      →  Frontend (port 3000)
```

## Features

- **Log**: Amount → Category → Subcategory → Note flow, optimized for mobile
- **Weekly view**: Mon–Sun, daily bar chart, category breakdown, payday marker
- **Monthly view**: Pie chart + drilldown to individual transactions
- **Comparison**: Month-to-month side-by-side, or week-by-week within a month
- **Settings**: Manage categories/subcategories, restore from R2 snapshot
- **Snapshots**: Daily cron at 02:00, 7-day retention, prune-only-on-success logic
- **Payday**: 15th of month, adjusted for weekends + Japanese public holidays (2025–2027)

## Updating Japanese holidays

Edit `backend/src/services/holidays.ts` and add the new year's dates to the `HOLIDAYS` set. Rebuild and redeploy.

## PWA icons

Add icons at:
- `frontend/public/icons/icon-192.png` (192×192)
- `frontend/public/icons/icon-512.png` (512×512)

You can generate them from any square PNG using a tool like [RealFaviconGenerator](https://realfavicongenerator.net/).
