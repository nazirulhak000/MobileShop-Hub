import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import { AccessError, StaffPrincipal, StaffRole, staffStorage } from "./staff-context";

// Production uses the `__Host-` prefix (browser enforces Secure, Path=/, no Domain → cannot be set by a
// sibling subdomain). The legacy name is still READ during the transition so existing sessions survive,
// and is cleared whenever a new session is issued or the user logs out.
export const LEGACY_STAFF_COOKIE = "mobileshop_staff_session";
export const SECURE_STAFF_COOKIE = "__Host-mobileshop_staff_session";
export const STAFF_COOKIE = process.env.NODE_ENV === "production" ? SECURE_STAFF_COOKIE : LEGACY_STAFF_COOKIE;
/** Every cookie name a staff session token may live under (preferred first). */
export const STAFF_COOKIE_NAMES = [SECURE_STAFF_COOKIE, LEGACY_STAFF_COOKIE] as const;
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
type CookieReader = { get(name: string): { value: string } | undefined };
/** Returns all staff session tokens present on the request (new name first, then legacy). */
export function staffTokens(store: CookieReader): string[] {
  return STAFF_COOKIE_NAMES.map(name => store.get(name)?.value).filter((v): v is string => !!v);
}
/** Expire every staff cookie name. `__Host-` cookies can only be cleared with Secure set. */
export function clearStaffCookies(store: { set(name: string, value: string, options: Record<string, unknown>): unknown }) {
  store.set(LEGACY_STAFF_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  if (process.env.NODE_ENV === "production") store.set(SECURE_STAFF_COOKIE, "", { ...cookieOptions, secure: true, maxAge: 0 });
}
export async function requireStaffSession(req?: any): Promise<StaffPrincipal> {
  const current = staffStorage.getStore();
  if (current) return current;

  let store: any;
  try {
    store = await cookies();
  } catch {
    if (req && "cookies" in req && req.cookies) {
      store = req.cookies;
    } else {
      throw new AccessError(401, "กรุณาเข้าสู่ระบบของร้านก่อน");
    }
  }
  const token = staffTokens(store)[0];
  if (!token) throw new AccessError(401, "กรุณาเข้าสู่ระบบของร้านก่อน");
  const session = await db.staffSession.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) throw new AccessError(401, "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง");
  const user = await db.user.findFirst({ where: { id: session.userId, tenantId: session.tenantId }, include: { branch: true, tenant: true } });
  if (!user || !user.isActive || !user.tenant || !["ACTIVE", "TRIAL"].includes(user.tenant.status) || user.branch.tenantId !== session.tenantId) throw new AccessError(401, "บัญชีนี้ไม่พร้อมใช้งาน");
  if (!["ADMIN", "MANAGER", "CASHIER", "TECHNICIAN"].includes(user.role)) throw new AccessError(403, "ไม่มีสิทธิ์เข้าใช้งาน");
  const branches = await db.branch.findMany({ where: { tenantId: session.tenantId }, select: { id: true } });
  const grants = await db.staffBranchAccess.findMany({ where: { tenantId: session.tenantId, userId: user.id } });
  const allowed = new Set([user.branchId, ...grants.map(g => g.branchId)]);
  return { id: user.id, tenantId: session.tenantId, name: user.name, username: user.username, role: user.role as StaffRole, branchId: user.branchId, branchIds: branches.filter(b => user.role === "ADMIN" || allowed.has(b.id)).map(b => b.id) };
}
export async function createStaffSession(userId: string, tenantId: string) {
  const store = await cookies();
  const previous = staffTokens(store);
  if (previous.length) await db.staffSession.updateMany({ where: { tokenHash: { in: previous.map(hashToken) } }, data: { revokedAt: new Date() } });
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  await db.staffSession.create({ data: { tokenHash: hashToken(token), userId, tenantId, expiresAt } });
  if (STAFF_COOKIE !== LEGACY_STAFF_COOKIE && store.get(LEGACY_STAFF_COOKIE)) store.set(LEGACY_STAFF_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  store.set(STAFF_COOKIE, token, { ...cookieOptions, expires: expiresAt });
}
export function checkOrigin(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const expected = new URL(process.env.APP_ORIGIN || request.url).origin;
  if (request.headers.get("origin") !== expected || request.headers.get("sec-fetch-site") === "cross-site") throw new AccessError(403, "กรุณาทำรายการจากเว็บไซต์ของร้าน");
}
/**
 * Fixed-window counter stored in AuthThrottle (key = sha256 of the logical key, so raw IPs/phones are not
 * stored). Each call consumes one attempt; throws 429 once `limit` attempts were used in the window.
 */
export async function throttle(key: string, limit = 10, windowMs = 15 * 60 * 1000) {
  const now = new Date();
  const id = hashToken(key);
  await db.authThrottle.upsert({ where: { key: id }, create: { key: id, attempts: 0, resetsAt: new Date(now.getTime() + windowMs) }, update: {} });
  await db.authThrottle.updateMany({ where: { key: id, resetsAt: { lte: now } }, data: { attempts: 0, resetsAt: new Date(now.getTime() + windowMs) } });
  const claimed = await db.authThrottle.updateMany({ where: { key: id, attempts: { lt: limit } }, data: { attempts: { increment: 1 } } });
  if (!claimed.count) throw new AccessError(429, "ทำรายการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่");
}
/** Clears a throttle bucket (e.g. after a successful login). */
export async function resetThrottle(key: string) {
  await db.authThrottle.deleteMany({ where: { key: hashToken(key) } });
}
