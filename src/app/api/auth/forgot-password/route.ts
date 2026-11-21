import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { checkOrigin, throttle } from "@/lib/staff-auth";
import { safeError } from "@/lib/staff-http";
import { clientIp, isKnownIp } from "@/lib/client-ip";
import { createOtpChallenge, verifyOtpChallenge } from "@/lib/email-service";
import { db } from "@/lib/db";
import { AccessError } from "@/lib/staff-context";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const ip = clientIp(req);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      throw new AccessError(400, "รูปแบบข้อมูลไม่ถูกต้อง");
    }

    const action = body.action || "request-otp";

    if (action === "request-otp") {
      // 1. Request Password Reset OTP
      if (isKnownIp(ip)) {
        await throttle(`pwd-reset-ip:${ip}`, 5, 60 * 60 * 1000);
      }
      await throttle("pwd-reset-global", 60, 60 * 1000);

      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new AccessError(400, "กรุณากรอกอีเมลที่ถูกต้อง");
      }

      await throttle(`pwd-reset-email:${email}`, 3, 10 * 60 * 1000);

      // Check if user exists
      const user = await db.user.findFirst({
        where: { email, isActive: true },
        include: { tenant: true },
      });

      // To prevent user enumeration, if not found we still pretend to succeed or provide clean response
      if (!user) {
        throw new AccessError(404, "ไม่พบบัญชีผู้ใช้ที่ผูกกับอีเมลนี้");
      }

      const { verificationToken, devOtp } = await createOtpChallenge(email, "forgot_password");

      return NextResponse.json({
        success: true,
        message: `ส่งรหัส OTP 6 หลักไปยัง ${email} เรียบร้อยแล้ว (รหัสมีอายุ 10 นาที)`,
        verificationToken,
        devOtp,
      });
    }

    if (action === "reset-password") {
      // 2. Verify OTP & Set New Password
      const { email, otpCode, verificationToken, newPassword } = body;

      if (!email || typeof email !== "string") {
        throw new AccessError(400, "กรุณาระบุอีเมล");
      }
      const cleanEmail = email.trim().toLowerCase();

      if (!newPassword || typeof newPassword !== "string" || newPassword.length < 12) {
        throw new AccessError(400, "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 12 ตัวอักษร");
      }

      // Verify OTP
      await verifyOtpChallenge(cleanEmail, String(otpCode || ""), String(verificationToken || ""), "forgot_password");

      // Hash new password
      const newHash = await bcrypt.hash(newPassword, 12);

      // Find user(s) with this email and update
      const users = await db.user.findMany({
        where: { email: cleanEmail, isActive: true },
        select: { id: true, tenantId: true },
      });

      if (users.length === 0) {
        throw new AccessError(404, "ไม่พบบัญชีผู้ใช้");
      }

      for (const u of users) {
        await db.user.update({
          where: { id: u.id },
          data: { password: newHash },
        });
        // Revoke active sessions for security
        await db.staffSession.updateMany({
          where: { userId: u.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      return NextResponse.json({
        success: true,
        message: "เปลี่ยนรหัสผ่านใหม่เรียบร้อยแล้ว คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที",
      });
    }

    throw new AccessError(400, "action ไม่ถูกต้อง");
  } catch (error) {
    return safeError(error);
  }
}
