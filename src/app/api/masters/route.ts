import { NextRequest, NextResponse } from "next/server";
import { AccessError, staffContext } from "@/lib/staff-context";
import { withStaff } from "@/lib/staff-http";
import {
  getMasterData,
  saveMasterDataStore,
  addMasterItem,
  updateMasterItem,
  deleteMasterItem,
  reorderMasterItems,
  MasterDataStore,
} from "@/lib/masters";

export const dynamic = "force-dynamic";

const VALID_TYPES = ["categories", "brands", "models", "symptoms", "services", "capacities", "colors"] as const;
type MasterType = typeof VALID_TYPES[number];

function assertValidType(type: unknown): asserts type is MasterType {
  if (typeof type !== "string" || !VALID_TYPES.includes(type as MasterType)) {
    throw new AccessError(400, `ประเภทข้อมูลหลักไม่ถูกต้อง (ต้องเป็นหนึ่งใน: ${VALID_TYPES.join(", ")})`);
  }
}

/**
 * GET /api/masters
 * Retrieve all master data collections for the current tenant
 */
export const GET = withStaff(async (request: NextRequest) => {
  const actor = staffContext();
  const data = await getMasterData(actor.tenantId);

  return NextResponse.json({
    success: true,
    data,
  });
}, ["ADMIN", "MANAGER", "CASHIER", "TECHNICIAN"]);

/**
 * POST /api/masters
 * Add a new item to a master collection or reorder items
 */
export const POST = withStaff(async (request: NextRequest) => {
  const actor = staffContext();
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    throw new AccessError(400, "รูปแบบข้อมูล JSON ไม่ถูกต้อง");
  }

  const { action, type, item, orderedIds } = body;
  assertValidType(type);

  if (action === "reorder") {
    if (!Array.isArray(orderedIds)) {
      throw new AccessError(400, "กรุณาส่ง orderedIds เป็น array ของ ID");
    }
    const updatedStore = await reorderMasterItems(actor.tenantId, actor.id, type, orderedIds);
    return NextResponse.json({
      success: true,
      message: "บันทึกลำดับการแสดงผลสำเร็จ",
      data: updatedStore,
    });
  }

  // Default: Add single item
  if (!item || typeof item !== "object") {
    throw new AccessError(400, "ข้อมูล item ห้ามว่าง");
  }

  // Type-specific field validations
  if (type === "categories") {
    if (!item.name || typeof item.name !== "string" || !item.name.trim()) {
      throw new AccessError(400, "กรุณากรอกชื่อหมวดหมู่ (ห้ามว่าง)");
    }
  } else if (type === "brands") {
    if (!item.name || typeof item.name !== "string" || !item.name.trim()) {
      throw new AccessError(400, "กรุณากรอกชื่อยี่ห้อ (ห้ามว่าง)");
    }
  } else if (type === "models") {
    if (!item.modelName || typeof item.modelName !== "string" || !item.modelName.trim()) {
      throw new AccessError(400, "กรุณากรอกชื่อรุ่นอุปกรณ์ (ห้ามว่าง)");
    }
    if (!item.brandName || typeof item.brandName !== "string") {
      throw new AccessError(400, "กรุณาเลือกยี่ห้อของอุปกรณ์");
    }
  } else if (type === "symptoms") {
    if (!item.name || typeof item.name !== "string" || !item.name.trim()) {
      throw new AccessError(400, "กรุณากรอกชื่ออาการเสีย (ห้ามว่าง)");
    }
    if (typeof item.baseLaborFee !== "number" || item.baseLaborFee < 0) {
      throw new AccessError(400, "ค่าแรงมาตรฐานต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0");
    }
  } else if (type === "services") {
    if (!item.name || typeof item.name !== "string" || !item.name.trim()) {
      throw new AccessError(400, "กรุณากรอกชื่อบริการ (ห้ามว่าง)");
    }
    if (typeof item.standardPrice !== "number" || item.standardPrice < 0) {
      throw new AccessError(400, "ราคาค่าบริการต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0");
    }
  }

  const updatedStore = await addMasterItem(actor.tenantId, actor.id, type, item);

  return NextResponse.json({
    success: true,
    message: "เพิ่มข้อมูลหลักสำเร็จ",
    data: updatedStore,
  });
}, ["ADMIN", "MANAGER"]);

/**
 * PUT /api/masters
 * Update an existing master item
 */
export const PUT = withStaff(async (request: NextRequest) => {
  const actor = staffContext();
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    throw new AccessError(400, "รูปแบบข้อมูล JSON ไม่ถูกต้อง");
  }

  const { type, id, patch } = body;
  assertValidType(type);

  if (!id || typeof id !== "string") {
    throw new AccessError(400, "กรุณาระบุ id ของรายการที่ต้องการแก้ไข");
  }

  if (!patch || typeof patch !== "object") {
    throw new AccessError(400, "กรุณาระบุข้อมูล patch");
  }

  const updatedStore = await updateMasterItem(actor.tenantId, actor.id, type, id, patch);

  return NextResponse.json({
    success: true,
    message: "แก้ไขข้อมูลหลักสำเร็จ",
    data: updatedStore,
  });
}, ["ADMIN", "MANAGER"]);

/**
 * DELETE /api/masters
 * Delete a master item by type and id
 */
export const DELETE = withStaff(async (request: NextRequest) => {
  const actor = staffContext();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");

  assertValidType(type);
  if (!id) {
    throw new AccessError(400, "กรุณาระบุ id ใน parameter");
  }

  const updatedStore = await deleteMasterItem(actor.tenantId, actor.id, type, id);

  return NextResponse.json({
    success: true,
    message: "ลบข้อมูลหลักสำเร็จ",
    data: updatedStore,
  });
}, ["ADMIN", "MANAGER"]);
