import { AccessError, staffTenantId, staffContext } from "@/lib/staff-context";
import { readJson, safeError, withStaff, reqInt } from "@/lib/staff-http";
import { throttle } from "@/lib/staff-auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  normalizePhone,
  packCustomerAddress,
  unpackCustomerAddress,
  calculateCustomerLTV,
  determineCustomerTier,
  CustomerTag,
} from "@/lib/customer-utils";

export const dynamic = "force-dynamic";

// GET /api/customers?search=...&tag=...&sort=...&page=...&limit=...
async function handleGET(request: NextRequest) {
  try {
    const actor = staffContext();
    const tenantId = actor.tenantId;
    const { searchParams } = new URL(request.url);

    // Backwards compatibility with ?id=...
    const id = searchParams.get("id");
    if (id) {
      const customer = await prisma.customer.findFirst({
        where: { id, tenantId },
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
                  quantity: true,
                  unitPrice: true,
                  subtotal: true,
                  product: { select: { name: true, code: true } },
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
              status: true,
              createdAt: true,
              dueDate: true,
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

      // Unpack metadata
      const meta = unpackCustomerAddress(customer.address);
      const ltv = calculateCustomerLTV(customer.sales, customer.repairJobs);

      // Active Debt / Remaining Installments
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

      return NextResponse.json({
        success: true,
        customer: {
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
        },
      });
    }

    // 2. Customer List View
    const search = (searchParams.get("search") || searchParams.get("q") || "").trim();
    const tagFilter = searchParams.get("tag") || searchParams.get("tier") || "ALL";
    const sort = searchParams.get("sort") || "latest"; // latest, oldest, spend_desc, spend_asc, name_asc, name_desc
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || searchParams.get("take") || "20", 10) || 20));

    const where: any = { tenantId };

    if (search) {
      const normalizedDigits = normalizePhone(search);
      const orConditions: any[] = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { lineId: { contains: search } },
        { nationalId: { contains: search } },
        { address: { contains: search } },
      ];

      // If search contains digits (e.g. 081-234-5678), match normalized phone or nationalId
      if (normalizedDigits.length >= 3) {
        orConditions.push({ phone: { contains: normalizedDigits } });
        orConditions.push({ nationalId: { contains: normalizedDigits } });
      }

      where.OR = orConditions;
    }

    // Fetch all customers matching search in tenant
    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: {
          select: {
            repairJobs: true,
            sales: true,
            tradeInContracts: true,
            installmentContracts: true,
          },
        },
        sales: {
          where: { status: "COMPLETED" },
          select: { netAmount: true },
        },
        repairJobs: {
          where: { status: "COMPLETED" },
          select: { totalCost: true },
        },
        installmentContracts: {
          where: { status: { in: ["ACTIVE", "OVERDUE"] } },
          select: { monthlyPayment: true, termMonths: true, paidMonths: true, isOverdue: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Format and calculate LTV, active debts, tier, tags
    let formattedCustomers = customers.map(({ sales, repairJobs, installmentContracts, address, ...c }) => {
      const meta = unpackCustomerAddress(address);
      const ltv = calculateCustomerLTV(sales, repairJobs);

      const activeDebts = installmentContracts.reduce(
        (sum, ins) => sum + Math.max(0, (ins.termMonths - ins.paidMonths) * ins.monthlyPayment),
        0
      );
      const hasOverdueDebt = installmentContracts.some((ins) => ins.isOverdue);
      const tier = determineCustomerTier(ltv.totalSpend, ltv.totalOrders, meta.tag);

      return {
        ...c,
        address: meta.address,
        email: meta.email,
        tag: meta.tag,
        notes: meta.notes,
        taxId: c.nationalId || "",
        totalSpend: ltv.totalSpend,
        totalSalesSpend: ltv.totalSalesSpend,
        totalRepairSpend: ltv.totalRepairSpend,
        totalOrders: ltv.totalOrders,
        activeDebts: Math.round(activeDebts * 100) / 100,
        hasOverdueDebt,
        tier,
      };
    });

    // Tag / Tier Filter
    if (tagFilter && tagFilter !== "ALL") {
      const upperFilter = tagFilter.toUpperCase();
      if (upperFilter === "VIP") {
        formattedCustomers = formattedCustomers.filter((c) => c.tier === "VIP" || c.tag === "VIP");
      } else if (upperFilter === "REGULAR") {
        formattedCustomers = formattedCustomers.filter((c) => c.tier === "REGULAR" || c.tag === "REGULAR");
      } else if (upperFilter === "WHOLESALE") {
        formattedCustomers = formattedCustomers.filter((c) => c.tag === "WHOLESALE");
      } else if (upperFilter === "BLACKLIST") {
        formattedCustomers = formattedCustomers.filter((c) => c.tag === "BLACKLIST");
      } else if (upperFilter === "NEW") {
        formattedCustomers = formattedCustomers.filter((c) => c.tier === "NEW");
      } else if (upperFilter === "DEBT") {
        formattedCustomers = formattedCustomers.filter((c) => c.activeDebts > 0);
      } else if (upperFilter === "REPAIR") {
        formattedCustomers = formattedCustomers.filter((c) => (c._count?.repairJobs ?? 0) > 0);
      }
    }

    // Sorting
    if (sort === "spend_desc") {
      formattedCustomers.sort((a, b) => b.totalSpend - a.totalSpend);
    } else if (sort === "spend_asc") {
      formattedCustomers.sort((a, b) => a.totalSpend - b.totalSpend);
    } else if (sort === "oldest") {
      formattedCustomers.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sort === "name_asc") {
      formattedCustomers.sort((a, b) => a.name.localeCompare(b.name, "th"));
    } else if (sort === "name_desc") {
      formattedCustomers.sort((a, b) => b.name.localeCompare(a.name, "th"));
    } else {
      // "latest" default by createdAt desc
      formattedCustomers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // Pagination
    const totalCount = formattedCustomers.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const startIndex = (page - 1) * limit;
    const paginatedCustomers = formattedCustomers.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      customers: paginatedCustomers,
      data: paginatedCustomers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    return safeError(error);
  }
}

// POST /api/customers - Create customer with duplicate check & normalization
async function handlePOST(request: NextRequest) {
  try {
    const actor = staffContext();
    const tenantId = actor.tenantId;
    await throttle(`staff-customers:${tenantId}`, 60, 60_000);

    const body = await readJson(request);
    const { name, phone, nationalId, taxId, lineId, address, email, tag, notes } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุชื่อและเบอร์โทรศัพท์ลูกค้า" },
        { status: 400 }
      );
    }

    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length < 9) {
      return NextResponse.json(
        { success: false, error: "เบอร์โทรศัพท์ไม่ถูกต้อง (ต้องมีอย่างน้อย 9-10 หลัก)" },
        { status: 400 }
      );
    }

    const cleanName = String(name).trim();
    const cleanNationalId = (nationalId || taxId) ? String(nationalId || taxId).trim() : null;
    const cleanLineId = lineId ? String(lineId).trim() : null;

    // Block duplicate customer creation with identical phone in same tenant
    const existingCustomer = await prisma.customer.findFirst({
      where: { tenantId, phone: cleanPhone },
    });

    if (existingCustomer) {
      return NextResponse.json(
        {
          success: false,
          error: `เบอร์โทรศัพท์ ${cleanPhone} มีอยู่ในระบบแล้ว (ชื่อ: ${existingCustomer.name})`,
        },
        { status: 409 }
      );
    }

    // Pack address with metadata (email, tag, notes)
    const packedAddress = packCustomerAddress({
      address: address ? String(address).trim() : "",
      email: email ? String(email).trim() : "",
      tag: tag || "REGULAR",
      notes: notes ? String(notes).trim() : "",
    });

    const customer = await prisma.customer.create({
      data: {
        tenantId,
        name: cleanName,
        phone: cleanPhone,
        nationalId: cleanNationalId,
        lineId: cleanLineId,
        address: packedAddress,
      },
    });

    // Audit Trail
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: actor.id,
        action: "CREATE_CUSTOMER",
        module: "CRM",
        details: JSON.stringify({
          customerId: customer.id,
          name: cleanName,
          phone: cleanPhone,
          tag: tag || "REGULAR",
        }),
      },
    });

    const meta = unpackCustomerAddress(customer.address);

    const formatted = {
      ...customer,
      address: meta.address,
      email: meta.email,
      tag: meta.tag,
      notes: meta.notes,
      taxId: customer.nationalId || "",
      totalSpend: 0,
      activeDebts: 0,
      hasOverdueDebt: false,
      tier: (meta.tag === "VIP" || meta.tag === "WHOLESALE" || meta.tag === "BLACKLIST") ? meta.tag : "NEW",
    };

    return NextResponse.json({ success: true, customer: formatted, data: formatted });
  } catch (error) {
    return safeError(error);
  }
}

export const GET = withStaff(handleGET, ["ADMIN", "MANAGER", "CASHIER", "TECHNICIAN"]);
export const POST = withStaff(handlePOST, ["ADMIN", "MANAGER", "CASHIER"]);
