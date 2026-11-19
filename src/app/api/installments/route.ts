import { AccessError, staffContext } from "@/lib/staff-context";
import {
  safeError,
  withStaff,
  reqId,
  reqInt,
  reqMoney,
  bangkokYYYYMM,
  bangkokDateString,
  addMonthsClamped,
  takeParam,
} from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Payment statuses that still need to be collected.
const UNPAID = ["PENDING", "OVERDUE"];

type ContractWithPayments = {
  startDate: Date;
  nextDueDate: Date | null;
  payments: { monthNumber: number; dueDate: Date; amount: number; paidDate: Date | null; status: string; paymentRef: string | null }[];
  [key: string]: unknown;
};

// Shape a contract for the client UI (Bangkok-local date strings, sorted payments).
function formatContract(c: ContractWithPayments) {
  return {
    ...c,
    startDate: bangkokDateString(c.startDate),
    nextDueDate: c.nextDueDate ? bangkokDateString(c.nextDueDate) : null,
    payments: [...c.payments]
      .sort((a, b) => a.monthNumber - b.monthNumber)
      .map((p) => ({
        month: p.monthNumber,
        dueDate: bangkokDateString(p.dueDate),
        amount: p.amount,
        paidDate: p.paidDate ? bangkokDateString(p.paidDate) : null,
        status: p.status,
        ref: p.paymentRef,
      })),
  };
}

async function handleGET(request: NextRequest) {
  try {
    const contracts = await prisma.installmentContract.findMany({
      include: {
        payments: {
          orderBy: { monthNumber: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: takeParam(new URL(request.url).searchParams.get("take"), 200, 500),
    });

    return NextResponse.json({ success: true, data: contracts.map(formatContract) });
  } catch (err: any) {
    if (err instanceof AccessError) return safeError(err);
    console.error("GET /api/installments error:");
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

function reqText(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new AccessError(400, `กรุณากรอก${field}`);
  return value.trim();
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();

    const customerName = reqText(body.customerName, "ชื่อลูกค้า");
    const customerPhone = reqText(body.customerPhone, "เบอร์โทรศัพท์");
    const deviceModel = reqText(body.deviceModel, "รุ่นอุปกรณ์");
    const nationalId = typeof body.nationalId === "string" && body.nationalId.trim() ? body.nationalId.trim() : "-";
    const imei = typeof body.imei === "string" && body.imei.trim() ? body.imei.trim() : "-";

    const termMonths = reqInt(body.termMonths, "จำนวนงวด", 1, 36);
    const totalPrice = reqMoney(body.totalPrice, "ราคาสินค้า", 0.01);
    const downPayment = reqMoney(body.downPayment ?? 0, "เงินดาวน์", 0, totalPrice);
    if (downPayment >= totalPrice) throw new AccessError(400, "เงินดาวน์ต้องน้อยกว่าราคาสินค้า");
    // Only fall back to the schema default when the field is omitted; NaN/invalid is rejected.
    const monthlyInterestRate =
      body.monthlyInterestRate === undefined ? 1.5 : reqMoney(body.monthlyInterestRate, "อัตราดอกเบี้ย", 0, 5);

    // All schedule math in integer satang so the periods sum exactly to the total payable.
    const financedSatang = Math.round(totalPrice * 100) - Math.round(downPayment * 100);
    const interestSatang = Math.round((financedSatang * monthlyInterestRate * termMonths) / 100);
    const totalPayableSatang = financedSatang + interestSatang;
    const perPeriodSatang = Math.floor(totalPayableSatang / termMonths);
    const lastPeriodSatang = totalPayableSatang - perPeriodSatang * (termMonths - 1);

    const financedAmount = financedSatang / 100;
    const monthlyPayment = perPeriodSatang / 100;

    const now = new Date();
    const yyyymm = bangkokYYYYMM(now);
    const actor = staffContext();

    // Transactional creation with atomic counter
    const contract = await prisma.$transaction(async (tx) => {
      const counter = await tx.sequenceCounter.upsert({
        where: { id: `INS-${yyyymm}` },
        update: { current: { increment: 1 } },
        create: { id: `INS-${yyyymm}`, current: 1 },
      });
      const contractNo = `INS-${yyyymm}-${String(counter.current).padStart(3, "0")}`;

      const paymentsData = [];
      for (let m = 1; m <= termMonths; m++) {
        paymentsData.push({
          monthNumber: m,
          dueDate: addMonthsClamped(now, m),
          amount: (m === termMonths ? lastPeriodSatang : perPeriodSatang) / 100,
          status: "PENDING",
        });
      }

      const created = await tx.installmentContract.create({
        data: {
          contractNo,
          customerName,
          customerPhone,
          nationalId,
          deviceModel,
          imei,
          totalPrice,
          downPayment,
          financedAmount,
          termMonths,
          monthlyInterestRate,
          monthlyPayment,
          startDate: now,
          status: "ACTIVE",
          paidMonths: 0,
          nextDueDate: paymentsData[0].dueDate,
          isOverdue: false,
          overdueDays: 0,
          payments: {
            create: paymentsData,
          },
        },
        include: {
          payments: true,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          module: "INSTALLMENTS",
          action: "CREATE",
          targetId: created.id,
          details: JSON.stringify({ contractNo, totalPrice, downPayment, termMonths, monthlyInterestRate, totalPayable: totalPayableSatang / 100 }),
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, data: formatContract(contract) });
  } catch (err: any) {
    if (err instanceof AccessError) return safeError(err);
    console.error("POST /api/installments error:");
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

async function handlePATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const contractId = reqId(body.contractId, "contractId");
    // `monthIndex` accepted for backward compatibility: the old UI sent the 0-based row index.
    const rawMonth =
      body.month !== undefined ? body.month : typeof body.monthIndex === "number" ? body.monthIndex + 1 : body.monthIndex;
    const paymentRef = typeof body.paymentRef === "string" && body.paymentRef.trim() ? body.paymentRef.trim().slice(0, 100) : null;
    const actor = staffContext();

    const updated = await prisma.$transaction(async (tx) => {
      const contract = await tx.installmentContract.findFirst({
        where: { id: contractId },
        include: { payments: { orderBy: { monthNumber: "asc" } } },
      });
      if (!contract) throw new AccessError(404, "ไม่พบสัญญาผ่อนชำระ");
      if (!["ACTIVE", "OVERDUE"].includes(contract.status)) {
        throw new AccessError(409, "สัญญานี้ปิดแล้วหรือถูกยกเลิก ไม่สามารถรับชำระได้");
      }

      const month = reqInt(rawMonth, "งวดที่", 1, contract.termMonths);
      const period = contract.payments.find((p) => p.monthNumber === month);
      if (!period) throw new AccessError(409, "งวดนี้ชำระแล้วหรือไม่พบ");
      const amount = reqMoney(body.amount, "จำนวนเงิน", 0.01);
      if (Math.round(amount * 100) < Math.round(period.amount * 100)) {
        throw new AccessError(400, `จำนวนเงินต้องไม่น้อยกว่ายอดงวด (${period.amount.toFixed(2)} บาท)`);
      }

      const now = new Date();
      // Conditional update: only an unpaid period can be marked paid (prevents double collection).
      const marked = await tx.installmentPayment.updateMany({
        where: { contractId, monthNumber: month, status: { in: UNPAID } },
        data: { status: "PAID", paidDate: now, paymentRef },
      });
      if (marked.count !== 1) throw new AccessError(409, "งวดนี้ชำระแล้วหรือไม่พบ");

      const paidCount = await tx.installmentPayment.count({ where: { contractId, status: "PAID" } });
      // Earliest unpaid period of the contract (any month), not just after the one paid now.
      const nextPending = await tx.installmentPayment.findFirst({
        where: { contractId, status: { in: UNPAID } },
        orderBy: { monthNumber: "asc" },
      });
      const stillOverdue = nextPending ? nextPending.dueDate.getTime() < now.getTime() : false;

      const result = await tx.installmentContract.update({
        where: { id: contractId },
        data: {
          paidMonths: paidCount,
          status: nextPending ? (stillOverdue ? "OVERDUE" : "ACTIVE") : "COMPLETED",
          isOverdue: stillOverdue,
          overdueDays: stillOverdue ? contract.overdueDays : 0,
          nextDueDate: nextPending ? nextPending.dueDate : null,
        },
        include: { payments: { orderBy: { monthNumber: "asc" } } },
      });

      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          module: "INSTALLMENTS",
          action: "PAYMENT",
          targetId: contractId,
          details: JSON.stringify({
            contractNo: contract.contractNo,
            month,
            periodAmount: period.amount,
            amountReceived: amount,
            overpaid: Math.round(amount * 100 - period.amount * 100) / 100,
            paymentRef,
            completed: !nextPending,
          }),
        },
      });

      return result;
    });

    return NextResponse.json({ success: true, data: formatContract(updated) });
  } catch (err: any) {
    if (err instanceof AccessError) return safeError(err);
    console.error("PATCH /api/installments error:");
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export const GET = withStaff(handleGET, ["ADMIN","MANAGER","CASHIER"]);

export const POST = withStaff(handlePOST, ["ADMIN","MANAGER","CASHIER"]);

export const PATCH = withStaff(handlePATCH, ["ADMIN","MANAGER","CASHIER"]);
