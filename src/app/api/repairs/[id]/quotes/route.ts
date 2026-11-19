import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withStaff } from "@/lib/staff-http";
import { staffContext, AccessError } from "@/lib/staff-context";
import { retryTransaction } from "@/lib/bookings";
const roles = ["ADMIN", "MANAGER", "CASHIER"];
export const GET = withStaff(async (_request: NextRequest, { params }: { params: { id: string } }) => {
  const job = await prisma.repairJob.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!job) throw new AccessError(404, "ไม่พบงานซ่อม");
  return NextResponse.json(await prisma.repairQuote.findMany({ where: { repairJobId: job.id }, orderBy: { version: "desc" } }));
}, roles);
export const POST = withStaff(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const actor = staffContext(); const body = await request.json();
  const job = await prisma.repairJob.findUnique({ where: { id: params.id }, select: { id: true, customerId: true, status: true } });
  if (!job) throw new AccessError(404, "ไม่พบงานซ่อม");
  if (!["PENDING", "DIAGNOSING", "WAITING_PARTS"].includes(job.status)) throw new AccessError(409, "งานนี้ไม่อยู่ในขั้นตอนเสนอราคา");
  if (!Number.isSafeInteger(body.amountSatang) || body.amountSatang < 0 || body.amountSatang > 100_000_000 || typeof body.description !== "string" || !body.description.trim() || body.description.length > 2000) throw new AccessError(400, "กรุณาระบุรายการและยอดราคาที่ถูกต้อง");
  const quote = await retryTransaction(async tx => {
    const latest = await tx.repairQuote.findFirst({ where: { tenantId: actor.tenantId, repairJobId: job.id }, orderBy: { version: "desc" } });
    await tx.repairQuote.updateMany({ where: { tenantId: actor.tenantId, repairJobId: job.id, status: "PENDING" }, data: { status: "SUPERSEDED" } });
    const created = await tx.repairQuote.create({ data: { tenantId: actor.tenantId, repairJobId: job.id, version: (latest?.version ?? 0) + 1, description: body.description.trim(), amountSatang: body.amountSatang, expiresAt: new Date(Date.now() + 3 * 86_400_000) } });
    await tx.repairJob.update({ where: { id: job.id }, data: { customerApproved: false } });
    const link = await tx.customerAccountLink.findFirst({ where: { tenantId: actor.tenantId, customerId: job.customerId } });
    if (link) await tx.customerNotification.create({ data: { tenantId: actor.tenantId, accountId: link.accountId, eventKey: `quote:${created.id}`, message: "มีใบเสนอราคางานซ่อมรอการยืนยัน", href: "repairs" } });
    return created;
  });
  return NextResponse.json({ id: quote.id, version: quote.version }, { status: 201 });
}, roles);
