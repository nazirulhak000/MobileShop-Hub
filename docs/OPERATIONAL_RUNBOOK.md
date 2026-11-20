# FixMe Platform Operational Runbook & Production Readiness Guide

> **Audience**: Platform Engineers, SRE, DevOps, and On-Call Engineers  
> **Status**: Production Reference for Q11 & Q12 (Phase 6 MVP Rollout)  
> **Last Updated**: November 2026

---

## 1. Architecture Overview (Vercel + Cloud PostgreSQL)

FixMe uses a multi-tenant, fail-closed architecture designed for serverless execution:
- **Compute Layer**: Next.js 15 (App Router) running on Vercel Serverless Functions (`sin1` Singapore region).
- **Database Layer**: Managed Cloud PostgreSQL (Neon Serverless Postgres or Supabase).
- **Connection Management**: Transaction pooling via **PgBouncer** (Neon) or **Supavisor** (Supabase port 6543) for application traffic; Direct session connection (port 5432) for Prisma migrations.
- **Tenant Isolation**: Multi-tenant row scoping enforced fail-closed at the Prisma client extension level (`src/lib/prisma.ts`), with unscoped operations restricted strictly to `src/lib/db.ts` (authentication, system maintenance).
- **State & Sessions**: Fully stateless serverless lambdas; sessions (`StaffSession`, `CustomerSession`) and rate-limiting counters (`AuthThrottle`) persist in PostgreSQL.

---

## 2. Serverless Limitations & Traps Checklist

| Serverless Constraint | Risk / Trap in FixMe | Mitigation & Production Requirement |
|---|---|---|
| **Ephemeral / Read-Only Filesystem** | Routes calling `fs.writeFile` (e.g. `src/app/api/storefront/upload`) fail on Vercel with `EROFS: read-only file system`. Files in `/tmp` are wiped on container teardown. | **Must use Object Storage**: Replace local filesystem writes with Vercel Blob, AWS S3, or Cloudflare R2 presigned URLs. Never rely on `public/uploads` at runtime. |
| **Connection Pool Exhaustion** | 100 concurrent lambdas opening default pool (5 connections) = 500 connections, exceeding PostgreSQL limits. | **Enforce Connection Limit**: Append `?pgbouncer=true&connection_limit=1&pool_timeout=10` to `DATABASE_URL`. |
| **PgBouncer Prepared Statements Trap** | Transaction pooling breaks PostgreSQL named prepared statements, throwing `prepared statement "s0" already exists`. | **Disable Prepared Statements**: Ensure `pgbouncer=true` parameter is present in `DATABASE_URL`. |
| **Migration Failure through Pooler** | `prisma migrate deploy` fails if pointed to a transaction pooler (requires advisory locks). | **Use `DIRECT_URL`**: Point `DIRECT_URL` to direct database port (5432) without PgBouncer. |
| **Execution Duration Limits** | Vercel Hobby (10s), Pro (15s–300s). Heavy reporting or unbounded batch delete in cron can time out. | Keep `/api/cron/cleanup` batch sizes bounded; set `maxDuration` in `vercel.json` for API routes if running on Pro. |
| **IP Spoofing / Rate-Limit Bypass** | If `TRUST_PROXY` is false, `clientIp()` returns `"unknown"`, disabling per-IP rate limits. | Set `TRUST_PROXY=true` in Vercel environment variables to safely parse Vercel's sanitized `x-forwarded-for`. |
| **Timezone Inconsistencies** | Vercel lambdas run in UTC (`process.env.TZ=UTC`), whereas shop schedules operate in `Asia/Bangkok` (UTC+7). | All appointment booking, slot generation, and business timestamps must use explicit timezone conversion (`Asia/Bangkok`). |

---

## 3. Tenant Feature Flags & Rollback Plan (Q11)

### 3.1 Feature Flag Strategy

Feature flags allow phased rollout to pilot shops (canary deployment) and immediate kill-switch capability without redeploying code.

#### Key Feature Flags
- `FEATURE_CUSTOMER_PORTAL`: Gates `/s/[shopSlug]` and `/api/customer/*`.
- `FEATURE_ONLINE_BOOKINGS`: Gates appointment scheduling and slot reservation.
- `FEATURE_QUOTE_APPROVAL`: Gates digital quote acceptance and tracking tokens.
- `FEATURE_OUTBOX_NOTIFICATIONS`: Gates background SMS/LINE notification workers.

#### Resolution Hierarchy (Top-down)
1. **Global Emergency Kill-Switch (Environment Variable)**:
   ```bash
   # If true, completely disables customer portal across all tenants (returns 503 Maintenance)
   EMERGENCY_DISABLE_CUSTOMER_PORTAL=false
   ```
2. **Pilot Tenant Whitelist (Environment Variable or DB Flag)**:
   ```bash
   # Comma-separated tenant slugs permitted to use beta features
   PILOT_TENANT_SLUGS=mobileshop,fixme-pilot-1,demo-store
   ```
3. **Tenant-Level Database Setting**:
   Configured in `StorefrontConfig` or `Tenant.featureFlags` (JSON), editable via Super Admin / Tenant Admin dashboard.

```typescript
// Pattern for evaluating tenant feature flags in API routes
export function isTenantFeatureEnabled(tenantSlug: string, feature: string): boolean {
  if (process.env.EMERGENCY_DISABLE_CUSTOMER_PORTAL === "true") return false;
  
  const pilotSlugs = (process.env.PILOT_TENANT_SLUGS ?? "").split(",").map(s => s.trim().toLowerCase());
  if (pilotSlugs.includes(tenantSlug.toLowerCase())) return true;
  
  // Default fallback for general tenants during rollout
  return process.env.PUBLIC_ROLLOUT_ENABLED === "true";
}
```

### 3.2 Safe Error Logging Standard (No Secret Leaks)

In serverless environments, logs are collected by Vercel Runtime Logs, Axiom, or Datadog. Leaking secrets into logs violates PDPA / GDPR and creates security vulnerabilities.

#### Logging Rules
1. **Redacted Fields**: Automatically redact the following keys from any logged object:
   `password`, `tokenHash`, `token`, `secret`, `secretHash`, `code`, `authorization`, `cookie`, `nationalId`, `creditCard`.
2. **Masked PII**: Mask phone numbers (e.g., `081-***-5678`) and tax IDs in log outputs.
3. **Correlation ID (`x-request-id`)**:
   Every request generates or forwards an `x-request-id`. API error responses return this correlation ID to the user (`{ error: "...", correlationId: "req_abc123" }`) while the server logs the internal stack trace with the same correlation ID. Support can grep logs without exposing stack traces to the public.

---

## 4. Rollback Plan

### Level 1: Feature Flag Kill-Switch (< 1 minute, Zero Downtime)
- **When**: Bug reported in new customer portal or booking feature, but core POS/repair system is unaffected.
- **Action**: In Vercel Project Settings -> Environment Variables:
  Set `EMERGENCY_DISABLE_CUSTOMER_PORTAL=true` or remove tenant from `PILOT_TENANT_SLUGS`.
  Re-deploy current build or trigger environment variable reload.

### Level 2: Vercel Instant Rollback (< 30 seconds, Zero Downtime)
- **When**: Code regression, broken bundle, or unexpected runtime crash across the entire application.
- **Action**:
  1. Open **Vercel Dashboard** -> **Deployments**.
  2. Locate the previous stable deployment (green checkmark).
  3. Click **Instant Rollback** -> Confirm.
  4. Or via Vercel CLI:
     ```bash
     vercel rollback <deployment-url-or-id>
     ```
  5. Traffic instantly switches at the Edge CDN layer without rebuilding.

### Level 3: Database Migration Rollback
- **Principle**: Schema changes must always follow the **Expand and Contract pattern** (backward compatible).
  - Step 1: Add new nullable columns / new tables. (Old code continues to function).
  - Step 2: Deploy new code writing to new columns.
  - Step 3: Backfill data.
  - Step 4: Add non-null constraint or drop old columns in a subsequent release.
- **Emergency Data Restore**:
  If a catastrophic data corruption occurred:
  - **Neon**: Branch from point-in-time prior to deployment:
    ```bash
    neon branches create --from-timestamp "2026-11-20T10:00:00Z" --name rollback-branch
    ```
    Update `DATABASE_URL` in Vercel to the new branch endpoint.
  - **Supabase**: Navigate to **Database** -> **Backups** -> **Point in Time Recovery** -> Select restore timestamp.

---

## 5. Backup, Monitoring & Alerting (Q12)

### 5.1 Automated Backup Strategy

| Backup Type | Frequency | Target / Destination | Retention | RPO / RTO |
|---|---|---|---|---|
| **Continuous WAL (PITR)** | Continuous | Neon / Supabase WAL Storage | 7–30 days | RPO: < 1 min, RTO: < 15 min |
| **Physical Daily Snapshot** | Daily 02:00 UTC | Managed Cloud Provider | 30 days | RPO: < 24 hrs, RTO: < 30 min |
| **Encrypted Logical Dump (`pg_dump`)** | Daily 03:00 UTC | AWS S3 / Cloudflare R2 (AES-256) | 90 days (Monthly for 1 yr) | RPO: < 24 hrs, RTO: < 45 min |

#### Automated Logical Dump Script (`scripts/backup-database.sh`)
```bash
#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")
BACKUP_FILE="/tmp/fixme_backup_${TIMESTAMP}.sql.gz"

echo "Starting encrypted logical backup..."
pg_dump "$DIRECT_URL" --format=custom --no-owner --no-privileges | gzip > "$BACKUP_FILE"

# Upload to S3 / R2 with server-side encryption
aws s3 cp "$BACKUP_FILE" "s3://${BACKUP_S3_BUCKET}/daily/fixme_${TIMESTAMP}.sql.gz" \
  --sse aws:kms --sse-kms-key-id "$BACKUP_KMS_KEY"

rm -f "$BACKUP_FILE"
echo "Backup completed and uploaded successfully."
```

### 5.2 Monthly Restore Drill Procedure
1. Create a temporary staging database: `createdb fixme_restore_drill`.
2. Download latest dump from S3/R2.
3. Restore dump: `pg_restore -d fixme_restore_drill /path/to/dump.sql.gz`.
4. Run verification queries:
   - Check total tenants: `SELECT COUNT(*) FROM "Tenant";`
   - Check repair jobs consistency: `SELECT COUNT(*) FROM "RepairJob" WHERE "tenantId" IS NULL;` (Must be 0).
   - Check sequence counter integrity: `SELECT id, current FROM "SequenceCounter";`
5. Tear down staging database.

---

## 6. Monitoring Metrics & Alerting Thresholds

Configure alerts via Vercel Monitoring, Datadog, Axiom, or Better Stack:

| Metric / Event | Warning Threshold | Critical Alert (Paging) | Likely Root Cause & Action |
|---|---|---|---|
| **Session Errors (401 Spike)** | > 5% of requests over 5 min | > 15% of requests | `AUTH_SECRET` mismatch, mass cookie revocation, or expired session flood. Check `/api/auth` logs. |
| **Forbidden Access (403 Spike)** | > 1% of requests | > 3% of requests | Tenant boundary violation attempt, CSRF Origin mismatch (`APP_ORIGIN`), or role misconfiguration. |
| **Booking Conflicts (409 Spike)** | > 3% of booking requests | > 10% of booking requests | Slot concurrency contention, stale calendar UI, or race condition on booking slots. Inspect `BookingSlot` lock contention. |
| **Outbox Notification Failures** | > 3 retry attempts | Any DLQ (Dead Letter Queue) entry | SMS provider (Twilio) balance exhausted, invalid phone format, or LINE API rate limit. |
| **Database Connection Saturation** | > 70% pool capacity | > 85% pool capacity | Serverless function scaling spike or missing `connection_limit=1`. Check Neon/Supabase pooler metrics. |
| **Serverless Lambda Duration** | Avg > 3,000ms | 95th percentile > 8,000ms | Slow unindexed database query or external API timeout. Investigate query plans. |

---

## 7. Incident Response Playbooks

### Playbook 1: PostgreSQL Connection Pool Exhaustion (500 Spike)
1. **Symptom**: HTTP 500 responses with `PrismaClientInitializationError: Timed out fetching a connection from the pool`.
2. **Immediate Diagnostics**:
   - Check Neon/Supabase dashboard -> Active connections.
   - Run diagnostic query on `DIRECT_URL`:
     ```sql
     SELECT count(*), state, query FROM pg_stat_activity GROUP BY state, query ORDER BY count(*) DESC;
     ```
3. **Immediate Remediation**:
   - Verify `DATABASE_URL` has `?pgbouncer=true&connection_limit=1`.
   - Terminate idle client connections:
     ```sql
     SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND pid <> pg_backend_pid();
     ```
   - If lambdas are surging due to DDoS, enable Vercel Attack Challenge mode under Vercel Security Settings.

### Playbook 2: Potential Tenant Boundary Breach / 403 Access Violation Spike
1. **Symptom**: Spikes in `AccessError: ไม่สามารถเข้าถึงข้อมูลนี้ผ่านระบบร้าน` or `AccessError(403)`.
2. **Immediate Diagnostics**:
   - Filter logs by `"status": 403` and inspect `tenantId` in request headers vs session claims.
   - Check if a customer account is attempting to query another tenant's `/api/customer/*` routes.
3. **Remediation**:
   - If an automated probe or penetration test is occurring, block the source IP in Vercel Firewall / WAF.
   - Verify that `prisma.ts` fail-closed extension is active and no route bypassed to `db.ts` unscoped client.

### Playbook 3: Booking Concurrency Contention / Overbooking Incident
1. **Symptom**: Customers reporting inability to complete booking or receiving 409 Conflict.
2. **Immediate Diagnostics**:
   - Check `Appointment` table for double-booked slots:
     ```sql
     SELECT "branchId", "slotStartTime", count(*) 
     FROM "Appointment" 
     WHERE "status" = 'CONFIRMED' 
     GROUP BY "branchId", "slotStartTime" 
     HAVING count(*) > 1;
     ```
3. **Remediation**:
   - In FixMe, bookings use atomic slot transactions with optimistic backoff (`src/lib/bookings.ts`).
   - If a specific branch slot is over-subscribed, adjust `BookingPolicy.slotCapacity` or add temporary technician capacity in `/appointments`.

### Playbook 4: Outbox / Notification Worker Failures
1. **Symptom**: Customers not receiving OTP SMS, repair status updates, or reminder notifications.
2. **Immediate Diagnostics**:
   - Inspect outbox events:
     ```sql
     SELECT status, channel, "retryCount", "lastError", count(*) 
     FROM "CustomerNotification" 
     GROUP BY status, channel, "retryCount", "lastError";
     ```
   - Check Twilio console for error codes: `30001` (Queue overflow), `21211` (Invalid number), `21614` (Country code not allowed).
3. **Remediation**:
   - Verify `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_MESSAGING_SERVICE_SID`.
   - Clear transient delivery backoffs and trigger worker reprocessing.

### Playbook 5: Maintenance Cron (`/api/cron/cleanup`) Failure
1. **Symptom**: Vercel Cron status reports non-200, or expired sessions accumulate.
2. **Immediate Diagnostics**:
   - Test manual execution:
     ```bash
     curl -i -X POST "https://<your-domain>/api/cron/cleanup" \
       -H "Authorization: Bearer <CRON_SECRET>"
     ```
   - Check response JSON: should return `{ "success": true, "deleted": { ... } }`.
3. **Remediation**:
   - If returns `404`: Verify `CRON_SECRET` is set in Vercel environment variables and is at least 32 characters.
   - If returns `401`: Verify the Authorization Bearer header exactly matches `CRON_SECRET`.
   - If returns `500`: Check Vercel Runtime Logs for `[CRON cleanup error]`. Verify database connectivity.
