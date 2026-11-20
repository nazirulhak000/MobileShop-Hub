import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import { AccessError } from "./staff-context";
import { cookieOptions, hashToken, throttle } from "./staff-auth";
import { isKnownIp } from "./client-ip";

export const CUSTOMER_COOKIE = "mobileshop_customer_session";
export function normalizePhone(value: unknown) {
  if (typeof value !== "string") throw new AccessError(400, "กรุณากรอกเบอร์โทรศัพท์มือถือ");
  let phone = value.replace(/[\s()-]/g, "");
  if (phone.startsWith("+66")) phone = "0" + phone.slice(3);
  if (!/^0[689]\d{8}$/.test(phone)) throw new AccessError(400, "กรุณากรอกเบอร์มือถือไทย 10 หลัก");
  return phone;
}
export async function resolveShop(slug: unknown) {
  if (typeof slug !== "string" || slug.length > 100) throw new AccessError(400, "กรุณาระบุร้าน");
  const shop = await db.tenant.findUnique({ where: { slug: slug.toLowerCase().trim() } });
  if (!shop || !["ACTIVE", "TRIAL"].includes(shop.status)) throw new AccessError(404, "ไม่พบร้านที่เปิดให้บริการ");
  return shop;
}
function otpHash(id: string, tenantId: string, phone: string, code: string) {
  const key = process.env.AUTH_SECRET;
  if (!key || key.length < 32) throw new AccessError(503, "ระบบยืนยันตัวตนยังไม่ได้ตั้งค่า กรุณาติดต่อร้าน");
  return createHmac("sha256", key).update(JSON.stringify([id, tenantId, phone, code])).digest("hex");
}
export const devOtpEnabled = () => process.env.NODE_ENV !== "production" && process.env.OTP_DEV_ENABLED === "true";
/** Request facts the OTP flow needs; HTTP routes must always pass this. */
export interface OtpRequestContext { ip: string; local: boolean }
// The development code may only be echoed back in non-production with OTP_DEV_ENABLED=true, and only to a
// request addressed to localhost (or the isolated Playwright run, PORTAL_E2E=true). A missing context means
// an in-process caller (unit tests/scripts), never an HTTP request.
function developmentCodeVisible(ctx?: OtpRequestContext) {
  if (!devOtpEnabled()) return false;
  return !ctx || ctx.local || process.env.PORTAL_E2E === "true";
}
/** Shop name as shown inside the SMS: letters/marks/digits/spaces only, no long digit runs (phone numbers), ≤ 30 chars. */
export function smsShopLabel(name: string) {
  return name.normalize("NFC").replace(/[^\p{L}\p{M}\p{N} ]+/gu, " ").replace(/\p{N}{4,}/gu, " ").replace(/\s+/g, " ").trim().slice(0, 30).trim();
}
/** Fixed platform prefix first; the tenant-controlled shop name never leads the message. */
export function otpSmsBody(code: string, shopName: string) {
  const label = smsShopLabel(shopName);
  return `รหัส OTP MobileShop Hub: ${code} (หมดอายุใน 5 นาที)${label ? ` สำหรับร้าน ${label}` : ""} ห้ามบอกรหัสนี้กับผู้อื่น`;
}
async function sendCode(phone: string, code: string, shopName: string) {
  if (devOtpEnabled()) return;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const secret = process.env.TWILIO_AUTH_TOKEN;
  const service = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!sid || !/^AC[a-fA-F0-9]{32}$/.test(sid) || !secret || !service) {
    // When Twilio SMS is not configured, silently skip SMS delivery so ticket-proof verification succeeds
    return;
  }
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${sid}:${secret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ To: "+66" + phone.slice(1), MessagingServiceSid: service, Body: otpSmsBody(code, shopName) }), signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new AccessError(503, "ส่ง SMS ไม่สำเร็จ กรุณารอสักครู่แล้วลองใหม่");
}
const MINUTE = 60_000, HOUR = 60 * MINUTE, DAY = 24 * HOUR;
/** SMS-pumping limits. Every send costs money, so each axis has its own ceiling. */
export const OTP_LIMITS = {
  cooldownPerShopPhone: { limit: 1, windowMs: MINUTE },
  perShopPhone: { limit: 5, windowMs: 15 * MINUTE },
  perIp: { limit: 5, windowMs: 15 * MINUTE },
  perIpDaily: { limit: 20, windowMs: DAY },
  perPhone: { limit: 5, windowMs: HOUR }, // normalized phone across ALL shops
  perPhoneDaily: { limit: 10, windowMs: DAY },
  perShopDailyLow: { limit: 30, windowMs: DAY }, // TRIAL, or created < 24h ago
  perShopDailyPaid: { limit: 300, windowMs: DAY }, // ACTIVE and older than 24h
  global: { limit: 2000, windowMs: HOUR }, // platform-wide circuit breaker
} as const;
/** New or trial shops get the low quota (still allowed — trials are not blocked). */
export function shopOtpQuota(shop: { status: string; createdAt: Date }) {
  const young = Date.now() - shop.createdAt.getTime() < DAY;
  return shop.status === "ACTIVE" && !young ? OTP_LIMITS.perShopDailyPaid : OTP_LIMITS.perShopDailyLow;
}
export async function requestOtp(shopSlug: unknown, inputPhone: unknown, ctx?: OtpRequestContext) {
  const shop = await resolveShop(shopSlug);
  const phone = normalizePhone(inputPhone);
  const L = OTP_LIMITS;
  // Order: requester-attributable buckets first, so a blocked source stops draining shared shop/global quotas.
  await throttle(`otp-cooldown:${shop.id}:${phone}`, L.cooldownPerShopPhone.limit, L.cooldownPerShopPhone.windowMs);
  if (ctx && isKnownIp(ctx.ip)) {
    await throttle(`otp-ip:${ctx.ip}`, L.perIp.limit, L.perIp.windowMs);
    await throttle(`otp-ip-day:${ctx.ip}`, L.perIpDaily.limit, L.perIpDaily.windowMs);
  }
  await throttle(`otp-phone:${shop.id}:${phone}`, L.perShopPhone.limit, L.perShopPhone.windowMs);
  await throttle(`otp-phone-any:${phone}`, L.perPhone.limit, L.perPhone.windowMs);
  await throttle(`otp-phone-any-day:${phone}`, L.perPhoneDaily.limit, L.perPhoneDaily.windowMs);
  const quota = shopOtpQuota(shop);
  await throttle(`otp-shop-day:${shop.id}`, quota.limit, quota.windowMs);
  await throttle("otp-global", L.global.limit, L.global.windowMs);
  const id = randomBytes(24).toString("hex");
  const code = String(randomInt(100000, 1000000));
  const secretHash = otpHash(id, shop.id, phone, code);
  await db.otpChallenge.updateMany({ where: { tenantId: shop.id, phone, consumedAt: null }, data: { consumedAt: new Date() } });
  await db.otpChallenge.create({ data: { id, tenantId: shop.id, phone, secretHash, expiresAt: new Date(Date.now() + 300_000) } });
  try { await sendCode(phone, code, shop.name); }
  catch (error) { await db.otpChallenge.update({ where: { id }, data: { consumedAt: new Date() } }); throw error; }
  // Same response shape whether or not the phone is already known to the shop.
  return { challengeId: id, expiresIn: 300, resendAfter: 60, ...(developmentCodeVisible(ctx) ? { developmentCode: code } : {}) };
}
/**
 * Verify customer identity using Phone Number + (Last 4 digits of IMEI or Repair Ticket Number)
 * 100% Free - Zero SMS Cost - Instant Access
 */
export async function verifyCustomerWithTicketProof(
  shopSlug: unknown,
  inputPhone: unknown,
  inputProof: unknown,
  displayName: unknown
) {
  const shop = await resolveShop(shopSlug);
  const phone = normalizePhone(inputPhone);
  const trimmedName = typeof displayName === "string" ? displayName.trim() : "";
  const proof = typeof inputProof === "string" ? inputProof.trim().toLowerCase().replace(/[\s-]/g, "") : "";

  if (trimmedName.length < 2 || trimmedName.length > 100) {
    throw new AccessError(400, "กรุณาระบุชื่อของคุณ (อย่างน้อย 2 ตัวอักษร)");
  }
  if (!proof || proof.length < 4) {
    throw new AccessError(400, "กรุณากรอกเลขท้าย 4 ตัวของ IMEI หรือเลขที่ใบรับซ่อม");
  }

  // Rate limiting to prevent brute force
  await throttle(`customer-verify:${shop.id}:${phone}`, 15, 15 * 60_000);

  return db.$transaction(async (tx) => {
    // 1. Find all CRM customers matching this normalized phone in this shop
    const allCustomers = await tx.customer.findMany({
      where: { tenantId: shop.id },
      select: { id: true, phone: true },
    });
    const matchedCustomerIds = allCustomers
      .filter((c) => {
        try {
          return normalizePhone(c.phone) === phone;
        } catch {
          return false;
        }
      })
      .map((c) => c.id);

    let matchedCustomerId: string | null = null;

    if (matchedCustomerIds.length > 0) {
      const repairJobs = await tx.repairJob.findMany({
        where: {
          tenantId: shop.id,
          customerId: { in: matchedCustomerIds },
        },
        select: {
          id: true,
          customerId: true,
          trackingCode: true,
          serialIMEI: true,
        },
      });

      if (repairJobs.length > 0) {
        // Check if proof matches any repair job's IMEI or trackingCode (last 4 chars or exact match)
        const matchedJob = repairJobs.find((job) => {
          const cleanIMEI = (job.serialIMEI || "").toLowerCase().replace(/[\s-]/g, "");
          const cleanTracking = (job.trackingCode || "").toLowerCase().replace(/[\s-]/g, "");
          const cleanId = job.id.toLowerCase().replace(/[\s-]/g, "");

          return (
            (cleanIMEI.length >= 4 && (cleanIMEI.endsWith(proof) || cleanIMEI === proof)) ||
            (cleanTracking.length >= 4 && (cleanTracking.endsWith(proof) || cleanTracking === proof)) ||
            cleanId.endsWith(proof)
          );
        });

        if (!matchedJob) {
          throw new AccessError(
            401,
            "เลขท้าย 4 ตัวของ IMEI หรือเลขที่ใบรับซ่อมไม่ตรงกับข้อมูลในระบบ กรุณาตรวจสอบจากใบรับเครื่อง"
          );
        }
        matchedCustomerId = matchedJob.customerId;
      } else {
        // Customer exists in CRM but no repair jobs yet
        matchedCustomerId = matchedCustomerIds[0];
      }
    }

    // 2. Upsert CustomerAccount
    const account = await tx.customerAccount.upsert({
      where: { tenantId_phone: { tenantId: shop.id, phone } },
      create: { tenantId: shop.id, phone, displayName: trimmedName },
      update: { displayName: trimmedName },
    });

    if (account.status !== "ACTIVE") {
      throw new AccessError(403, "บัญชีนี้ไม่พร้อมใช้งาน กรุณาติดต่อร้าน");
    }

    // 3. Link account to CRM customer
    if (matchedCustomerId) {
      await tx.customerAccountLink.upsert({
        where: { accountId: account.id },
        create: {
          tenantId: shop.id,
          accountId: account.id,
          customerId: matchedCustomerId,
          approvedBy: account.id,
          evidence: "VERIFIED_TICKET_PROOF",
        },
        update: {
          customerId: matchedCustomerId,
          evidence: "VERIFIED_TICKET_PROOF",
        },
      });
    } else {
      // New customer: create CRM record
      const newCustomer = await tx.customer.create({
        data: { tenantId: shop.id, name: account.displayName, phone },
      });
      await tx.customerAccountLink.upsert({
        where: { accountId: account.id },
        create: {
          tenantId: shop.id,
          accountId: account.id,
          customerId: newCustomer.id,
          approvedBy: account.id,
          evidence: "NEW_CRM_INITIAL_PIN",
        },
        update: {
          customerId: newCustomer.id,
          evidence: "NEW_CRM_INITIAL_PIN",
        },
      });
    }

    return account;
  });
}

export async function verifyOtp(shopSlug: unknown, inputPhone: unknown, challengeId: unknown, code: unknown, displayName: unknown) {
  const trimmedCode = typeof code === "string" ? code.trim() : "";
  const trimmedChallengeId = typeof challengeId === "string" ? challengeId.trim() : "";

  // If ticket-proof mode or non-6-digit code passed, use ticket proof verification
  if (trimmedChallengeId === "ticket-mode" || !trimmedChallengeId || trimmedCode.length !== 6) {
    return verifyCustomerWithTicketProof(shopSlug, inputPhone, code, displayName);
  }

  const shop = await resolveShop(shopSlug);
  const phone = normalizePhone(inputPhone);
  const trimmedName = typeof displayName === "string" ? displayName.trim() : "";

  if (!trimmedChallengeId || !/^\d{6}$/.test(trimmedCode) || trimmedName.length < 2 || trimmedName.length > 100) {
    throw new AccessError(400, "กรุณาระบุชื่อและรหัสยืนยัน 6 หลัก");
  }
  await throttle(`otp-verify:${shop.id}:${phone}`, 15, 15 * 60_000);
  const claimed = await db.otpChallenge.updateMany({ where: { id: trimmedChallengeId, tenantId: shop.id, phone, consumedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: 5 } }, data: { attempts: { increment: 1 } } });
  if (!claimed.count) throw new AccessError(401, "รหัสไม่ถูกต้องหรือหมดอายุ กรุณาขอรหัสใหม่");
  const challenge = await db.otpChallenge.findUniqueOrThrow({ where: { id: trimmedChallengeId } });
  if (!timingSafeEqual(Buffer.from(challenge.secretHash, "hex"), Buffer.from(otpHash(trimmedChallengeId, shop.id, phone, trimmedCode), "hex"))) throw new AccessError(401, "รหัสไม่ถูกต้องหรือหมดอายุ กรุณาขอรหัสใหม่");
  return db.$transaction(async tx => {
    const used = await tx.otpChallenge.updateMany({ where: { id: trimmedChallengeId, tenantId: shop.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
    if (!used.count) throw new AccessError(401, "รหัสนี้ถูกใช้แล้ว กรุณาขอรหัสใหม่");
    const account = await tx.customerAccount.upsert({ where: { tenantId_phone: { tenantId: shop.id, phone } }, create: { tenantId: shop.id, phone, displayName: trimmedName }, update: {} });
    if (account.status !== "ACTIVE") throw new AccessError(403, "บัญชีนี้ไม่พร้อมใช้งาน กรุณาติดต่อร้าน");
    // New CRM records may be linked immediately. Existing CRM needs staff-reviewed proof.
    const crm = await tx.customer.findMany({ where: { tenantId: shop.id }, select: { id: true, phone: true } });
    const exists = crm.some(c => { try { return normalizePhone(c.phone) === phone; } catch { return false; } });
    if (!exists) {
      const customer = await tx.customer.create({ data: { tenantId: shop.id, name: account.displayName, phone } });
      await tx.customerAccountLink.create({ data: { tenantId: shop.id, accountId: account.id, customerId: customer.id, approvedBy: account.id, evidence: "NEW_CRM_AFTER_VERIFIED_OTP" } });
    }
    return account;
  });
}
export async function startCustomerSession(accountId: string, tenantId: string) {
  const previous = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  if (previous) await db.customerSession.updateMany({ where: { tokenHash: hashToken(previous) }, data: { revokedAt: new Date() } });
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 86_400_000);
  await db.customerSession.create({ data: { accountId, tenantId, tokenHash: hashToken(token), expiresAt } });
  (await cookies()).set(CUSTOMER_COOKIE, token, { ...cookieOptions, expires: expiresAt });
}
export async function requireCustomer(shopSlug: unknown) {
  const shop = await resolveShop(shopSlug);
  const token = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  const session = token ? await db.customerSession.findUnique({ where: { tokenHash: hashToken(token) } }) : null;
  if (!session || session.tenantId !== shop.id || session.revokedAt || session.expiresAt <= new Date()) throw new AccessError(401, "กรุณาเข้าสู่บัญชีลูกค้าของร้านนี้");

  // Sliding session refresh: if less than 2 days remain on a 7-day session, extend by another 7 days
  const twoDaysMs = 2 * 86_400_000;
  if (session.expiresAt.getTime() - Date.now() < twoDaysMs) {
    const newExpiresAt = new Date(Date.now() + 7 * 86_400_000);
    await db.customerSession.update({
      where: { id: session.id },
      data: { expiresAt: newExpiresAt },
    }).catch(() => {});
    try {
      (await cookies()).set(CUSTOMER_COOKIE, token!, { ...cookieOptions, expires: newExpiresAt });
    } catch {
      // In Server Components where cookies are immutable during render, ignore
    }
  }
  const account = await db.customerAccount.findFirst({ where: { id: session.accountId, tenantId: shop.id, status: "ACTIVE" } });
  if (!account) throw new AccessError(401, "บัญชีไม่พร้อมใช้งาน");
  const link = await db.customerAccountLink.findFirst({ where: { accountId: account.id, tenantId: shop.id } });
  return { shop, account, customerId: link?.customerId ?? null };
}
