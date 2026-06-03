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
| `JWT_SECRET` | Random secret ≥32 chars for session signing (see [below](#generating-jwt_secret)) |
| `FRONTEND_URL` | `https://yourdomain.com` |
| `R2_BACKUP_ENABLED` | `true` (default) — set to `false` to disable daily snapshots and skip all `R2_*` vars below |
| `R2_ACCOUNT_ID` | Cloudflare Account ID |
| `R2_ACCESS_KEY_ID` | R2 API key ID |
| `R2_SECRET_ACCESS_KEY` | R2 API secret |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |

#### Generating `JWT_SECRET`

This is a secret you generate yourself — there's nothing to sign up for. It signs
the session cookie, so use a long random string (≥32 chars) and keep it private.
Any of these work:

```bash
# OpenSSL (most systems)
openssl rand -base64 48

# Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"

# Linux /dev/urandom
head -c 48 /dev/urandom | base64
```

Paste the output into `.env` as `JWT_SECRET=...`. Changing it later invalidates
all existing sessions (everyone gets logged out), which is also how you'd force a
logout everywhere.

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
- **Weekly view**: Mon–Sun, daily bar chart, category breakdown
- **Monthly view**: Pie chart + drilldown to individual transactions
- **Comparison**: Month-to-month side-by-side, or week-by-week within a month
- **Settings**: Manage categories/subcategories, restore from R2 snapshot
- **Snapshots**: Daily cron at 02:00, 7-day retention, prune-only-on-success logic (optional, enabled by default)

## Currency

The app shows a single currency app-wide, configured at **build time** in the
frontend (`frontend/.env`, copy from `frontend/.env.example`). Defaults to
Japanese Yen if unset.

| Variable | Description |
|---|---|
| `VITE_CURRENCY` | [ISO 4217](https://en.wikipedia.org/wiki/ISO_4217) currency code — e.g. `JPY`, `USD`, `EUR`. Decides the **symbol and number of decimal places**. |
| `VITE_LOCALE` | [BCP 47](https://en.wikipedia.org/wiki/IETF_language_tag) locale tag — e.g. `ja-JP`, `en-US`, `de-DE`. Decides the **grouping/decimal punctuation and symbol placement**. |

Formatting is handled by the browser's built-in
[`Intl.NumberFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat),
so the two settings combine. The same currency renders differently per locale:

| `VITE_CURRENCY` | `VITE_LOCALE` | Renders |
|---|---|---|
| `JPY` | `ja-JP` | `￥1,235` |
| `USD` | `en-US` | `$1,234.56` |
| `USD` | `de-DE` | `1.234,56 $` |
| `EUR` | `de-DE` | `1.234,56 €` |
| `EUR` | `en-US` | `€1,234.56` |
| `GBP` | `en-GB` | `£1,234.56` |

Example — US dollars for a US audience:

```bash
# frontend/.env
VITE_CURRENCY=USD
VITE_LOCALE=en-US
```

**Notes:**
- These are baked into the bundle at build time, so rebuild the frontend (or
  pass them to the build step in CI) after changing them.
- This is display-only — stored amounts are not converted. Switching `JPY` → `USD`
  makes a stored `1000` render as `$1,000.00`; it is not an FX conversion.

## PWA icons

Add icons at:
- `frontend/public/icons/icon-192.png` (192×192)
- `frontend/public/icons/icon-512.png` (512×512)

You can generate them from any square PNG using a tool like [RealFaviconGenerator](https://realfavicongenerator.net/).
