import { AccessError, staffContext, staffTenantId } from "@/lib/staff-context";
import { readJson, safeError, withStaff, reqEnum, reqInt, reqMoney, bangkokYYYYMM, addMonthsClamped, takeParam } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/trade-in - List contracts
async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchCode = searchParams.get("branch");
    const type = searchParams.get("type"); // BUYBACK | PAWN | ALL
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = {};
    if (branchCode) {
      const branch = await prisma.branch.findFirst({
        where: { OR: [{ code: branchCode }, { id: branchCode }] },
      });
      if (branch) where.branchId = branch.id;
    }
    if (type && type !== "ALL") {
      where.type = type;
    }
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { contractNo: { contains: search } },
        { imei: { contains: search } },
        { deviceModel: { contains: search } },
        { customer: { name: { contains: search } } },
        { nationalId: { contains: search } },
      ];
    }

    const contracts = await prisma.tradeInContract.findMany({
      where,
      include: {
        customer: true,
        branch: true,
        deviceImeis: true,
      },
      orderBy: { createdAt: "desc" },
      take: takeParam(searchParams.get("take"), 200, 500),
    });

    const now = new Date();
    // Add computed overdue info for Pawn contracts
    const formatted = contracts.map((c) => {
      let isOverdue = false;
      let daysOverdue = 0;
      let monthlyInterestAmount = 0;

      if (c.type === "PAWN") {
        monthlyInterestAmount = +(c.agreedPrice * (c.interestRateMonthly / 100)).toFixed(2);
        if (c.dueDate && c.status === "ACTIVE") {
          const dueTime = new Date(c.dueDate).getTime();
          const diffMs = now.getTime() - dueTime;
          if (diffMs > 0) {
            isOverdue = true;
            daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          }
        }
      }

      let parsedInspection = null;
      if (c.inspectionData) {
        try { parsedInspection = JSON.parse(c.inspectionData); } catch { parsedInspection = null; }
      }

      return {
        ...c,
        inspectionData: parsedInspection,
        monthlyInterestAmount,
        isOverdue,
        daysOverdue,
      };
    });

    return NextResponse.json({ success: true, contracts: formatted });
  } catch (error) {
    return safeError(error);
  }
}

const CONTRACT_TYPES = ["BUYBACK", "PAWN"] as const;
const GRADES = ["A", "B", "C"] as const;

function reqText(value: unknown, label: string, max = 200): string {
  if (typeof value !== "string" || !value.trim()) throw new AccessError(400, `กรุณากรอก${label}`);
  return value.trim().slice(0, max);
}

// Collapse whitespace so "iPhone 14  Pro" and "iPhone 14 Pro" map to the same product.
function normaliseModel(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

// POST /api/trade-in - Create new Buyback or Pawn contract
async function handlePOST(request: NextRequest) {
  try {
    const body = await readJson(request);
    const actor = staffContext();

    const type = reqEnum(body.type, "type", CONTRACT_TYPES);
    const customerName = reqText(body.customerName, "ชื่อลูกค้า");
    const customerPhone = reqText(body.customerPhone, "เบอร์โทรศัพท์ลูกค้า", 30);
    const deviceBrand = reqText(body.deviceBrand, "ยี่ห้อเครื่อง", 100);
    const deviceModel = normaliseModel(reqText(body.deviceModel, "รุ่นเครื่อง"));
    const imei = reqText(body.imei, "หมายเลข IMEI", 30).replace(/\s+/g, "");
    const conditionGrade = body.conditionGrade === undefined ? "A" : reqEnum(body.conditionGrade, "conditionGrade", GRADES);
    const customerAddress = typeof body.customerAddress === "string" && body.customerAddress.trim() ? body.customerAddress.trim() : null;
    const customerPhoto = typeof body.customerPhoto === "string" && body.customerPhoto.trim() ? body.customerPhoto.trim() : null;
    const declarationAgreed = body.declarationAgreed === undefined ? true : body.declarationAgreed === true;
    if (!declarationAgreed) throw new AccessError(400, "ลูกค้าต้องยอมรับหนังสือยืนยันกรรมสิทธิ์");

    const nationalId = typeof body.nationalId === "string" ? body.nationalId.replace(/[\s-]/g, "") : "";
    if (!/^\d{13}$/.test(nationalId)) {
      return NextResponse.json(
        { success: false, error: "กรุณากรอกเลขบัตรประจำตัวประชาชน 13 หลักให้ถูกต้อง" },
        { status: 400 }
      );
    }

    const priceNum = reqMoney(body.agreedPrice, "ราคาที่ตกลง", 0.01);
    // Interest/duration only apply to pawns; a buyback is a one-off purchase.
    const interestRateMonthly =
      type === "PAWN"
        ? body.interestRateMonthly === undefined
          ? 2.5
          : reqMoney(body.interestRateMonthly, "อัตราดอกเบี้ย", 0, 5)
        : 0;
    const durationMonths = type === "PAWN" ? reqInt(body.durationMonths ?? 1, "ระยะเวลาสัญญา", 1, 12) : 1;
    const inspectionData =
      body.inspectionData && typeof body.inspectionData === "object" ? JSON.stringify(body.inspectionData) : null;

    // Resolve branch (scoped to branches this staff member can access)
    const branchCode = typeof body.branchCode === "string" ? body.branchCode.trim() : "";
    if (!branchCode) throw new AccessError(400, "กรุณาระบุสาขา");
    const branch = await prisma.branch.findFirst({
      where: { OR: [{ code: branchCode }, { id: branchCode }] },
    });
    if (!branch) {
      return NextResponse.json({ success: false, error: "ไม่พบสาขา" }, { status: 404 });
    }

    const now = new Date();
    const yyyymm = bangkokYYYYMM(now);
    const dueDate = type === "PAWN" ? addMonthsClamped(now, durationMonths) : null;
    const sellPrice = Math.round(priceNum * 1.3); // Recommended markup
    const imeiStatus = type === "PAWN" ? "PAWNED" : "IN_STOCK";

    // Contract, customer, product, IMEI and stock are created atomically.
    const contract = await prisma.$transaction(async (tx) => {
      // Find or create customer; never overwrite an existing customer's identity data.
      const customer = await tx.customer.upsert({
        where: { tenantId_phone: { tenantId: staffTenantId(), phone: customerPhone } },
        update: {},
        create: {
          name: customerName,
          phone: customerPhone,
          nationalId,
          address: customerAddress,
        },
      });

      // IMEI pre-check: a device already in stock, in repair or pawned cannot be taken in again.
      const existingImei = await tx.deviceIMEI.findFirst({ where: { imei } });
      if (existingImei && !["SOLD", "RETURNED"].includes(existingImei.status)) {
        throw new AccessError(409, `IMEI ${imei} อยู่ในระบบแล้ว (สถานะ ${existingImei.status})`);
      }

      const counter = await tx.sequenceCounter.upsert({
        where: { id: `TC-${yyyymm}` },
        update: { current: { increment: 1 } },
        create: { id: `TC-${yyyymm}`, current: 1 },
      });
      const contractNo = `TC-${yyyymm}-${String(counter.current).padStart(4, "0")}`;

      const created = await tx.tradeInContract.create({
        data: {
          contractNo,
          type,
          branchId: branch.id,
          customerId: customer.id,
          nationalId,
          deviceBrand,
          deviceModel,
          imei,
          conditionGrade,
          inspectionData,
          declarationAgreed,
          customerPhoto,
          agreedPrice: priceNum,
          interestRateMonthly,
          durationMonths,
          dueDate,
          status: type === "PAWN" ? "ACTIVE" : "COMPLETED",
        },
        include: {
          customer: true,
          branch: true,
        },
      });

      // Link to an existing device product by exact (normalised) model, else create one.
      let product = await tx.product.findFirst({
        where: { category: "DEVICE", model: deviceModel },
      });
      if (!product) {
        // Sequence-based code: collision-safe, unlike a random 4-digit suffix.
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
            costPrice: priceNum,
            sellPrice,
            minStock: 1,
          },
        });
      }

      const imeiData = {
        productId: product.id,
        branchId: branch.id,
        conditionGrade,
        status: imeiStatus,
        costPrice: priceNum,
        sellPrice,
        tradeInContractId: created.id,
      };
      if (existingImei) {
        // Device came back (sold or redeemed earlier): reuse the IMEI record instead of failing on unique.
        const reused = await tx.deviceIMEI.updateMany({
          where: { id: existingImei.id, status: { in: ["SOLD", "RETURNED"] } },
          data: imeiData,
        });
        if (reused.count !== 1) throw new AccessError(409, `IMEI ${imei} ถูกใช้งานโดยรายการอื่นแล้ว`);
      } else {
        await tx.deviceIMEI.create({ data: { ...imeiData, imei } });
      }

      // BUYBACK goes straight into sellable stock; a pawned device is only collateral.
      if (type === "BUYBACK") {
        await tx.stockItem.upsert({
          where: { productId_branchId: { productId: product.id, branchId: branch.id } },
          update: { quantity: { increment: 1 } },
          create: { productId: product.id, branchId: branch.id, quantity: 1 },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          module: type === "PAWN" ? "PAWN" : "TRADE_IN",
          action: "CREATE",
          targetId: created.id,
          details: JSON.stringify({ contractNo, type, imei, agreedPrice: priceNum, reusedImei: Boolean(existingImei) }),
        },
      });

      return created;
    });

    return NextResponse.json({
      success: true,
      message: `สร้างสัญญาเลขที่ ${contract.contractNo} เรียบร้อยแล้ว`,
      contract,
    });
  } catch (error) {
    return safeError(error);
  }
}

export const GET = withStaff(handleGET, ["ADMIN","MANAGER","CASHIER"]);

export const POST = withStaff(handlePOST, ["ADMIN","MANAGER","CASHIER"]);
