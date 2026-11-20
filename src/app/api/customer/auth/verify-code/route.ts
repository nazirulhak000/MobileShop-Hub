import { NextRequest, NextResponse } from "next/server";
import { startCustomerSession, verifyOtp } from "@/lib/customer-auth";
import { checkOrigin, throttle } from "@/lib/staff-auth";
import { safeError } from "@/lib/staff-http";
import { clientIp, isKnownIp } from "@/lib/client-ip";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const ip = clientIp(request);
    // Per-IP ceiling on code guesses across many phones/challenges (per-phone limits live in verifyOtp).
    if (isKnownIp(ip)) await throttle(`otp-verify-ip:${ip}`, 30, 15 * 60_000);
    const body = await request.json().catch(() => null);
    const account = await verifyOtp(body?.shopSlug, body?.phone, body?.challengeId, body?.code, body?.displayName);
    await startCustomerSession(account.id, account.tenantId);
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return safeError(error); }
}
