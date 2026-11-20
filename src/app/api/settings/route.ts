import { NextRequest, NextResponse } from "next/server";
import { AccessError, staffContext } from "@/lib/staff-context";
import { withStaff } from "@/lib/staff-http";
import { getStoreSettings, updateStoreSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * GET /api/settings
 * Retrieve General Store Settings for current tenant
 */
export const GET = withStaff(async (request: NextRequest) => {
  const actor = staffContext();
  const settings = await getStoreSettings(actor.tenantId);

  return NextResponse.json({
    success: true,
    data: settings,
  });
}, ["ADMIN", "MANAGER", "CASHIER", "TECHNICIAN"]);

/**
 * PUT /api/settings
 * Update General Store Settings for current tenant (Admin / Manager only)
 */
export const PUT = withStaff(async (request: NextRequest) => {
  const actor = staffContext();
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    throw new AccessError(400, "รูปแบบข้อมูล JSON ไม่ถูกต้อง");
  }

  const updated = await updateStoreSettings(actor.tenantId, actor.id, body);

  return NextResponse.json({
    success: true,
    message: "บันทึกการตั้งค่าร้านค้าสำเร็จ",
    data: updated,
  });
}, ["ADMIN", "MANAGER"]);
