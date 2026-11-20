import { AccessError, staffContext } from "@/lib/staff-context";
import { readJson, safeError, withStaff, reqInt, reqMoney, takeParam } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/accessories?barcode=ACC-01&branch=HQ&lowStock=true&search=
async function handleGET(request: NextRequest) {
  try {
    const actor = staffContext();
    const { searchParams } = new URL(request.url);
    const branchCode = searchParams.get("branch")?.trim() || "";
    const barcode = searchParams.get("barcode")?.trim() || searchParams.get("sku")?.trim() || "";
    const search = searchParams.get("search")?.trim() || "";
    const brand = searchParams.get("brand")?.trim() || "";
    const lowStockOnly = searchParams.get("lowStock") === "true";

    let branch = null;
    if (branchCode) {
      branch = await prisma.branch.findFirst({
        where: {
          tenantId: actor.tenantId,
          OR: [{ code: branchCode }, { id: branchCode }],
        },
      });
      if (!branch || !actor.branchIds.includes(branch.id)) {
        throw new AccessError(404, "ไม่พบสาขาหรือไม่ได้รับอนุญาต");
      }
    }

    const where: any = {
      tenantId: actor.tenantId,
      category: "ACCESSORY",
    };

    if (barcode) {
      where.code = barcode;
    } else if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { brand: { contains: search } },
        { model: { contains: search } },
      ];
    }

    if (brand && brand !== "ALL") {
      where.brand = brand;
    }

    const accessories = await prisma.product.findMany({
      where,
      include: {
        stockItems: {
          where: {
            tenantId: actor.tenantId,
            ...(branch ? { branchId: branch.id } : { branchId: { in: actor.branchIds } }),
          },
          include: {
            branch: { select: { id: true, code: true, name: true } },
          },
        },
      },
      orderBy: { name: "asc" },
      take: takeParam(searchParams.get("take"), 200, 500),
    });

    let formatted = accessories.map((p) => {
      let currentStock = 0;
      const totalStock = p.stockItems.reduce((acc, s) => acc + s.quantity, 0);

      if (branch) {
        const branchStock = p.stockItems.find((s) => s.branchId === branch!.id);
        currentStock = branchStock ? branchStock.quantity : 0;
      } else {
        currentStock = totalStock;
      }

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        category: p.category,
        brand: p.brand || "",
        model: p.model || "",
        costPrice: p.costPrice,
        sellPrice: p.sellPrice,
        minStock: p.minStock,
        currentStock,
        totalStock,
        isLowStock: currentStock <= p.minStock,
        stockPerBranch: p.stockItems.map((s) => ({
          branchId: s.branchId,
          branchName: s.branch.name,
          branchCode: s.branch.code,
          quantity: s.quantity,
        })),
        createdAt: p.createdAt,
      };
    });

    if (lowStockOnly) {
      formatted = formatted.filter((p) => p.isLowStock);
    }

    if (actor.role === "CASHIER" || actor.role === "TECHNICIAN") {
      const stripped = formatted.map(({ costPrice: _c, ...rest }) => rest);
      return NextResponse.json({ success: true, accessories: stripped });
    }

    return NextResponse.json({ success: true, accessories: formatted });
  } catch (error) {
    return safeError(error);
  }
}

// POST /api/accessories - Quick restock OR create accessory
async function handlePOST(request: NextRequest) {
  try {
    const actor = staffContext();
    const body = await readJson(request);

    // Quick restock flow
    if (body.action === "QUICK_RESTOCK" || (body.productId && body.quantity && !body.name)) {
      const { productId, branchCode, branchId, quantity, reason } = body;
      const targetBranchKey = branchCode || branchId;

      if (!productId || !targetBranchKey || quantity === undefined) {
        return NextResponse.json(
          { success: false, error: "ข้อมูลไม่ครบถ้วน (productId, branch, quantity)" },
          { status: 400 }
        );
      }

      const branch = await prisma.branch.findFirst({
        where: {
          tenantId: actor.tenantId,
          OR: [{ code: targetBranchKey }, { id: targetBranchKey }],
        },
      });
      if (!branch || !actor.branchIds.includes(branch.id)) {
        throw new AccessError(404, "ไม่พบสาขาหรือไม่ได้รับอนุญาต");
      }

      const product = await prisma.product.findFirst({
        where: { id: productId, tenantId: actor.tenantId, category: "ACCESSORY" },
      });
      if (!product) {
        return NextResponse.json({ success: false, error: "ไม่พบสินค้าอุปกรณ์เสริม" }, { status: 404 });
      }

      const addQty = reqInt(quantity, "quantity", 1, 100_000);

      const result = await prisma.$transaction(async (tx) => {
        const stock = await tx.stockItem.upsert({
          where: { productId_branchId: { productId: product.id, branchId: branch.id } },
          update: { quantity: { increment: addQty } },
          create: { tenantId: actor.tenantId, productId: product.id, branchId: branch.id, quantity: addQty },
          include: { branch: true },
        });

        await tx.auditLog.create({
          data: {
            tenantId: actor.tenantId,
            userId: actor.id,
            module: "INVENTORY",
            action: "QUICK_RESTOCK",
            targetId: product.id,
            details: JSON.stringify({
              productCode: product.code,
              productName: product.name,
              branchName: branch.name,
              addedQuantity: addQty,
              newQuantity: stock.quantity,
              reason: reason || "เติมสต็อกด่วนหน้าร้าน",
            }),
          },
        });

        return stock;
      });

      return NextResponse.json({
        success: true,
        message: `เติมสต็อก ${product.name} จำนวน ${addQty} ชิ้น เรียบร้อย (คงเหลือ ${result.quantity} ชิ้น)`,
        stock: result,
      });
    }

    // Create new accessory
    const { code, name, brand, model, costPrice, sellPrice, minStock, branchId, initialStock } = body;
    if (!code?.trim() || !name?.trim()) {
      return NextResponse.json({ success: false, error: "กรุณาระบุรหัสและชื่ออุปกรณ์เสริม" }, { status: 400 });
    }

    const trimmedCode = code.trim();
    const existing = await prisma.product.findFirst({
      where: { tenantId: actor.tenantId, code: trimmedCode },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: `รหัสสินค้า "${trimmedCode}" มีอยู่ในระบบแล้ว` }, { status: 400 });
    }

    const cost = costPrice !== undefined && costPrice !== null && costPrice !== "" ? reqMoney(costPrice, "costPrice") : 0;
    const sell = sellPrice !== undefined && sellPrice !== null && sellPrice !== "" ? reqMoney(sellPrice, "sellPrice") : 0;
    const min = minStock !== undefined && minStock !== null && minStock !== "" ? reqInt(minStock, "minStock", 0, 100_000) : 5;
    const initialQty = initialStock !== undefined && initialStock !== null && initialStock !== ""
      ? reqInt(initialStock, "initialStock", 0, 100_000)
      : 0;

    let targetBranch: { id: string } | null = null;
    if (branchId) {
      targetBranch = await prisma.branch.findFirst({
        where: { tenantId: actor.tenantId, OR: [{ id: branchId }, { code: branchId }] },
        select: { id: true },
      });
      if (!targetBranch || !actor.branchIds.includes(targetBranch.id)) {
        throw new AccessError(404, "ไม่พบสาขาหรือไม่ได้รับอนุญาต");
      }
    }

    const newAccessory = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.create({
        data: {
          tenantId: actor.tenantId,
          code: trimmedCode,
          name: name.trim(),
          category: "ACCESSORY",
          brand: brand?.trim() || null,
          model: model?.trim() || null,
          costPrice: cost,
          sellPrice: sell,
          minStock: min,
        },
      });

      if (targetBranch && initialQty > 0) {
        await tx.stockItem.create({
          data: {
            tenantId: actor.tenantId,
            productId: prod.id,
            branchId: targetBranch.id,
            quantity: initialQty,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          module: "INVENTORY",
          action: "CREATE_ACCESSORY",
          targetId: prod.id,
          details: JSON.stringify({ code: prod.code, name: prod.name, initialStock: initialQty }),
        },
      });

      return prod;
    });

    return NextResponse.json({ success: true, accessory: newAccessory });
  } catch (error) {
    return safeError(error);
  }
}

export const GET = withStaff(handleGET, ["ADMIN", "MANAGER", "CASHIER", "TECHNICIAN"]);
export const POST = withStaff(handlePOST, ["ADMIN", "MANAGER"]);
