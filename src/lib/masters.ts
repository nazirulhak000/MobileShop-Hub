import prisma from "@/lib/prisma";
import { db } from "@/lib/db";
import { AccessError } from "@/lib/staff-context";
import {
  MasterCategory,
  MasterBrand,
  MasterModel,
  MasterCommonSymptom,
  MasterService,
  MasterStorageCapacity,
  MasterColor,
  MasterDataStore,
  DEFAULT_MASTER_DATA,
} from "@/types/masters";

export type {
  MasterCategory,
  MasterBrand,
  MasterModel,
  MasterCommonSymptom,
  MasterService,
  MasterStorageCapacity,
  MasterColor,
  MasterDataStore,
};
export { DEFAULT_MASTER_DATA };

/**
 * Retrieve Master Data for a Tenant with strict multi-tenant scoping
 */
export async function getMasterData(tenantId: string): Promise<MasterDataStore> {
  if (!tenantId) throw new AccessError(400, "ไม่พบรหัสร้านค้า (tenantId)");

  const latestAudit = await db.auditLog.findFirst({
    where: {
      tenantId,
      module: "MASTERS",
      action: "UPDATE",
    },
    orderBy: { createdAt: "desc" },
    select: { afterJson: true, createdAt: true },
  });

  if (!latestAudit?.afterJson) {
    return {
      ...DEFAULT_MASTER_DATA,
    };
  }

  try {
    const parsed = JSON.parse(latestAudit.afterJson);
    return {
      categories: Array.isArray(parsed.categories) ? parsed.categories : DEFAULT_MASTER_DATA.categories,
      brands: Array.isArray(parsed.brands) ? parsed.brands : DEFAULT_MASTER_DATA.brands,
      models: Array.isArray(parsed.models) ? parsed.models : DEFAULT_MASTER_DATA.models,
      symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : DEFAULT_MASTER_DATA.symptoms,
      services: Array.isArray(parsed.services) ? parsed.services : DEFAULT_MASTER_DATA.services,
      capacities: Array.isArray(parsed.capacities) ? parsed.capacities : DEFAULT_MASTER_DATA.capacities,
      colors: Array.isArray(parsed.colors) ? parsed.colors : DEFAULT_MASTER_DATA.colors,
      updatedAt: latestAudit.createdAt.toISOString(),
    };
  } catch {
    return { ...DEFAULT_MASTER_DATA };
  }
}

/**
 * Persist Master Data Store for a Tenant with audit logging and multi-tenant isolation
 */
export async function saveMasterDataStore(
  tenantId: string,
  actorId: string,
  store: MasterDataStore,
  details: string
): Promise<MasterDataStore> {
  if (!tenantId) throw new AccessError(400, "ไม่พบรหัสร้านค้า (tenantId)");

  const cleanedStore: MasterDataStore = {
    categories: (store.categories || []).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
    brands: (store.brands || []).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
    models: (store.models || []).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
    symptoms: (store.symptoms || []).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
    services: (store.services || []).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
    capacities: (store.capacities || []).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
    colors: (store.colors || []).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
    updatedAt: new Date().toISOString(),
  };

  await db.auditLog.create({
    data: {
      tenantId,
      userId: actorId,
      module: "MASTERS",
      action: "UPDATE",
      targetId: tenantId,
      details: details.slice(0, 500),
      afterJson: JSON.stringify(cleanedStore),
      severity: "INFO",
    },
  });

  return cleanedStore;
}

/**
 * Add a new Master item
 */
export async function addMasterItem(
  tenantId: string,
  actorId: string,
  type: keyof Omit<MasterDataStore, "updatedAt">,
  item: any
): Promise<MasterDataStore> {
  const current = await getMasterData(tenantId);
  const list = (current[type] as any[]) || [];

  const newItem = {
    ...item,
    id: `${type.slice(0, 3)}-${Date.now()}`,
    displayOrder: typeof item.displayOrder === "number" ? item.displayOrder : list.length + 1,
  };

  const updatedList = [...list, newItem];
  const updatedStore: MasterDataStore = {
    ...current,
    [type]: updatedList,
  };

  return saveMasterDataStore(tenantId, actorId, updatedStore, `เพิ่มข้อมูลหลัก (${type}): ${item.name || item.modelName || item.capacity || item.nameTh || "รายการใหม่"}`);
}

/**
 * Update an existing Master item
 */
export async function updateMasterItem(
  tenantId: string,
  actorId: string,
  type: keyof Omit<MasterDataStore, "updatedAt">,
  id: string,
  patch: any
): Promise<MasterDataStore> {
  const current = await getMasterData(tenantId);
  const list = (current[type] as any[]) || [];
  const idx = list.findIndex((x) => x.id === id);

  if (idx === -1) {
    throw new AccessError(404, `ไม่พบข้อมูลหลักรหัส ${id} ในกลุ่ม ${type}`);
  }

  const updatedItem = { ...list[idx], ...patch, id };
  const updatedList = [...list];
  updatedList[idx] = updatedItem;

  const updatedStore: MasterDataStore = {
    ...current,
    [type]: updatedList,
  };

  return saveMasterDataStore(tenantId, actorId, updatedStore, `แก้ไขข้อมูลหลัก (${type} ID: ${id})`);
}

/**
 * Delete a Master item
 */
export async function deleteMasterItem(
  tenantId: string,
  actorId: string,
  type: keyof Omit<MasterDataStore, "updatedAt">,
  id: string
): Promise<MasterDataStore> {
  const current = await getMasterData(tenantId);
  const list = (current[type] as any[]) || [];
  const filtered = list.filter((x) => x.id !== id);

  if (filtered.length === list.length) {
    throw new AccessError(404, `ไม่พบข้อมูลหลักรหัส ${id} ในกลุ่ม ${type}`);
  }

  const updatedStore: MasterDataStore = {
    ...current,
    [type]: filtered,
  };

  return saveMasterDataStore(tenantId, actorId, updatedStore, `ลบข้อมูลหลัก (${type} ID: ${id})`);
}

/**
 * Reorder Master items
 */
export async function reorderMasterItems(
  tenantId: string,
  actorId: string,
  type: keyof Omit<MasterDataStore, "updatedAt">,
  orderedIds: string[]
): Promise<MasterDataStore> {
  const current = await getMasterData(tenantId);
  const list = (current[type] as any[]) || [];

  const idToOrder = new Map(orderedIds.map((id, index) => [id, index + 1]));

  const updatedList = list.map((item) => ({
    ...item,
    displayOrder: idToOrder.has(item.id) ? idToOrder.get(item.id)! : item.displayOrder,
  })).sort((a, b) => a.displayOrder - b.displayOrder);

  const updatedStore: MasterDataStore = {
    ...current,
    [type]: updatedList,
  };

  return saveMasterDataStore(tenantId, actorId, updatedStore, `เรียงลำดับการแสดงผล (${type})`);
}
