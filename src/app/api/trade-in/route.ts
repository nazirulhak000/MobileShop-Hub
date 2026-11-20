import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AccessError, staffContext } from "@/lib/staff-context";
import {
  withStaff,
  readJson,
  safeError,
  reqMoney,
  reqInt,
  reqEnum,
  takeParam,
  bangkokYYYYMM,
  addMonthsClamped,
} from "@/lib/staff-http";
import { validateThaiNationalId } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CONTRACT_TYPES = ["BUYBACK", "PAWN"] as const;

// GET /api/trade-in - List contracts
async function handleGET(request: NextRequest) {
  try {
    const actor = staffContext();
    const { searchParams } = new URL(request.url);
    const branchCode = searchParams.get("branch")?.trim() || "";
    const type = searchParams.get("type")?.trim(); // BUYBACK | PAWN | ALL
    const status = searchParams.get("status")?.trim();
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const take = takeParam(searchParams.get("take"), 200, 500);

    const where: any = {
      tenantId: actor.tenantId,
      branchId: { in: actor.branchIds },
    };

    if (branchCode) {
      const branch = await prisma.branch.findFirst({
        where: {
          tenantId: actor.tenantId,
          id: { in: actor.branchIds },
          OR: [{ code: branchCode }, { id: branchCode }],
        },
        select: { id: true },
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
        branch: { select: { id: true, code: true, name: true } },
        deviceImeis: true,
      },
      orderBy: { createdAt: "desc" },
      take,
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

      return {
        ...c,
        inspectionData: c.inspectionData ? JSON.parse(c.inspectionData) : null,
        monthlyInterestAmount,
        isOverdue,
        daysOverdue,
      };
    });

    return NextResponse.json({ success: true, contracts: formatted });
  } catch (error: any) {
    return safeError(error);
  }
}

// POST /api/trade-in - Create new Buyback or Pawn contract
async function handlePOST(request: NextRequest) {
  try {
    const actor = staffContext();
    const body = await readJson(request);
    const {
      type: rawType, // "BUYBACK" | "PAWN"
      branchCode,
      customerName,
      customerPhone,
      nationalId,
      customerAddress,
      deviceBrand,
      deviceModel,
      imei,
      conditionGrade = "A",
      inspectionData,
      declarationAgreed = true,
      customerPhoto,
      agreedPrice,
      interestRateMonthly = 2.5,
      durationMonths = 1,
    } = body;

    const type = reqEnum(rawType, "ประเภทสัญญา", CONTRACT_TYPES);
    const brand = String(deviceBrand || "").trim();
    const model = String(deviceModel || "").trim();
    const cleanImei = String(imei || "").trim();
    if (!brand || !model || !cleanImei) {
      throw new AccessError(400, "กรุณากรอกยี่ห้อ รุ่น และหมายเลข IMEI");
    }

    const priceNum = reqMoney(agreedPrice, "ราคาที่ตกลง", 1);
    const rateNum = reqMoney(interestRateMonthly ?? 2.5, "อัตราดอกเบี้ย", 0, 10);
    const monthsNum = reqInt(durationMonths ?? 1, "ระยะเวลาสัญญา", 1, 12);

    const cleanCustName = String(customerName || "").trim();
    const cleanPhone = String(customerPhone || "0000000000").trim();
    if (!cleanCustName) {
      throw new AccessError(400, "กรุณากรอกชื่อลูกค้า");
    }

    const rawNationalId = String(nationalId || "").replace(/[^0-9]/g, "");
    const idCheck = validateThaiNationalId(rawNationalId);
    if (!idCheck.valid) {
      throw new AccessError(400, idCheck.message || "กรุณากรอกเลขบัตรประจำตัวประชาชน 13 หลักให้ถูกต้อง");
    }

    // Resolve branch within actor's tenant and accessible branches
    const branch = await prisma.branch.findFirst({
      where: {
        tenantId: actor.tenantId,
        id: { in: actor.branchIds },
        ...(branchCode ? { OR: [{ code: branchCode }, { id: branchCode }] } : {}),
      },
    });
    if (!branch) {
      throw new AccessError(404, "ไม่พบสาขาที่มีสิทธิ์เข้าถึง");
    }

    const now = new Date();
    const yyyymm = bangkokYYYYMM(now);

    const result = await prisma.$transaction(async (tx) => {
      // Find or create customer
      let customer = await tx.customer.findFirst({
        where: {
          tenantId: actor.tenantId,
          phone: cleanPhone,
        },
      });
      if (customer) {
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: {
            name: cleanCustName,
            nationalId: rawNationalId,
            address: customerAddress ? String(customerAddress).trim() : undefined,
          },
        });
      } else {
        customer = await tx.customer.create({
          data: {
            tenantId: actor.tenantId,
            name: cleanCustName,
            phone: cleanPhone,
            nationalId: rawNationalId,
            address: customerAddress ? String(customerAddress).trim() : null,
          },
        });
      }

      // Concurrency-safe atomic contract numbering
      const counter = await tx.sequenceCounter.upsert({
        where: { id: `TC-${yyyymm}` },
        update: { current: { increment: 1 } },
        create: { id: `TC-${yyyymm}`, current: 1, tenantId: actor.tenantId },
      });
      const contractNo = `TC-${yyyymm}-${String(counter.current).padStart(4, "0")}`;

      // Calculate due date for Pawn
      let dueDate: Date | null = null;
      if (type === "PAWN") {
        dueDate = addMonthsClamped(now, monthsNum);
      }

      // Create contract
      const contract = await tx.tradeInContract.create({
        data: {
          tenantId: actor.tenantId,
          contractNo,
          type,
          branchId: branch.id,
          customerId: customer.id,
          nationalId: rawNationalId,
          deviceBrand: brand,
          deviceModel: model,
          imei: cleanImei,
          conditionGrade: String(conditionGrade || "A"),
          inspectionData: inspectionData ? JSON.stringify(inspectionData) : null,
          declarationAgreed: Boolean(declarationAgreed),
          customerPhoto: customerPhoto ? String(customerPhoto) : null,
          agreedPrice: priceNum,
          interestRateMonthly: rateNum,
          durationMonths: monthsNum,
          dueDate,
          status: type === "PAWN" ? "ACTIVE" : "COMPLETED",
        },
        include: {
          customer: true,
          branch: { select: { id: true, code: true, name: true } },
        },
      });

      // Auto-create or link Product in inventory
      let product = await tx.product.findFirst({
        where: {
          tenantId: actor.tenantId,
          category: "DEVICE",
          model: { contains: model },
        },
      });

      if (!product) {
        const codeSuffix = Math.floor(1000 + Math.random() * 9000);
        product = await tx.product.create({
          data: {
            tenantId: actor.tenantId,
            code: `DEV-USED-${codeSuffix}`,
            name: `${brand} ${model} (มือสอง เกรด ${conditionGrade})`,
            category: "DEVICE",
            brand,
            model,
            costPrice: priceNum,
            sellPrice: Math.round(priceNum * 1.3), // Recommended markup
            minStock: 1,
          },
        });
      }

      // Register or update IMEI
      const imeiStatus = type === "PAWN" ? "PAWNED" : "IN_STOCK";
      const existingImei = await tx.deviceIMEI.findFirst({
        where: { tenantId: actor.tenantId, imei: cleanImei },
      });
      if (existingImei) {
        await tx.deviceIMEI.update({
          where: { id: existingImei.id },
          data: {
            productId: product.id,
            branchId: branch.id,
            conditionGrade: String(conditionGrade || "A"),
            status: imeiStatus,
            costPrice: priceNum,
            sellPrice: Math.round(priceNum * 1.3),
            tradeInContractId: contract.id,
          },
        });
      } else {
        await tx.deviceIMEI.create({
          data: {
            tenantId: actor.tenantId,
            productId: product.id,
            branchId: branch.id,
            imei: cleanImei,
            conditionGrade: String(conditionGrade || "A"),
            status: imeiStatus,
            costPrice: priceNum,
            sellPrice: Math.round(priceNum * 1.3),
            tradeInContractId: contract.id,
          },
        });
      }

      // If BUYBACK, increment inventory stock count
      if (type === "BUYBACK") {
        await tx.stockItem.upsert({
          where: {
            productId_branchId: {
              productId: product.id,
              branchId: branch.id,
            },
          },
          update: {
            quantity: { increment: 1 },
          },
          create: {
            tenantId: actor.tenantId,
            productId: product.id,
            branchId: branch.id,
            quantity: 1,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          module: type === "PAWN" ? "PAWN" : "TRADE_IN",
          action: "CREATE",
          targetId: contract.id,
          details: JSON.stringify({
            contractNo,
            type,
            brand,
            model,
            imei: cleanImei,
            priceNum,
            customerName: cleanCustName,
          }),
        },
      });

      return contract;
    });

    return NextResponse.json({
      success: true,
      message: `สร้างสัญญาเลขที่ ${result.contractNo} เรียบร้อยแล้ว`,
      contract: result,
    }, { status: 201 });
  } catch (error: any) {
    return safeError(error);
  }
}

export const GET = withStaff(handleGET, ["ADMIN", "MANAGER", "CASHIER"]);
export const POST = withStaff(handlePOST, ["ADMIN", "MANAGER", "CASHIER"]);
