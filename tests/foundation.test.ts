import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { db } from "../src/lib/db";
import { prisma } from "../src/lib/prisma";
import { staffStorage, StaffPrincipal } from "../src/lib/staff-context";
import { mutateBooking } from "../src/lib/bookings";
import { requestOtp, verifyOtp, devOtpEnabled } from "../src/lib/customer-auth";
let admin: StaffPrincipal;
let cashier: StaffPrincipal;
let foreignCustomer: string;
let ownCustomer: string;
let ownBranch: string;
let foreignBranch: string;
let secondBranch: string;
let product: string;
async function cleanupTestTenants() {
  const tenants = ["test-a", "test-b"];
  try {
    await db.authThrottle.deleteMany({});
    await db.appointmentEvent.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.appointment.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.bookingSlot.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.bookingPolicy.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.repairQuote.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.repairStatusEvent.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.repairJob.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.saleItem.deleteMany({ where: { sale: { tenantId: { in: tenants } } } });
    await db.sale.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.stockItem.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.product.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.otpChallenge.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.customerAccountLink.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.customerAccount.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.customer.deleteMany({ where: { OR: [{ tenantId: { in: tenants } }, { name: "Unassigned" }] } });
    await db.user.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.branch.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.tenant.deleteMany({ where: { id: { in: tenants } } });
  } catch (err) {
    console.error("Cleanup error:", err);
  }
}

before(async () => {
  await cleanupTestTenants();
  await db.tenant.createMany({ data: [{ id: "test-a", name: "ร้าน A", slug: "test-a" }, { id: "test-b", name: "ร้าน B", slug: "test-b" }] });
  const a = await db.branch.create({ data: { tenantId: "test-a", name: "A", code: "HQ" } });
  const a2 = await db.branch.create({ data: { tenantId: "test-a", name: "A2", code: "BR2" } });
  const b = await db.branch.create({ data: { tenantId: "test-b", name: "B", code: "HQ" } });
  ownBranch = a.id; foreignBranch = b.id; secondBranch = a2.id;
  const user = await db.user.create({ data: { tenantId: "test-a", name: "Admin", username: "admin", password: "unused", role: "ADMIN", branchId: a.id } });
  await db.user.create({ data: { tenantId: "test-b", name: "Other Admin", username: "admin", password: "unused", role: "ADMIN", branchId: b.id } });
  admin = { id: user.id, tenantId: "test-a", name: user.name, username: user.username, role: "ADMIN", branchId: a.id, branchIds: [a.id, a2.id] };
  cashier = { ...admin, role: "CASHIER", branchIds: [a.id] };
  const ca = await db.customer.create({ data: { tenantId: "test-a", name: "Customer A", phone: "0811111111" } });
  const cb = await db.customer.create({ data: { tenantId: "test-b", name: "Customer B", phone: "0811111111" } });
  ownCustomer = ca.id; foreignCustomer = cb.id;
  const p = await db.product.create({ data: { tenantId: "test-a", code: "P1", name: "Product", category: "SPARE_PART" } });
  product = p.id;
  await db.stockItem.createMany({ data: [{ tenantId: "test-a", productId: p.id, branchId: a.id, quantity: 1 }, { tenantId: "test-a", productId: p.id, branchId: a2.id, quantity: 7 }] });
});
after(async () => {
  await cleanupTestTenants();
  await db.$disconnect();
});
test("same username, phone and branch code can exist in different tenants", async () => {
  assert.equal(await db.user.count({ where: { username: "admin", tenantId: { in: ["test-a", "test-b"] } } }), 2);
  assert.equal(await db.customer.count({ where: { phone: "0811111111", tenantId: { in: ["test-a", "test-b"] } } }), 2);
});
test("list/count/unique/update/delete remain scoped even with a foreign ID", async () => staffStorage.run(admin, async () => {
  assert.equal((await prisma.customer.findMany()).length, 1);
  assert.equal(await prisma.customer.count(), 1);
  assert.equal(await prisma.customer.findUnique({ where: { id: foreignCustomer } }), null);
  await assert.rejects(prisma.customer.update({ where: { id: foreignCustomer }, data: { name: "attacker" } }));
  assert.equal((await prisma.customer.deleteMany({ where: { id: foreignCustomer } })).count, 0);
  assert.equal((await db.customer.findUniqueOrThrow({ where: { id: foreignCustomer } })).name, "Customer B");
}));
test("FK injection and explicit foreign tenant fail before writes", async () => staffStorage.run(admin, async () => {
  await assert.rejects(prisma.repairJob.create({ data: { trackingCode: "R1", branchId: ownBranch, customerId: foreignCustomer, deviceBrand: "X", deviceModel: "X", issueDescription: "test" } }));
  await assert.rejects(prisma.customer.create({ data: { tenantId: "test-b", name: "X", phone: "0822222222" } }));
  await assert.rejects(prisma.repairJob.create({ data: { trackingCode: "R2", branchId: foreignBranch, customerId: ownCustomer, deviceBrand: "X", deviceModel: "X", issueDescription: "test" } }));
}));
test("branch scopes also apply to nested collections and counts", async () => staffStorage.run(cashier, async () => {
  const p = await prisma.product.findUniqueOrThrow({ where: { id: product }, include: { stockItems: true, _count: { select: { stockItems: true } } } });
  assert.equal(p.stockItems.length, 1);
  assert.equal(p.stockItems[0].quantity, 1);
  assert.equal(p._count.stockItems, 1);
  assert.equal(await prisma.branch.findUnique({ where: { id: secondBranch } }), null);
}));
test("transaction-created parent references remain valid and scoped", async () => staffStorage.run(admin, async () => {
  const sale = await prisma.$transaction(async tx => {
    const created = await tx.sale.create({ data: { invoiceNo: "I1", branchId: ownBranch, customerId: ownCustomer, cashierId: admin.id } });
    await tx.saleItem.create({ data: { saleId: created.id, productId: product, quantity: 1, unitPrice: 1, subtotal: 1 } });
    return created;
  });
  assert.equal(sale.tenantId, admin.tenantId);
  assert.equal(await prisma.saleItem.count({ where: { saleId: sale.id } }), 1);
}));
test("array transactions and tenant-scoped compound upserts work", async () => staffStorage.run(admin, async () => {
  const result = await prisma.customer.upsert({ where: { tenantId_phone: { tenantId: admin.tenantId, phone: "0811111111" } }, update: { name: "Updated A" }, create: { name: "A", phone: "0811111111" } });
  assert.equal(result.id, ownCustomer);
  const [stock] = await prisma.$transaction([prisma.stockItem.update({ where: { productId_branchId: { productId: product, branchId: ownBranch } }, data: { quantity: { increment: 1 } } })]);
  assert.equal(stock.quantity, 2);
}));
test("unassigned legacy records fail closed", async () => staffStorage.run(admin, async () => {
  const orphan = await db.customer.create({ data: { name: "Unassigned", phone: "0899999999" } });
  assert.equal(await prisma.customer.findUnique({ where: { id: orphan.id } }), null);
}));

test("20 concurrent reservations cannot exceed capacity, and retries/cancel/reschedule preserve counts", async () => {
  await db.bookingPolicy.create({ data: { tenantId: "test-a", branchId: ownBranch, opensMinute: 540, closesMinute: 1200, capacity: 1 } });
  const start = new Date(Date.now() + 48 * 3_600_000); start.setUTCHours(3, 0, 0, 0);
  const actors = [];
  for (let i = 0; i < 20; i++) {
    const account = await db.customerAccount.create({ data: { tenantId: "test-a", phone: `08600000${String(i).padStart(2, "0")}`, displayName: `Customer ${i}` } });
    actors.push({ tenantId: "test-a", accountId: account.id });
  }
  const payload = { branchId: ownBranch, startsAt: start.toISOString(), service: "DIAGNOSIS", deviceModel: "Phone", issueDescription: "Screen check" };
  const results = await Promise.allSettled(actors.map((actor, i) => mutateBooking(actor, "create", { ...payload, key: `concurrent-key-${i}` })));
  const successful = results.filter(r => r.status === "fulfilled");
  assert.equal(successful.length, 1, JSON.stringify(results.map(r => r.status === "rejected" ? r.reason?.message : "success")));
  for (const result of results) if (result.status === "rejected") assert.equal(result.reason.status, 409);
  const winnerIndex = results.findIndex(r => r.status === "fulfilled");
  const winner = results[winnerIndex]; assert.equal(winner.status, "fulfilled"); if (winner.status !== "fulfilled") return;
  const actor = actors[winnerIndex];
  const replay = await mutateBooking(actor, "create", { ...payload, key: `concurrent-key-${winnerIndex}` });
  assert.equal(replay.id, winner.value.id);
  const other = actors[(winnerIndex + 1) % actors.length];
  const next = new Date(start.getTime() + 30 * 60_000);
  await mutateBooking(other, "create", { ...payload, startsAt: next.toISOString(), key: "fill-next-slot" });
  await assert.rejects(mutateBooking(actor, "reschedule", { id: replay.id, startsAt: next.toISOString(), key: "failed-reschedule" }));
  assert.equal((await db.appointment.findUniqueOrThrow({ where: { id: replay.id } })).slotId, replay.slotId);
  assert.equal((await db.bookingSlot.findUniqueOrThrow({ where: { id: replay.slotId } })).reservedCount, 1);
  await assert.rejects(mutateBooking(other, "cancel", { id: replay.id, key: "foreign-cancel" }));
  await mutateBooking(actor, "cancel", { id: replay.id, key: "cancel-winner" });
  await mutateBooking(actor, "cancel", { id: replay.id, key: "cancel-winner" });
  await mutateBooking(actor, "cancel", { id: replay.id, key: "cancel-again-new-key" });
  assert.equal((await db.bookingSlot.findUniqueOrThrow({ where: { id: replay.slotId } })).reservedCount, 0);
  await assert.rejects(mutateBooking(actor, "create", { ...payload, startsAt: next.toISOString(), key: `concurrent-key-${winnerIndex}` }));
});

test("OTP is tenant-bound, single-use and does not auto-link historical CRM", async () => {
  process.env.AUTH_SECRET = "test-only-secret-with-at-least-32-characters";
  process.env.OTP_DEV_ENABLED = "true";
  const challenge = await requestOtp("test-a", "081-111-1111");
  assert.ok(challenge.developmentCode);
  await assert.rejects(verifyOtp("test-b", "0811111111", challenge.challengeId, challenge.developmentCode, "Customer A"));
  const account = await verifyOtp("test-a", "0811111111", challenge.challengeId, challenge.developmentCode, "Customer A");
  assert.equal(account.tenantId, "test-a");
  assert.equal(await db.customerAccountLink.count({ where: { accountId: account.id } }), 0);
  await assert.rejects(verifyOtp("test-a", "0811111111", challenge.challengeId, challenge.developmentCode, "Customer A"));
  await assert.rejects(requestOtp("test-a", "0811111111"));
});
test("expired OTP and attempt exhaustion are rejected; production cannot enable dev adapter", async () => {
  const challenge = await requestOtp("test-a", "0891234567");
  await db.otpChallenge.update({ where: { id: challenge.challengeId }, data: { expiresAt: new Date(Date.now() - 1000) } });
  await assert.rejects(verifyOtp("test-a", "0891234567", challenge.challengeId, challenge.developmentCode, "Customer"));
  const exhausted = await requestOtp("test-a", "0891234568");
  await db.otpChallenge.update({ where: { id: exhausted.challengeId }, data: { attempts: 5 } });
  await assert.rejects(verifyOtp("test-a", "0891234568", exhausted.challengeId, exhausted.developmentCode, "Customer"));
  const nodeEnv = process.env.NODE_ENV;
  (process.env as any).NODE_ENV = "production";
  assert.equal(devOtpEnabled(), false);
  (process.env as any).NODE_ENV = nodeEnv;
});
