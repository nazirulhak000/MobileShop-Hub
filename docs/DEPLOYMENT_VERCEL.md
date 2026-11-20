# Vercel & Cloud PostgreSQL Deployment Guide

This guide details how to deploy **FixMe (POS & Repair Management Platform)** to **Vercel** with a serverless Cloud PostgreSQL database (**Neon** or **Supabase**).

---

## 1. Why SQLite Cannot Be Used on Vercel

In local development, FixMe uses SQLite (`prisma/dev.db`). However, **SQLite is fundamentally incompatible with Vercel serverless functions**:
1. **Ephemeral File System**: Vercel lambdas run in isolated, stateless containers. The file system is read-only (except `/tmp`), and any changes to files in `/tmp` are destroyed when the instance shuts down.
2. **Instance Isolation**: Multiple concurrent user requests are served by different lambda instances. A local file in one container cannot be seen or shared by another container.
3. **Write Concurrency**: Multiple serverless instances attempting to write to the same SQLite file result in `SQLITE_BUSY: database is locked` fatal errors.

**Solution**: Migrate from SQLite to a managed cloud PostgreSQL database designed for serverless architectures (e.g., **Neon**, **Supabase**, or **AWS Aurora Serverless**).

---

## 2. Cloud Database Setup

### Option A: Neon Serverless Postgres (Recommended)
1. Sign up at [neon.tech](https://neon.tech) and create a project (e.g., `fixme-production`).
2. Go to **Dashboard** -> **Connection Details**:
   - Check **Pooled connection** (uses PgBouncer / Neon connection pooler on port 5432).
   - Copy the pooled connection string for `DATABASE_URL` (append `&connection_limit=1&pool_timeout=10` to avoid connection exhaustion in serverless lambdas):
     ```text
     postgres://username:password@ep-sample-pooler.us-east-2.aws.neon.tech/fixmedb?sslmode=require&connection_limit=1&pool_timeout=10
     ```
   - Uncheck pooled connection to get the direct connection string for `DIRECT_URL`:
     ```text
     postgres://username:password@ep-sample.us-east-2.aws.neon.tech/fixmedb?sslmode=require
     ```

### Option B: Supabase
1. Sign up at [supabase.com](https://supabase.com) and create a new project.
2. Go to **Project Settings** -> **Database**:
   - Under **Connection string**, select **URI**:
   - Mode **Transaction** (port 6543, uses Supavisor; append `&connection_limit=1&pool_timeout=10`):
     ```text
     postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=10
     ```
     Use this for `DATABASE_URL`.
   - Mode **Session** or direct port 5432:
     ```text
     postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
     ```
     Use this for `DIRECT_URL`.

---

## 3. Database Migration Workflow

### Step 1: Switch Prisma Schema to PostgreSQL
A ready-to-use PostgreSQL schema is provided at `prisma/schema.postgresql.prisma`.

You can switch the active schema by copying it over `prisma/schema.prisma`:
```bash
# Windows PowerShell
Copy-Item prisma/schema.postgresql.prisma prisma/schema.prisma

# macOS / Linux
cp prisma/schema.postgresql.prisma prisma/schema.prisma
```

Or update the top datasource block in `prisma/schema.prisma`:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

### Step 2: Push Schema to Cloud PostgreSQL
Set your `DATABASE_URL` and `DIRECT_URL` in `.env` (or pass via command line) and run:
```bash
# Push schema tables and indexes to your cloud PostgreSQL database
npx prisma db push
```

Or generate and deploy migrations:
```bash
npx prisma migrate dev --name init_postgres
npx prisma migrate deploy
```

### Step 3: Migrate Data from SQLite (Optional)
If you have existing data in `prisma/dev.db` that you want to transfer:
```bash
# Export SQLite rows to a PostgreSQL-compatible SQL dump in foreign-key order:
python scripts/export-sqlite-to-postgres.py --database prisma/dev.db --output postgres-migration.sql

# Import into your Cloud PostgreSQL instance:
psql "$DATABASE_URL" -f postgres-migration.sql
```

For fresh deployments, seed demo shops, users, and catalog products:
```bash
ALLOW_SEED=true SEED_PASSWORD="YourSecureAdminPass123" npx tsx prisma/seed.ts
```

---

## 4. Vercel Configuration (`vercel.json`)

`vercel.json` is configured in the root directory to automate build and scheduled maintenance:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "prisma generate && next build",
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 * * * *"
    }
  ]
}
```

### Key Settings:
- **`buildCommand`**: Executes `prisma generate` before `next build`. This ensures Prisma Client and TypeScript typings are compiled during Vercel deployment.
- **`crons`**: Schedules `/api/cron/cleanup` to execute every hour. Vercel automatically sends `Authorization: Bearer <CRON_SECRET>`. The cleanup endpoint purges expired sessions, throttle buckets, and expired OTP records.

---

## 5. Environment Variables in Vercel

In the **Vercel Project Dashboard** -> **Settings** -> **Environment Variables**, configure the following for **Production** and **Preview**:

| Variable Name | Required | Example / Format | Description |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | `postgres://user:pass@ep-pooler.neon.tech/fixmedb?sslmode=require` | Pooled connection string to Cloud PostgreSQL |
| `DIRECT_URL` | Recommended | `postgres://user:pass@ep.neon.tech/fixmedb?sslmode=require` | Direct connection string for Prisma migrations |
| `APP_ORIGIN` | **Yes** | `https://fixme.yourdomain.com` or `https://app.vercel.app` | Canonical public URL. Required for CSRF Origin checks |
| `AUTH_SECRET` | **Yes** | Random 32+ character string | Secret for session cookies, token hashes, and HMAC validation |
| `TRUST_PROXY` | **Yes** | `true` | Must be `true` on Vercel (trusts `X-Forwarded-For` for IP rate limits) |
| `CRON_SECRET` | **Yes** | Random 32+ character string | Bearer secret for `/api/cron/cleanup` cron authentication |
| `OTP_DEV_ENABLED` | **Yes** | `false` | Must be `false` in production. Disables demo OTP bypass |
| `TWILIO_ACCOUNT_SID` | Optional | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | Twilio Account SID for live Thai SMS |
| `TWILIO_AUTH_TOKEN` | Optional | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | Twilio Auth Token |
| `TWILIO_MESSAGING_SERVICE_SID` | Optional | `MGxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | Twilio Messaging Service SID |

> **Tip to generate a secure secret**:
> - PowerShell: `-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 36 | ForEach-Object {[char]$_})`
> - Linux/macOS: `openssl rand -base64 32`

---

## 6. Deployment Steps on Vercel

1. **Push your code to GitHub / GitLab**.
2. **Import repository into Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new).
   - Select your repository.
   - Preset: **Next.js** (Root Directory: `./`).
3. **Add Environment Variables**:
   - Enter all variables from Section 5 above.
4. **Deploy**:
   - Click **Deploy**.
   - Vercel runs `prisma generate && next build` and deploys the application.

---

## 7. Post-Deployment Verification

1. **Frontend / Public Portal**: Visit `https://your-domain.vercel.app` to verify the landing page renders.
2. **Staff Login**: Navigate to `/login` and verify staff authentication.
3. **Customer Portal**: Navigate to `/customer` or `/s/[shopSlug]` to verify customer lookup.
4. **Maintenance Cron**: Test the cleanup route:
   ```bash
   curl -X POST https://your-domain.vercel.app/api/cron/cleanup \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```
   Should return `{"success": true, "deleted": { ... }, "ranAt": "..."}`.

---

## 8. Serverless Traps & Operational Runbook

For production incident response, disaster recovery, monitoring alerts, and tenant feature flag rollbacks:
- Read [docs/OPERATIONAL_RUNBOOK.md](file:///D:/Winona/Programmer/FixMe/docs/OPERATIONAL_RUNBOOK.md) (Covers Q11 Feature Flags & Q12 Backup/Monitoring Runbook).
- **Important**: Local filesystem uploads (`src/app/api/storefront/upload`) fail on Vercel's read-only lambdas. For storefront logos/images in production, configure cloud object storage (Vercel Blob / S3 / R2) or pass image assets as data URLs.
