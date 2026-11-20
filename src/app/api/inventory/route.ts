import { AccessError, staffContext } from "@/lib/staff-context";
import { readJson, safeError, withStaff, reqInt, reqMoney, takeParam } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/inventory?branch=HQ&category=SPARE_PART&search=iPhone
async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchCode = searchParams.get("branch") || "";
    const category = searchParams.get("category") || "";
    const search = searchParams.get("search") || "";

    // Resolve branch
    let branch = null;
    if (branchCode) {
      branch = await prisma.branch.findFirst({
        where: {
          OR: [{ code: branchCode }, { id: branchCode }],
        },
      });
    }

    const where: any = {};
    if (category && category !== "ALL") {
      where.category = category;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { brand: { contains: search } },
        { model: { contains: search } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        stockItems: {
          include: {
            branch: true,
          },
        },
        // Bounded per product: "status asc" sorts IN_REPAIR/IN_STOCK before SOLD,
        // so sellable devices are kept when a product has many historical IMEIs.
        imeis: {
          include: {
            branch: true,
          },
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
          take: 100,
        },
      },
      orderBy: { createdAt: "desc" },
      take: takeParam(searchParams.get("take"), 200, 500),
    });

    // Format products with branch-specific stock calculation
    const formatted = products.map((p) => {
      let currentStock = 0;
      const totalStock =p.stockItems.reduce((acc, s) => acc + s.quantity, 0);

      if (branch) {
        const branchStock = p.stockItems.find((s) => s.branchId === branch!.id);
        currentStock = branchStock ? branchStock.quantity : 0;
      } else {
        currentStock = totalStock;
      }

      // Filter IMEIs if branch specified
      const relevantImeis = branch
        ? p.imeis.filter((i) => i.branchId === branch!.id)
        : p.imeis;

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        category: p.category,
        brand: p.brand || "",
        model: p.model || "",
        compatibleModels: (() => {
          if (!p.compatibleModels) return [];
          try { return JSON.parse(p.compatibleModels); } catch { return []; }
        })(),
        costPrice: p.costPrice,
        sellPrice: p.sellPrice,
        minStock: p.minStock,
        currentStock,
        totalStock,
        isLowStock: currentStock <= p.minStock,
        imeis: relevantImeis,
        stockPerBranch: p.stockItems.map((s) => ({
          branchId: s.branchId,
          branchName: s.branch.name,
          branchCode: s.branch.code,
          quantity: s.quantity,
        })),
      };
    });

    // Hide cost prices from roles that should not see margins.
    const role = staffContext().role;
    if (role === "CASHIER" || role === "TECHNICIAN") {
      const stripped = formatted.map(({ costPrice: _c, imeis, ...rest }) => ({
        ...rest,
        imeis: imeis.map(({ costPrice: _ic, ...im }) => im),
      }));
      return NextResponse.json({ success: true, products: stripped });
    }

    return NextResponse.json({ success: true, products: formatted });
  } catch (error) {
    return safeError(error);
  }
}

// POST /api/inventory - Create a new product
async function handlePOST(request: NextRequest) {
  try {
    const body = await readJson(request);
    const {
      code,
      name,
      category,
      brand,
      model,
      compatibleModels,
      costPrice,
      sellPrice,
      minStock,
      branchId,
      initialStock,
    } = body;

    if (!code || !name || !category) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุรหัสสินค้า ชื่อ และหมวดหมู่" },
        { status: 400 }
      );
    }

    // Validate numeric inputs (no silent `|| 0` fallbacks for bad values).
    const cost = costPrice === undefined || costPrice === null || costPrice === "" ? 0 : reqMoney(costPrice, "costPrice");
    const sell = sellPrice === undefined || sellPrice === null || sellPrice === "" ? 0 : reqMoney(sellPrice, "sellPrice");
    const min = minStock === undefined || minStock === null || minStock === "" ? 5 : reqInt(minStock, "minStock", 0, 100_000);
    const hasInitial = initialStock !== undefined && initialStock !== null && initialStock !== "";
    const initialQty = hasInitial ? reqInt(initialStock, "initialStock", 0, 100_000) : 0;

    const actor = staffContext();

    // Product + initial stock are created atomically.
    const newProduct = await prisma.$transaction(async (tx) => {
      let branch = null;
      if (branchId && hasInitial) {
        branch = await tx.branch.findFirst({
          where: { OR: [{ id: branchId }, { code: branchId }] },
        });
        if (!branch) throw new AccessError(404, "ไม่พบสาขาสำหรับสต็อกเริ่มต้น");
        if (!actor.branchIds.includes(branch.id)) throw new AccessError(403, "ไม่มีสิทธิ์จัดการสต็อกสาขานี้");
      }

      const product = await tx.product.create({
        data: {
          tenantId: actor.tenantId ?? branch?.tenantId,
          code,
          name,
          category,
          brand: brand || null,
          model: model || null,
          compatibleModels: compatibleModels ? JSON.stringify(compatibleModels) : null,
          costPrice: cost,
          sellPrice: sell,
          minStock: min,
        },
      });

      if (branch) {
        await tx.stockItem.create({
          data: {
            tenantId: actor.tenantId ?? branch.tenantId,
            productId: product.id,
            branchId: branch.id,
            quantity: initialQty,
          },
        });
      }
      return product;
    });

    return NextResponse.json({ success: true, product: newProduct });
  } catch (error) {
    return safeError(error);
  }
}

export const GET = withStaff(handleGET, ["ADMIN","MANAGER","CASHIER"]);

export const POST = withStaff(handlePOST, ["ADMIN","MANAGER"]);
