import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";
async function seed() {
  const password = await bcrypt.hash("test-password-1234", 12);
  for (const suffix of ["a", "b"]) {
    const tenantId = `e2e-${suffix}`;
    await db.tenant.create({ data: { id: tenantId, name: suffix === "a" ? "ร้านทดสอบมือถือ" : "ร้านอีกกิจการ", slug: tenantId } });
    await db.branch.create({ data: { id: `${tenantId}-hq`, tenantId, name: "สาขาหลัก", code: "HQ", phone: "020000000" } });
    await db.user.create({ data: { id: `${tenantId}-admin`, tenantId, branchId: `${tenantId}-hq`, username: "admin", password, name: "ผู้ดูแลร้าน", role: "ADMIN" } });
    await db.user.create({ data: { id: `${tenantId}-cashier`, tenantId, branchId: `${tenantId}-hq`, username: "cashier", password, name: "พนักงาน", role: "CASHIER" } });
    await db.customer.create({ data: { id: `${tenantId}-customer`, tenantId, name: "ลูกค้าประวัติเดิม", phone: "0811111111", nationalId: "private-national-id" } });
    await db.repairJob.create({ data: { id: `${tenantId}-repair`, tenantId, branchId: `${tenantId}-hq`, customerId: `${tenantId}-customer`, trackingCode: "REP-202611-0001", deviceBrand: "Apple", deviceModel: "iPhone 14", issueDescription: "จอแตก", passcode: "never-public", patternLock: "private-pattern", customerSignature: "private-signature", notes: "private-internal-note", customerApproved: false } });
    await db.bookingPolicy.create({ data: { tenantId, branchId: `${tenantId}-hq`, opensMinute: 540, closesMinute: 1200, capacity: 1 } });
  }
}
seed().finally(() => db.$disconnect());
