import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AccessError, staffContext } from "@/lib/staff-context";
import {
  withStaff,
  readJson,
  safeError,
  reqId,
  reqMoney,
  reqInt,
  reqEnum,
  requireRole,
  takeParam,
  bangkokYYYYMM,
  addMonthsClamped,
} from "@/lib/staff-http";
import { validateThaiNationalId } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAWN_ACTIONS = ["pay_interest", "redeem", "forfeit"] as const;

async function handleGET(request: NextRequest) {
  try {
    const actor = staffContext();
    const { searchParams } = new URL(request.url);
    const branchCode = searchParams.get("branch")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "ALL";
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const take = takeParam(searchParams.get("take"), 200, 500);

    const where: any = {
      tenantId: actor.tenantId,
      type: "PAWN",
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

    if (status !== "ALL") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { contractNo: { contains: search } },
        { imei: { contains: search } },
        { deviceModel: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { phone: { contains: search } } },
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
    const formatted = contracts.map((c) => {
      let isOverdue = false;
      let daysOverdue = 0;
      const monthlyInterestAmount = Math.round(c.agreedPrice * (c.interestRateMonthly / 100) * 100) / 100;

      if (c.dueDate && c.status === "ACTIVE") {
        const diffMs = now.getTime() - new Date(c.dueDate).getTime();
        if (diffMs > 0) {
          isOverdue = true;
          daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        }
      }

      return {
        ...c,
        monthlyInterestAmount,
        isOverdue,
        daysOverdue,
      };
    });

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    return safeError(error);
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const actor = staffContext();
    const body = await readJson(request);
    const {
      customerId,
      customerName,
      customerPhone,
      nationalId,
      branchId: reqBranchId,
      deviceBrand,
      deviceModel,
      imei,
      conditionGrade = "A",
      agreedPrice,
      interestRateMonthly = 2.5,
      durationMonths = 1,
    } = body;

    const brand = String(deviceBrand || "").trim();
    const model = String(deviceModel || "").trim();
    const cleanImei = String(imei || "").trim();
    if (!brand || !model || !cleanImei) {
      throw new AccessError(400, "กรุณากรอกยี่ห้อ รุ่น และหมายเลข IMEI");
    }

    const cleanCustName = String(customerName || "").trim();
    const cleanPhone = String(customerPhone || "").trim();
    if (!cleanCustName || !cleanPhone) {
      throw new AccessError(400, "กรุณากรอกชื่อและเบอร์โทรศัพท์ลูกค้า");
    }

    const rawNationalId = String(nationalId || "").replace(/[^0-9]/g, "");
    if (rawNationalId) {
      const idCheck = validateThaiNationalId(rawNationalId);
      if (!idCheck.valid) {
        throw new AccessError(400, idCheck.message || "เลขประจำตัวประชาชน 13 หลักไม่ถูกต้อง");
      }
    }

    const loanAmount = reqMoney(agreedPrice, "ยอดเงินต้นกู้ยืม", 1);
    const interestRate = reqMoney(interestRateMonthly, "อัตราดอกเบี้ย", 0, 10);
    const months = reqInt(durationMonths, "ระยะสัญญา", 1, 12);

    // Resolve branch
    const branchId = reqBranchId ? String(reqBranchId).trim() : actor.branchId;
    if (!actor.branchIds.includes(branchId)) {
      throw new AccessError(404, "ไม่พบสาขาที่มีสิทธิ์");
    }

    const now = new Date();
    const yyyymm = bangkokYYYYMM(now);
    const dueDate = addMonthsClamped(now, months);

    const contract = await prisma.$transaction(async (tx) => {
      // Resolve or create Customer
      let finalCustId = customerId ? String(customerId).trim() : null;
      if (!finalCustId) {
        let existingCust = await tx.customer.findFirst({
          where: { tenantId: actor.tenantId, phone: cleanPhone },
        });
        if (!existingCust) {
          existingCust = await tx.customer.create({
            data: {
              tenantId: actor.tenantId,
              name: cleanCustName,
              phone: cleanPhone,
              nationalId: rawNationalId || null,
            },
          });
        }
        finalCustId = existingCust.id;
      }

      // Atomic SequenceCounter
      const counter = await tx.sequenceCounter.upsert({
        where: { id: `PW-${yyyymm}` },
        update: { current: { increment: 1 } },
        create: { id: `PW-${yyyymm}`, current: 1, tenantId: actor.tenantId },
      });
      const contractNo = `PW-${yyyymm}-${String(counter.current).padStart(4, "0")}`;

      const created = await tx.tradeInContract.create({
        data: {
          tenantId: actor.tenantId,
          contractNo,
          type: "PAWN",
          branchId,
          customerId: finalCustId,
          nationalId: rawNationalId || "-",
          deviceBrand: brand,
          deviceModel: model,
          imei: cleanImei,
          conditionGrade: String(conditionGrade || "A"),
          agreedPrice: loanAmount,
          interestRateMonthly: interestRate,
          durationMonths: months,
          startDate: now,
          dueDate,
          status: "ACTIVE",
        },
        include: {
          customer: true,
          branch: { select: { id: true, code: true, name: true } },
        },
      });

      // Find or auto-create Product placeholder in category DEVICE
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
            code: `DEV-PWN-${codeSuffix}`,
            name: `${brand} ${model} (เครื่องรับจำนำ)`,
            category: "DEVICE",
            brand,
            model,
            costPrice: loanAmount,
            sellPrice: Math.round(loanAmount * 1.3),
            minStock: 0,
          },
        });
      }

      // Register or update DeviceIMEI with PAWNED status
      const existingImei = await tx.deviceIMEI.findFirst({
        where: { tenantId: actor.tenantId, imei: cleanImei },
      });
      if (existingImei) {
        await tx.deviceIMEI.update({
          where: { id: existingImei.id },
          data: {
            productId: product.id,
            branchId,
            conditionGrade: String(conditionGrade || "A"),
            status: "PAWNED",
            costPrice: loanAmount,
            tradeInContractId: created.id,
          },
        });
      } else {
        await tx.deviceIMEI.create({
          data: {
            tenantId: actor.tenantId,
            productId: product.id,
            branchId,
            imei: cleanImei,
            conditionGrade: String(conditionGrade || "A"),
            status: "PAWNED",
            costPrice: loanAmount,
            sellPrice: Math.round(loanAmount * 1.3),
            tradeInContractId: created.id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          module: "PAWN",
          action: "CREATE",
          targetId: created.id,
          details: JSON.stringify({
            contractNo,
            brand,
            model,
            imei: cleanImei,
            loanAmount,
            interestRate,
            months,
            dueDate,
          }),
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, data: contract }, { status: 201 });
  } catch (error) {
    return safeError(error);
  }
}

async function handlePATCH(request: NextRequest) {
  try {
    const actor = staffContext();
    const body = await readJson(request);
    const id = reqId(body.id, "id");
    const action = reqEnum(body.action, "action", PAWN_ACTIONS);

    if (action === "forfeit") {
      requireRole(actor.role, ["ADMIN", "MANAGER"]);
    }

    const months = action === "pay_interest" ? reqInt(body.months ?? 1, "จำนวนเดือนที่ต่อสัญญา", 1, 12) : 0;

    const result = await prisma.$transaction(async (tx) => {
      const contract = await tx.tradeInContract.findFirst({
        where: { id, tenantId: actor.tenantId },
        include: { deviceImeis: true, customer: true, branch: true },
      });

      if (!contract) throw new AccessError(404, "ไม่พบข้อมูลสัญญาจำนำ");
      if (contract.type !== "PAWN" || contract.status !== "ACTIVE") {
        throw new AccessError(409, "ทำรายการได้เฉพาะสัญญาจำนำที่มีสถานะใช้งานอยู่ (ACTIVE) เท่านั้น");
      }

      const guard = { id, tenantId: actor.tenantId, type: "PAWN", status: "ACTIVE" };
      let message = "";
      let auditDetails: Record<string, unknown> = { contractNo: contract.contractNo, action };

      if (action === "pay_interest") {
        // Extend due date by N months
        const base = contract.dueDate ? new Date(contract.dueDate) : new Date();
        const newDue = addMonthsClamped(base, months);
        const monthlyInterest = Math.round(contract.agreedPrice * (contract.interestRateMonthly / 100) * 100) / 100;
        const totalInterestPaid = Math.round(monthlyInterest * months * 100) / 100;

        const changed = await tx.tradeInContract.updateMany({
          where: guard,
          data: {
            dueDate: newDue,
            durationMonths: { increment: months },
          },
        });
        if (changed.count !== 1) throw new AccessError(409, "สัญญานี้ถูกดำเนินการไปแล้ว");

        auditDetails = {
          ...auditDetails,
          months,
          previousDueDate: contract.dueDate,
          newDueDate: newDue,
          interestPaid: totalInterestPaid,
        };
        message = `รับชำระดอกเบี้ย ${totalInterestPaid} บาท และขยายสัญญา ${months} เดือนเรียบร้อย`;
      } else if (action === "redeem") {
        // Customer pays back loan and redeems device
        const changed = await tx.tradeInContract.updateMany({
          where: guard,
          data: { status: "REDEEMED" },
        });
        if (changed.count !== 1) throw new AccessError(409, "สัญญานี้ถูกดำเนินการไปแล้ว");

        // Mark IMEI as RETURNED
        const returned = await tx.deviceIMEI.updateMany({
          where: { tenantId: actor.tenantId, tradeInContractId: id, status: "PAWNED" },
          data: { status: "RETURNED" },
        });

        auditDetails = { ...auditDetails, imeisReturned: returned.count, principalReceived: contract.agreedPrice };
        message = "บันทึกการไถ่ถอนเครื่องสำเร็จ ลูกค้ารับเครื่องคืนเรียบร้อย";
      } else if (action === "forfeit") {
        // Device forfeited into store inventory
        const changed = await tx.tradeInContract.updateMany({
          where: guard,
          data: { status: "FORFEITED" },
        });
        if (changed.count !== 1) throw new AccessError(409, "สัญญานี้ถูกดำเนินการไปแล้ว");

        // Move device IMEIs to IN_STOCK
        let movedCount = 0;
        for (const im of contract.deviceImeis) {
          const r = await tx.deviceIMEI.updateMany({
            where: { id: im.id, tenantId: actor.tenantId, status: "PAWNED" },
            data: { status: "IN_STOCK" },
          });
          if (r.count !== 1) continue;
          movedCount++;

          // Upsert StockItem quantity for the branch
          await tx.stockItem.upsert({
            where: {
              productId_branchId: {
                productId: im.productId,
                branchId: im.branchId,
              },
            },
            update: { quantity: { increment: 1 } },
            create: {
              tenantId: actor.tenantId,
              productId: im.productId,
              branchId: im.branchId,
              quantity: 1,
            },
          });
        }

        // If no DeviceIMEI was attached, create product and stock
        if (movedCount === 0) {
          let product = await tx.product.findFirst({
            where: {
              tenantId: actor.tenantId,
              category: "DEVICE",
              model: { contains: contract.deviceModel },
            },
          });
          if (!product) {
            const codeSuffix = Math.floor(1000 + Math.random() * 9000);
            product = await tx.product.create({
              data: {
                tenantId: actor.tenantId,
                code: `DEV-PWN-${codeSuffix}`,
                name: `${contract.deviceBrand} ${contract.deviceModel} (หลุดจำนำ เกรด ${contract.conditionGrade})`,
                category: "DEVICE",
                brand: contract.deviceBrand,
                model: contract.deviceModel,
                costPrice: contract.agreedPrice,
                sellPrice: Math.round(contract.agreedPrice * 1.3),
                minStock: 1,
              },
            });
          }

          await tx.deviceIMEI.create({
            data: {
              tenantId: actor.tenantId,
              productId: product.id,
              branchId: contract.branchId,
              imei: contract.imei,
              conditionGrade: contract.conditionGrade,
              status: "IN_STOCK",
              costPrice: contract.agreedPrice,
              sellPrice: Math.round(contract.agreedPrice * 1.3),
              tradeInContractId: contract.id,
            },
          });

          await tx.stockItem.upsert({
            where: {
              productId_branchId: {
                productId: product.id,
                branchId: contract.branchId,
              },
            },
            update: { quantity: { increment: 1 } },
            create: {
              tenantId: actor.tenantId,
              productId: product.id,
              branchId: contract.branchId,
              quantity: 1,
            },
          });
        }

        auditDetails = { ...auditDetails, imeisToStock: Math.max(movedCount, 1) };
        message = "ตัดเครื่องหลุดจำนำเข้าสต็อกมือสองของร้านเรียบร้อย";
      }

      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          module: "PAWN",
          action: action.toUpperCase(),
          targetId: id,
          details: JSON.stringify(auditDetails),
          severity: action === "forfeit" ? "WARNING" : "INFO",
        },
      });

      const updated = await tx.tradeInContract.findFirst({
        where: { id, tenantId: actor.tenantId },
        include: { customer: true, branch: true, deviceImeis: true },
      });

      return { message, updated };
    });

    return NextResponse.json({ success: true, message: result.message, data: result.updated });
  } catch (error) {
    return safeError(error);
  }
}

export const GET = withStaff(handleGET, ["ADMIN", "MANAGER", "CASHIER"]);
export const POST = withStaff(handlePOST, ["ADMIN", "MANAGER", "CASHIER"]);
export const PATCH = withStaff(handlePATCH, ["ADMIN", "MANAGER", "CASHIER"]);
