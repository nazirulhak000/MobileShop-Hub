import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashToken, throttle } from "@/lib/staff-auth";
import { safeError } from "@/lib/staff-http";
import { clientIp, isKnownIp } from "@/lib/client-ip";
export const dynamic = "force-dynamic";
const TOKEN_FORMAT = /^[a-f0-9]{64}$/;
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const code = (await params).code.toLowerCase();
    // Format check happens before any DB access (no throttle rows, no lookups for junk input).
    if (!TOKEN_FORMAT.test(code)) return NextResponse.json({ error: "กรุณาสแกน QR จากใบรับซ่อมฉบับใหม่ หรือติดต่อร้านเพื่อรับลิงก์ติดตาม" }, { status: 404 });
    // Throttle per client IP (one row per source) rather than per token hash, so random guesses cannot
    // create unbounded AuthThrottle rows. Without a trustworthy IP, fall back to one shared, generous bucket.
    const ip = clientIp(request);
    if (isKnownIp(ip)) await throttle(`tracking-ip:${ip}`, 60, 60_000);
    else await throttle("tracking-ip:unknown", 1000, 60_000);
    const token = await db.publicTrackingToken.findUnique({ where: { tokenHash: hashToken(code) } });
    if (!token || token.revokedAt || token.expiresAt <= new Date()) return NextResponse.json({ error: "ลิงก์ไม่พร้อมใช้งาน กรุณาติดต่อร้าน" }, { status: 404 });
    const job = await db.repairJob.findFirst({ where: { id: token.repairJobId, tenantId: token.tenantId, branch: { tenantId: token.tenantId, tenant: { status: { in: ["ACTIVE", "TRIAL"] } } } }, select: { trackingCode: true, deviceBrand: true, deviceModel: true, status: true, estimatedFinish: true, updatedAt: true, branch: { select: { name: true, phone: true } } } });
    if (!job) return NextResponse.json({ error: "ไม่พบงานซ่อม" }, { status: 404 });
    return NextResponse.json({ data: job }, { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
  } catch (error) { return safeError(error); }
}
// Tracking links grant limited read access only. Decisions require authenticated ownership.
export async function POST() {
  return NextResponse.json({ error: "กรุณาเข้าบัญชีลูกค้าเพื่อตัดสินใจใบเสนอราคา" }, { status: 403 });
}
