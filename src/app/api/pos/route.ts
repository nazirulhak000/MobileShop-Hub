import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AccessError, staffContext } from "@/lib/staff-context";
import { withStaff, bangkokYYYYMM, readJson } from "@/lib/staff-http";
import { calculateVAT } from "@/lib/tax";

export const dynamic = "force-dynamic";

const round2 = (n: number) => Math.round(n * 100) / 100;

// POST /api/pos - Process Checkout & Create Invoice
async function handlePOST(request: NextRequest) {
  const actor = staffContext();
  const body = await readJson(request);
  const {
    branchCode,
    customerData,
    items,
    discount = 0,
    vatMode = "INCLUSIVE", // INCLUSIVE | EXCLUSIVE | EXEMPT
    paymentMethod = "CASH",
    paymentDetails = null,
  } = body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new AccessError(400, "ไม่มีสินค้าในตะกร้า");
  }

  // 1. Resolve branch scoped to tenant and staff permissions
  const targetBranch = branchCode || actor.branchId;
  const branch = await prisma.branch.findFirst({
    where: {
      tenantId: actor.tenantId,
      OR: [{ code: targetBranch }, { id: targetBranch }],
    },
  });
  if (!branch || !actor.branchIds.includes(branch.id)) {
    throw new AccessError(404, "ไม่พบข้อมูลสาขาหรือไม่มีสิทธิ์ในสาขานี้");
  }

  // 2. Resolve or create customer if provided, strictly scoped to actor.tenantId
  let customerId: string | null = null;
  if (customerData?.phone && customerData?.name) {
    const cleanPhone = String(customerData.phone).replace(/[\s()-]/g, "");
    const cleanName = String(customerData.name).trim();
    if (cleanPhone.length >= 9) {
      let cust = await prisma.customer.findFirst({
        where: {
          tenantId: actor.tenantId,
          phone: cleanPhone,
        },
      });
      if (cust) {
        cust = await prisma.customer.update({
          where: { id: cust.id },
          data: {
            name: cleanName,
            nationalId: customerData.nationalId || undefined,
            address: customerData.address || undefined,
          },
        });
      } else {
        cust = await prisma.customer.create({
          data: {
            tenantId: actor.tenantId,
            name: cleanName,
            phone: cleanPhone,
            nationalId: customerData.nationalId || null,
            address: customerData.address || null,
          },
        });
      }
      customerId = cust.id;
    }
  } else if (customerData?.id) {
    const existingCust = await prisma.customer.findFirst({
      where: { id: customerData.id, tenantId: actor.tenantId },
      select: { id: true },
    });
    if (existingCust) {
      customerId = existingCust.id;
    }
  }

  // 3. Financial calculations with Satang precision
  let rawTotal = 0;
  let lineDiscountsTotal = 0;
  for (const it of items) {
    const qty = Number(it.quantity) || 1;
    const unitPrice = Number(it.unitPrice) || 0;
    const itemDisc = Math.max(0, Number(it.discount) || 0);
    rawTotal += round2(unitPrice * qty);
    lineDiscountsTotal += itemDisc;
  }
  const totalAmount = round2(rawTotal);
  lineDiscountsTotal = round2(lineDiscountsTotal);

  const billDiscount = Math.max(0, Number(discount) || 0);
  const totalDiscount = Math.min(totalAmount, round2(lineDiscountsTotal + billDiscount));
  const afterDiscount = Math.max(0, round2(totalAmount - totalDiscount));

  let netBeforeVat = afterDiscount;
  let vatAmount = 0;
  let netAmount = afterDiscount;

  if (vatMode === "INCLUSIVE") {
    const vatCalc = calculateVAT(afterDiscount, true, 0.07);
    netBeforeVat = vatCalc.base;
    vatAmount = vatCalc.vat;
    netAmount = vatCalc.total;
  } else if (vatMode === "EXCLUSIVE") {
    const vatCalc = calculateVAT(afterDiscount, false, 0.07);
    netBeforeVat = vatCalc.base;
    vatAmount = vatCalc.vat;
    netAmount = vatCalc.total;
  } else {
    // EXEMPT
    netBeforeVat = afterDiscount;
    vatAmount = 0;
    netAmount = afterDiscount;
  }

  // 4. Payment validation
  const validMethods = ["CASH", "PROMPTPAY", "CARD", "SPLIT"];
  if (!validMethods.includes(paymentMethod)) {
    throw new AccessError(400, "วิธีการชำระเงินไม่ถูกต้อง");
  }

  if (paymentMethod === "SPLIT") {
    const cashPart = Number(paymentDetails?.cashPart) || 0;
    const secPart = Number(paymentDetails?.secondaryPart) || 0;
    if (Math.abs(cashPart + secPart - netAmount) > 0.05) {
      throw new AccessError(
        400,
        `ยอดรวมแยกชำระ (${cashPart + secPart}) ไม่ตรงกับยอดสุทธิ (${netAmount})`
      );
    }
  }

  // 5. Atomic transaction: SequenceCounter + Sale + SaleItems + Stock decrement / IMEI status + AuditLog
  const createdSale = await prisma.$transaction(async (tx) => {
    // Generate unique sequential invoice number
    const yyyymm = bangkokYYYYMM();
    const prefix = `INV-${yyyymm}-`;
    let invoiceNo = "";
    let attempts = 0;
    while (attempts < 15) {
      attempts++;
      const counter = await tx.sequenceCounter.upsert({
        where: { id: `INV-${yyyymm}` },
        update: { current: { increment: 1 } },
        create: { id: `INV-${yyyymm}`, current: 1 },
      });
      invoiceNo = `${prefix}${String(counter.current).padStart(4, "0")}`;
      const exists = await tx.sale.findFirst({
        where: { invoiceNo, tenantId: actor.tenantId },
        select: { id: true },
      });
      if (!exists) break;
    }

    const sale = await tx.sale.create({
      data: {
        tenantId: actor.tenantId,
        invoiceNo,
        branchId: branch.id,
        customerId,
        cashierId: actor.id,
        totalAmount,
        discount: totalDiscount,
        vatAmount,
        netAmount,
        paymentMethod,
        paymentDetails: paymentDetails ? JSON.stringify(paymentDetails) : null,
        status: "COMPLETED",
      },
    });

    for (const it of items) {
      const qty = Number(it.quantity) || 1;
      const unitPrice = Number(it.unitPrice) || 0;
      const itemDisc = Math.max(0, Number(it.discount) || 0);
      const subtotal = round2(unitPrice * qty - itemDisc);

      const product = await tx.product.findFirst({
        where: { id: it.productId, tenantId: actor.tenantId },
      });
      if (!product) {
        throw new AccessError(404, `ไม่พบสินค้ารหัส ${it.productId}`);
      }

      await tx.saleItem.create({
        data: {
          tenantId: actor.tenantId,
          saleId: sale.id,
          productId: it.productId,
          deviceImeiId: it.deviceImeiId || null,
          quantity: qty,
          unitPrice,
          costPrice: Number(it.costPrice) || product.costPrice || 0,
          subtotal,
        },
      });

      // Stock deduction if not a non-inventory SERVICE item
      if (product.category !== "SERVICE") {
        const stock = await tx.stockItem.findUnique({
          where: {
            productId_branchId: {
              productId: it.productId,
              branchId: branch.id,
            },
          },
        });
        if (!stock || stock.quantity < qty) {
          throw new AccessError(
            400,
            `สินค้า "${product.name}" มีจำนวนในสต็อกสาขานี้ไม่เพียงพอ (คงเหลือ ${stock?.quantity ?? 0} ชิ้น, ต้องการ ${qty} ชิ้น)`
          );
        }
        await tx.stockItem.update({
          where: { id: stock.id },
          data: {
            quantity: { decrement: qty },
          },
        });
      }

      // If it's a device with IMEI, mark status as SOLD
      if (it.deviceImeiId) {
        const device = await tx.deviceIMEI.findFirst({
          where: { id: it.deviceImeiId, tenantId: actor.tenantId },
        });
        if (!device) {
          throw new AccessError(404, `ไม่พบเครื่อง IMEI ในระบบ`);
        }
        if (device.status !== "IN_STOCK") {
          throw new AccessError(
            409,
            `เครื่อง IMEI: ${device.imei} ไม่อยู่ในสถานะพร้อมขาย (${device.status})`
          );
        }
        if (device.branchId !== branch.id) {
          throw new AccessError(400, `เครื่อง IMEI: ${device.imei} ไม่อยู่ที่สาขานี้`);
        }
        await tx.deviceIMEI.update({
          where: { id: device.id },
          data: { status: "SOLD" },
        });
      }
    }

    // Security audit log
    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "POS",
        action: "SALE_CREATE",
        targetId: sale.id,
        severity: "INFO",
        details: JSON.stringify({
          invoiceNo: sale.invoiceNo,
          netAmount: sale.netAmount,
          itemCount: items.length,
          paymentMethod,
        }),
        afterJson: JSON.stringify({
          saleId: sale.id,
          invoiceNo: sale.invoiceNo,
          totalAmount,
          discount: totalDiscount,
          vatAmount,
          netAmount,
        }),
      },
    });

    return sale;
  });

  const fullSale = await prisma.sale.findUnique({
    where: { id: createdSale.id },
    include: {
      branch: true,
      cashier: { select: { id: true, name: true, username: true } },
      customer: true,
      items: {
        include: {
          product: true,
          deviceImei: true,
        },
      },
    },
  });

  return NextResponse.json({
    success: true,
    message: `บันทึกการขายสำเร็จ เลขที่ใบเสร็จ: ${createdSale.invoiceNo}`,
    sale: fullSale,
    taxCalculation: {
      totalAmount,
      discount: totalDiscount,
      vatMode,
      netBeforeVat,
      vatRate: vatMode === "EXEMPT" ? 0 : 7,
      vatAmount,
      netAmount,
    },
  });
}

export const POST = withStaff(handlePOST, ["ADMIN", "MANAGER", "CASHIER"]);
