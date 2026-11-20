import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { hashToken } from "./staff-auth";
import { AccessError } from "./staff-context";
export const services: Record<string, string> = { DIAGNOSIS: "ตรวจอาการ", SCREEN: "ตรวจจอ/เปลี่ยนจอ", BATTERY: "ตรวจแบตเตอรี่", OTHER: "บริการอื่น ๆ" };
export interface BookingActor { tenantId: string; accountId: string }
const HOUR = 3_600_000;
function parseJsonArray(raw: string | null | undefined): any[] {
  if (!raw) return [];
  try {
    const val = JSON.parse(raw);
    return Array.isArray(val) ? val : [];
  } catch {
    return [];
  }
}
function validStart(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/.test(value)) throw new AccessError(400, "เวลานัดไม่ถูกต้อง");
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) throw new AccessError(400, "เวลานัดไม่ถูกต้อง");
  return date;
}
async function validateSlot(tx: Prisma.TransactionClient, tenantId: string, branchId: string, startsAt: Date) {
  const branch = await tx.branch.findFirst({ where: { id: branchId, tenantId } });
  const policy = await tx.bookingPolicy.findFirst({ where: { branchId, tenantId, active: true } });
  if (!branch || !policy) throw new AccessError(404, "สาขานี้ยังไม่เปิดรับจองออนไลน์");
  const local = new Date(startsAt.getTime() + 7 * HOUR);
  const minute = local.getUTCHours() * 60 + local.getUTCMinutes();
  const day = local.toISOString().slice(0, 10);
  if (startsAt.getTime() < Date.now() + HOUR || startsAt.getTime() > Date.now() + 30 * 24 * HOUR || minute % 30 !== 0 || minute < policy.opensMinute || minute + 30 > policy.closesMinute || parseJsonArray(policy.closedDates).includes(day) || parseJsonArray(policy.closedWeekdays).includes(local.getUTCDay())) throw new AccessError(409, "เวลานี้ไม่เปิดรับจอง กรุณาเลือกเวลาใหม่");
  return policy;
}
async function claimSlot(tx: Prisma.TransactionClient, actor: BookingActor, branchId: string, startsAt: Date) {
  const policy = await validateSlot(tx, actor.tenantId, branchId, startsAt);
  const slot = await tx.bookingSlot.upsert({ where: { branchId_startsAt: { branchId, startsAt } }, update: {}, create: { tenantId: actor.tenantId, branchId, startsAt, endsAt: new Date(startsAt.getTime() + HOUR / 2), capacity: policy.capacity } });
  const claimed = await tx.bookingSlot.updateMany({ where: { id: slot.id, tenantId: actor.tenantId, reservedCount: { lt: policy.capacity } }, data: { capacity: policy.capacity, reservedCount: { increment: 1 } } });
  if (!claimed.count) throw new AccessError(409, "คิวนี้เต็มแล้ว กรุณาเลือกเวลาใหม่");
  return slot;
}
export async function retryTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await db.$transaction(work, { maxWait: 10_000, timeout: 10_000 }); }
    catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P1008", "P2028", "P2002"].includes(error.code);
      if (!retryable || attempt >= 6) throw error;
      await new Promise(resolve => setTimeout(resolve, 25 * (attempt + 1) + Math.random() * 50));
    }
  }
}
export async function availability(tenantId: string, branchId: string, date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new AccessError(400, "กรุณาเลือกวันที่");
  const midnight = new Date(`${date}T00:00:00+07:00`);
  if (!Number.isFinite(midnight.getTime()) || new Date(midnight.getTime() + 7 * HOUR).toISOString().slice(0, 10) !== date) throw new AccessError(400, "วันที่ไม่ถูกต้อง");
  const branch = await db.branch.findFirst({ where: { id: branchId, tenantId } });
  const policy = await db.bookingPolicy.findFirst({ where: { branchId, tenantId, active: true } });
  if (!branch || !policy) return [];
  const existing = await db.bookingSlot.findMany({ where: { tenantId, branchId, startsAt: { gte: midnight, lt: new Date(midnight.getTime() + 24 * HOUR) } } });
  const localDay = new Date(midnight.getTime() + 7 * HOUR).getUTCDay();
  if (parseJsonArray(policy.closedDates).includes(date) || parseJsonArray(policy.closedWeekdays).includes(localDay)) return [];
  const slots: { startsAt: string; remaining: number }[] = [];
  for (let minute = policy.opensMinute; minute + 30 <= policy.closesMinute; minute += 30) {
    const start = new Date(midnight.getTime() + minute * 60_000);
    if (start.getTime() < Date.now() + HOUR || start.getTime() > Date.now() + 30 * 24 * HOUR) continue;
    const used = existing.find(s => s.startsAt.getTime() === start.getTime())?.reservedCount ?? 0;
    slots.push({ startsAt: start.toISOString(), remaining: Math.max(0, policy.capacity - used) });
  }
  return slots;
}
export async function mutateBooking(actor: BookingActor, action: "create" | "cancel" | "reschedule", body: Record<string, unknown>) {
  if (typeof body.key !== "string" || body.key.length < 8 || body.key.length > 100) throw new AccessError(400, "กรุณาส่งรหัสการทำรายการ");
  const key = body.key;
  const startsAt = action === "cancel" ? null : validStart(body.startsAt);
  const branchId = typeof body.branchId === "string" ? body.branchId : "";
  const id = typeof body.id === "string" ? body.id : "";
  const service = typeof body.service === "string" ? body.service : "";
  const deviceModel = typeof body.deviceModel === "string" ? body.deviceModel.trim() : "";
  const issueDescription = typeof body.issueDescription === "string" ? body.issueDescription.trim() : "";
  if (action === "create" && (!services[service] || !deviceModel || deviceModel.length > 100 || !issueDescription || issueDescription.length > 2000)) throw new AccessError(400, "กรุณาระบุบริการ รุ่นเครื่อง และอาการให้ครบ");
  const payloadHash = hashToken(JSON.stringify({ id, branchId, startsAt: startsAt?.toISOString(), service, deviceModel, issueDescription }));
  return retryTransaction(async tx => {
    const previous = await tx.bookingRequest.findUnique({ where: { tenantId_accountId_action_key: { ...actor, action, key } } });
    if (previous) {
      if (previous.payloadHash !== payloadHash) throw new AccessError(409, "รหัสทำรายการนี้ถูกใช้กับข้อมูลอื่นแล้ว");
      return tx.appointment.findFirstOrThrow({ where: { id: previous.appointmentId, ...actor } });
    }
    let appointment;
    if (action === "create") {
      if (await tx.appointment.count({ where: { ...actor, status: "CONFIRMED" } }) >= 3) throw new AccessError(409, "มีนัดที่ยังไม่เข้ารับบริการครบ 3 รายการแล้ว");
      const slot = await claimSlot(tx, actor, branchId, startsAt!);
      appointment = await tx.appointment.create({ data: { ...actor, branchId, slotId: slot.id, service, deviceModel, issueDescription, bookingRef: `BK-${randomBytes(6).toString("hex").toUpperCase()}` } });
    } else {
      const current = await tx.appointment.findFirst({ where: { id, ...actor } });
      if (!current) throw new AccessError(404, "ไม่พบนัดหมาย");
      const oldSlot = await tx.bookingSlot.findFirstOrThrow({ where: { id: current.slotId, tenantId: actor.tenantId } });
      if (action === "cancel" && current.status === "CANCELLED") appointment = current;
      else {
        if (current.status !== "CONFIRMED" || current.repairJobId || oldSlot.startsAt.getTime() - Date.now() < 2 * HOUR) throw new AccessError(409, "เปลี่ยนนัดได้ก่อนเวลานัดอย่างน้อย 2 ชั่วโมง กรุณาติดต่อร้าน");
        if (action === "reschedule" && startsAt!.getTime() === oldSlot.startsAt.getTime()) appointment = current;
        else {
          const next = action === "reschedule" ? await claimSlot(tx, actor, current.branchId, startsAt!) : null;
          const changed = await tx.appointment.updateMany({ where: { id, ...actor, status: "CONFIRMED", slotId: current.slotId }, data: action === "cancel" ? { status: "CANCELLED" } : { slotId: next!.id } });
          if (!changed.count) throw new AccessError(409, "นัดถูกเปลี่ยนแล้ว กรุณาโหลดใหม่");
          const released = await tx.bookingSlot.updateMany({ where: { id: oldSlot.id, tenantId: actor.tenantId, reservedCount: { gt: 0 } }, data: { reservedCount: { decrement: 1 } } });
          if (!released.count) throw new Error("Booking capacity invariant failed");
          appointment = await tx.appointment.findFirstOrThrow({ where: { id, tenantId: actor.tenantId } });
        }
      }
    }
    await tx.bookingRequest.create({ data: { ...actor, key, action, payloadHash, appointmentId: appointment.id } });
    await tx.appointmentEvent.create({ data: { tenantId: actor.tenantId, appointmentId: appointment.id, action, actorId: actor.accountId, details: JSON.stringify({ startsAt: startsAt?.toISOString() }) } });
    await tx.customerNotification.create({ data: { ...actor, eventKey: `booking:${action}:${actor.accountId}:${key}`, message: action === "create" ? "ยืนยันการจองคิวแล้ว" : action === "cancel" ? "ยกเลิกนัดหมายแล้ว" : "เลื่อนนัดหมายแล้ว", href: "bookings" } });
    return appointment;
  });
}
