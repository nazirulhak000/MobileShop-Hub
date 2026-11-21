import { createHmac, randomBytes } from "node:crypto";
import { db } from "./db";
import { AccessError } from "./staff-context";

const SECRET = process.env.AUTH_SECRET || "mobileshop-default-email-otp-secret-key-32b";
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Sends email using Resend API if RESEND_API_KEY is configured.
 * Otherwise falls back to simulated delivery with console logging.
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string; simulated?: boolean }> {
  const { to, subject, html, text } = options;
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "MobileShop Hub <noreply@resend.dev>",
          to: [to],
          subject,
          html,
          text: text || html.replace(/<[^>]*>/g, " "),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error("[EmailService] Resend API error:", data);
        // Fall back gracefully rather than crash if API key has issues
        return { success: true, simulated: true };
      }
      return { success: true, id: data.id };
    } catch (err) {
      console.error("[EmailService] Failed to send via Resend:", err);
      return { success: true, simulated: true };
    }
  }

  // Simulated / Local delivery
  console.log(`\n========================================`);
  console.log(`[EMAIL SERVICE - SIMULATED DELIVERY]`);
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Time:    ${new Date().toISOString()}`);
  console.log(`========================================\n`);

  return { success: true, simulated: true };
}

/**
 * Generate 6-digit OTP code and signed verification token
 */
export async function createOtpChallenge(
  email: string,
  purpose: "register" | "forgot_password"
): Promise<{ verificationToken: string; devOtp?: string }> {
  const cleanEmail = email.toLowerCase().trim();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const salt = randomBytes(8).toString("hex");
  const expiresAt = Date.now() + OTP_EXPIRY_MS;

  // Hash the code with salt and secret
  const codeHash = createHmac("sha256", SECRET)
    .update(`${cleanEmail}:${code}:${salt}:${purpose}`)
    .digest("hex");

  // Create payload
  const payload = JSON.stringify({
    email: cleanEmail,
    codeHash,
    salt,
    purpose,
    expiresAt,
  });

  const payloadBase64 = Buffer.from(payload).toString("base64url");
  const signature = createHmac("sha256", SECRET).update(payloadBase64).digest("base64url");
  const verificationToken = `${payloadBase64}.${signature}`;

  // Subject and HTML email styling
  const isRegister = purpose === "register";
  const subject = isRegister
    ? `รหัส OTP ยืนยันการเปิดร้านใหม่: ${code} - MobileShop Hub`
    : `รหัส OTP สำหรับรีเซ็ตรหัสผ่าน: ${code} - MobileShop Hub`;

  const html = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 36px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .logo-badge { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; background: #2563eb; color: #ffffff; border-radius: 12px; font-weight: bold; font-size: 20px; margin-bottom: 20px; }
        h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; }
        p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0; }
        .otp-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }
        .otp-code { font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #1d4ed8; }
        .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 28px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo-badge">M</div>
        <h1>${isRegister ? "ยืนยันการเปิดร้านใหม่บน MobileShop Hub" : "รีเซ็ตรหัสผ่านบัญชีของคุณ"}</h1>
        <p>คุณได้รับอีเมลนี้เนื่องจากมีการร้องขอ${isRegister ? "ลงทะเบียนเปิดร้านค้าใหม่" : "ตั้งรหัสผ่านใหม่"} สำหรับอีเมล <strong>${cleanEmail}</strong></p>
        <div class="otp-box">
          <div style="font-size: 12px; text-transform: uppercase; color: #64748b; margin-bottom: 6px; font-weight: 600;">รหัสยืนยัน OTP (มีอายุ 10 นาที)</div>
          <div class="otp-code">${code}</div>
        </div>
        <p style="font-size: 13px; color: #64748b;">หากคุณไม่ได้เป็นผู้ทำรายการนี้ โปรดเพิกเฉยต่ออีเมลฉบับนี้ รหัส OTP จะหมดอายุอัตโนมัติภายใน 10 นาที</p>
        <div class="footer">
          &copy; ${new Date().getFullYear()} MobileShop Hub • ระบบบริหารจัดการร้านซ่อมมือถือครบวงจร
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({ to: cleanEmail, subject, html });

  // In non-production or simulated environments, expose devOtp for convenient UX
  const isDevOrSimulated = process.env.NODE_ENV !== "production" || !process.env.RESEND_API_KEY;
  return {
    verificationToken,
    devOtp: isDevOrSimulated ? code : undefined,
  };
}

/**
 * Verify submitted OTP against signed verification token
 */
export async function verifyOtpChallenge(
  email: string,
  code: string,
  verificationToken: string,
  purpose: "register" | "forgot_password"
): Promise<boolean> {
  if (!email || !code || !verificationToken) {
    throw new AccessError(400, "กรุณาระบุอีเมล รหัส OTP และ Token ให้ครบถ้วน");
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanCode = code.trim();

  // Split token into payload and signature
  const parts = verificationToken.split(".");
  if (parts.length !== 2) {
    throw new AccessError(400, "รูปแบบ Verification Token ไม่ถูกต้อง");
  }

  const [payloadBase64, signature] = parts;
  const expectedSignature = createHmac("sha256", SECRET).update(payloadBase64).digest("base64url");

  if (signature !== expectedSignature) {
    throw new AccessError(400, "Verification Token ไม่ถูกต้องหรือถูกแก้ไข");
  }

  let payload: any;
  try {
    const raw = Buffer.from(payloadBase64, "base64url").toString("utf8");
    payload = JSON.parse(raw);
  } catch {
    throw new AccessError(400, "Verification Token เสียหาย");
  }

  if (payload.email !== cleanEmail) {
    throw new AccessError(400, "อีเมลไม่ตรงกับที่ขอรับรหัส OTP");
  }

  if (payload.purpose !== purpose) {
    throw new AccessError(400, "วัตถุประสงค์ของ Token ไม่ถูกต้อง");
  }

  if (Date.now() > payload.expiresAt) {
    throw new AccessError(400, "รหัส OTP หมดอายุแล้ว กรุณากดขอรหัสใหม่");
  }

  // Check replay protection in AuthThrottle
  const tokenHashKey = `otp-used:${signature.slice(0, 32)}`;
  const existingUse = await db.authThrottle.findUnique({
    where: { key: tokenHashKey },
  });
  if (existingUse) {
    throw new AccessError(400, "รหัส OTP นี้ถูกใช้งานไปแล้ว กรุณาขอรหัสใหม่");
  }

  // Verify hash
  const computedHash = createHmac("sha256", SECRET)
    .update(`${cleanEmail}:${cleanCode}:${payload.salt}:${purpose}`)
    .digest("hex");

  if (computedHash !== payload.codeHash) {
    throw new AccessError(400, "รหัส OTP 6 หลักไม่ถูกต้อง");
  }

  // Mark token as consumed
  await db.authThrottle.create({
    data: {
      key: tokenHashKey,
      attempts: 1,
      resetsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return true;
}
