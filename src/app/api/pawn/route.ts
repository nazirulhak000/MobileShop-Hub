import { AccessError, staffContext } from "@/lib/staff-context";
import {
  readJson,
  safeError,
  withStaff,
  reqId,
  optId,
  reqInt,
  reqMoney,
  reqEnum,
  requireRole,
  bangkokYYYYMM,
  addMonthsClamped,
  takeParam,
} from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// NOTE: legacy pawn endpoint. New pawn/buyback intake should go through /api/trade-in,
// which also registers the device IMEI so a forfeit can move it into stock.

async function handleGET(request: NextRequest) {
  try {
    const contracts = await prisma.tradeInContract.findMany({
      where: { type: "PAWN" },
      include: {
        customer: true,
        branch: true,
      },
      orderBy: { createdAt: "desc" },
      take: takeParam(new URL(request.url).searchParams.get("take"), 200, 500),
    });
    return NextResponse.json({ success: true, data: contracts });
  } catch (error) {
    return safeError(error);
  }
}

function reqText(value: unknown, label: string, max = 200): string {
  if (typeof value !== "string" || !value.trim()) throw new AccessError(400, `กรุณากรอก${label}`);
  return value.trim().slice(0, max);
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await readJson(request);
    const actor = staffContext();

    const customerId = optId(body.customerId, "customerId");
    const branchId = optId(body.branchId, "branchId") ?? actor.branchId;
    const deviceBrand = reqText(body.deviceBrand, "ยี่ห้อเครื่อง", 100);
    const deviceModel = reqText(body.deviceModel, "รุ่นเครื่อง");
    const imei = reqText(body.imei, "หมายเลข IMEI", 30).replace(/\s+/g, "");
    const conditionGrade =
      body.conditionGrade === undefined || body.conditionGrade === "" ? "A" : reqEnum(body.conditionGrade, "conditionGrade", ["A", "B", "C"] as const);
    const agreedPrice = reqMoney(body.agreedPrice, "วงเงินจำนำ", 0.01);
    const interestRateMonthly =
      body.interestRateMonthly === undefined ? 2.5 : reqMoney(body.interestRateMonthly, "อัตราดอกเบี้ย", 0, 5);
    const durationMonths = reqInt(body.durationMonths ?? 1, "ระยะเวลาสัญญา", 1, 12);

    // A pawn contract legally needs the pledgor's ID; no fake placeholder.
    const nationalId = typeof body.nationalId === "string" ? body.nationalId.replace(/[\s-]/g, "") : "";
    if (!/^\d{13}$/.test(nationalId)) throw new AccessError(400, "กรุณากรอกเลขบัตรประจำตัวประชาชน 13 หลักให้ถูกต้อง");

    // Validate customer fields up front when no existing customer is referenced.
    const customerName = customerId ? null : reqText(body.customerName, "ชื่อลูกค้า");
    const customerPhone = customerId ? null : reqText(body.customerPhone, "เบอร์โทรศัพท์ลูกค้า", 30);

    const now = new Date();
    const yyyymm = bangkokYYYYMM(now);
    const dueDate = addMonthsClamped(now, durationMonths);

    const contract = await prisma.$transaction(async (tx) => {
      // Resolve customer (never overwrite existing customer data)
      let finalCustId = customerId;
      if (!finalCustId) {
        let existingCust = await tx.customer.findFirst({ where: { phone: customerPhone! } });
        if (!existingCust) {
          existingCust = await tx.customer.create({
            data: { name: customerName!, phone: customerPhone!, nationalId },
          });
        }
        finalCustId = existingCust.id;
      }

      // IMEI pre-check: a device already in stock, in repair or pawned cannot be taken in again.
      const existingImei = await tx.deviceIMEI.findFirst({ where: { imei } });
      if (existingImei && !["SOLD", "RETURNED"].includes(existingImei.status)) {
        throw new AccessError(409, `IMEI ${imei} อยู่ในระบบแล้ว (สถานะ ${existingImei.status})`);
      }

      const counter = await tx.sequenceCounter.upsert({
        where: { id: `PW-${yyyymm}` },
        update: { current: { increment: 1 } },
        create: { id: `PW-${yyyymm}`, current: 1 },
      });
      const contractNo = `PW-${yyyymm}-${String(counter.current).padStart(4, "0")}`;

      const created = await tx.tradeInContract.create({
        data: {
          contractNo,
          type: "PAWN",
          branchId,
          customerId: finalCustId,
          nationalId,
          deviceBrand,
          deviceModel,
          imei,
          conditionGrade,
          agreedPrice,
          interestRateMonthly,
          durationMonths,
          startDate: now,
          dueDate,
          status: "ACTIVE",
        },
        include: {
          customer: true,
          branch: true,
        },
      });

      // Link to product & register DeviceIMEI as collateral
      let product = await tx.product.findFirst({
        where: { category: "DEVICE", model: deviceModel },
      });
      if (!product) {
        const productCounter = await tx.sequenceCounter.upsert({
          where: { id: "DEV-USED" },
          update: { current: { increment: 1 } },
          create: { id: "DEV-USED", current: 1 },
        });
        product = await tx.product.create({
          data: {
            code: `DEV-USED-${String(productCounter.current).padStart(5, "0")}`,
            name: `${deviceBrand} ${deviceModel} (มือสอง เกรด ${conditionGrade})`,
            category: "DEVICE",
            brand: deviceBrand,
            model: deviceModel,
            costPrice: agreedPrice,
            sellPrice: Math.round(agreedPrice * 1.3),
            minStock: 1,
          },
        });
      }

      const imeiData = {
        productId: product.id,
        branchId,
        conditionGrade,
        status: "PAWNED",
        costPrice: agreedPrice,
        sellPrice: Math.round(agreedPrice * 1.3),
        tradeInContractId: created.id,
      };

      if (existingImei) {
        const reused = await tx.deviceIMEI.updateMany({
          where: { id: existingImei.id, status: { in: ["SOLD", "RETURNED"] } },
          data: imeiData,
        });
        if (reused.count !== 1) throw new AccessError(409, `IMEI ${imei} ถูกใช้งานโดยรายการอื่นแล้ว`);
      } else {
        await tx.deviceIMEI.create({ data: { ...imeiData, imei } });
      }

      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          module: "PAWN",
          action: "CREATE",
          targetId: created.id,
          details: JSON.stringify({ contractNo, imei, agreedPrice, durationMonths, interestRateMonthly }),
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, data: contract }, { status: 201 });
  } catch (error) {
    return safeError(error);
  }
}

const PATCH_ACTIONS = ["pay_interest", "redeem", "forfeit"] as const;

async function handlePATCH(request: NextRequest) {
  try {
    const body = await readJson(request);
    const id = reqId(body.id, "id");
    const action = reqEnum(body.action, "action", PATCH_ACTIONS);
    const actor = staffContext();
    if (action === "forfeit") requireRole(actor.role, ["ADMIN", "MANAGER"]);

    const updated = await prisma.$transaction(async (tx) => {
      const contract = await tx.tradeInContract.findFirst({
        where: { id },
        include: { deviceImeis: true },
      });
      if (!contract) throw new AccessError(404, "ไม่พบข้อมูลสัญญา");
      if (contract.type !== "PAWN" || contract.status !== "ACTIVE") {
        throw new AccessError(409, "ทำรายการได้เฉพาะสัญญาจำนำที่ยังมีผลอยู่เท่านั้น");
      }

      // Conditional update guards against concurrent/double actions.
      const guard = { id, type: "PAWN", status: "ACTIVE" };
      let details: Record<string, unknown> = { contractNo: contract.contractNo };

      if (action === "pay_interest") {
        const newDue = addMonthsClamped(contract.dueDate ?? new Date(), 1);
        const r = await tx.tradeInContract.updateMany({
          where: guard,
          data: { dueDate: newDue, durationMonths: { increment: 1 } },
        });
        if (r.count !== 1) throw new AccessError(409, "สัญญานี้ถูกดำเนินการไปแล้ว");
        details = {
          ...details,
          previousDueDate: contract.dueDate,
          newDueDate: newDue,
          interestAmount: Math.round(contract.agreedPrice * contract.interestRateMonthly) / 100,
        };
      } else if (action === "redeem") {
        const r = await tx.tradeInContract.updateMany({ where: guard, data: { status: "REDEEMED" } });
        if (r.count !== 1) throw new AccessError(409, "สัญญานี้ถูกดำเนินการไปแล้ว");
        const returned = await tx.deviceIMEI.updateMany({
          where: { tradeInContractId: id, status: "PAWNED" },
          data: { status: "RETURNED" },
        });
        details = { ...details, imeisReturned: returned.count };
      } else {
        // Forfeit: only move a device that was actually registered at intake (PAWNED IMEI).
        const pawned = contract.deviceImeis.filter((im) => im.status === "PAWNED");
        if (pawned.length === 0) {
          throw new AccessError(409, "สัญญานี้ไม่มีข้อมูลเครื่องในสต็อก กรุณารับเข้าสต็อกผ่านหน้าเทิร์น/รับซื้อ");
        }
        const r = await tx.tradeInContract.updateMany({ where: guard, data: { status: "FORFEITED" } });
        if (r.count !== 1) throw new AccessError(409, "สัญญานี้ถูกดำเนินการไปแล้ว");
        let moved = 0;
        for (const im of pawned) {
          const m = await tx.deviceIMEI.updateMany({
            where: { id: im.id, status: "PAWNED" },
            data: { status: "IN_STOCK" },
          });
          if (m.count !== 1) continue;
          moved++;
          await tx.stockItem.upsert({
            where: { productId_branchId: { productId: im.productId, branchId: im.branchId } },
            update: { quantity: { increment: 1 } },
            create: { productId: im.productId, branchId: im.branchId, quantity: 1 },
          });
        }
        if (moved === 0) {
          throw new AccessError(409, "สัญญานี้ไม่มีข้อมูลเครื่องในสต็อก กรุณารับเข้าสต็อกผ่านหน้าเทิร์น/รับซื้อ");
        }
        details = { ...details, imeisToStock: moved };
      }

      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          module: "PAWN",
          action: action.toUpperCase(),
          targetId: id,
          details: JSON.stringify(details),
          severity: action === "forfeit" ? "WARNING" : "INFO",
        },
      });

      return tx.tradeInContract.findFirst({
        where: { id },
        include: { customer: true, branch: true },
      });
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return safeError(error);
  }
}

export const GET = withStaff(handleGET, ["ADMIN","MANAGER","CASHIER"]);

export const POST = withStaff(handlePOST, ["ADMIN","MANAGER","CASHIER"]);

export const PATCH = withStaff(handlePATCH, ["ADMIN","MANAGER","CASHIER"]);
