import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCustomer } from "@/lib/customer-auth";
import { checkOrigin } from "@/lib/staff-auth";
import { safeError } from "@/lib/staff-http";
import { AccessError } from "@/lib/staff-context";
import { retryTransaction } from "@/lib/bookings";
export async function POST(request: NextRequest) {
  try {
    checkOrigin(request); const body = await request.json(); const actor = await requireCustomer(body.shopSlug);
    if (!["APPROVED", "REJECTED"].includes(body.action) || !Number.isInteger(body.version) || typeof body.quoteId !== "string") throw new AccessError(400, "ข้อมูลการยืนยันไม่ถูกต้อง");
    await retryTransaction(async tx => {
      const quote = await tx.repairQuote.findFirst({ where: { id: body.quoteId, tenantId: actor.shop.id, version: body.version } });
      const job = quote && actor.customerId ? await tx.repairJob.findFirst({ where: { id: quote.repairJobId, tenantId: actor.shop.id, customerId: actor.customerId } }) : null;
      if (!quote || !job) throw new AccessError(404, "ไม่พบใบเสนอราคา");
      if (quote.status === body.action && quote.decidedBy === actor.account.id) return;
      if (!["PENDING", "DIAGNOSING", "WAITING_PARTS"].includes(job.status)) throw new AccessError(409, "งานนี้ไม่อยู่ในขั้นตอนอนุมัติราคา กรุณาติดต่อร้าน");
      const changed = await tx.repairQuote.updateMany({ where: { id: quote.id, version: body.version, status: "PENDING", expiresAt: { gt: new Date() }, tenantId: actor.shop.id }, data: { status: body.action, decidedAt: new Date(), decidedBy: actor.account.id } });
      if (!changed.count) throw new AccessError(409, "ใบเสนอราคาถูกเปลี่ยนหรือหมดอายุ กรุณาตรวจสอบฉบับล่าสุด");
      await tx.repairJob.update({ where: { id: job.id }, data: { customerApproved: body.action === "APPROVED" } });
      await tx.auditLog.create({ data: { tenantId: actor.shop.id, module: "REPAIRS", action: "QUOTE_DECISION", targetId: quote.id, details: JSON.stringify({ accountId: actor.account.id, version: quote.version, decision: body.action }) } });
    });
    return NextResponse.json({ success: true });
  } catch (error) { return safeError(error); }
}
