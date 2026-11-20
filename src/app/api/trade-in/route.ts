import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateThaiNationalId } from "@/lib/utils";

// GET /api/trade-in - List contracts
export async function GET(request: NextRequest) {
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
    console.error("GET /api/trade-in error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/trade-in - Create new Buyback or Pawn contract
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type, // "BUYBACK" | "PAWN"
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

    if (!type || !deviceBrand || !deviceModel || !imei || !agreedPrice) {
      return NextResponse.json(
        { success: false, error: "กรุณากรอกข้อมูลสำคัญให้ครบถ้วน" },
        { status: 400 }
      );
    }

    const idCheck = validateThaiNationalId(nationalId);
    if (!idCheck.valid) {
      return NextResponse.json(
        { success: false, error: idCheck.message || "กรุณากรอกเลขบัตรประจำตัวประชาชน 13 หลักให้ถูกต้อง" },
        { status: 400 }
      );
    }

    // Resolve branch
    const branch = await prisma.branch.findFirst({
      where: { OR: [{ code: branchCode || "HQ" }, { id: branchCode || "HQ" }] },
    });
    if (!branch) {
      return NextResponse.json({ success: false, error: "ไม่พบสาขา" }, { status: 404 });
    }

    // Find or create customer
    const cleanPhone = String(customerPhone || "0000000000").trim();
    let customer = await prisma.customer.findFirst({
      where: { phone: cleanPhone },
    });
    if (customer) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: customerName,
          nationalId,
          address: customerAddress || undefined,
        },
      });
    } else {
      customer = await prisma.customer.create({
        data: {
          name: customerName,
          phone: cleanPhone,
          nationalId,
          address: customerAddress || null,
        },
      });
    }

    // Generate contract number: TC-YYYYMM-XXXX
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const contractCount = await prisma.tradeInContract.count({
      where: { contractNo: { startsWith: `TC-${yyyymm}` } },
    });
    const contractNo = `TC-${yyyymm}-${String(contractCount + 1).padStart(4, "0")}`;

    // Calculate due date for Pawn
    let dueDate: Date | null = null;
    if (type === "PAWN") {
      dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + Number(durationMonths || 1));
    }

    const priceNum = Number(agreedPrice);

    // Create contract
    const contract = await prisma.tradeInContract.create({
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
        inspectionData: inspectionData ? JSON.stringify(inspectionData) : null,
        declarationAgreed: Boolean(declarationAgreed),
        customerPhoto: customerPhoto || null,
        agreedPrice: priceNum,
        interestRateMonthly: Number(interestRateMonthly) || 2.5,
        durationMonths: Number(durationMonths) || 1,
        dueDate,
        status: type === "PAWN" ? "ACTIVE" : "COMPLETED",
      },
      include: {
        customer: true,
        branch: true,
      },
    });

    // Auto-create or link Product in inventory
    let product = await prisma.product.findFirst({
      where: {
        category: "DEVICE",
        model: { contains: deviceModel },
      },
    });

    if (!product) {
      const codeSuffix = Math.floor(1000 + Math.random() * 9000);
      product = await prisma.product.create({
        data: {
          code: `DEV-USED-${codeSuffix}`,
          name: `${deviceBrand} ${deviceModel} (มือสอง เกรด ${conditionGrade})`,
          category: "DEVICE",
          brand: deviceBrand,
          model: deviceModel,
          costPrice: priceNum,
          sellPrice: Math.round(priceNum * 1.3), // Recommended markup
          minStock: 1,
        },
      });
    }

    // Register IMEI
    const imeiStatus = type === "PAWN" ? "PAWNED" : "IN_STOCK";
    const existingImei = await prisma.deviceIMEI.findFirst({
      where: { imei },
    });
    if (existingImei) {
      await prisma.deviceIMEI.update({
        where: { id: existingImei.id },
        data: {
          productId: product.id,
          branchId: branch.id,
          conditionGrade,
          status: imeiStatus,
          costPrice: priceNum,
          sellPrice: Math.round(priceNum * 1.3),
          tradeInContractId: contract.id,
        },
      });
    } else {
      await prisma.deviceIMEI.create({
        data: {
          productId: product.id,
          branchId: branch.id,
          imei,
          conditionGrade,
          status: imeiStatus,
          costPrice: priceNum,
          sellPrice: Math.round(priceNum * 1.3),
          tradeInContractId: contract.id,
        },
      });
    }

    // If BUYBACK, increment inventory stock count
    if (type === "BUYBACK") {
      await prisma.stockItem.upsert({
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
          productId: product.id,
          branchId: branch.id,
          quantity: 1,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `สร้างสัญญาเลขที่ ${contractNo} เรียบร้อยแล้ว`,
      contract,
    });
  } catch (error: any) {
    console.error("POST /api/trade-in error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
