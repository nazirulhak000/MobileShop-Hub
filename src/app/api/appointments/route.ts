import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/db";
import { reqId, withStaff, readJson } from "@/lib/staff-http";
import { staffContext, AccessError } from "@/lib/staff-context";
import { retryTransaction } from "@/lib/bookings";
export const GET = withStaff(async () => {
  const [appointments, policies, branches] = await Promise.all([
    prisma.appointment.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.bookingPolicy.findMany(), prisma.branch.findMany({ select: { id: true, name: true } }),
  ]);
  const tenantId = staffContext().tenantId;
  const [slots, accounts] = await Promise.all([
    db.bookingSlot.findMany({ where: { tenantId, id: { in: appointments.map(a => a.slotId) } } }),
    db.customerAccount.findMany({ where: { tenantId, id: { in: appointments.map(a => a.accountId) } }, select: { id: true, displayName: true, phone: true } }),
  ]);
  return NextResponse.json({ appointments: appointments.map(a => ({ ...a, slot: slots.find(s => s.id === a.slotId), account: accounts.find(c => c.id === a.accountId) })), policies, branches });
}, ["ADMIN", "MANAGER", "CASHIER"]);
export const POST = withStaff(async (request: NextRequest) => {
  const actor = staffContext();
  const body = (await readJson<Record<string, any>>(request)) || {};
  if (!body || typeof body !== "object") throw new AccessError(400, "รูปแบบข้อมูลไม่ถูกต้อง");
  if (body.action === "policy") {
    if (!["ADMIN", "MANAGER"].includes(actor.role)) throw new AccessError(403, "ไม่มีสิทธิ์ตั้งค่าคิว");
    const branch = await prisma.branch.findFirst({ where: { id: reqId(body.branchId, "branchId") } });
    if (!branch) throw new AccessError(404, "ไม่พบสาขา");
    if (!Number.isInteger(body.opensMinute) || !Number.isInteger(body.closesMinute) || body.opensMinute < 0 || body.closesMinute > 1440 || body.opensMinute >= body.closesMinute || body.opensMinute % 30 || body.closesMinute % 30 || !Number.isInteger(body.capacity) || body.capacity < 1 || body.capacity > 20 || !Array.isArray(body.closedWeekdays) || body.closedWeekdays.some((n: unknown) => !Number.isInteger(n) || Number(n) < 0 || Number(n) > 6) || !Array.isArray(body.closedDates) || body.closedDates.length > 365 || body.closedDates.some((d: unknown) => typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d))) throw new AccessError(400, "เวลาทำการ จำนวนคิว หรือวันหยุดไม่ถูกต้อง");
    await db.bookingPolicy.upsert({ where: { branchId: branch.id }, create: { tenantId: actor.tenantId, branchId: branch.id, opensMinute: body.opensMinute, closesMinute: body.closesMinute, capacity: body.capacity, closedDates: JSON.stringify(body.closedDates), closedWeekdays: JSON.stringify(body.closedWeekdays), active: body.active === true }, update: { opensMinute: body.opensMinute, closesMinute: body.closesMinute, capacity: body.capacity, closedDates: JSON.stringify(body.closedDates), closedWeekdays: JSON.stringify(body.closedWeekdays), active: body.active === true } });
    return NextResponse.json({ success: true, message: "บันทึกแล้ว นัดเดิมยังอยู่ครบ กรุณาตรวจรายการนัดหากเปลี่ยนวันเปิดบริการ" });
  }
  if (!["CHECKED_IN", "NO_SHOW", "COMPLETED", "CANCELLED"].includes(body.action)) throw new AccessError(400, "การทำรายการไม่ถูกต้อง");
  // Validate before querying: findFirst with an undefined id would match an arbitrary row.
  const appointmentId = reqId(body.id, "id");
  const appointment = await retryTransaction(async tx => {
    const current = await tx.appointment.findFirst({ where: { id: appointmentId, tenantId: actor.tenantId, branchId: { in: actor.branchIds } } });
    if (!current) throw new AccessError(404, "ไม่พบนัดหมาย");
    if (current.status === body.action) return current;
    if (body.action === "COMPLETED" ? current.status !== "CHECKED_IN" : current.status !== "CONFIRMED") throw new AccessError(409, "สถานะนัดเปลี่ยนแล้ว กรุณาโหลดใหม่");
    const slot = await tx.bookingSlot.findFirstOrThrow({ where: { id: current.slotId, tenantId: actor.tenantId } });
    if (body.action === "NO_SHOW" && slot.startsAt > new Date()) throw new AccessError(409, "ยังไม่ถึงเวลานัด");
    if (body.action === "CANCELLED" && (typeof body.reason !== "string" || body.reason.trim().length < 10 || body.reason.length > 500)) throw new AccessError(400, "กรุณาระบุเหตุผลยกเลิกอย่างน้อย 10 ตัวอักษร");
    let repairJobId = current.repairJobId;
    if (body.action === "CHECKED_IN" && !repairJobId) {
      const link = await tx.customerAccountLink.findFirst({ where: { accountId: current.accountId, tenantId: actor.tenantId } });
      const customer = link ? await tx.customer.findFirst({ where: { id: link.customerId, tenantId: actor.tenantId } }) : null;
      if (!customer) throw new AccessError(409, "กรุณาตรวจหลักฐานและเชื่อมประวัติลูกค้าก่อนรับเครื่อง");
      const job = await tx.repairJob.create({ data: { tenantId: actor.tenantId, branchId: current.branchId, customerId: customer.id, trackingCode: `REP-${current.bookingRef}`, deviceBrand: "รอตรวจรับ", deviceModel: current.deviceModel, issueDescription: current.issueDescription, customerApproved: false } });
      repairJobId = job.id;
      await tx.repairStatusEvent.create({ data: { tenantId: actor.tenantId, repairJobId: job.id, status: "PENDING", customerMessage: "ร้านรับเครื่องเข้าตรวจแล้ว", actorId: actor.id } });
    }
    if (body.action === "CANCELLED") {
      const released = await tx.bookingSlot.updateMany({ where: { id: slot.id, reservedCount: { gt: 0 }, tenantId: actor.tenantId }, data: { reservedCount: { decrement: 1 } } });
      if (!released.count) throw new Error("Capacity invariant failed");
    }
    const updated = await tx.appointment.update({ where: { id: current.id }, data: { status: body.action, repairJobId } });
    await tx.appointmentEvent.create({ data: { tenantId: actor.tenantId, appointmentId: current.id, actorId: actor.id, action: body.action, details: typeof body.reason === "string" ? body.reason.trim() : "" } });
    await tx.customerNotification.create({ data: { tenantId: actor.tenantId, accountId: current.accountId, eventKey: `appointment:${current.id}:${body.action}`, message: `ร้านอัปเดตนัดหมาย ${current.bookingRef}`, href: "bookings" } });
    return updated;
  });
  return NextResponse.json({ success: true, id: appointment.id, repairJobId: appointment.repairJobId });
}, ["ADMIN", "MANAGER", "CASHIER"]);
