import { AccessError, staffContext } from "@/lib/staff-context";
import { readJson, safeError, withStaff, reqInt, takeParam } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface WarrantyItem {
  id: string;
  sourceType: "SALE" | "REPAIR";
  imei: string;
  productName: string;
  brand: string;
  model: string;
  customerName: string;
  customerPhone: string;
  invoiceNo: string;
  branchName: string;
  branchCode: string;
  purchaseDate: string; // ISO date
  warrantyDays: number;
  expiryDate: string; // ISO date
  daysRemaining: number;
  status: "ACTIVE" | "EXPIRED";
  provider: string;
  claims: Array<{
    claimNo: string;
    date: string;
    symptom: string;
    resolution: string;
    status: string;
  }>;
}

// GET /api/warranty?search=...&status=ACTIVE|EXPIRED|ALL&branch=...
async function handleGET(request: NextRequest) {
  try {
    const actor = staffContext();
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const statusFilter = searchParams.get("status") || "ALL";
    const branchCode = searchParams.get("branch")?.trim() || "";
    const take = takeParam(searchParams.get("take"), 200, 500);

    let branchIdFilter: string | undefined = undefined;
    if (branchCode) {
      const branch = await prisma.branch.findFirst({
        where: { tenantId: actor.tenantId, OR: [{ code: branchCode }, { id: branchCode }] },
        select: { id: true },
      });
      if (!branch || !actor.branchIds.includes(branch.id)) {
        throw new AccessError(404, "ไม่พบสาขาหรือไม่ได้รับอนุญาต");
      }
      branchIdFilter = branch.id;
    }

    const now = new Date();

    // 1. Fetch Sales with IMEIs or Items (Sales warranty)
    const sales = await prisma.sale.findMany({
      where: {
        tenantId: actor.tenantId,
        status: "COMPLETED",
        ...(branchIdFilter ? { branchId: branchIdFilter } : { branchId: { in: actor.branchIds } }),
      },
      include: {
        branch: { select: { id: true, code: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
        items: {
          include: {
            product: { select: { id: true, code: true, name: true, brand: true, model: true, category: true } },
            deviceImei: { select: { id: true, imei: true, serialNo: true, conditionGrade: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
    });

    // 2. Fetch completed repairs (Repair warranty)
    const repairs = await prisma.repairJob.findMany({
      where: {
        tenantId: actor.tenantId,
        status: "COMPLETED",
        completedAt: { not: null },
        ...(branchIdFilter ? { branchId: branchIdFilter } : { branchId: { in: actor.branchIds } }),
      },
      include: {
        branch: { select: { id: true, code: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { completedAt: "desc" },
      take,
    });

    // 3. Fetch Warranty Claims from AuditLog
    const claimLogs = await prisma.auditLog.findMany({
      where: {
        tenantId: actor.tenantId,
        module: "WARRANTY",
        action: "CLAIM",
      },
      orderBy: { createdAt: "desc" },
    });

    const claimsByTarget = new Map<string, Array<{ claimNo: string; date: string; symptom: string; resolution: string; status: string }>>();
    for (const log of claimLogs) {
      if (!log.targetId) continue;
      let details: any = {};
      try { details = JSON.parse(log.details); } catch { /* ignore */ }
      const entry = {
        claimNo: details.claimNo || `CLM-${log.createdAt.toISOString().slice(0, 10).replace(/-/g, "")}-${log.id.slice(-4)}`,
        date: log.createdAt.toISOString().slice(0, 10),
        symptom: details.symptom || details.reason || "ไม่ระบุอาการ",
        resolution: details.resolution || "รับเรื่องส่งตรวจสอบช่างซ่อม",
        status: details.status || "PENDING",
      };
      const list = claimsByTarget.get(log.targetId) || [];
      list.push(entry);
      claimsByTarget.set(log.targetId, list);
    }

    const warrantyList: WarrantyItem[] = [];

    // Process Sales Items
    for (const sale of sales) {
      for (const item of sale.items) {
        // Only include serialized devices or accessories with warranty
        const imei = item.deviceImei?.imei || "";
        const defaultWarrantyDays = item.product.category === "DEVICE" ? 90 : 30;
        const purchaseDate = sale.createdAt;
        const expiryDate = new Date(purchaseDate.getTime() + defaultWarrantyDays * 86400000);
        const diffMs = expiryDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffMs / 86400000);
        const status = daysRemaining >= 0 ? "ACTIVE" : "EXPIRED";

        const customerName = sale.customer?.name || "ลูกค้าทั่วไป";
        const customerPhone = sale.customer?.phone || "-";
        const targetKey = imei || sale.invoiceNo;
        const claims = claimsByTarget.get(targetKey) || claimsByTarget.get(imei) || claimsByTarget.get(sale.invoiceNo) || [];

        warrantyList.push({
          id: `sale-${item.id}`,
          sourceType: "SALE",
          imei: imei || "-",
          productName: item.product.name,
          brand: item.product.brand || "-",
          model: item.product.model || "-",
          customerName,
          customerPhone,
          invoiceNo: sale.invoiceNo,
          branchName: sale.branch.name,
          branchCode: sale.branch.code,
          purchaseDate: purchaseDate.toISOString(),
          warrantyDays: defaultWarrantyDays,
          expiryDate: expiryDate.toISOString(),
          daysRemaining: Math.max(0, daysRemaining),
          status,
          provider: item.product.category === "DEVICE"
            ? `FixMe Shop Warranty (ประกันร้าน ${defaultWarrantyDays} วัน)`
            : `ประกันสินค้าหน้าร้าน (${defaultWarrantyDays} วัน)`,
          claims,
        });
      }
    }

    // Process Completed Repairs
    for (const rep of repairs) {
      if (!rep.completedAt) continue;
      const imei = rep.serialIMEI || "-";
      const warrantyDays = rep.warrantyDays || 90;
      const completionDate = rep.completedAt;
      const expiryDate = new Date(completionDate.getTime() + warrantyDays * 86400000);
      const diffMs = expiryDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffMs / 86400000);
      const status = daysRemaining >= 0 ? "ACTIVE" : "EXPIRED";

      const customerName = rep.customer?.name || "ลูกค้าทั่วไป";
      const customerPhone = rep.customer?.phone || "-";
      const targetKey = rep.trackingCode || imei;
      const claims = claimsByTarget.get(targetKey) || claimsByTarget.get(imei) || [];

      warrantyList.push({
        id: `repair-${rep.id}`,
        sourceType: "REPAIR",
        imei,
        productName: `งานซ่อม: ${rep.deviceBrand} ${rep.deviceModel} (${rep.issueDescription.slice(0, 40)})`,
        brand: rep.deviceBrand,
        model: rep.deviceModel,
        customerName,
        customerPhone,
        invoiceNo: rep.trackingCode,
        branchName: rep.branch.name,
        branchCode: rep.branch.code,
        purchaseDate: completionDate.toISOString(),
        warrantyDays,
        expiryDate: expiryDate.toISOString(),
        daysRemaining: Math.max(0, daysRemaining),
        status,
        provider: `ประกันงานซ่อม FixMe (${warrantyDays} วัน)`,
        claims,
      });
    }

    // Filter by search & status
    const filtered = warrantyList.filter((w) => {
      if (statusFilter !== "ALL" && w.status !== statusFilter) return false;
      if (search) {
        const matchesImei = w.imei.toLowerCase().includes(search);
        const matchesProduct = w.productName.toLowerCase().includes(search);
        const matchesCustomer = w.customerName.toLowerCase().includes(search);
        const matchesPhone = w.customerPhone.toLowerCase().includes(search);
        const matchesInvoice = w.invoiceNo.toLowerCase().includes(search);
        return matchesImei || matchesProduct || matchesCustomer || matchesPhone || matchesInvoice;
      }
      return true;
    });

    return NextResponse.json({ success: true, warranties: filtered });
  } catch (error) {
    return safeError(error);
  }
}

// POST /api/warranty - Register or extend warranty, or file a warranty claim
async function handlePOST(request: NextRequest) {
  try {
    const actor = staffContext();
    const body = await readJson(request);

    // Flow 1: File a Warranty Claim
    if (body.action === "CLAIM" || body.claimSymptom) {
      const { targetId, imei, invoiceNo, symptom, customerName, customerPhone, branchCode } = body;
      const claimReason = symptom || body.claimSymptom;
      if (!claimReason?.trim()) {
        return NextResponse.json({ success: false, error: "กรุณาระบุอาการที่ต้องการเคลม" }, { status: 400 });
      }

      const lookupKey = (targetId || imei || invoiceNo || "").trim();
      if (!lookupKey) {
        return NextResponse.json({ success: false, error: "กรุณาระบุหมายเลข IMEI หรือเลขที่ใบเสร็จ" }, { status: 400 });
      }

      // Generate sequential claim number
      const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const claimNo = `CLM-${datePrefix}-${randomSuffix}`;

      // Record claim in AuditLog
      const log = await prisma.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          module: "WARRANTY",
          action: "CLAIM",
          targetId: lookupKey,
          details: JSON.stringify({
            claimNo,
            imei: imei || lookupKey,
            invoiceNo: invoiceNo || null,
            symptom: claimReason.trim(),
            customerName: customerName || null,
            customerPhone: customerPhone || null,
            branchCode: branchCode || null,
            status: "IN_REVIEW",
          }),
        },
      });

      return NextResponse.json({
        success: true,
        message: `เปิดคำขอเคลมประกันสำเร็จ (หมายเลขเคลม: ${claimNo})`,
        claim: {
          claimNo,
          date: log.createdAt.toISOString().slice(0, 10),
          symptom: claimReason.trim(),
          resolution: "รับเรื่องเรียบร้อย เจ้าหน้าที่จะติดต่อกลับ",
          status: "IN_REVIEW",
        },
      });
    }

    // Flow 2: Register / Extend Warranty
    const { imei, invoiceNo, warrantyDays, notes } = body;
    if (!imei && !invoiceNo) {
      return NextResponse.json({ success: false, error: "กรุณาระบุ IMEI หรือเลขที่ใบเสร็จ" }, { status: 400 });
    }

    const days = reqInt(warrantyDays || 90, "warrantyDays", 1, 3650);

    const log = await prisma.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "WARRANTY",
        action: "REGISTER",
        targetId: imei || invoiceNo,
        details: JSON.stringify({
          imei: imei || null,
          invoiceNo: invoiceNo || null,
          warrantyDays: days,
          notes: notes || "ลงทะเบียน/ต่ออายุประกันสินค้า",
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `บันทึกการรับประกันเรียบร้อย (${days} วัน)`,
      id: log.id,
    });
  } catch (error) {
    return safeError(error);
  }
}

export const GET = withStaff(handleGET, ["ADMIN", "MANAGER", "CASHIER", "TECHNICIAN"]);
export const POST = withStaff(handlePOST, ["ADMIN", "MANAGER", "CASHIER", "TECHNICIAN"]);
