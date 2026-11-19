import prisma from "@/lib/prisma";

export interface RepairFilters {
  status?: string;
  branchId?: string;
  technicianId?: string;
  search?: string;
}

export async function getRepairJobs(filters: RepairFilters = {}) {
  const where: any = {};

  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status;
  }

  if (filters.branchId && filters.branchId !== "ALL") {
    where.branchId = filters.branchId;
  }

  if (filters.technicianId && filters.technicianId !== "ALL") {
    where.technicianId = filters.technicianId;
  }

  if (filters.search) {
    const s = filters.search.trim();
    where.OR = [
      { trackingCode: { contains: s } },
      { serialIMEI: { contains: s } },
      { deviceBrand: { contains: s } },
      { deviceModel: { contains: s } },
      { customer: { name: { contains: s } } },
      { customer: { phone: { contains: s } } },
    ];
  }

  return await prisma.repairJob.findMany({
    where,
    include: {
      customer: true,
      branch: true,
      technician: true,
      partUsages: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getRepairJobById(id: string) {
  return await prisma.repairJob.findUnique({
    where: { id },
    include: {
      customer: true,
      branch: true,
      technician: true,
      partUsages: {
        include: {
          product: true,
        },
      },
    },
  });
}

export async function getRepairJobByTrackingCode(trackingCode: string) {
  return await prisma.repairJob.findUnique({
    where: { trackingCode },
    include: {
      customer: true,
      branch: true,
      technician: true,
      partUsages: {
        include: {
          product: true,
        },
      },
    },
  });
}

export async function generateNextTrackingCode(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `REP-${year}${month}-`;

  const latestJob = await prisma.repairJob.findFirst({
    where: {
      trackingCode: {
        startsWith: prefix,
      },
    },
    orderBy: {
      trackingCode: "desc",
    },
    select: {
      trackingCode: true,
    },
  });

  if (!latestJob) {
    return `${prefix}0001`;
  }

  const parts = latestJob.trackingCode.split("-");
  const lastSeq = parseInt(parts[2] || "0", 10);
  const nextSeq = String(lastSeq + 1).padStart(4, "0");
  return `${prefix}${nextSeq}`;
}
