import { AccessError, staffContext } from "@/lib/staff-context";
import { readJson, safeError, withStaff, reqMoney, takeParam } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["IN_STOCK", "SOLD", "DEFECTIVE", "RETURNED", "IN_REPAIR", "PAWNED"] as const;
const VALID_GRADES = ["A", "B", "C"] as const;

// GET /api/inventory/imei?productId=...&imei=...&status=...&branch=...
async function handleGET(request: NextRequest) {
  try {
    const actor = staffContext();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId")?.trim();
    const imei = searchParams.get("imei")?.trim();
    const status = searchParams.get("status")?.trim();
    const branchCode = searchParams.get("branch")?.trim() || searchParams.get("branchId")?.trim();

    const where: any = {
      tenantId: actor.tenantId,
    };

    if (productId) {
      where.productId = productId;
    }

    if (imei) {
      where.imei = { contains: imei };
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (branchCode) {
      const branch = await prisma.branch.findFirst({
        where: {
          tenantId: actor.tenantId,
          OR: [{ code: branchCode }, { id: branchCode }],
        },
        select: { id: true },
      });
      if (!branch || !actor.branchIds.includes(branch.id)) {
        throw new AccessError(404, "ไม่พบสาขาหรือไม่ได้รับอนุญาต");
      }
      where.branchId = branch.id;
    } else {
      where.branchId = { in: actor.branchIds };
    }

    const imeis = await prisma.deviceIMEI.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            brand: true,
            model: true,
            category: true,
            sellPrice: true,
            costPrice: true,
          },
        },
        branch: {
          select: { id: true, code: true, name: true },
        },
        tradeInContract: {
          select: { id: true, contractNo: true, type: true, agreedPrice: true },
        },
        saleItem: {
          select: {
            id: true,
            saleId: true,
            sale: {
              select: { id: true, invoiceNo: true, createdAt: true, customer: { select: { id: true, name: true, phone: true } } },
            },
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: takeParam(searchParams.get("take"), 200, 500),
    });

    // Hide cost prices from roles that should not see margins.
    const role = actor.role;
    if (role === "CASHIER" || role === "TECHNICIAN") {
      const stripped = imeis.map(({ costPrice: _c, product, ...rest }) => ({
        ...rest,
        product: {
          ...product,
          costPrice: undefined,
        },
      }));
      return NextResponse.json({ success: true, imeis: stripped });
    }

    return NextResponse.json({ success: true, imeis });
  } catch (error) {
    return safeError(error);
  }
}

// POST /api/inventory/imei - Add new IMEI
async function handlePOST(request: NextRequest) {
  try {
    const actor = staffContext();
    const body = await readJson(request);
    const { productId, branchCode, branchId, imei, serialNo, conditionGrade, costPrice, sellPrice } = body;

    const targetBranchIdentifier = branchCode || branchId;
    if (!productId || !targetBranchIdentifier || !imei) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุ productId, สาขา และหมายเลข IMEI" },
        { status: 400 }
      );
    }

    const cleanImei = String(imei).trim().replace(/\s+/g, "");
    if (cleanImei.length < 8) {
      return NextResponse.json(
        { success: false, error: "หมายเลข IMEI ต้องมีความยาวอย่างน้อย 8 หลัก" },
        { status: 400 }
      );
    }

    const branch = await prisma.branch.findFirst({
      where: {
        tenantId: actor.tenantId,
        OR: [{ code: targetBranchIdentifier }, { id: targetBranchIdentifier }],
      },
    });
    if (!branch) {
      return NextResponse.json({ success: false, error: "ไม่พบสาขา" }, { status: 404 });
    }
    if (!actor.branchIds.includes(branch.id)) {
      throw new AccessError(403, "ไม่มีสิทธิ์จัดการสต็อกสาขานี้");
    }

    // Verify product belongs to actor tenant
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId: actor.tenantId },
    });
    if (!product) {
      return NextResponse.json({ success: false, error: "ไม่พบสินค้าในระบบ" }, { status: 404 });
    }

    // Check duplicate IMEI in this tenant
    const existing = await prisma.deviceIMEI.findFirst({
      where: {
        tenantId: actor.tenantId,
        imei: cleanImei,
      },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `หมายเลข IMEI ${cleanImei} มีอยู่ในระบบแล้ว` },
        { status: 400 }
      );
    }

    const grade = conditionGrade ? String(conditionGrade).trim().toUpperCase() : "A";
    if (!VALID_GRADES.includes(grade as any)) {
      return NextResponse.json({ success: false, error: `เกรดสภาพเครื่องไม่ถูกต้อง: ${grade}` }, { status: 400 });
    }

    const cost = costPrice !== undefined && costPrice !== null && costPrice !== ""
      ? reqMoney(costPrice, "costPrice")
      : product.costPrice;
    const sell = sellPrice !== undefined && sellPrice !== null && sellPrice !== ""
      ? reqMoney(sellPrice, "sellPrice")
      : product.sellPrice;

    // Create DeviceIMEI + update StockItem + AuditLog atomically
    const newImei = await prisma.$transaction(async (tx) => {
      const created = await tx.deviceIMEI.create({
        data: {
          tenantId: actor.tenantId,
          productId: product.id,
          branchId: branch.id,
          imei: cleanImei,
          serialNo: serialNo ? String(serialNo).trim() : null,
          conditionGrade: grade,
          status: "IN_STOCK",
          costPrice: cost,
          sellPrice: sell,
        },
        include: {
          product: { select: { id: true, code: true, name: true, brand: true, model: true } },
          branch: { select: { id: true, code: true, name: true } },
        },
      });

      // Update stock quantity for this product at this branch
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

      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          module: "INVENTORY",
          action: "ADD_IMEI",
          targetId: created.id,
          details: JSON.stringify({
            imei: cleanImei,
            productName: product.name,
            productCode: product.code,
            branchName: branch.name,
            conditionGrade: grade,
          }),
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, imei: newImei });
  } catch (error) {
    return safeError(error);
  }
}

// PATCH /api/inventory/imei - Update status, branch, or condition grade
async function handlePATCH(request: NextRequest) {
  try {
    const actor = staffContext();
    const body = await readJson(request);
    const { id, status, conditionGrade, sellPrice, costPrice, branchId, branchCode } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ต้องระบุ ID ของ IMEI" }, { status: 400 });
    }

    const currentImei = await prisma.deviceIMEI.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: { product: true, branch: true },
    });
    if (!currentImei) {
      return NextResponse.json({ success: false, error: "ไม่พบเครื่อง IMEI" }, { status: 404 });
    }

    if (!actor.branchIds.includes(currentImei.branchId)) {
      throw new AccessError(403, "ไม่มีสิทธิ์จัดการ IMEI สาขานี้");
    }

    const data: any = {};
    if (status) {
      const cleanStatus = String(status).trim().toUpperCase();
      if (!VALID_STATUSES.includes(cleanStatus as any)) {
        return NextResponse.json({ success: false, error: `สถานะไม่ถูกต้อง: ${cleanStatus}` }, { status: 400 });
      }
      data.status = cleanStatus;
    }

    if (conditionGrade) {
      const cleanGrade = String(conditionGrade).trim().toUpperCase();
      if (!VALID_GRADES.includes(cleanGrade as any)) {
        return NextResponse.json({ success: false, error: `เกรดสภาพเครื่องไม่ถูกต้อง: ${cleanGrade}` }, { status: 400 });
      }
      data.conditionGrade = cleanGrade;
    }

    if (sellPrice !== undefined) data.sellPrice = reqMoney(sellPrice, "sellPrice");
    if (costPrice !== undefined) {
      if (actor.role === "CASHIER" || actor.role === "TECHNICIAN") {
        throw new AccessError(403, "ไม่มีสิทธิ์ปรับแก้ราคาทุน");
      }
      data.costPrice = reqMoney(costPrice, "costPrice");
    }

    let targetBranch: { id: string; name: string; code: string } | null = null;
    const newBranchKey = branchCode || branchId;
    if (newBranchKey && newBranchKey !== currentImei.branchId && newBranchKey !== currentImei.branch.code) {
      targetBranch = await prisma.branch.findFirst({
        where: {
          tenantId: actor.tenantId,
          OR: [{ id: newBranchKey }, { code: newBranchKey }],
        },
        select: { id: true, name: true, code: true },
      });
      if (!targetBranch) throw new AccessError(404, "ไม่พบสาขาปลายทาง");
      if (!actor.branchIds.includes(targetBranch.id)) throw new AccessError(403, "ไม่มีสิทธิ์ย้ายเครื่องไปยังสาขานี้");
      data.branchId = targetBranch.id;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextStatus = data.status || currentImei.status;
      const oldStatus = currentImei.status;
      const isStatusChanged = nextStatus !== oldStatus;
      const isBranchChanged = targetBranch !== null && targetBranch.id !== currentImei.branchId;

      // Handle stock count adjustments
      if (isBranchChanged) {
        // If device was in stock at old branch, deduct from old branch
        if (oldStatus === "IN_STOCK") {
          const oldStock = await tx.stockItem.findUnique({
            where: { productId_branchId: { productId: currentImei.productId, branchId: currentImei.branchId } },
          });
          if (oldStock) {
            await tx.stockItem.update({
              where: { id: oldStock.id },
              data: { quantity: Math.max(0, oldStock.quantity - 1) },
            });
          }
        }
        // If device is in stock at new branch, add to new branch
        if (nextStatus === "IN_STOCK") {
          await tx.stockItem.upsert({
            where: { productId_branchId: { productId: currentImei.productId, branchId: targetBranch!.id } },
            update: { quantity: { increment: 1 } },
            create: { tenantId: actor.tenantId, productId: currentImei.productId, branchId: targetBranch!.id, quantity: 1 },
          });
        }
      } else if (isStatusChanged) {
        if (oldStatus === "IN_STOCK" && nextStatus !== "IN_STOCK") {
          // Left stock -> decrement
          const stock = await tx.stockItem.findUnique({
            where: { productId_branchId: { productId: currentImei.productId, branchId: currentImei.branchId } },
          });
          if (stock) {
            await tx.stockItem.update({
              where: { id: stock.id },
              data: { quantity: Math.max(0, stock.quantity - 1) },
            });
          }
        } else if (oldStatus !== "IN_STOCK" && nextStatus === "IN_STOCK") {
          // Returned to stock -> increment
          await tx.stockItem.upsert({
            where: { productId_branchId: { productId: currentImei.productId, branchId: currentImei.branchId } },
            update: { quantity: { increment: 1 } },
            create: { tenantId: actor.tenantId, productId: currentImei.productId, branchId: currentImei.branchId, quantity: 1 },
          });
        }
      }

      const imeiUpdated = await tx.deviceIMEI.update({
        where: { id },
        data,
        include: {
          product: { select: { id: true, code: true, name: true } },
          branch: { select: { id: true, code: true, name: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          module: "INVENTORY",
          action: "UPDATE_IMEI",
          targetId: id,
          details: JSON.stringify({
            imei: currentImei.imei,
            statusChange: isStatusChanged ? `${oldStatus} -> ${nextStatus}` : undefined,
            branchChange: isBranchChanged ? `${currentImei.branch.name} -> ${targetBranch!.name}` : undefined,
            conditionGrade: data.conditionGrade,
          }),
          beforeJson: JSON.stringify({ status: oldStatus, branchId: currentImei.branchId, grade: currentImei.conditionGrade }),
          afterJson: JSON.stringify(data),
        },
      });

      return imeiUpdated;
    });

    return NextResponse.json({ success: true, imei: updated });
  } catch (error) {
    return safeError(error);
  }
}

export const GET = withStaff(handleGET, ["ADMIN", "MANAGER", "CASHIER", "TECHNICIAN"]);
export const POST = withStaff(handlePOST, ["ADMIN", "MANAGER", "TECHNICIAN"]);
export const PATCH = withStaff(handlePATCH, ["ADMIN", "MANAGER", "TECHNICIAN"]);
