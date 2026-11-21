import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { checkOrigin, throttle } from "@/lib/staff-auth";
import { safeError } from "@/lib/staff-http";
import { clientIp, isKnownIp } from "@/lib/client-ip";
import { verifyOtpChallenge } from "@/lib/email-service";

const HOUR = 3_600_000;
// Per-IP limits run first so a single source is stopped before it drains the global bucket; the global
// bucket is a much higher circuit breaker so one attacker cannot block every legitimate signup.
const LIMITS = { ipHourly: 5, ipDaily: 15, globalPerMinute: 30 };

export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const ip = clientIp(req);
    if (isKnownIp(ip)) {
      await throttle(`tenant-registration-ip:${ip}`, LIMITS.ipHourly, HOUR);
      await throttle(`tenant-registration-ip-day:${ip}`, LIMITS.ipDaily, 24 * HOUR);
    }
    await throttle("tenant-registration", LIMITS.globalPerMinute, 60_000);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "รูปแบบข้อมูล JSON ไม่ถูกต้อง" },
        { status: 400 }
      );
    }
    const { shopName, shopSlug, ownerName, username, password, phone, email, otpCode, verificationToken, plan: rawPlan } = body;

    // Validate email & OTP
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { error: "กรุณากรอกอีเมลที่ถูกต้องเพื่อรับรหัสยืนยัน" },
        { status: 400 }
      );
    }

    if (!otpCode || !verificationToken) {
      return NextResponse.json(
        { error: "กรุณายืนยันรหัส OTP 6 หลักที่ส่งไปยังอีเมลของคุณ" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Verify OTP challenge
    await verifyOtpChallenge(cleanEmail, String(otpCode), String(verificationToken), "register");

    const requestedPlan = String(rawPlan || "free").toLowerCase();
    const planConfig = requestedPlan === "enterprise"
      ? { plan: "ENTERPRISE", maxBranches: 99, maxUsers: 99, pricePerMonth: 399, status: "TRIAL" }
      : requestedPlan === "pro"
      ? { plan: "PRO", maxBranches: 3, maxUsers: 20, pricePerMonth: 199, status: "TRIAL" }
      : { plan: "FREE", maxBranches: 1, maxUsers: 3, pricePerMonth: 0, status: "ACTIVE" };

    if (![shopName, shopSlug, ownerName, username, password].every(value => typeof value === "string" && value.trim().length > 0 && value.length <= 100) || typeof password !== "string" || password.length < 12) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน และรหัสผ่านต้องมีความยาวอย่างน้อย 12 ตัวอักษร" },
        { status: 400 }
      );
    }

    // Clean and validate slug (alphanumeric and dashes only)
    const cleanedSlug = String(shopSlug)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (cleanedSlug.length < 3) {
      return NextResponse.json(
        { error: "รหัสร้านค้า (Shop Slug) ต้องมีความยาวอย่างน้อย 3 ตัวอักษร (ภาษาอังกฤษหรือตัวเลข)" },
        { status: 400 }
      );
    }

    // Check if tenant slug already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: cleanedSlug },
    });

    if (existingTenant) {
      return NextResponse.json(
        { error: `รหัสร้านค้า "${cleanedSlug}" มีผู้ใช้งานแล้ว กรุณาเลือกรหัสอื่น` },
        { status: 409 }
      );
    }

    // Usernames are unique inside the newly created tenant, not across all shops.
    const passwordHash = await bcrypt.hash(password, 12);

    // Create Tenant, Subscription, Branch, and User in a transaction
    const trialDays = 14;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: String(shopName).trim(),
          slug: cleanedSlug,
          plan: planConfig.plan,
          status: planConfig.status,
          maxBranches: planConfig.maxBranches,
          maxUsers: planConfig.maxUsers,
        },
      });

      // 2. Create Subscription
      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          plan: planConfig.plan,
          status: planConfig.status,
          billingCycle: "MONTHLY",
          pricePerMonth: planConfig.pricePerMonth,
          trialEndsAt: planConfig.status === "TRIAL" ? trialEndsAt : null,
          currentPeriodStart: new Date(),
          currentPeriodEnd: planConfig.status === "TRIAL" ? trialEndsAt : new Date(Date.now() + 365 * 24 * 3600 * 1000),
        },
      });

      // 3. Create Default Branch (HQ)
      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: `${String(shopName).trim()} (สาขาหลัก)`,
          code: "HQ",
          phone: phone ? String(phone).trim() : null,
          address: "กรุงเทพมหานคร",
        },
      });

      // 4. Create Admin User
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          name: String(ownerName).trim(),
          username: String(username).trim(),
          email: cleanEmail,
          password: passwordHash,
          role: "ADMIN",
        },
      });

      // 5. Create default StorefrontConfig for this shop
      await tx.storefrontConfig.create({
        data: {
          tenantId: tenant.id,
          themeColor: "emerald",
          fontFamily: "anuphan",
          headline: `${String(shopName).trim()} ศูนย์บริการซ่อมมือถือมาตรฐาน`,
          subheadline: "บริการซ่อมด่วน รอรับได้ พร้อมระบบตรวจสอบสถานะสด 24 ชั่วโมง",
          phone: phone ? String(phone).trim() : null,
        },
      });

      return { tenant, branch, user };
    });

    return NextResponse.json({
      success: true,
      shopSlug: result.tenant.slug,
      shopName: result.tenant.name,
      username: result.user.username,
      message: "สร้างร้านค้าสำเร็จเรียบร้อย พร้อมเริ่มทดลองใช้งานฟรี 14 วัน",
    });
  } catch (error) {
    console.error("Register tenant error:");
    return safeError(error);
  }
}
