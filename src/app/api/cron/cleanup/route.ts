import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Cross-tenant maintenance: purges expired auth/abuse bookkeeping rows. Uses the unscoped `db` client.
// Call with:  POST /api/cron/cleanup   Authorization: Bearer $CRON_SECRET   (CRON_SECRET ≥ 32 chars)
// When CRON_SECRET is unset/too short the endpoint does not exist (404).
export const dynamic = "force-dynamic";
const DAY = 86_400_000;
const digest = (value: string) => createHash("sha256").update(value).digest();
const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
function authorized(request: NextRequest, secret: string) {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer (.+)$/.exec(header);
  return !!match && timingSafeEqual(digest(match[1]), digest(secret));
}
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return notFound();
  if (!authorized(request, secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * DAY);
    const monthAgo = new Date(now.getTime() - 30 * DAY);
    const authThrottle = await db.authThrottle.deleteMany({ where: { resetsAt: { lt: now } } });
    // OTP challenges live 5 minutes; keep a day of consumed/expired rows for support/abuse review.
    const dayAgo = new Date(now.getTime() - DAY);
    const otpChallenge = await db.otpChallenge.deleteMany({ where: { OR: [{ expiresAt: { lt: dayAgo } }, { consumedAt: { lt: dayAgo } }] } });
    const staffSession = await db.staffSession.deleteMany({ where: { OR: [{ expiresAt: { lt: weekAgo } }, { revokedAt: { lt: weekAgo } }] } });
    const customerSession = await db.customerSession.deleteMany({ where: { OR: [{ expiresAt: { lt: weekAgo } }, { revokedAt: { lt: weekAgo } }] } });
    const publicTrackingToken = await db.publicTrackingToken.deleteMany({ where: { OR: [{ expiresAt: { lt: monthAgo } }, { revokedAt: { lt: monthAgo } }] } });
    return NextResponse.json({
      success: true,
      deleted: { authThrottle: authThrottle.count, otpChallenge: otpChallenge.count, staffSession: staffSession.count, customerSession: customerSession.count, publicTrackingToken: publicTrackingToken.count },
      ranAt: now.toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
