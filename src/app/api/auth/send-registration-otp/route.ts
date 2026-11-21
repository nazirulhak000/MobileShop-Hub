import { NextRequest, NextResponse } from "next/server";
import { checkOrigin, throttle } from "@/lib/staff-auth";
import { safeError } from "@/lib/staff-http";
import { clientIp, isKnownIp } from "@/lib/client-ip";
import { createOtpChallenge } from "@/lib/email-service";
import { db } from "@/lib/db";
import { AccessError } from "@/lib/staff-context";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const ip = clientIp(req);

    // Rate limiting: max 5 OTP requests per IP per hour, max 30 per IP per day
    if (isKnownIp(ip)) {
      await throttle(`otp-reg-ip:${ip}`, 5, 60 * 60 * 1000);
      await throttle(`otp-reg-ip-day:${ip}`, 30, 24 * 60 * 60 * 1000);
    }
    await throttle("otp-reg-global", 60, 60 * 1000);

    const body = await req.json().catch(() => null);
    if (!body || typeof body.email !== "string" || !body.email.trim()) {
      throw new AccessError(400, "กรุณากรอกอีเมลที่ถูกต้อง");
    }

    const email = body.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 150) {
      throw new AccessError(400, "รูปแบบอีเมลไม่ถูกต้อง");
    }

    // Rate limit per email: max 3 OTP requests per 10 minutes
    await throttle(`otp-reg-email:${email}`, 3, 10 * 60 * 1000);

    // Check if email is already tied to an existing tenant owner
    const existingUser = await db.user.findFirst({
      where: { email, role: "ADMIN", isActive: true },
      include: { tenant: true },
    });
    if (existingUser && existingUser.tenant && existingUser.tenant.status === "ACTIVE") {
      throw new AccessError(409, `อีเมลนี้ถูกลงทะเบียนเปิดร้าน "${existingUser.tenant.name}" แล้ว กรุณาเข้าสู่ระบบ`);
    }

    // Generate and send OTP
    const { verificationToken, devOtp } = await createOtpChallenge(email, "register");

    return NextResponse.json({
      success: true,
      message: `ส่งรหัส OTP 6 หลักไปยัง ${email} เรียบร้อยแล้ว (รหัสมีอายุ 10 นาที)`,
      verificationToken,
      devOtp, // Returned only in dev / local mode for ease of testing
    });
  } catch (error) {
    return safeError(error);
  }
}
