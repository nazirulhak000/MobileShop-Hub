import { AccessError, staffContext } from "@/lib/staff-context";
import { readJson, safeError, withStaff } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  normalizePhone,
  packCustomerAddress,
  unpackCustomerAddress,
  calculateCustomerLTV,
  determineCustomerTier,
} from "@/lib/customer-utils";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/customers/[id]
async function handleGET(request: NextRequest, { params }: RouteParams) {
  try {
    const actor = staffContext();
    const { id } = await params;

    const customer = await prisma.customer.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: {
        repairJobs: {
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            trackingCode: true,
            deviceBrand: true,
            deviceModel: true,
            deviceColor: true,
            serialIMEI: true,
            status: true,
            totalCost: true,
            estimatedCost: true,
            laborFee: true,
            warrantyDays: true,
            createdAt: true,
            completedAt: true,
            issueDescription: true,
            technician: { select: { id: true, name: true } },
          },
        },
        sales: {
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            invoiceNo: true,
            netAmount: true,
            status: true,
            paymentMethod: true,
            createdAt: true,
            items: {
              select: {
                id: true,
                quantity: true,
                unitPrice: true,
                subtotal: true,
                product: { select: { name: true, code: true } },
                deviceImei: { select: { imei: true } },
              },
            },
          },
        },
        installmentContracts: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            contractNo: true,
            deviceModel: true,
            imei: true,
            totalPrice: true,
            downPayment: true,
            financedAmount: true,
            monthlyPayment: true,
            paidMonths: true,
            termMonths: true,
            status: true,
            isOverdue: true,
            overdueDays: true,
            nextDueDate: true,
          },
        },
        tradeInContracts: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            contractNo: true,
            type: true,
            deviceBrand: true,
            deviceModel: true,
            imei: true,
            agreedPrice: true,
            interestRateMonthly: true,
            durationMonths: true,
            dueDate: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            repairJobs: true,
            sales: true,
            tradeInContracts: true,
            installmentContracts: true,
          },
        },
      },
    });

    if (!customer) {
      throw new AccessError(404, "ไม่พบข้อมูลลูกค้า");
    }

    const meta = unpackCustomerAddress(customer.address);
    const ltv = calculateCustomerLTV(customer.sales, customer.repairJobs);

    const activeDebts = customer.installmentContracts
      .filter((ins) => ["ACTIVE", "OVERDUE"].includes(ins.status))
      .reduce((sum, ins) => sum + Math.max(0, (ins.termMonths - ins.paidMonths) * ins.monthlyPayment), 0);
    const hasOverdueDebt = customer.installmentContracts.some((ins) => ins.isOverdue);

    const tier = determineCustomerTier(ltv.totalSpend, ltv.totalOrders, meta.tag);

    // Aggregate warranties
    const now = new Date().getTime();
    const warranties = customer.repairJobs
      .filter((job) => job.status === "COMPLETED")
      .map((job) => {
        const wDays = job.warrantyDays || 90;
        const start = new Date(job.completedAt || job.createdAt).getTime();
        const expiry = start + wDays * 24 * 60 * 60 * 1000;
        const daysRemaining = Math.max(0, Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)));
        const isExpired = daysRemaining <= 0;
        return {
          id: job.id,
          type: "REPAIR" as const,
          trackingCode: job.trackingCode,
          device: `${job.deviceBrand} ${job.deviceModel}`,
          serialIMEI: job.serialIMEI || "-",
          warrantyDays: wDays,
          startDate: new Date(start).toISOString(),
          expiryDate: new Date(expiry).toISOString(),
          daysRemaining,
          status: isExpired ? "EXPIRED" : "ACTIVE",
        };
      });

    const formatted = {
      ...customer,
      address: meta.address,
      email: meta.email,
      tag: meta.tag,
      notes: meta.notes,
      taxId: customer.nationalId || "",
      totalSpend: ltv.totalSpend,
      totalSalesSpend: ltv.totalSalesSpend,
      totalRepairSpend: ltv.totalRepairSpend,
      totalOrders: ltv.totalOrders,
      activeDebts: Math.round(activeDebts * 100) / 100,
      hasOverdueDebt,
      tier,
      warranties,
    };

    return NextResponse.json({ success: true, customer: formatted, data: formatted });
  } catch (error) {
    return safeError(error);
  }
}

// PATCH /api/customers/[id]
async function handlePATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const actor = staffContext();
    const { id } = await params;

    const existing = await prisma.customer.findFirst({
      where: { id, tenantId: actor.tenantId },
    });

    if (!existing) {
      throw new AccessError(404, "ไม่พบข้อมูลลูกค้า");
    }

    const body = await readJson(request);
    const { name, phone, nationalId, taxId, lineId, address, email, tag, notes } = body;

    let cleanPhone = existing.phone;
    if (phone !== undefined) {
      cleanPhone = normalizePhone(phone);
      if (!cleanPhone || cleanPhone.length < 9) {
        return NextResponse.json(
          { success: false, error: "เบอร์โทรศัพท์ไม่ถูกต้อง (ต้องมีอย่างน้อย 9-10 หลัก)" },
          { status: 400 }
        );
      }

      // Check duplicate phone in same tenant
      if (cleanPhone !== existing.phone) {
        const duplicate = await prisma.customer.findFirst({
          where: {
            tenantId: actor.tenantId,
            phone: cleanPhone,
            id: { not: id },
          },
        });
        if (duplicate) {
          return NextResponse.json(
            {
              success: false,
              error: `เบอร์โทรศัพท์ ${cleanPhone} ถูกใช้งานโดยลูกค้ารายอื่นแล้ว (${duplicate.name})`,
            },
            { status: 409 }
          );
        }
      }
    }

    const currentMeta = unpackCustomerAddress(existing.address);
    const updatedAddress = packCustomerAddress({
      address: address !== undefined ? address : currentMeta.address,
      email: email !== undefined ? email : currentMeta.email,
      tag: tag !== undefined ? tag : currentMeta.tag,
      notes: notes !== undefined ? notes : currentMeta.notes,
    });

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: name !== undefined ? String(name).trim() : existing.name,
        phone: cleanPhone,
        nationalId: (nationalId !== undefined || taxId !== undefined) ? (nationalId || taxId ? String(nationalId || taxId).trim() : null) : existing.nationalId,
        lineId: lineId !== undefined ? (lineId ? String(lineId).trim() : null) : existing.lineId,
        address: updatedAddress,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        action: "UPDATE_CUSTOMER",
        module: "CRM",
        details: JSON.stringify({
          customerId: id,
          updatedFields: Object.keys(body),
        }),
      },
    });

    const meta = unpackCustomerAddress(updated.address);

    return NextResponse.json({
      success: true,
      customer: {
        ...updated,
        address: meta.address,
        email: meta.email,
        tag: meta.tag,
        notes: meta.notes,
        taxId: updated.nationalId || "",
      },
    });
  } catch (error) {
    return safeError(error);
  }
}

// DELETE /api/customers/[id]
async function handleDELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const actor = staffContext();
    const { id } = await params;

    const customer = await prisma.customer.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: {
        _count: {
          select: {
            repairJobs: true,
            sales: true,
            installmentContracts: true,
            tradeInContracts: true,
          },
        },
        repairJobs: {
          where: { status: { in: ["PENDING", "DIAGNOSING", "WAITING_PARTS", "REPAIRING", "QC_PASSED", "READY"] } },
          select: { id: true, trackingCode: true },
        },
        installmentContracts: {
          where: { status: { in: ["ACTIVE", "OVERDUE"] } },
          select: { id: true, contractNo: true },
        },
        tradeInContracts: {
          where: { status: "ACTIVE" },
          select: { id: true, contractNo: true },
        },
      },
    });

    if (!customer) {
      throw new AccessError(404, "ไม่พบข้อมูลลูกค้า");
    }

    // Safety checks: Guarded deletion
    if (customer.repairJobs.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `ไม่สามารถลบข้อมูลลูกค้าได้ เนื่องจากมีงานซ่อมที่กำลังดำเนินการอยู่ (${customer.repairJobs[0].trackingCode})`,
        },
        { status: 400 }
      );
    }

    if (customer.installmentContracts.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `ไม่สามารถลบข้อมูลลูกค้าได้ เนื่องจากมีสัญญาผ่อนชำระที่ยังไม่เสร็จสิ้น (${customer.installmentContracts[0].contractNo})`,
        },
        { status: 400 }
      );
    }

    if (customer.tradeInContracts.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `ไม่สามารถลบข้อมูลลูกค้าได้ เนื่องจากมีสัญญาจำนำ/เทิร์นที่ยังดำเนินการอยู่ (${customer.tradeInContracts[0].contractNo})`,
        },
        { status: 400 }
      );
    }

    // If customer has completed transactions, prevent accidental deletion to protect audit integrity
    const totalTransactions =
      (customer._count.repairJobs ?? 0) +
      (customer._count.sales ?? 0) +
      (customer._count.installmentContracts ?? 0) +
      (customer._count.tradeInContracts ?? 0);

    if (totalTransactions > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `ไม่สามารถลบข้อมูลลูกค้าที่มีประวัติธุรกรรมหรือใบเสร็จทางการเงินได้ (แนะนำให้เปลี่ยนสถานะเป็น Blacklist หรือบันทึกหมายเหตุแทน)`,
        },
        { status: 400 }
      );
    }

    await prisma.customer.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        action: "DELETE_CUSTOMER",
        module: "CRM",
        details: JSON.stringify({ customerId: id, name: customer.name, phone: customer.phone }),
      },
    });

    return NextResponse.json({ success: true, message: "ลบข้อมูลลูกค้าเรียบร้อยแล้ว" });
  } catch (error) {
    return safeError(error);
  }
}

export const GET = withStaff(handleGET, ["ADMIN", "MANAGER", "CASHIER", "TECHNICIAN"]);
export const PATCH = withStaff(handlePATCH, ["ADMIN", "MANAGER", "CASHIER"]);
export const PUT = withStaff(handlePATCH, ["ADMIN", "MANAGER", "CASHIER"]);
export const DELETE = withStaff(handleDELETE, ["ADMIN", "MANAGER"]);
