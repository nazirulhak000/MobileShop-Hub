import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { checkOrigin, createStaffSession, resetThrottle, throttle } from "@/lib/staff-auth";
import { AccessError } from "@/lib/staff-context";
import { safeError } from "@/lib/staff-http";
import { clientIp, isKnownIp } from "@/lib/client-ip";

export const dynamic = "force-dynamic";
const dummyHash = bcrypt.hashSync("unavailable-account", 12);
const WINDOW = 15 * 60_000;
// Login abuse limits (all fixed 15-minute windows):
//  - IP + shop + username: 10  → brute force from one source; a remote attacker cannot lock a real user
//                                 out of THEIR network because the bucket includes the attacker's IP.
//  - IP (any shop/user):   50  → credential stuffing / username spraying from one source.
//  - shop + username:      50  → distributed guessing ceiling on one account (high enough that a single
//                                 attacker IP, capped at 10, cannot exhaust it alone).
//  - shop:               1000  → circuit breaker only; far above any legitimate shop's login volume.
const LIMITS = { ipUser: 10, ip: 50, user: 50, shop: 1000 };
export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const body = await request.json();
    if (typeof body.shopSlug !== "string" || typeof body.username !== "string" || typeof body.password !== "string" || !body.username.trim() || body.password.length > 256 || body.username.length > 100 || body.shopSlug.length > 100) throw new AccessError(400, "กรุณาระบุร้าน ชื่อผู้ใช้ และรหัสผ่านให้ครบ");
    const slug = body.shopSlug.trim().toLowerCase();
    const username = body.username.trim().toLowerCase();
    const ip = clientIp(request);
    const ipUserKey = `staff-login-ipuser:${ip}:${slug}:${username}`;
    // Most specific (attacker-attributable) buckets first, so a blocked source stops consuming shared buckets.
    await throttle(ipUserKey, LIMITS.ipUser, WINDOW);
    if (isKnownIp(ip)) await throttle(`staff-login-ip:${ip}`, LIMITS.ip, WINDOW);
    await throttle(`staff-login-user:${slug}:${username}`, LIMITS.user, WINDOW);
    await throttle(`staff-login-shop:${slug}`, LIMITS.shop, WINDOW);
    const tenant = await db.tenant.findUnique({ where: { slug } });
    const user = tenant ? await db.user.findFirst({ where: { tenantId: tenant.id, username: body.username.trim() }, include: { branch: true } }) : null;
    const isHash = user?.password.startsWith("$2");
    const valid = await bcrypt.compare(body.password, isHash ? user!.password : dummyHash);
    if (!valid || !isHash || !user || !user.isActive || !tenant || !["ACTIVE", "TRIAL"].includes(tenant.status) || user.branch.tenantId !== tenant.id) throw new AccessError(401, "ร้าน ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง");
    await resetThrottle(ipUserKey);
    await createStaffSession(user.id, tenant.id);
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return safeError(error); }
}
