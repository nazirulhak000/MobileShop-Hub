import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCustomer } from "@/lib/customer-auth";
import { safeError } from "@/lib/staff-http";
import { checkOrigin, throttle } from "@/lib/staff-auth";
import { AccessError } from "@/lib/staff-context";
export const dynamic = "force-dynamic";

function parsePhotosList(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((u): u is string => typeof u === "string" && u.trim().length > 0);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((u): u is string => typeof u === "string" && u.trim().length > 0);
      if (typeof parsed === "string" && parsed.trim().length > 0) return [parsed.trim()];
    } catch (_) {
      if (raw.startsWith("http") || raw.startsWith("/") || raw.startsWith("data:")) return [raw.trim()];
    }
  }
  return [];
}
export async function GET(request: NextRequest) {
  try {
    const actor = await requireCustomer(request.nextUrl.searchParams.get("shopSlug"));
    const own = { tenantId: actor.shop.id, customerId: actor.customerId ?? "__unlinked__" };
    const section = request.nextUrl.searchParams.get("section");
    const cursor = request.nextUrl.searchParams.get("cursor");
    if (cursor) {
      const permitted = section === "repairs" ? await db.repairJob.findFirst({ where: { ...own, id: cursor }, select: { id: true } }) : section === "purchases" ? await db.sale.findFirst({ where: { ...own, id: cursor }, select: { id: true } }) : null;
      if (!permitted) throw new AccessError(404, "ไม่พบหน้าประวัติที่ขอ");
    }
    const repairPage: { cursor?: { id: string }; skip?: number } = cursor && section === "repairs" ? { cursor: { id: cursor }, skip: 1 } : {};
    const purchasePage: { cursor?: { id: string }; skip?: number } = cursor && section === "purchases" ? { cursor: { id: cursor }, skip: 1 } : {};
    const [repairs, purchases, bookings, notifications] = await Promise.all([
      db.repairJob.findMany({ where: own, ...repairPage, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 50, select: { id: true, trackingCode: true, deviceBrand: true, deviceModel: true, status: true, estimatedFinish: true, totalCost: true, createdAt: true, updatedAt: true, warrantyDays: true, completedAt: true, photos: true, branch: { select: { name: true, phone: true } } } }),
      db.sale.findMany({ where: own, ...purchasePage, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 50, select: { id: true, invoiceNo: true, netAmount: true, status: true, createdAt: true, branch: { select: { name: true } }, items: { select: { quantity: true, unitPrice: true, subtotal: true, product: { select: { name: true } } } } } }),
      db.appointment.findMany({ where: { tenantId: actor.shop.id, accountId: actor.account.id }, orderBy: { createdAt: "desc" }, take: 50 }),
      db.customerNotification.findMany({ where: { tenantId: actor.shop.id, accountId: actor.account.id }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, message: true, href: true, readAt: true, createdAt: true } }),
    ]);
    const ids = repairs.map(r => r.id);
    const [events, quotes, slots, branches] = await Promise.all([
      db.repairStatusEvent.findMany({ where: { tenantId: actor.shop.id, repairJobId: { in: ids } }, orderBy: { occurredAt: "asc" }, select: { id: true, repairJobId: true, status: true, customerMessage: true, occurredAt: true } }),
      db.repairQuote.findMany({ where: { tenantId: actor.shop.id, repairJobId: { in: ids } }, orderBy: { version: "desc" }, select: { id: true, repairJobId: true, version: true, description: true, amountSatang: true, status: true, expiresAt: true } }),
      db.bookingSlot.findMany({ where: { tenantId: actor.shop.id, id: { in: bookings.map(b => b.slotId) } }, select: { id: true, startsAt: true } }),
      db.branch.findMany({ where: { tenantId: actor.shop.id }, select: { id: true, name: true, phone: true } }),
    ]);
    return NextResponse.json({ repairsNext: repairs.length === 50 ? repairs[repairs.length - 1].id : null, purchasesNext: purchases.length === 50 ? purchases[purchases.length - 1].id : null, account: { displayName: actor.account.displayName, phone: actor.account.phone, linked: !!actor.customerId }, shop: { name: actor.shop.name, slug: actor.shop.slug }, repairs: repairs.map(r => ({ ...r, photos: parsePhotosList(r.photos), events: events.filter(e => e.repairJobId === r.id), quotes: quotes.filter(q => q.repairJobId === r.id) })), purchases, bookings: bookings.map(b => ({ id: b.id, bookingRef: b.bookingRef, branchId: b.branchId, status: b.status, service: b.service, deviceModel: b.deviceModel, startsAt: slots.find(s => s.id === b.slotId)?.startsAt, branch: branches.find(r => r.id === b.branchId) })), notifications }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return safeError(error); }
}
export async function PATCH(request: NextRequest) {
  try {
    checkOrigin(request);
    const body = await request.json();
    if (!body || typeof body !== "object") throw new AccessError(400, "รูปแบบข้อมูลไม่ถูกต้อง");
    const actor = await requireCustomer(body.shopSlug);
    await throttle(`customer-portal-patch:${actor.account.id}`, 30, 60_000);
    if (body.notificationId) await db.customerNotification.updateMany({ where: { id: body.notificationId, tenantId: actor.shop.id, accountId: actor.account.id }, data: { readAt: new Date() } });
    else {
      if (typeof body.displayName !== "string" || body.displayName.trim().length < 2 || body.displayName.length > 100) throw new AccessError(400, "กรุณาระบุชื่อ 2–100 ตัวอักษร");
      await db.customerAccount.updateMany({ where: { id: actor.account.id, tenantId: actor.shop.id }, data: { displayName: body.displayName.trim() } });
    }
    return NextResponse.json({ success: true });
  } catch (error) { return safeError(error); }
}
