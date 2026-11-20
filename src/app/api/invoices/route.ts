import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AccessError, staffContext } from "@/lib/staff-context";
import { withStaff, readJson, safeError, reqId, takeParam, bangkokYYYYMM, bangkokDateString } from "@/lib/staff-http";
import { validateThaiTaxId, validateThaiBranchId, bahtText } from "@/lib/utils";

export const dynamic = "force-dynamic";

const round2 = (n: number) => Math.round(n * 100) / 100;

async function handleGET(request: NextRequest) {
  try {
    const actor = staffContext();
    const { searchParams } = new URL(request.url);
    const branchKey = searchParams.get("branch")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "ALL";
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const take = takeParam(searchParams.get("take"), 100, 300);

    const where: any = {
      tenantId: actor.tenantId,
      branchId: { in: actor.branchIds },
    };

    if (branchKey) {
      const branch = await prisma.branch.findFirst({
        where: {
          tenantId: actor.tenantId,
          OR: [{ code: branchKey }, { id: branchKey }],
        },
        select: { id: true },
      });
      if (branch) {
        where.branchId = branch.id;
      }
    }

    // Find sales created as B2B invoices (paymentMethod = "INVOICE" or paymentDetails contains "B2B")
    const sales = await prisma.sale.findMany({
      where: {
        ...where,
        OR: [
          { paymentMethod: "INVOICE" },
          { paymentDetails: { contains: "B2B" } },
        ],
      },
      include: {
        customer: true,
        branch: { select: { id: true, code: true, name: true, taxId: true, address: true, phone: true } },
        cashier: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, code: true, name: true } },
            deviceImei: { select: { id: true, imei: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
    });

    const data = sales.map((sale) => {
      let b2bMeta: any = {};
      try {
        if (sale.paymentDetails) {
          b2bMeta = JSON.parse(sale.paymentDetails);
        }
      } catch {
        b2bMeta = {};
      }

      const taxableSubtotal = b2bMeta.taxableSubtotal ?? round2(sale.netAmount - sale.vatAmount);
      const nonVatSubtotal = b2bMeta.nonVatSubtotal ?? 0;
      const calculatedVat = b2bMeta.vatAmount ?? sale.vatAmount;
      const grandTotal = b2bMeta.grandTotal ?? sale.netAmount;
      const b2bStatus = b2bMeta.status ?? (sale.status === "VOID" ? "VOID" : "SENT");

      return {
        id: sale.id,
        invoiceNo: sale.invoiceNo,
        companyName: b2bMeta.companyName || sale.customer?.name || "ไม่ระบุบริษัท",
        taxId: b2bMeta.taxId || sale.customer?.nationalId || "-",
        branchId: b2bMeta.branchCode || b2bMeta.branchId || "00000",
        address: b2bMeta.address || sale.customer?.address || "-",
        poNumber: b2bMeta.poNumber || "-",
        issueDate: b2bMeta.issueDate || bangkokDateString(sale.createdAt),
        dueDate: b2bMeta.dueDate || null,
        status: b2bStatus,
        branch: sale.branch,
        cashier: sale.cashier,
        items: sale.items.map((it) => ({
          name: it.product?.name ?? "-",
          qty: it.quantity,
          unitPrice: it.unitPrice,
          total: it.subtotal,
          imei: it.deviceImei?.imei ?? null,
          isVatExempt: Boolean(b2bMeta.items?.find((bi: any) => bi.name === it.product?.name)?.isVatExempt),
        })),
        taxableSubtotal,
        nonVatSubtotal,
        subtotal: taxableSubtotal + nonVatSubtotal,
        vatAmount: calculatedVat,
        grandTotal,
        bahtText: b2bMeta.bahtText || bahtText(grandTotal),
        createdAt: sale.createdAt,
      };
    }).filter((inv) => {
      if (status !== "ALL" && inv.status !== status) return false;
      if (search) {
        return (
          inv.invoiceNo.toLowerCase().includes(search) ||
          inv.companyName.toLowerCase().includes(search) ||
          inv.poNumber.toLowerCase().includes(search) ||
          inv.taxId.includes(search)
        );
      }
      return true;
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return safeError(err);
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const actor = staffContext();
    const body = await readJson(request);

    const companyName = String(body.companyName || "").trim();
    if (!companyName) throw new AccessError(400, "กรุณากรอกชื่อบริษัท / ผู้ซื้อ");

    const taxId = String(body.taxId || "").replace(/[^0-9]/g, "");
    const taxCheck = validateThaiTaxId(taxId);
    if (!taxCheck.valid) {
      throw new AccessError(400, taxCheck.message || "เลขประจำตัวผู้เสียภาษีอากร 13 หลักไม่ถูกต้อง");
    }

    const branchIdStr = String(body.branchId || "00000").trim();
    const branchCheck = validateThaiBranchId(branchIdStr);
    if (!branchCheck.valid) {
      throw new AccessError(400, branchCheck.message || "รหัสสาขาต้องเป็นตัวเลข 5 หลัก (เช่น 00000 = สำนักงานใหญ่)");
    }

    const address = String(body.address || "").trim();
    if (!address) throw new AccessError(400, "กรุณากรอกที่อยู่ตามใบกำกับภาษี");

    const poNumber = String(body.poNumber || "").trim() || `PO-${Date.now().toString().slice(-6)}`;
    const dueDate = body.dueDate ? String(body.dueDate).trim() : null;
    const branchCode = String(body.branchCode || "").trim();

    // Resolve branch of the seller
    let sellerBranch = await prisma.branch.findFirst({
      where: {
        tenantId: actor.tenantId,
        id: { in: actor.branchIds },
        ...(branchCode ? { OR: [{ code: branchCode }, { id: branchCode }] } : {}),
      },
    });
    if (!sellerBranch) {
      sellerBranch = await prisma.branch.findFirst({
        where: { tenantId: actor.tenantId, id: { in: actor.branchIds } },
      });
    }
    if (!sellerBranch) throw new AccessError(404, "ไม่พบสาขาผู้ขายที่มีสิทธิ์");

    const rawItems = Array.isArray(body.items) && body.items.length > 0 ? body.items : [];
    if (rawItems.length === 0) throw new AccessError(400, "กรุณาระบุรายการสินค้าหรือบริการอย่างน้อย 1 รายการ");

    // Satang precision item calculation
    let taxableSatang = 0;
    let nonVatSatang = 0;
    const processedItems: Array<{
      name: string;
      qty: number;
      unitPrice: number;
      total: number;
      isVatExempt: boolean;
    }> = [];

    for (const item of rawItems) {
      const name = String(item.name || "").trim();
      if (!name) throw new AccessError(400, "ชื่อรายการสินค้า/บริการต้องไม่ว่างเปล่า");
      const qty = Math.max(1, parseInt(item.qty, 10) || 1);
      const unitPrice = round2(parseFloat(item.unitPrice) || 0);
      if (unitPrice < 0) throw new AccessError(400, "ราคาต่อหน่วยต้องไม่ติดลบ");
      const isVatExempt = Boolean(item.isVatExempt);

      const lineSatang = Math.round(unitPrice * qty * 100);
      if (isVatExempt) {
        nonVatSatang += lineSatang;
      } else {
        taxableSatang += lineSatang;
      }

      processedItems.push({
        name,
        qty,
        unitPrice,
        total: lineSatang / 100,
        isVatExempt,
      });
    }

    const vatSatang = Math.round(taxableSatang * 0.07);
    const grandTotalSatang = taxableSatang + vatSatang + nonVatSatang;

    const taxableSubtotal = taxableSatang / 100;
    const nonVatSubtotal = nonVatSatang / 100;
    const vatAmount = vatSatang / 100;
    const grandTotal = grandTotalSatang / 100;
    const thaiWords = bahtText(grandTotal);

    const now = new Date();
    const yyyymm = bangkokYYYYMM(now);

    const created = await prisma.$transaction(async (tx) => {
      // Find or create Customer for the B2B buyer
      let customer = await tx.customer.findFirst({
        where: {
          tenantId: actor.tenantId,
          nationalId: taxId,
        },
      });

      if (!customer) {
        // Fallback search by company name or phone
        const cleanPhone = String(body.phone || `02${taxId.slice(-7)}`).trim();
        customer = await tx.customer.findFirst({
          where: {
            tenantId: actor.tenantId,
            phone: cleanPhone,
          },
        });
        if (!customer) {
          customer = await tx.customer.create({
            data: {
              tenantId: actor.tenantId,
              name: companyName,
              phone: cleanPhone,
              nationalId: taxId,
              address,
            },
          });
        } else {
          customer = await tx.customer.update({
            where: { id: customer.id },
            data: {
              name: companyName,
              nationalId: taxId,
              address,
            },
          });
        }
      }

      // Concurrency-safe atomic invoice numbering
      const counter = await tx.sequenceCounter.upsert({
        where: { id: `B2B-${yyyymm}` },
        update: { current: { increment: 1 } },
        create: { id: `B2B-${yyyymm}`, current: 1, tenantId: actor.tenantId },
      });
      const invoiceNo = `B2B-${yyyymm}-${String(counter.current).padStart(4, "0")}`;

      // Find or create default Product for line items
      const saleItemCreates = [];
      for (const it of processedItems) {
        let prod = await tx.product.findFirst({
          where: {
            tenantId: actor.tenantId,
            name: it.name,
          },
        });
        if (!prod) {
          const codeSuffix = Math.floor(1000 + Math.random() * 9000);
          prod = await tx.product.create({
            data: {
              tenantId: actor.tenantId,
              code: `SVC-B2B-${codeSuffix}`,
              name: it.name,
              category: "SERVICE",
              costPrice: round2(it.unitPrice * 0.7),
              sellPrice: it.unitPrice,
              minStock: 0,
            },
          });
        }
        saleItemCreates.push({
          tenantId: actor.tenantId,
          productId: prod.id,
          quantity: it.qty,
          unitPrice: it.unitPrice,
          subtotal: it.total,
        });
      }

      const b2bMeta = {
        type: "B2B",
        companyName,
        taxId,
        branchCode: branchIdStr,
        address,
        poNumber,
        issueDate: bangkokDateString(now),
        dueDate: dueDate || bangkokDateString(new Date(now.getTime() + 30 * 86_400_000)),
        status: "SENT",
        taxableSubtotal,
        nonVatSubtotal,
        vatAmount,
        grandTotal,
        bahtText: thaiWords,
        items: processedItems,
      };

      const sale = await tx.sale.create({
        data: {
          tenantId: actor.tenantId,
          invoiceNo,
          branchId: sellerBranch.id,
          customerId: customer.id,
          cashierId: actor.id,
          totalAmount: taxableSubtotal + nonVatSubtotal,
          discount: 0,
          vatAmount,
          netAmount: grandTotal,
          paymentMethod: "INVOICE",
          paymentDetails: JSON.stringify(b2bMeta),
          status: "COMPLETED",
          items: {
            create: saleItemCreates,
          },
        },
        include: {
          customer: true,
          branch: true,
          items: { include: { product: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          module: "INVOICE",
          action: "CREATE",
          targetId: sale.id,
          details: JSON.stringify({
            invoiceNo,
            companyName,
            taxId,
            branchCode: branchIdStr,
            grandTotal,
            vatAmount,
          }),
        },
      });

      return {
        id: sale.id,
        invoiceNo: sale.invoiceNo,
        companyName,
        taxId,
        branchId: branchIdStr,
        address,
        poNumber,
        issueDate: b2bMeta.issueDate,
        dueDate: b2bMeta.dueDate,
        status: "SENT",
        items: processedItems,
        taxableSubtotal,
        nonVatSubtotal,
        subtotal: taxableSubtotal + nonVatSubtotal,
        vatAmount,
        grandTotal,
        bahtText: thaiWords,
      };
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    return safeError(err);
  }
}

async function handlePATCH(request: NextRequest) {
  try {
    const actor = staffContext();
    const body = await readJson(request);
    const invoiceId = reqId(body.id, "id");
    const nextStatus = String(body.status || "PAID").trim().toUpperCase();

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: {
          id: invoiceId,
          tenantId: actor.tenantId,
        },
      });
      if (!sale) throw new AccessError(404, "ไม่พบข้อมูลใบแจ้งหนี้");

      let meta: any = {};
      try {
        if (sale.paymentDetails) meta = JSON.parse(sale.paymentDetails);
      } catch {
        meta = {};
      }

      meta.status = nextStatus;
      if (nextStatus === "PAID") {
        meta.paidAt = new Date().toISOString();
      }

      const updated = await tx.sale.update({
        where: { id: invoiceId },
        data: {
          paymentDetails: JSON.stringify(meta),
          status: nextStatus === "VOID" ? "VOID" : "COMPLETED",
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          module: "INVOICE",
          action: nextStatus === "PAID" ? "PAYMENT" : "STATUS_UPDATE",
          targetId: invoiceId,
          details: JSON.stringify({ invoiceNo: sale.invoiceNo, previousStatus: meta.status, newStatus: nextStatus }),
        },
      });

      return { id: updated.id, invoiceNo: updated.invoiceNo, status: nextStatus };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return safeError(err);
  }
}

export const GET = withStaff(handleGET, ["ADMIN", "MANAGER", "CASHIER"]);
export const POST = withStaff(handlePOST, ["ADMIN", "MANAGER", "CASHIER"]);
export const PATCH = withStaff(handlePATCH, ["ADMIN", "MANAGER", "CASHIER"]);
