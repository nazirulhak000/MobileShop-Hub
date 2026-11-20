import prisma from "@/lib/prisma";
import { staffContext, staffStorage } from "@/lib/staff-context";
import { bangkokYYYYMM } from "@/lib/staff-http";

export interface RepairFilters {
  tenantId?: string;
  status?: string;
  branchId?: string;
  technicianId?: string;
  search?: string;
  /** Max rows to return (default 200, capped at 500). */
  take?: number;
}

/** Public-safe user projection: never expose credentials or contact data of staff. */
export const staffUserSelect = { id: true, name: true } as const;

/** Customer projection for staff lists: no national ID / address. */
const customerListSelect = { id: true, name: true, phone: true } as const;

/**
 * RepairJob scalar fields returned by list endpoints.
 * Deliberately excludes `passcode`, `patternLock` (device unlock secrets),
 * and large base64 `customerSignature` payloads.
 */
const repairJobListScalars = {
  id: true,
  tenantId: true,
  trackingCode: true,
  branchId: true,
  customerId: true,
  technicianId: true,
  deviceBrand: true,
  deviceModel: true,
  deviceColor: true,
  serialIMEI: true,
  preCheckData: true,
  postCheckData: true,
  issueDescription: true,
  status: true,
  estimatedFinish: true,
  completedAt: true,
  laborFee: true,
  estimatedCost: true,
  totalCost: true,
  depositAmount: true,
  discount: true,
  taxRate: true,
  vatAmount: true,
  customerApproved: true,
  notes: true,
  photos: true,
  warrantyDays: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getRepairJobs(filters: RepairFilters = {}) {
  const where: any = {};
  const effectiveTenantId = filters.tenantId || staffStorage.getStore()?.tenantId;
  if (effectiveTenantId) {
    where.tenantId = effectiveTenantId;
  }

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

  const jobs = await prisma.repairJob.findMany({
    where,
    select: {
      ...repairJobListScalars,
      passcode: true,
      patternLock: true,
      customerSignature: true,
      customer: { select: customerListSelect },
      branch: true,
      technician: { select: staffUserSelect },
      partUsages: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: Math.min(Math.max(1, Math.trunc(filters.take ?? 200) || 200), 500),
  });
  // Only expose whether a lock/signature exists, never secrets/large payloads in lists.
  return jobs.map(({ passcode, patternLock, customerSignature, ...job }) => ({
    ...job,
    hasPasscode: Boolean(passcode),
    hasPatternLock: Boolean(patternLock),
    hasCustomerSignature: Boolean(customerSignature),
  }));
}

/** ADMIN/MANAGER or the assigned technician may see device unlock secrets. */
function canSeeDeviceLock(technicianId: string | null): boolean {
  try {
    const actor = staffContext();
    if (actor.role === "ADMIN" || actor.role === "MANAGER") return true;
    return actor.role === "TECHNICIAN" && technicianId === actor.id;
  } catch {
    return false;
  }
}

export async function getRepairJobById(id: string, tenantId?: string) {
  const effectiveTenantId = tenantId || staffStorage.getStore()?.tenantId;
  const job = await prisma.repairJob.findUnique({
    where: { id },
    include: {
      customer: {
        select: { id: true, name: true, phone: true, lineId: true, address: true },
      },
      branch: true,
      technician: { select: staffUserSelect },
      partUsages: {
        include: {
          product: true,
        },
      },
    },
  });
  if (!job) return null;
  if (effectiveTenantId && job.tenantId && job.tenantId !== effectiveTenantId) return null;

  // Fetch status history events with actor names
  const events = await prisma.repairStatusEvent.findMany({
    where: { repairJobId: job.id, ...(effectiveTenantId ? { tenantId: effectiveTenantId } : {}) },
    orderBy: { occurredAt: "asc" },
  });
  const actorIds = Array.from(new Set(events.map((e) => e.actorId).filter(Boolean)));
  const actors =
    actorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true, role: true },
        })
      : [];
  const actorMap = new Map(actors.map((a) => [a.id, a]));
  const statusEvents = events.map((e) => ({
    ...e,
    actor: actorMap.get(e.actorId) || { id: e.actorId, name: "เจ้าหน้าที่", role: "STAFF" },
  }));

  return {
    ...redactDeviceLock(job),
    statusEvents,
  };
}

/**
 * Hide passcode/patternLock unless the current actor may see them.
 * Always adds `hasPasscode` / `hasPatternLock` flags for UI display.
 */
export function redactDeviceLock<T extends { passcode: string | null; patternLock: string | null; technicianId: string | null }>(job: T) {
  const hasPasscode = Boolean(job.passcode);
  const hasPatternLock = Boolean(job.patternLock);
  if (canSeeDeviceLock(job.technicianId)) return { ...job, hasPasscode, hasPatternLock };
  return { ...job, passcode: null, patternLock: null, hasPasscode, hasPatternLock };
}

export async function getRepairJobByTrackingCode(trackingCode: string, tenantId?: string) {
  const effectiveTenantId = tenantId || staffStorage.getStore()?.tenantId;
  return await prisma.repairJob.findFirst({
    where: { trackingCode, ...(effectiveTenantId ? { tenantId: effectiveTenantId } : {}) },
    include: {
      customer: true,
      branch: true,
      technician: { select: staffUserSelect },
      partUsages: {
        include: {
          product: true,
        },
      },
    },
  });
}

export async function generateNextTrackingCode(tx?: any): Promise<string> {
  const client = tx || prisma;
  const yyyymm = bangkokYYYYMM();
  const prefix = `REP-${yyyymm}-`;

  // Atomic sequence counter with collision-resistance check against existing jobs
  let trackingCode = "";
  let attempts = 0;
  while (attempts < 15) {
    attempts++;
    const counter = await client.sequenceCounter.upsert({
      where: { id: `REP-${yyyymm}` },
      update: { current: { increment: 1 } },
      create: { id: `REP-${yyyymm}`, current: 1 },
    });

    trackingCode = `${prefix}${String(counter.current).padStart(4, "0")}`;
    const exists = await client.repairJob.findFirst({
      where: { trackingCode },
      select: { id: true },
    });
    if (!exists) {
      break;
    }
  }

  return trackingCode;
}
