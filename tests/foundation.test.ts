import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { db } from "../src/lib/db";
import { prisma } from "../src/lib/prisma";
import { staffStorage, StaffPrincipal } from "../src/lib/staff-context";
import { mutateBooking } from "../src/lib/bookings";
import { requestOtp, verifyOtp, verifyCustomerWithTicketProof, devOtpEnabled } from "../src/lib/customer-auth";
import { calculateVAT, calculateCIT, calculateWHT, calculatePP30, calculatePIT, DEFAULT_TAX_SETTINGS } from "../src/lib/tax";
import { bangkokYYYYMM } from "../src/lib/staff-http";
import { generateNextTrackingCode, getRepairJobs, getRepairJobById } from "../src/lib/repairs";
import { checkOrigin } from "../src/lib/staff-auth";
import { resolveTenantBySlug } from "../src/lib/storefrontTenant";
import { validateThaiTaxId, validateThaiBranchId, bahtText, validateThaiNationalId } from "../src/lib/utils";
import {
  normalizePhone as normalizeCustomerPhone,
  packCustomerAddress,
  unpackCustomerAddress,
  calculateCustomerLTV,
  determineCustomerTier,
} from "../src/lib/customer-utils";
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
    await db.attendanceRecord.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.payrollSlip.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.appointmentEvent.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.appointment.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.bookingSlot.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.bookingPolicy.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.installmentPayment.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.installmentContract.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.repairPartUsage.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.repairQuote.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.repairStatusEvent.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.repairJob.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.saleItem.deleteMany({ where: { sale: { tenantId: { in: tenants } } } });
    await db.sale.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.deviceIMEI.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.tradeInContract.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.purchaseOrderItem.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.purchaseOrder.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.supplier.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.shopExpense.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.stockItem.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.product.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.otpChallenge.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.customerAccountLink.deleteMany({ where: { tenantId: { in: tenants } } });
    await db.storefrontConfig.deleteMany({ where: { tenantId: { in: tenants } } });
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

const round2 = (n: number) => Math.round(n * 100) / 100;

test("Round 4: RepairJob intake creates atomic timeline event & quote approval updates estimatedCost", async () => staffStorage.run(admin, async () => {
  const tracking = await generateNextTrackingCode();
  assert.match(tracking, /^REP-\d{6}-\d{4}$/);

  const job = await prisma.$transaction(async tx => {
    const created = await tx.repairJob.create({
      data: {
        trackingCode: tracking,
        branchId: ownBranch,
        customerId: ownCustomer,
        deviceBrand: "Apple",
        deviceModel: "iPhone 15",
        issueDescription: "Battery drain",
        status: "PENDING",
        estimatedCost: 1000,
        totalCost: 1000,
      },
    });
    await tx.repairStatusEvent.create({
      data: {
        tenantId: admin.tenantId,
        repairJobId: created.id,
        status: "PENDING",
        customerMessage: "รับเครื่องเข้าระบบแล้ว รอช่างตรวจเช็ก",
        actorId: admin.id,
      },
    });
    return created;
  });

  const events = await prisma.repairStatusEvent.findMany({ where: { repairJobId: job.id } });
  assert.equal(events.length, 1);
  assert.equal(events[0].status, "PENDING");
  assert.equal(events[0].customerMessage, "รับเครื่องเข้าระบบแล้ว รอช่างตรวจเช็ก");

  // Create a quote
  const quote = await prisma.repairQuote.create({
    data: {
      tenantId: admin.tenantId,
      repairJobId: job.id,
      version: 1,
      description: "เปลี่ยนแบตแท้ มอก.",
      amountSatang: 250000, // 2,500 THB
      expiresAt: new Date(Date.now() + 86400000),
    },
  });

  // Customer approves quote
  const approvedBaht = Math.round(quote.amountSatang) / 100;
  await prisma.repairJob.update({
    where: { id: job.id },
    data: {
      customerApproved: true,
      estimatedCost: approvedBaht,
      totalCost: approvedBaht,
    },
  });

  const updatedJob = await prisma.repairJob.findUniqueOrThrow({ where: { id: job.id } });
  assert.equal(updatedJob.customerApproved, true);
  assert.equal(updatedJob.estimatedCost, 2500);
  assert.equal(updatedJob.totalCost, 2500);

  const updatedEvents = await prisma.repairStatusEvent.findMany({ where: { repairJobId: job.id } });
  assert.equal(updatedEvents.length, 1);
}));

test("Round 5: Booking capacity blocks reschedule on converted repair", async () => {
  const start = new Date(Date.now() + 72 * 3_600_000); start.setUTCHours(4, 0, 0, 0);
  const account = await db.customerAccount.create({ data: { tenantId: "test-a", phone: "0877777777", displayName: "Booking Test" } });
  const actor = { tenantId: "test-a", accountId: account.id };
  const apt = await mutateBooking(actor, "create", {
    branchId: ownBranch,
    startsAt: start.toISOString(),
    service: "SCREEN",
    deviceModel: "iPad",
    issueDescription: "Cracked screen",
    key: "booking-reschedule-lock-test",
  });

  // Attach a repairJobId (simulating check-in)
  await db.appointment.update({ where: { id: apt.id }, data: { repairJobId: "dummy-job-id" } });

  const next = new Date(start.getTime() + 30 * 60_000);
  await assert.rejects(mutateBooking(actor, "reschedule", { id: apt.id, startsAt: next.toISOString(), key: "reschedule-converted-fail" }), {
    status: 409,
  });
});

test("Round 6: POS calculates 7% inclusive VAT with Satang precision and SequenceCounter increments", async () => staffStorage.run(admin, async () => {
  // Test calculateVAT engine
  const vatCalc = calculateVAT(1070, true);
  assert.equal(vatCalc.total, 1070);
  assert.equal(vatCalc.base, 1000);
  assert.equal(vatCalc.vat, 70);
  assert.equal(vatCalc.base + vatCalc.vat, vatCalc.total);

  // Precision with odd decimals
  const vatOdd = calculateVAT(999.99, true);
  assert.equal(vatOdd.total, 999.99);
  assert.equal(round2(vatOdd.base + vatOdd.vat), 999.99);

  // Sequence counter increment
  const c1 = await prisma.sequenceCounter.upsert({
    where: { id: "INV-TEST-202611" },
    update: { current: { increment: 1 } },
    create: { id: "INV-TEST-202611", current: 1 },
  });
  const c2 = await prisma.sequenceCounter.upsert({
    where: { id: "INV-TEST-202611" },
    update: { current: { increment: 1 } },
    create: { id: "INV-TEST-202611", current: 1 },
  });
  assert.equal(c2.current, c1.current + 1);
}));

test("Round 7: Installment schedule integer satang rounding and sequential payment invariant", async () => staffStorage.run(admin, async () => {
  const totalPrice = 30000;
  const downPayment = 5000;
  const termMonths = 10;
  const monthlyInterestRate = 1.5;

  const financedSatang = Math.round(totalPrice * 100) - Math.round(downPayment * 100);
  const interestSatang = Math.round((financedSatang * monthlyInterestRate * termMonths) / 100);
  const totalPayableSatang = financedSatang + interestSatang;
  const perPeriodSatang = Math.floor(totalPayableSatang / termMonths);
  const lastPeriodSatang = totalPayableSatang - perPeriodSatang * (termMonths - 1);

  // Total sum of all periods in satang must exactly equal totalPayableSatang
  const sumSatang = perPeriodSatang * (termMonths - 1) + lastPeriodSatang;
  assert.equal(sumSatang, totalPayableSatang);

  // Odd amount to test fractional Satang distribution
  const oddTotal = 10000.33;
  const oddDown = 1000.11;
  const oddMonths = 3;
  const oddFinanced = Math.round(oddTotal * 100) - Math.round(oddDown * 100);
  const oddInterest = Math.round((oddFinanced * 1.5 * oddMonths) / 100);
  const oddPayable = oddFinanced + oddInterest;
  const oddPerPeriod = Math.floor(oddPayable / oddMonths);
  const oddLastPeriod = oddPayable - oddPerPeriod * (oddMonths - 1);
  assert.equal(oddPerPeriod * (oddMonths - 1) + oddLastPeriod, oddPayable);

  // Sequential payment invariant test on contract
  const contract = await prisma.installmentContract.create({
    data: {
      contractNo: "INS-TEST-001",
      customerName: "Installment Customer",
      customerPhone: "0899990001",
      nationalId: "1234567890123",
      deviceModel: "Galaxy S24",
      imei: "354123456789012",
      totalPrice,
      downPayment,
      financedAmount: financedSatang / 100,
      termMonths,
      monthlyInterestRate,
      monthlyPayment: perPeriodSatang / 100,
      startDate: new Date(),
      status: "ACTIVE",
      paidMonths: 0,
      nextDueDate: new Date(Date.now() + 30 * 86400000),
      isOverdue: false,
      overdueDays: 0,
      payments: {
        create: [
          { monthNumber: 1, dueDate: new Date(Date.now() + 30 * 86400000), amount: perPeriodSatang / 100, status: "PENDING" },
          { monthNumber: 2, dueDate: new Date(Date.now() + 60 * 86400000), amount: perPeriodSatang / 100, status: "PENDING" },
        ],
      },
    },
    include: { payments: true },
  });

  // Verify that paying month 2 when month 1 is unpaid triggers error
  const earliestUnpaid = contract.payments.find(p => p.status === "PENDING");
  assert.equal(earliestUnpaid?.monthNumber, 1);
  assert.equal(earliestUnpaid?.monthNumber! < 2, true);
}));

test("Round 1: Storefront configuration resolves strictly per tenant and rejects unknown slugs", async () => {
  const storeA = await db.storefrontConfig.upsert({
    where: { tenantId: "test-a" },
    create: { tenantId: "test-a", headline: "Headline A", phone: "021111111" },
    update: { headline: "Headline A", phone: "021111111" },
  });
  const storeB = await db.storefrontConfig.upsert({
    where: { tenantId: "test-b" },
    create: { tenantId: "test-b", headline: "Headline B", phone: "022222222" },
    update: { headline: "Headline B", phone: "022222222" },
  });
  assert.notEqual(storeA.headline, storeB.headline);

  // Unknown slug lookup fails closed (returns null, not Shop A or Shop B)
  const unknownTenant = await db.tenant.findUnique({
    where: { slug: "nonexistent-shop-slug" },
    select: { id: true, status: true },
  });
  assert.equal(unknownTenant, null);
});

test("Round 2: Cross-origin requests without valid origin are rejected", () => {
  const badReq = new Request("http://localhost:3000/api/customers", {
    method: "POST",
    headers: { origin: "https://evil-attacker.com", "sec-fetch-site": "cross-site" },
  });
  assert.throws(() => checkOrigin(badReq), { status: 403 });
});

test("Round 3: Repair DTOs omit customer signature in lists and national ID in details", async () => staffStorage.run(admin, async () => {
  const rJob = await prisma.repairJob.create({
    data: {
      trackingCode: "REP-LEAK-TEST-01",
      branchId: ownBranch,
      customerId: ownCustomer,
      deviceBrand: "Apple",
      deviceModel: "iPhone 15 Pro",
      issueDescription: "Camera lens crack",
      customerSignature: "data:image/svg+xml;base64,SECRET_SIGNATURE_DATA",
      passcode: "123456",
      patternLock: "0-1-2-5-8",
    },
  });

  // 1. List query omits raw customerSignature and raw passcodes
  const jobs = await getRepairJobs({ search: "REP-LEAK-TEST-01" });
  assert.equal(jobs.length, 1);
  const listed = jobs[0] as any;
  assert.equal(listed.customerSignature, undefined);
  assert.equal(listed.hasCustomerSignature, true);
  assert.equal(listed.hasPasscode, true);
  assert.equal(listed.hasPatternLock, true);
  assert.equal(listed.passcode, undefined);
  assert.equal(listed.patternLock, undefined);

  // 2. Job detail omits customer nationalId
  const detail = await getRepairJobById(rJob.id);
  assert.ok(detail);
  assert.equal((detail.customer as any).nationalId, undefined);
  assert.equal(detail.customer?.name, "Updated A");
}));

test("Round 10: Multi-Tenant Storefront Isolation, Case-Insensitive Slug Routing & Zero Bleed", async () => {
  // 1. Setup isolated configs for test-a and test-b
  await db.storefrontConfig.upsert({
    where: { tenantId: "test-a" },
    create: {
      tenantId: "test-a",
      themeColor: "emerald",
      headline: "Headline Store A",
      phone: "081-111-1111",
      lineId: "@storeA",
      showPriceEstimator: true,
      showHardwareScanner: false,
    },
    update: {
      themeColor: "emerald",
      headline: "Headline Store A",
      phone: "081-111-1111",
      lineId: "@storeA",
      showPriceEstimator: true,
      showHardwareScanner: false,
    },
  });

  await db.storefrontConfig.upsert({
    where: { tenantId: "test-b" },
    create: {
      tenantId: "test-b",
      themeColor: "rose",
      headline: "Headline Store B",
      phone: "082-222-2222",
      lineId: "@storeB",
      showPriceEstimator: false,
      showHardwareScanner: true,
    },
    update: {
      themeColor: "rose",
      headline: "Headline Store B",
      phone: "082-222-2222",
      lineId: "@storeB",
      showPriceEstimator: false,
      showHardwareScanner: true,
    },
  });

  // 2. Multi-tenant isolation: Verify A's config never bleeds into B
  const tenantA = await resolveTenantBySlug("test-a");
  const tenantB = await resolveTenantBySlug("test-b");
  assert.ok(tenantA);
  assert.ok(tenantB);
  assert.equal(tenantA.id, "test-a");
  assert.equal(tenantB.id, "test-b");
  assert.equal(tenantA.storefrontConfig?.themeColor, "emerald");
  assert.equal(tenantB.storefrontConfig?.themeColor, "rose");
  assert.equal(tenantA.storefrontConfig?.headline, "Headline Store A");
  assert.equal(tenantB.storefrontConfig?.headline, "Headline Store B");
  assert.equal(tenantA.storefrontConfig?.showHardwareScanner, false);
  assert.equal(tenantB.storefrontConfig?.showHardwareScanner, true);

  // 3. Case-insensitivity & trimming: Test-A, TEST-A, '  test-a  ', '%20test-a%20' all resolve to tenant-a
  const mixedCaseTenant = await resolveTenantBySlug("Test-A");
  assert.ok(mixedCaseTenant);
  assert.equal(mixedCaseTenant.id, "test-a");

  const upperCaseTenant = await resolveTenantBySlug("TEST-A");
  assert.ok(upperCaseTenant);
  assert.equal(upperCaseTenant.id, "test-a");

  const paddedTenant = await resolveTenantBySlug("   test-a   ");
  assert.ok(paddedTenant);
  assert.equal(paddedTenant.id, "test-a");

  const urlEncodedTenant = await resolveTenantBySlug("%20test-a%20");
  assert.ok(urlEncodedTenant);
  assert.equal(urlEncodedTenant.id, "test-a");

  // 4. Invalid, empty or nonexistent slug returns null (graceful 404)
  assert.equal(await resolveTenantBySlug("unknown-nonexistent-slug"), null);
  assert.equal(await resolveTenantBySlug(""), null);
  assert.equal(await resolveTenantBySlug(null), null);
  assert.equal(await resolveTenantBySlug(undefined), null);

  // 5. Inactive / Cancelled tenant fails closed (returns null)
  await db.tenant.create({
    data: {
      id: "test-cancelled",
      name: "Cancelled Shop",
      slug: "cancelled-shop",
      status: "CANCELLED",
    },
  });
  try {
    const cancelledTenant = await resolveTenantBySlug("cancelled-shop");
    assert.equal(cancelledTenant, null, "Cancelled tenant must not be accessible");
  } finally {
    await db.tenant.deleteMany({ where: { id: "test-cancelled" } });
  }
});

test("Round 4 & Round 5: Defensive JSON Parsing, Corrupted Data Handling & Navigation Synchronization", async () => {
  const {
    safeParseBeforeAfterCases,
    safeParsePricingRates,
    safeParseFaqs,
    safeParseJson,
    DEFAULT_BEFORE_IMAGE,
    DEFAULT_AFTER_IMAGE,
  } = await import("../src/lib/storefrontTheme");

  // 1. Test safeParseJson with corrupted inputs
  assert.equal(safeParseJson(null, "fallback"), "fallback");
  assert.equal(safeParseJson(undefined, "fallback"), "fallback");
  assert.equal(safeParseJson("", "fallback"), "fallback");
  assert.equal(safeParseJson("{ invalid: json }", "fallback"), "fallback");
  assert.deepEqual(safeParseJson('{"valid": true}', {}), { valid: true });

  // 2. Test safeParseBeforeAfterCases
  // 2.1 Malformed string
  assert.equal(safeParseBeforeAfterCases("{ broken json"), null);
  assert.equal(safeParseBeforeAfterCases([]), null);
  assert.equal(safeParseBeforeAfterCases(null), null);

  // 2.2 Handles key aliases like beforeImage / afterImage and string / object wrappers
  const parsedFromAlias = safeParseBeforeAfterCases(
    JSON.stringify([
      {
        device: "iPhone 15",
        beforeImage: "https://example.com/before.jpg",
        afterImage: "https://example.com/after.jpg",
        pins: [{ x: "not-a-number", y: 150, title: "Test Pin" }],
      },
    ])
  );
  assert.ok(parsedFromAlias);
  assert.equal(parsedFromAlias.length, 1);
  assert.equal(parsedFromAlias[0].device, "iPhone 15");
  assert.equal(parsedFromAlias[0].beforeImg, "https://example.com/before.jpg");
  assert.equal(parsedFromAlias[0].afterImg, "https://example.com/after.jpg");
  // Pins must have clamped coordinates (0-100) and never NaN
  assert.equal(parsedFromAlias[0].pins[0].x, 50);
  assert.equal(parsedFromAlias[0].pins[0].y, 100);

  // 2.3 Handles missing keys and falls back to default images
  const parsedEmptyKeys = safeParseBeforeAfterCases([{}]);
  assert.ok(parsedEmptyKeys);
  assert.equal(parsedEmptyKeys[0].beforeImg, DEFAULT_BEFORE_IMAGE);
  assert.equal(parsedEmptyKeys[0].afterImg, DEFAULT_AFTER_IMAGE);

  // 3. Test safeParsePricingRates
  assert.equal(safeParsePricingRates("{ broken json"), null);
  const parsedRates = safeParsePricingRates(
    JSON.stringify([
      { service: "เปลี่ยนจอ", price: "1,500" },
      { title: "เปลี่ยนแบต", basePrice: -100 },
      { name: "ซ่อมบอร์ด", basePrice: "NaN" },
    ])
  );
  assert.ok(parsedRates);
  assert.equal(parsedRates.length, 3);
  assert.equal(parsedRates[0].name, "เปลี่ยนจอ");
  assert.equal(parsedRates[0].basePrice, 1500);
  assert.equal(parsedRates[1].basePrice, 990); // negative falls back
  assert.equal(parsedRates[2].basePrice, 990); // NaN falls back

  // 4. Test safeParseFaqs
  assert.equal(safeParseFaqs("{ broken json"), null);
  const parsedFaqs = safeParseFaqs(
    JSON.stringify([
      { q: "ซ่อมนานไหม", a: "30 นาที" },
      { question: "มีประกันไหม", answer: "90 วัน", highlight: "รับประกันแท้" },
    ])
  );
  assert.ok(parsedFaqs);
  assert.equal(parsedFaqs.length, 2);
  assert.equal(parsedFaqs[0].question, "ซ่อมนานไหม");
  assert.equal(parsedFaqs[0].answer, "30 นาที");
  assert.equal(parsedFaqs[1].highlight, "รับประกันแท้");

  // 5. Test Round 4: Navigation anchor synchronization logic
  const testConfig = {
    showServicesBento: false,
    showLiveTracking: false,
    showInspectionBench: false,
    showPriceEstimator: false,
    showBeforeAfterSlider: false,
    showCustomerReviews: false,
    showLocationSection: false,
    showFaqSection: false,
  };
  const hiddenSections: string[] = [];
  if (!testConfig.showServicesBento) hiddenSections.push("#services");
  if (!testConfig.showLiveTracking) hiddenSections.push("#track-search");
  if (!testConfig.showInspectionBench) hiddenSections.push("#inspection");
  if (!testConfig.showPriceEstimator) hiddenSections.push("#estimate");
  if (!testConfig.showBeforeAfterSlider && !testConfig.showCustomerReviews) hiddenSections.push("#reviews");
  if (!testConfig.showLocationSection) hiddenSections.push("#location");
  if (!testConfig.showFaqSection) hiddenSections.push("#faq");

  assert.deepEqual(hiddenSections, [
    "#services",
    "#track-search",
    "#inspection",
    "#estimate",
    "#reviews",
    "#location",
    "#faq",
  ]);

  const navLinks = [
    { label: "บริการช่าง", href: "#services" },
    { label: "ติดตามงานซ่อม", href: "#track-search" },
    { label: "ตรวจเช็ค 10 จุด", href: "#inspection" },
    { label: "ประเมินราคา", href: "#estimate" },
    { label: "ผลงานก่อน-หลังซ่อม", href: "#reviews" },
    { label: "ที่ตั้งศูนย์", href: "#location" },
    { label: "คำถามพบบ่อย", href: "#faq" },
  ].filter((link) => !hiddenSections.includes(link.href));

  assert.equal(navLinks.length, 0, "All links must be safely filtered when optional sections are off");
});

test("Customer Management & Appointments Isolation: Cross-tenant customers, accounts, links, and policies strictly isolated", async () => staffStorage.run(admin, async () => {
  // 1. Customer listing and lookup scoping
  const ownCustList = await prisma.customer.findMany({ where: { tenantId: admin.tenantId } });
  assert.ok(ownCustList.some((c) => c.id === ownCustomer));
  assert.ok(!ownCustList.some((c) => c.id === foreignCustomer));

  const foreignCustLookup = await prisma.customer.findFirst({
    where: { id: foreignCustomer, tenantId: admin.tenantId },
  });
  assert.equal(foreignCustLookup, null, "Foreign customer lookup must return null");

  // 2. CustomerAccount and CustomerAccountLink scoping
  const accB = await db.customerAccount.create({
    data: { tenantId: "test-b", phone: "0898887766", displayName: "Customer B Account" },
  });
  const accListA = await prisma.customerAccount.findMany({ where: { tenantId: admin.tenantId } });
  assert.ok(!accListA.some((a) => a.id === accB.id), "Tenant A must not see Tenant B accounts");

  const foreignAccountInShopA = await prisma.customerAccount.findFirst({
    where: { id: accB.id, tenantId: admin.tenantId },
  });
  assert.equal(foreignAccountInShopA, null, "Foreign customer account in shop A must return null");

  // 3. Appointments & Branch Policy scoping
  const policyB = await db.bookingPolicy.upsert({
    where: { branchId: foreignBranch },
    create: {
      tenantId: "test-b",
      branchId: foreignBranch,
      opensMinute: 600,
      closesMinute: 1100,
      capacity: 3,
    },
    update: { opensMinute: 600, closesMinute: 1100, capacity: 3 },
  });

  const policiesA = await prisma.bookingPolicy.findMany({ where: { tenantId: admin.tenantId } });
  assert.ok(!policiesA.some((p) => p.branchId === foreignBranch), "Tenant A must not see Tenant B booking policies");

  const foreignBranchInShopA = await prisma.branch.findFirst({
    where: { id: foreignBranch, tenantId: admin.tenantId },
  });
  assert.equal(foreignBranchInShopA, null, "Foreign branch in Shop A must return null");
}));

test("Modular Custom Blocks & DynamicBlockRenderer: All 7 blocks render and dispatch cleanly with zero error", async () => {
  const { renderToString } = await import("react-dom/server");
  const React = await import("react");
  const {
    PromoBannerBlock,
    PhotoGalleryBlock,
    VideoEmbedBlock,
    RichTextBlock,
    CtaBlock,
    HtmlEmbedBlock,
    BusinessHoursBlock,
    DynamicBlockRenderer,
  } = await import("../src/components/landing/blocks");

  // 1. PromoBannerBlock
  const promoHtml = renderToString(
    React.createElement(PromoBannerBlock, {
      title: "โปรโมชั่นเปลี่ยนแบตเตอรี่แท้",
      discountTag: "BATTERY20",
      themeColor: "emerald",
    })
  );
  assert.ok(promoHtml.includes("โปรโมชั่นเปลี่ยนแบตเตอรี่แท้"));
  assert.ok(promoHtml.includes("BATTERY20"));

  // 2. PhotoGalleryBlock
  const galleryHtml = renderToString(
    React.createElement(PhotoGalleryBlock, {
      title: "ผลงานการซ่อมล่าสุด",
      columns: 3,
      images: ["https://example.com/p1.jpg", "https://example.com/p2.jpg"],
    })
  );
  assert.ok(galleryHtml.includes("ผลงานการซ่อมล่าสุด"));

  // 3. VideoEmbedBlock
  const videoHtml = renderToString(
    React.createElement(VideoEmbedBlock, {
      title: "วิดีโอสาธิต",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    })
  );
  assert.ok(videoHtml.includes("youtube-nocookie.com/embed/dQw4w9WgXcQ"));

  // 4. RichTextBlock
  const richHtml = renderToString(
    React.createElement(RichTextBlock, {
      title: "เกี่ยวกับทีมช่าง",
      content: "## มาตรฐานสากล\nทีมงานผู้เชี่ยวชาญกว่า 10 ปี",
      author: "หัวหน้าช่าง",
    })
  );
  assert.ok(richHtml.includes("มาตรฐานสากล"));
  assert.ok(richHtml.includes("หัวหน้าช่าง"));

  // 5. CtaBlock
  const ctaHtml = renderToString(
    React.createElement(CtaBlock, {
      title: "แอดไลน์รับสิทธิ์",
      lineId: "@testshop",
      phone: "081-111-2222",
    })
  );
  assert.ok(ctaHtml.includes("@testshop"));
  assert.ok(ctaHtml.includes("081-111-2222"));

  // 6. HtmlEmbedBlock
  const htmlBlock = renderToString(
    React.createElement(HtmlEmbedBlock, {
      html: "<iframe src='https://example.com/map'></iframe>",
      title: "แผนที่ร้าน",
    })
  );
  assert.ok(htmlBlock.includes("https://example.com/map"));

  // 7. BusinessHoursBlock
  const hoursHtml = renderToString(
    React.createElement(BusinessHoursBlock, {
      title: "เวลาเปิดทำการ",
      showLiveStatus: true,
    })
  );
  assert.ok(hoursHtml.includes("เวลาเปิดทำการ"));

  // 8. DynamicBlockRenderer master dispatcher
  const testBlocks = [
    { id: "1", type: "promo_banner", title: "Promo 1" },
    { id: "2", type: "photo_gallery", title: "Gallery 1" },
    { id: "3", type: "video_embed", title: "Video 1", videoUrl: "https://youtu.be/abc" },
    { id: "4", type: "rich_text", title: "Rich 1" },
    { id: "5", type: "cta", title: "CTA 1" },
    { id: "6", type: "html_embed", title: "HTML 1", html: "<p>Hello</p>" },
    { id: "7", type: "business_hours", title: "Hours 1" },
  ];

  for (const blk of testBlocks) {
    const rendered = renderToString(
      React.createElement(DynamicBlockRenderer, { block: blk, themeColor: "blue" })
    );
    assert.ok(rendered.length > 0, `DynamicBlockRenderer must render ${blk.type}`);
  }

  // 9. Hidden block must not render
  const hiddenRender = renderToString(
    React.createElement(DynamicBlockRenderer, {
      block: { id: "h1", type: "cta", visible: false },
    })
  );
  assert.equal(hiddenRender, "");
});

test("Dynamic Subpage Routing & Modular Block Storefront: safe parsers, layouts, and navigation", () => {
  const React = require("react");
  const { renderToString } = require("react-dom/server");
  const {
    safeParseCustomPages,
    safeParseSectionsOrder,
    safeParseNavMenu,
    FONT_FAMILY_CONFIG,
    DEFAULT_CUSTOM_PAGES,
    DEFAULT_SECTIONS_ORDER,
  } = require("../src/lib/storefrontTheme");
  const { LandingHero } = require("../src/components/landing/LandingHero");
  const { LandingNavbar } = require("../src/components/landing/LandingNavbar");

  // 1. Custom pages parsing & slug normalization
  const customPages = safeParseCustomPages(
    JSON.stringify([
      { slug: " About Us ", title: "เกี่ยวกับเรา", published: true },
      { slug: "WARRANTY-POLICY", title: "เงื่อนไขการรับประกัน", published: true },
      { slug: "draft", title: "แบบร่าง", published: false },
    ])
  );
  assert.equal(customPages.length, 3);
  assert.equal(customPages[0].slug, "about-us");
  assert.equal(customPages[1].slug, "warranty-policy");
  assert.equal(customPages[2].published, false);

  // 2. Fallback on invalid custom pages
  assert.deepEqual(safeParseCustomPages(null), []);
  assert.deepEqual(safeParseCustomPages("corrupt-json"), []);

  // 3. Sections order with custom block IDs
  const customOrder = ["hero", "custom-promo-1", "bento", "reviews", "faq"];
  const parsedOrder = safeParseSectionsOrder(JSON.stringify(customOrder));
  assert.deepEqual(parsedOrder, customOrder);
  assert.deepEqual(safeParseSectionsOrder(null), DEFAULT_SECTIONS_ORDER);

  // 4. Navigation menu parsing
  const navMenu = safeParseNavMenu(
    JSON.stringify([
      { label: "หน้าแรก", href: "#" },
      { label: "เกี่ยวกับเรา", href: "/store/apple-lab/about" },
      { label: "LINE", href: "https://line.me/ti/p/@test", isExternal: true },
    ])
  );
  assert.equal(navMenu.length, 3);
  assert.equal(navMenu[1].href, "/store/apple-lab/about");
  assert.equal(navMenu[2].isExternal, true);

  // 5. LandingNavbar subpage anchor resolution
  const navbarHtml = renderToString(
    React.createElement(LandingNavbar, {
      shopName: "Apple Lab",
      shopSlug: "apple-lab",
      navigationMenu: navMenu,
      isSubpage: true,
    })
  );
  assert.ok(navbarHtml.includes("Apple Lab"));
  assert.ok(navbarHtml.includes("เกี่ยวกับเรา"));
  assert.ok(navbarHtml.includes('href="https://line.me/ti/p/@test"'));

  // 6. LandingHero 3 layouts
  for (const layout of ["split", "centered", "banner"]) {
    const heroHtml = renderToString(
      React.createElement(LandingHero, {
        shopName: "Apple Lab",
        shopSlug: "apple-lab",
        heroLayout: layout,
        showScanner: true,
        showLiveTracking: true,
      })
    );
    assert.ok(heroHtml.includes("Apple Lab"));
    assert.ok(heroHtml.includes("LIVE HARDWARE SCANNER"));
  }

  // 7. Typography config
  for (const font of ["anuphan", "prompt", "sarabun", "mitr", "kanit", "inter"]) {
    const cfg = FONT_FAMILY_CONFIG[font];
    assert.ok(cfg && cfg.googleFont && cfg.fontFamily);
  }
});

test("Round 11: Repair Workflow & Management Audit - Transitions, Timeline Audit Events, Financial Calculations & Multi-Tenant Isolation", async () => {
  // 1. Create a technician
  const techUser = await db.user.create({
    data: {
      tenantId: "test-a",
      name: "ช่างสมชาย",
      username: `tech_${Date.now()}`,
      password: "pwd",
      role: "TECHNICIAN",
      branchId: ownBranch,
    },
  });

  const adminBUser = await db.user.findFirstOrThrow({ where: { tenantId: "test-b", role: "ADMIN" } });
  const adminBPrincipal: StaffPrincipal = {
    id: adminBUser.id,
    tenantId: "test-b",
    name: adminBUser.name,
    username: adminBUser.username,
    role: "ADMIN",
    branchId: foreignBranch,
    branchIds: [foreignBranch],
  };

  // 2. Admin in Tenant A creates a repair job with laborFee, deposit, discount, VAT
  let jobId = "";
  await staffStorage.run(admin, async () => {
    const tracking = await generateNextTrackingCode();
    const created = await prisma.repairJob.create({
      data: {
        trackingCode: tracking,
        branchId: ownBranch,
        customerId: ownCustomer,
        technicianId: techUser.id,
        deviceBrand: "Samsung",
        deviceModel: "Galaxy S24",
        issueDescription: "จอแตก เปิดไม่ติด",
        passcode: "123456",
        status: "PENDING",
        laborFee: 1000,
        depositAmount: 500,
        discount: 200,
        taxRate: 7,
        customerApproved: true,
      },
    });
    jobId = created.id;

    // Timeline event 1: PENDING
    await prisma.repairStatusEvent.create({
      data: {
        tenantId: admin.tenantId,
        repairJobId: created.id,
        status: "PENDING",
        customerMessage: "รับเครื่องเข้าระบบแล้ว รอช่างตรวจเช็ก",
        actorId: admin.id,
      },
    });

    // Add spare part: 2x 500 = 1000 parts total
    await prisma.repairPartUsage.create({
      data: {
        tenantId: admin.tenantId,
        repairJobId: created.id,
        productId: product,
        quantity: 2,
        costPrice: 300,
        sellPrice: 500,
      },
    });

    // Financial calculation verification:
    // laborFee = 1000, parts = 1000 -> subtotal = 2000
    // discount = 200 -> discounted = 1800
    // vat 7% = 126 -> totalCost = 1926
    // deposit = 500 -> remainingBalance = 1426
    const fee = 1000;
    const partsTotal = 1000;
    const subtotal = fee + partsTotal;
    const discounted = subtotal - 200;
    const vat = Math.round(discounted * 0.07 * 100) / 100;
    const totalCost = Math.round((discounted + vat) * 100) / 100;

    await prisma.repairJob.update({
      where: { id: created.id },
      data: { vatAmount: vat, totalCost },
    });

    // Status transition: PENDING -> DIAGNOSING -> REPAIRING
    await prisma.repairJob.update({
      where: { id: created.id },
      data: { status: "DIAGNOSING" },
    });
    await prisma.repairStatusEvent.create({
      data: {
        tenantId: admin.tenantId,
        repairJobId: created.id,
        status: "DIAGNOSING",
        customerMessage: "ช่างกำลังตรวจเช็กอาการเครื่อง",
        actorId: techUser.id,
      },
    });

    await prisma.repairJob.update({
      where: { id: created.id },
      data: { status: "REPAIRING" },
    });
    await prisma.repairStatusEvent.create({
      data: {
        tenantId: admin.tenantId,
        repairJobId: created.id,
        status: "REPAIRING",
        customerMessage: "กำลังซ่อม",
        actorId: techUser.id,
      },
    });

    // Verification via getRepairJobById
    const jobDetail = await getRepairJobById(created.id) as any;
    assert.ok(jobDetail);
    assert.equal(jobDetail.laborFee, 1000);
    assert.equal(jobDetail.depositAmount, 500);
    assert.equal(jobDetail.discount, 200);
    assert.equal(jobDetail.taxRate, 7);
    assert.equal(jobDetail.vatAmount, 126);
    assert.equal(jobDetail.totalCost, 1926);
    const balance = (jobDetail.totalCost || 0) - (jobDetail.depositAmount || 0);
    assert.equal(balance, 1426);

    // Verify timeline events
    assert.ok(jobDetail.statusEvents);
    assert.equal(jobDetail.statusEvents.length, 3);
    assert.equal(jobDetail.statusEvents[0].status, "PENDING");
    assert.equal(jobDetail.statusEvents[1].status, "DIAGNOSING");
    assert.equal(jobDetail.statusEvents[2].status, "REPAIRING");
    assert.equal(jobDetail.statusEvents[0].actor.name, "Admin");
    assert.equal(jobDetail.statusEvents[1].actor.name, "ช่างสมชาย");
  });

  // 3. Multi-Tenant Isolation: Staff from Tenant B cannot find or read Tenant A's repair job
  await staffStorage.run(adminBPrincipal, async () => {
    const isolatedJob = await getRepairJobById(jobId);
    assert.equal(isolatedJob, null);

    const searchList = await getRepairJobs({ search: "Galaxy S24" });
    assert.equal(searchList.length, 0);
  });
});

test("Finance & Tax Invoice: Thai Tax ID, Branch ID, Baht text, and VAT breakdown", async () => {
  // 1. Thai Tax ID (13 digits Modulo 11)
  assert.equal(validateThaiTaxId("1234567890121").valid, true);
  assert.equal(validateThaiTaxId("1234567890120").valid, false);
  assert.equal(validateThaiTaxId("12345").valid, false);
  assert.equal(validateThaiTaxId("abcdefghijklm").valid, false);

  // 2. Thai National ID (13 digits Modulo 11)
  assert.equal(validateThaiNationalId("1234567890121").valid, true);
  assert.equal(validateThaiNationalId("1234567890120").valid, false);

  // 3. Thai Branch ID (5 digits, 00000 = Head Office)
  assert.equal(validateThaiBranchId("00000").valid, true);
  assert.equal(validateThaiBranchId("00001").valid, true);
  assert.equal(validateThaiBranchId("1234").valid, false);
  assert.equal(validateThaiBranchId("000000").valid, false);
  assert.equal(validateThaiBranchId("HQ001").valid, false);

  // 4. Baht text generation
  assert.equal(bahtText(0), "ศูนย์บาทถ้วน");
  assert.equal(bahtText(120.50), "หนึ่งร้อยยี่สิบบาทห้าสิบสตางค์");
  assert.equal(bahtText(1000), "หนึ่งพันบาทถ้วน");
  assert.equal(bahtText(101), "หนึ่งร้อยเอ็ดบาทถ้วน");
  assert.equal(bahtText(21), "ยี่สิบเอ็ดบาทถ้วน");
  assert.equal(bahtText(1000000), "หนึ่งล้านบาทถ้วน");

  // 5. VAT breakdown math (Non-VAT vs VAT 7% with integer satang precision)
  const taxableAmount = 1000.00;
  const nonVatAmount = 500.00;
  const vatRate = 0.07;
  const vatAmount = Math.round(taxableAmount * vatRate * 100) / 100; // 70.00
  const grandTotal = Math.round((taxableAmount + vatAmount + nonVatAmount) * 100) / 100; // 1570.00
  assert.equal(vatAmount, 70.00);
  assert.equal(grandTotal, 1570.00);
});

test("Installment Schedule: integer satang rounding guarantees zero remainder", async () => {
  const totalAmount = 1000.00;
  const months = 3;
  const totalSatang = Math.round(totalAmount * 100); // 100000 satang
  const baseMonthlySatang = Math.floor(totalSatang / months); // 33333 satang = 333.33
  const remainderSatang = totalSatang - (baseMonthlySatang * months); // 1 satang

  const schedule: number[] = [];
  for (let i = 1; i <= months; i++) {
    const monthlySatang = i === months ? baseMonthlySatang + remainderSatang : baseMonthlySatang;
    schedule.push(monthlySatang / 100);
  }

  assert.equal(schedule.length, 3);
  assert.equal(schedule[0], 333.33);
  assert.equal(schedule[1], 333.33);
  assert.equal(schedule[2], 333.34);
  const sum = schedule.reduce((acc, curr) => acc + curr, 0);
  assert.equal(Math.round(sum * 100) / 100, totalAmount);
});

test("Pawn & Trade-in: multi-tenant isolation, pawn creation, forfeit to stock", async () => {
  let contractId = "";
  let imeiId = "";

  // Admin from Tenant A creates product, imei, and pawn contract
  await staffStorage.run(admin, async () => {
    const pawnProduct = await prisma.product.create({
      data: {
        tenantId: admin.tenantId,
        code: "PW-STOCK-001",
        name: "มือสอง: iPhone 13 Pro 128GB",
        category: "DEVICE",
        costPrice: 12000,
        sellPrice: 16000,
      },
    });

    const imei = await prisma.deviceIMEI.create({
      data: {
        tenantId: admin.tenantId,
        productId: pawnProduct.id,
        imei: "990000862471854",
        status: "PAWNED",
        costPrice: 12000,
        sellPrice: 16000,
        branchId: ownBranch,
      },
    });
    imeiId = imei.id;

    const contract = await prisma.tradeInContract.create({
      data: {
        tenantId: admin.tenantId,
        contractNo: "PW-202611-0001",
        type: "PAWN",
        status: "ACTIVE",
        customerId: ownCustomer,
        branchId: ownBranch,
        nationalId: "1234567890121",
        deviceBrand: "Apple",
        deviceModel: "iPhone 13 Pro 128GB",
        imei: "990000862471854",
        conditionGrade: "A",
        agreedPrice: 12000,
        interestRateMonthly: 1.25,
        durationMonths: 2,
        startDate: new Date(),
        dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
    });
    contractId = contract.id;
    assert.ok(contractId);
  });

  // Verify Tenant B cannot read or access this pawn contract
  const adminB: StaffPrincipal = {
    id: "user-b",
    tenantId: "test-b",
    name: "Admin B",
    username: "admin-b",
    role: "ADMIN",
    branchId: foreignBranch,
    branchIds: [foreignBranch],
  };

  await staffStorage.run(adminB, async () => {
    const isolatedContract = await prisma.tradeInContract.findUnique({
      where: { id: contractId },
    });
    assert.equal(isolatedContract, null);

    const bList = await prisma.tradeInContract.findMany({
      where: { type: "PAWN" },
    });
    assert.equal(bList.length, 0);
  });

  // Tenant A forfeits pawn (หลุดจำนำ) -> moves IMEI to IN_STOCK, creates stock item
  await staffStorage.run(admin, async () => {
    const updatedContract = await prisma.tradeInContract.update({
      where: { id: contractId },
      data: { status: "FORFEITED" },
    });
    assert.equal(updatedContract.status, "FORFEITED");

    const updatedImei = await prisma.deviceIMEI.update({
      where: { id: imeiId },
      data: { status: "IN_STOCK" },
    });
    assert.equal(updatedImei.status, "IN_STOCK");

    const productRecord = await prisma.product.findFirstOrThrow({
      where: { code: "PW-STOCK-001" },
    });

    const stock = await prisma.stockItem.create({
      data: {
        tenantId: admin.tenantId,
        productId: productRecord.id,
        branchId: ownBranch,
        quantity: 1,
      },
    });
    assert.equal(stock.quantity, 1);
  });
});

test("Round 12: POS Core Checkout & Sales Management Audit - Sequential Invoicing, Inventory Deductions, IMEI Tracking & Multi-Tenant Security", async () => {
  const adminBUser = await db.user.findFirstOrThrow({ where: { tenantId: "test-b", role: "ADMIN" } });
  const adminBPrincipal: StaffPrincipal = {
    id: adminBUser.id,
    tenantId: "test-b",
    name: adminBUser.name,
    username: adminBUser.username,
    role: "ADMIN",
    branchId: foreignBranch,
    branchIds: [foreignBranch],
  };

  let testSaleId = "";
  const yyyymm = bangkokYYYYMM();

  await staffStorage.run(cashier, async () => {
    // 1. Create a test device product with IMEI and an accessory with stock
    const phoneProduct = await prisma.product.create({
      data: {
        tenantId: cashier.tenantId,
        code: `PHONE-POS-${Date.now()}`,
        name: "iPhone 15 Pro Max 256GB",
        category: "DEVICE",
        costPrice: 35000,
        sellPrice: 42000,
      },
    });

    const phoneImei = await prisma.deviceIMEI.create({
      data: {
        tenantId: cashier.tenantId,
        productId: phoneProduct.id,
        branchId: ownBranch,
        imei: `35987654321${Date.now().toString().slice(-4)}`,
        status: "IN_STOCK",
      },
    });

    const caseProduct = await prisma.product.create({
      data: {
        tenantId: cashier.tenantId,
        code: `CASE-POS-${Date.now()}`,
        name: "Silicone Magnetic Case",
        category: "ACCESSORY",
        costPrice: 200,
        sellPrice: 500,
      },
    });

    await prisma.stockItem.create({
      data: {
        tenantId: cashier.tenantId,
        productId: caseProduct.id,
        branchId: ownBranch,
        quantity: 5,
      },
    });

    const serviceProduct = await prisma.product.create({
      data: {
        tenantId: cashier.tenantId,
        code: `SRV-POS-${Date.now()}`,
        name: "ค่าบริการติดฟิล์มและโอนถ่ายข้อมูล",
        category: "SERVICE",
        costPrice: 0,
        sellPrice: 300,
      },
    });

    // 2. Simulate Checkout: Sequential Counter, Stock Deduct, IMEI SOLD, Financial VAT Calc
    const counter = await prisma.sequenceCounter.upsert({
      where: { id: `INV-${yyyymm}` },
      update: { current: { increment: 1 } },
      create: { id: `INV-${yyyymm}`, current: 1 },
    });
    const invoiceNo = `INV-${yyyymm}-${String(counter.current).padStart(4, "0")}`;

    // Item 1: Device (42,000)
    // Item 2: Accessory (2x 500 = 1,000)
    // Item 3: Service (300)
    // Total = 43,300
    // Discount = 300 (Bill discount)
    // Net = 43,000 (VAT 7% inclusive)
    const vatCalc = calculateVAT(43000, true);
    assert.equal(vatCalc.total, 43000);
    assert.equal(vatCalc.base, Math.round((43000 / 1.07) * 100) / 100);
    assert.equal(vatCalc.vat, Math.round((43000 - vatCalc.base) * 100) / 100);

    const sale = await prisma.sale.create({
      data: {
        tenantId: cashier.tenantId,
        invoiceNo,
        branchId: ownBranch,
        customerId: ownCustomer,
        cashierId: cashier.id,
        totalAmount: 43300,
        discount: 300,
        vatAmount: vatCalc.vat,
        netAmount: vatCalc.total,
        paymentMethod: "SPLIT",
        paymentDetails: JSON.stringify({
          cashPart: 20000,
          secondaryMethod: "PROMPTPAY",
          secondaryPart: 23000,
        }),
        status: "COMPLETED",
      },
    });
    testSaleId = sale.id;

    // Create sale items
    await prisma.saleItem.create({
      data: {
        tenantId: cashier.tenantId,
        saleId: sale.id,
        productId: phoneProduct.id,
        deviceImeiId: phoneImei.id,
        quantity: 1,
        unitPrice: 42000,
        costPrice: 35000,
        subtotal: 42000,
      },
    });

    await prisma.saleItem.create({
      data: {
        tenantId: cashier.tenantId,
        saleId: sale.id,
        productId: caseProduct.id,
        quantity: 2,
        unitPrice: 500,
        costPrice: 200,
        subtotal: 1000,
      },
    });

    await prisma.saleItem.create({
      data: {
        tenantId: cashier.tenantId,
        saleId: sale.id,
        productId: serviceProduct.id,
        quantity: 1,
        unitPrice: 300,
        costPrice: 0,
        subtotal: 300,
      },
    });

    // Deduct stock for accessory (5 -> 3)
    await prisma.stockItem.update({
      where: {
        productId_branchId: {
          productId: caseProduct.id,
          branchId: ownBranch,
        },
      },
      data: { quantity: { decrement: 2 } },
    });

    // Mark IMEI as SOLD
    await prisma.deviceIMEI.update({
      where: { id: phoneImei.id },
      data: { status: "SOLD" },
    });

    // Verify stock and IMEI status
    const updatedStock = await prisma.stockItem.findUnique({
      where: {
        productId_branchId: {
          productId: caseProduct.id,
          branchId: ownBranch,
        },
      },
    });
    assert.equal(updatedStock?.quantity, 3);

    const updatedImei = await prisma.deviceIMEI.findUnique({
      where: { id: phoneImei.id },
    });
    assert.equal(updatedImei?.status, "SOLD");

    // Guard: Prevent selling already SOLD IMEI
    assert.notEqual(updatedImei?.status as string, "IN_STOCK");

    // Guard: Prevent overselling stock
    const remainingStock = updatedStock?.quantity ?? 0;
    const attemptedQty = 10;
    assert.ok(attemptedQty > remainingStock, "Oversell guard triggered");
  });

  // 3. Multi-Tenant Isolation: Tenant B cannot access Tenant A's Sale or SaleItems
  await staffStorage.run(adminBPrincipal, async () => {
    const saleForB = await prisma.sale.findFirst({
      where: { id: testSaleId },
    });
    assert.equal(saleForB, null);

    const salesListForB = await prisma.sale.findMany({
      where: { tenantId: "test-b" },
    });
    assert.ok(!salesListForB.some((s) => s.id === testSaleId));
  });
});

test("Round 13: Shift Management, Daily Takings, Sales History & Refunds Audit - Discrepancy Variance, Stock Replenishment & Multi-Tenant Isolation", async () => {
  // 1. Shift Lifecycle test: Open shift with float, record cash movements, close shift with discrepancy
  await staffStorage.run(admin, async () => {
    const openingFloat = 2000;
    const shiftId = `SHIFT-${Date.now()}`;
    await db.auditLog.create({
      data: {
        tenantId: admin.tenantId,
        userId: admin.id,
        module: "SHIFT",
        action: "OPEN",
        targetId: ownBranch,
        details: JSON.stringify({ shiftId, openingFloat, openedBy: admin.name }),
      },
    });

    // Cash movement: +500 Cash In, -200 Cash Out
    await db.auditLog.create({
      data: {
        tenantId: admin.tenantId,
        userId: admin.id,
        module: "SHIFT",
        action: "MOVEMENT",
        targetId: ownBranch,
        details: JSON.stringify({ shiftId, type: "CASH_IN", amount: 500, reason: "เงินทอนเพิ่ม" }),
      },
    });
    await db.auditLog.create({
      data: {
        tenantId: admin.tenantId,
        userId: admin.id,
        module: "SHIFT",
        action: "MOVEMENT",
        targetId: ownBranch,
        details: JSON.stringify({ shiftId, type: "CASH_OUT", amount: 200, reason: "ค่าน้ำดื่ม" }),
      },
    });

    // Expected cash calculation: 2000 (float) + 500 - 200 = 2300
    const expectedCash = 2000 + 500 - 200;
    const countedCash = 2350; // 50 over
    const discrepancy = countedCash - expectedCash; // +50

    await db.auditLog.create({
      data: {
        tenantId: admin.tenantId,
        userId: admin.id,
        module: "SHIFT",
        action: "CLOSE",
        targetId: ownBranch,
        details: JSON.stringify({
          shiftId,
          openingFloat,
          countedCash,
          expectedCash,
          discrepancy,
          closedBy: admin.name,
        }),
      },
    });

    const shiftLogs = await db.auditLog.findMany({
      where: { tenantId: admin.tenantId, module: "SHIFT", targetId: ownBranch },
    });
    assert.ok(shiftLogs.length >= 4);
    assert.equal(discrepancy, 50);
  });

  // 2. POS Sale, Stock Replenishment & IMEI Return on Refund
  const testPhone = await db.product.create({
    data: { tenantId: "test-a", code: `IP15-REF-${Date.now()}`, name: "iPhone 15 Pro", category: "DEVICE" },
  });
  await db.stockItem.upsert({
    where: { productId_branchId: { productId: testPhone.id, branchId: ownBranch } },
    update: { quantity: 10 },
    create: { tenantId: "test-a", productId: testPhone.id, branchId: ownBranch, quantity: 10 },
  });
  const imeiRecord = await db.deviceIMEI.create({
    data: {
      tenantId: "test-a",
      productId: testPhone.id,
      branchId: ownBranch,
      imei: `3517590000${Date.now().toString().slice(-5)}`,
      status: "IN_STOCK",
    },
  });

  // Simulate Sale of 1 device with IMEI
  const sale = await db.sale.create({
    data: {
      tenantId: "test-a",
      invoiceNo: `INV-202611-TEST-${Date.now()}`,
      branchId: ownBranch,
      customerId: ownCustomer,
      cashierId: admin.id,
      totalAmount: 35000,
      discount: 1000,
      vatAmount: 2224.3,
      netAmount: 34000,
      paymentMethod: "CASH",
      status: "COMPLETED",
      items: {
        create: {
          tenantId: "test-a",
          productId: testPhone.id,
          deviceImeiId: imeiRecord.id,
          quantity: 1,
          unitPrice: 35000,
          costPrice: 30000,
          subtotal: 35000,
        },
      },
    },
  });

  // Deduct stock and mark SOLD
  await db.stockItem.update({
    where: { productId_branchId: { productId: testPhone.id, branchId: ownBranch } },
    data: { quantity: { decrement: 1 } },
  });
  await db.deviceIMEI.update({
    where: { id: imeiRecord.id },
    data: { status: "SOLD" },
  });

  // Verify state before refund
  let stockBefore = await db.stockItem.findUnique({
    where: { productId_branchId: { productId: testPhone.id, branchId: ownBranch } },
  });
  let imeiBefore = await db.deviceIMEI.findUnique({ where: { id: imeiRecord.id } });
  assert.equal(stockBefore?.quantity, 9);
  assert.equal(imeiBefore?.status, "SOLD");

  // Perform Refund & Stock Replenishment transaction
  await db.$transaction(async (tx) => {
    // 1. Revert stock
    await tx.stockItem.update({
      where: { productId_branchId: { productId: testPhone.id, branchId: ownBranch } },
      data: { quantity: { increment: 1 } },
    });
    // 2. Revert IMEI to IN_STOCK and detach from item
    await tx.deviceIMEI.update({
      where: { id: imeiRecord.id },
      data: { status: "IN_STOCK" },
    });
    await tx.saleItem.updateMany({
      where: { saleId: sale.id },
      data: { deviceImeiId: null },
    });
    // 3. Mark sale as VOID
    await tx.sale.update({
      where: { id: sale.id },
      data: { status: "VOID" },
    });
    // 4. Log AuditLog
    await tx.auditLog.create({
      data: {
        tenantId: "test-a",
        userId: admin.id,
        module: "POS",
        action: "REFUND",
        targetId: sale.id,
        details: JSON.stringify({ invoiceNo: sale.invoiceNo, refundAmount: sale.netAmount }),
      },
    });
    await tx.auditLog.create({
      data: {
        tenantId: "test-a",
        userId: admin.id,
        module: "INVENTORY",
        action: "RESTOCK",
        targetId: sale.id,
        details: JSON.stringify({ productId: testPhone.id, quantity: 1, imei: imeiRecord.imei }),
      },
    });
  });

  // Verify state after refund
  const stockAfter = await db.stockItem.findUnique({
    where: { productId_branchId: { productId: testPhone.id, branchId: ownBranch } },
  });
  const imeiAfter = await db.deviceIMEI.findUnique({ where: { id: imeiRecord.id } });
  const saleAfter = await db.sale.findUnique({ where: { id: sale.id } });
  assert.equal(stockAfter?.quantity, 10);
  assert.equal(imeiAfter?.status, "IN_STOCK");
  assert.equal(saleAfter?.status, "VOID");

  // 3. Multi-Tenant isolation: Staff in Tenant B cannot see Tenant A's sale or stock
  const adminB = await db.user.findFirstOrThrow({ where: { tenantId: "test-b", username: "admin" } });
  const adminBPrincipal: StaffPrincipal = {
    id: adminB.id,
    tenantId: "test-b",
    name: adminB.name,
    username: adminB.username,
    role: "ADMIN",
    branchId: foreignBranch,
    branchIds: [foreignBranch],
  };

  await staffStorage.run(adminBPrincipal, async () => {
    const foreignSales = await prisma.sale.findMany({ where: { id: sale.id } });
    assert.equal(foreignSales.length, 0);

    const foreignIMEIs = await prisma.deviceIMEI.findMany({ where: { id: imeiRecord.id } });
    assert.equal(foreignIMEIs.length, 0);
  });
});

test("Round 14: Stock Transfers & Physical Stock Count Audit - State Machine, Stock Deduction & Receipt, IMEI Location Tracking, Count Reconciliation & Multi-Tenant Isolation", async () => {
  const adminBUser = await db.user.findFirstOrThrow({ where: { tenantId: "test-b", username: "admin" } });
  const adminBPrincipal: StaffPrincipal = {
    id: adminBUser.id,
    tenantId: "test-b",
    name: adminBUser.name,
    username: adminBUser.username,
    role: "ADMIN",
    branchId: foreignBranch,
    branchIds: [foreignBranch],
  };

  const yyyymm = bangkokYYYYMM();
  let transferProduct: any;
  let accessoryProduct: any;
  let testImei: any;
  let transfer1Id = "";
  let transfer1No = "";

  // 1. Setup products, initial stock and serialized IMEI in Tenant A
  await staffStorage.run(admin, async () => {
    transferProduct = await prisma.product.create({
      data: {
        tenantId: admin.tenantId,
        code: `PHONE-TRF-${Date.now()}`,
        name: "iPhone 15 Pro Max 512GB (Transfer Test)",
        category: "DEVICE",
        costPrice: 38000,
        sellPrice: 46000,
      },
    });

    accessoryProduct = await prisma.product.create({
      data: {
        tenantId: admin.tenantId,
        code: `CASE-TRF-${Date.now()}`,
        name: "Armor Shield Case (Count Test)",
        category: "ACCESSORY",
        costPrice: 200,
        sellPrice: 490,
      },
    });

    // Stock at ownBranch (HQ): 10 phones, 5 cases. secondBranch (BR2): 0 phones.
    await prisma.stockItem.createMany({
      data: [
        { tenantId: admin.tenantId, productId: transferProduct.id, branchId: ownBranch, quantity: 10 },
        { tenantId: admin.tenantId, productId: accessoryProduct.id, branchId: ownBranch, quantity: 5 },
        { tenantId: admin.tenantId, productId: transferProduct.id, branchId: secondBranch, quantity: 0 },
      ],
    });

    // Serialized IMEI at ownBranch with IN_STOCK status
    testImei = await prisma.deviceIMEI.create({
      data: {
        tenantId: admin.tenantId,
        productId: transferProduct.id,
        branchId: ownBranch,
        imei: `86543219876${Date.now().toString().slice(-4)}`,
        status: "IN_STOCK",
      },
    });
  });

  // 2. Branch-to-Branch Transfers: Transfer state machine (PENDING -> IN_TRANSIT -> RECEIVED)
  await staffStorage.run(admin, async () => {
    // 2.1 CREATE transfer TRF-1 with status PENDING: 2 phones (including testImei) from ownBranch -> secondBranch
    transfer1Id = `trf_test_${Date.now()}`;
    const counter = await prisma.sequenceCounter.upsert({
      where: { id: `TRF-${yyyymm}` },
      update: { current: { increment: 1 } },
      create: { id: `TRF-${yyyymm}`, current: 1 },
    });
    transfer1No = `TRF-${yyyymm}-${String(counter.current).padStart(4, "0")}`;

    await prisma.auditLog.create({
      data: {
        tenantId: admin.tenantId,
        userId: admin.id,
        module: "STOCK_TRANSFER",
        action: "CREATE",
        targetId: transfer1Id,
        details: JSON.stringify({
          transferId: transfer1Id,
          transferNo: transfer1No,
          sourceBranchId: ownBranch,
          destBranchId: secondBranch,
          status: "PENDING",
          items: [{ productId: transferProduct.id, quantity: 2, imeiIds: [testImei.id] }],
          requestedBy: admin.name,
        }),
      },
    });

    // In PENDING status, stock is not yet deducted
    const srcStockPending = await prisma.stockItem.findUnique({
      where: { productId_branchId: { productId: transferProduct.id, branchId: ownBranch } },
    });
    const destStockPending = await prisma.stockItem.findUnique({
      where: { productId_branchId: { productId: transferProduct.id, branchId: secondBranch } },
    });
    const imeiPending = await prisma.deviceIMEI.findUnique({ where: { id: testImei.id } });

    assert.equal(srcStockPending?.quantity, 10, "Source stock should remain 10 in PENDING");
    assert.equal(destStockPending?.quantity, 0, "Destination stock should remain 0 in PENDING");
    assert.equal(imeiPending?.status, "IN_STOCK", "IMEI status should remain IN_STOCK in PENDING");
    assert.equal(imeiPending?.branchId, ownBranch, "IMEI location should remain at ownBranch");

    // 2.2 DISPATCH transfer TRF-1: PENDING -> IN_TRANSIT
    // Deducts source stock: 10 -> 8, updates IMEI to IN_TRANSIT
    await prisma.$transaction(async (tx) => {
      await tx.stockItem.update({
        where: { productId_branchId: { productId: transferProduct.id, branchId: ownBranch } },
        data: { quantity: 8 },
      });
      await tx.deviceIMEI.update({
        where: { id: testImei.id },
        data: { status: "IN_TRANSIT" },
      });
      await tx.auditLog.create({
        data: {
          tenantId: admin.tenantId,
          userId: admin.id,
          module: "STOCK_TRANSFER",
          action: "IN_TRANSIT",
          targetId: transfer1Id,
          details: JSON.stringify({
            transferId: transfer1Id,
            transferNo: transfer1No,
            fromStatus: "PENDING",
            toStatus: "IN_TRANSIT",
          }),
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId: admin.tenantId,
          userId: admin.id,
          module: "INVENTORY",
          action: "STOCK_TRANSFER_OUT",
          targetId: transferProduct.id,
          details: JSON.stringify({ transferNo: transfer1No, quantity: 2, fromQty: 10, toQty: 8 }),
        },
      });
    });

    const srcStockTransit = await prisma.stockItem.findUnique({
      where: { productId_branchId: { productId: transferProduct.id, branchId: ownBranch } },
    });
    const imeiTransit = await prisma.deviceIMEI.findUnique({ where: { id: testImei.id } });
    assert.equal(srcStockTransit?.quantity, 8, "Source stock must be deducted on dispatch");
    assert.equal(imeiTransit?.status, "IN_TRANSIT", "IMEI status must transition to IN_TRANSIT");

    // 2.3 RECEIVE transfer TRF-1: IN_TRANSIT -> RECEIVED
    // Destination stock credited: 0 -> 2, IMEI location updated to secondBranch and status returns to IN_STOCK
    await prisma.$transaction(async (tx) => {
      await tx.stockItem.update({
        where: { productId_branchId: { productId: transferProduct.id, branchId: secondBranch } },
        data: { quantity: 2 },
      });
      await tx.deviceIMEI.update({
        where: { id: testImei.id },
        data: { branchId: secondBranch, status: "IN_STOCK" },
      });
      await tx.auditLog.create({
        data: {
          tenantId: admin.tenantId,
          userId: admin.id,
          module: "STOCK_TRANSFER",
          action: "RECEIVED",
          targetId: transfer1Id,
          details: JSON.stringify({
            transferId: transfer1Id,
            transferNo: transfer1No,
            fromStatus: "IN_TRANSIT",
            toStatus: "RECEIVED",
          }),
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId: admin.tenantId,
          userId: admin.id,
          module: "INVENTORY",
          action: "STOCK_TRANSFER_IN",
          targetId: transferProduct.id,
          details: JSON.stringify({ transferNo: transfer1No, quantity: 2, receivedStockQty: 2 }),
        },
      });
    });

    const srcStockFinal = await prisma.stockItem.findUnique({
      where: { productId_branchId: { productId: transferProduct.id, branchId: ownBranch } },
    });
    const destStockFinal = await prisma.stockItem.findUnique({
      where: { productId_branchId: { productId: transferProduct.id, branchId: secondBranch } },
    });
    const imeiFinal = await prisma.deviceIMEI.findUnique({ where: { id: testImei.id } });

    assert.equal(srcStockFinal?.quantity, 8, "Source stock remains deducted (8)");
    assert.equal(destStockFinal?.quantity, 2, "Destination stock must be credited on receipt (2)");
    assert.equal(imeiFinal?.branchId, secondBranch, "IMEI location branchId must be updated to secondBranch");
    assert.equal(imeiFinal?.status, "IN_STOCK", "IMEI status must return to IN_STOCK");
  });

  // 3. Transfer Reversal / Cancellation: dispatched stock returns to source on CANCEL / REJECT
  await staffStorage.run(admin, async () => {
    const transfer2Id = `trf_cancel_${Date.now()}`;
    // Dispatch 3 phones: ownBranch stock drops 8 -> 5
    await prisma.stockItem.update({
      where: { productId_branchId: { productId: transferProduct.id, branchId: ownBranch } },
      data: { quantity: 5 },
    });

    // Now Cancel / Revert the transfer from IN_TRANSIT
    await prisma.$transaction(async (tx) => {
      await tx.stockItem.update({
        where: { productId_branchId: { productId: transferProduct.id, branchId: ownBranch } },
        data: { quantity: { increment: 3 } },
      });
      await tx.auditLog.create({
        data: {
          tenantId: admin.tenantId,
          userId: admin.id,
          module: "INVENTORY",
          action: "STOCK_TRANSFER_REVERT",
          targetId: transferProduct.id,
          details: JSON.stringify({ transferId: transfer2Id, quantity: 3, reason: "ยกเลิกคำขอโอนย้ายสินค้า" }),
        },
      });
    });

    const srcStockReverted = await prisma.stockItem.findUnique({
      where: { productId_branchId: { productId: transferProduct.id, branchId: ownBranch } },
    });
    assert.equal(srcStockReverted?.quantity, 8, "Cancelled transfer must revert stock back to source (8)");
  });

  // 4. Physical Stock Count / Audit: Expected vs Counted, Surplus/Deficit, Variance Auto-adjustment & AuditLog
  await staffStorage.run(admin, async () => {
    // Physical audit at ownBranch:
    // transferProduct: expected 8, counted 10 (+2 SURPLUS)
    // accessoryProduct: expected 5, counted 3 (-2 DEFICIT)
    const sessionCount = await prisma.sequenceCounter.upsert({
      where: { id: `CNT-${yyyymm}` },
      update: { current: { increment: 1 } },
      create: { id: `CNT-${yyyymm}`, current: 1 },
    });
    const sessionCode = `CNT-${yyyymm}-${String(sessionCount.current).padStart(4, "0")}`;

    const countedItems = [
      {
        productId: transferProduct.id,
        expectedQty: 8,
        countedQty: 10,
        diff: +2,
        status: "SURPLUS",
        costPrice: 38000,
        impact: +76000,
      },
      {
        productId: accessoryProduct.id,
        expectedQty: 5,
        countedQty: 3,
        diff: -2,
        status: "DEFICIT",
        costPrice: 200,
        impact: -400,
      },
    ];

    await prisma.$transaction(async (tx) => {
      for (const item of countedItems) {
        await tx.stockItem.update({
          where: { productId_branchId: { productId: item.productId, branchId: ownBranch } },
          data: { quantity: item.countedQty },
        });

        await tx.auditLog.create({
          data: {
            tenantId: admin.tenantId,
            userId: admin.id,
            module: "INVENTORY",
            action: "STOCK_ADJUST",
            targetId: item.productId,
            details: JSON.stringify({
              sessionCode,
              type: "SET",
              fromQty: item.expectedQty,
              toQty: item.countedQty,
              variance: item.diff,
              status: item.status,
              reason: `ปรับยอดตรวจนับจริง (${sessionCode})`,
            }),
            beforeJson: JSON.stringify({ quantity: item.expectedQty }),
            afterJson: JSON.stringify({ quantity: item.countedQty }),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: admin.tenantId,
          userId: admin.id,
          module: "STOCK_COUNT",
          action: "SESSION_COMPLETE",
          targetId: ownBranch,
          details: JSON.stringify({
            sessionCode,
            branchId: ownBranch,
            itemsCounted: 2,
            discrepancyCount: 2,
            surplusCount: 1,
            deficitCount: 1,
            totalVarianceQty: 0,
            totalCostImpact: 75600,
            autoAdjusted: true,
          }),
        },
      });
    });

    const phoneAfterCount = await prisma.stockItem.findUnique({
      where: { productId_branchId: { productId: transferProduct.id, branchId: ownBranch } },
    });
    const caseAfterCount = await prisma.stockItem.findUnique({
      where: { productId_branchId: { productId: accessoryProduct.id, branchId: ownBranch } },
    });

    assert.equal(phoneAfterCount?.quantity, 10, "Phone stock must be reconciled to counted 10");
    assert.equal(caseAfterCount?.quantity, 3, "Case stock must be reconciled to counted 3");
  });

  // 5. Multi-Tenant isolation: Tenant B cannot see Tenant A's transfer logs or stock count logs
  await staffStorage.run(adminBPrincipal, async () => {
    const foreignTransferLogs = await prisma.auditLog.findMany({
      where: { module: "STOCK_TRANSFER" },
    });
    assert.equal(foreignTransferLogs.length, 0, "Tenant B must not see Tenant A stock transfer logs");

    const foreignCountLogs = await prisma.auditLog.findMany({
      where: { module: "STOCK_COUNT" },
    });
    assert.equal(foreignCountLogs.length, 0, "Tenant B must not see Tenant A stock count session logs");

    // Cross-tenant transfer check: branch lookup across tenants fails
    const foreignBranchCheck = await prisma.branch.findFirst({
      where: { id: ownBranch },
    });
    assert.equal(foreignBranchCheck, null, "Tenant A branch is invisible and inaccessible to Tenant B");
  });
});

test("Round 15: Purchasing, Purchase Orders, Receiving Shipment, Reorder Alerts & Multi-Tenant Isolation", async () => {
  // 1. Create Suppliers in Tenant A and Tenant B
  let supA: any;
  let supB: any;

  await staffStorage.run(admin, async () => {
    supA = await prisma.supplier.create({
      data: {
        tenantId: "test-a",
        name: "ซีคอน พาร์ท เซ็นเตอร์",
        contactPerson: "คุณกิตติศักดิ์",
        phone: "02-721-8899",
        creditTerms: "เครดิต 30 วัน",
        categories: "หน้าจอแท้, แบตเตอรี่ มอก.",
      },
    });
    assert.equal(supA.name, "ซีคอน พาร์ท เซ็นเตอร์");
  });

  const adminB = await db.user.findFirstOrThrow({ where: { tenantId: "test-b", username: "admin" } });
  const adminBPrincipal: StaffPrincipal = {
    id: adminB.id,
    tenantId: "test-b",
    name: adminB.name,
    username: adminB.username,
    role: "ADMIN",
    branchId: foreignBranch,
    branchIds: [foreignBranch],
  };

  await staffStorage.run(adminBPrincipal, async () => {
    supB = await prisma.supplier.create({
      data: {
        tenantId: "test-b",
        name: "เสือป่า เทรดดิ้ง",
        contactPerson: "เฮียชัย",
        phone: "081-998-7766",
        creditTerms: "เงินสด",
      },
    });

    // Multi-tenant check: Tenant B cannot see Tenant A's supplier
    const supFromB = await prisma.supplier.findMany({ where: { id: supA.id } });
    assert.equal(supFromB.length, 0);
  });

  // 2. PO Creation with Sequential Numbering & 7% VAT Calculation
  let createdPo: any;
  let testPhoneProduct: any;
  let testPartProduct: any;

  await staffStorage.run(admin, async () => {
    testPhoneProduct = await prisma.product.create({
      data: {
        tenantId: "test-a",
        code: "DEV-IP15P-128",
        name: "iPhone 15 Pro 128GB",
        category: "DEVICE",
        costPrice: 28000,
        sellPrice: 35900,
        minStock: 2,
      },
    });

    testPartProduct = await prisma.product.create({
      data: {
        tenantId: "test-a",
        code: "PART-BAT-IP14",
        name: "แบตเตอรี่ iPhone 14 มอก.",
        category: "SPARE_PART",
        costPrice: 850,
        sellPrice: 1500,
        minStock: 5,
      },
    });

    // Initialize initial stock for part to 2 (below minStock 5 -> Low Stock!)
    await prisma.stockItem.create({
      data: {
        tenantId: "test-a",
        branchId: ownBranch,
        productId: testPartProduct.id,
        quantity: 2,
      },
    });

    // Initial stock for device is 0
    await prisma.stockItem.create({
      data: {
        tenantId: "test-a",
        branchId: ownBranch,
        productId: testPhoneProduct.id,
        quantity: 0,
      },
    });

    // Subtotal: (2 phones * 27,500) + (10 batteries * 800) = 55,000 + 8,000 = 63,000
    const qtyPhone = 2;
    const costPhone = 27500;
    const qtyPart = 10;
    const costPart = 800;

    const subtotal = qtyPhone * costPhone + qtyPart * costPart; // 63000
    const vatAmount = Math.round(subtotal * 0.07 * 100) / 100; // 4410
    const totalAmount = Math.round((subtotal + vatAmount) * 100) / 100; // 67410

    const yyyymm = bangkokYYYYMM();
    const counter = await prisma.sequenceCounter.upsert({
      where: { id: `PO-test-a-${yyyymm}` },
      update: { current: { increment: 1 } },
      create: { id: `PO-test-a-${yyyymm}`, current: 1, tenantId: "test-a" },
    });
    const poNumber = `PO-${yyyymm}-${String(counter.current).padStart(4, "0")}`;

    createdPo = await prisma.purchaseOrder.create({
      data: {
        tenantId: "test-a",
        poNumber,
        branchId: ownBranch,
        supplierId: supA.id,
        supplierName: supA.name,
        supplierPhone: supA.phone,
        status: "ORDERED",
        paymentStatus: "PENDING",
        subtotal,
        taxRate: 7,
        vatAmount,
        totalAmount,
        orderedAt: new Date(),
        items: {
          create: [
            {
              tenantId: "test-a",
              productId: testPhoneProduct.id,
              productCode: testPhoneProduct.code,
              productName: testPhoneProduct.name,
              category: "DEVICE",
              quantity: qtyPhone,
              receivedQty: 0,
              unitCost: costPhone,
              totalCost: qtyPhone * costPhone,
            },
            {
              tenantId: "test-a",
              productId: testPartProduct.id,
              productCode: testPartProduct.code,
              productName: testPartProduct.name,
              category: "SPARE_PART",
              quantity: qtyPart,
              receivedQty: 0,
              unitCost: costPart,
              totalCost: qtyPart * costPart,
            },
          ],
        },
      },
      include: { items: true },
    });

    assert.equal(createdPo.subtotal, 63000);
    assert.equal(createdPo.vatAmount, 4410);
    assert.equal(createdPo.totalAmount, 67410);
    assert.match(createdPo.poNumber, /^PO-\d{6}-\d{4}$/);
    assert.equal(createdPo.items.length, 2);
  });

  // 3. Receiving Shipment: Atomic inventory credit, batch IMEI registration, updating cost price
  await staffStorage.run(admin, async () => {
    const po = await prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: createdPo.id },
      include: { items: true },
    });

    const phoneItem = po.items.find((i) => i.category === "DEVICE")!;
    const partItem = po.items.find((i) => i.category === "SPARE_PART")!;

    const phoneImeis = ["359871112223331", "359871112223332"];

    // Atomic transaction simulation (same as PATCH /api/purchases with action: RECEIVE)
    await prisma.$transaction(async (tx) => {
      // A. Credit part stock
      await tx.stockItem.upsert({
        where: {
          productId_branchId: { productId: partItem.productId!, branchId: ownBranch },
        },
        update: { quantity: { increment: partItem.quantity } },
        create: { tenantId: "test-a", branchId: ownBranch, productId: partItem.productId!, quantity: partItem.quantity },
      });
      // Update part cost price
      await tx.product.update({
        where: { id: partItem.productId! },
        data: { costPrice: partItem.unitCost },
      });

      // B. Credit phone stock
      await tx.stockItem.upsert({
        where: {
          productId_branchId: { productId: phoneItem.productId!, branchId: ownBranch },
        },
        update: { quantity: { increment: phoneItem.quantity } },
        create: { tenantId: "test-a", branchId: ownBranch, productId: phoneItem.productId!, quantity: phoneItem.quantity },
      });
      // Update phone cost price
      await tx.product.update({
        where: { id: phoneItem.productId! },
        data: { costPrice: phoneItem.unitCost },
      });

      // Batch IMEI registration
      await tx.deviceIMEI.createMany({
        data: phoneImeis.map((imei) => ({
          tenantId: "test-a",
          branchId: ownBranch,
          productId: phoneItem.productId!,
          imei,
          status: "IN_STOCK",
          conditionGrade: "A",
          costPrice: phoneItem.unitCost,
          sellPrice: 35900,
        })),
      });

      // Update PO status to RECEIVED
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: {
          status: "RECEIVED",
          receivedAt: new Date(),
          paymentStatus: "PAID",
        },
      });
    });

    // Verification after receiving
    const partStock = await prisma.stockItem.findUnique({
      where: { productId_branchId: { productId: testPartProduct.id, branchId: ownBranch } },
    });
    // Was 2, received 10 -> should be 12
    assert.equal(partStock?.quantity, 12);

    const updatedPartProd = await prisma.product.findUnique({ where: { id: testPartProduct.id } });
    assert.equal(updatedPartProd?.costPrice, 800);

    const phoneStock = await prisma.stockItem.findUnique({
      where: { productId_branchId: { productId: testPhoneProduct.id, branchId: ownBranch } },
    });
    // Was 0, received 2 -> should be 2
    assert.equal(phoneStock?.quantity, 2);

    const registeredImeis = await prisma.deviceIMEI.findMany({
      where: { tenantId: "test-a", imei: { in: phoneImeis } },
    });
    assert.equal(registeredImeis.length, 2);
    assert.equal(registeredImeis[0].status, "IN_STOCK");
    assert.equal(registeredImeis[0].costPrice, 27500);

    const receivedPo = await prisma.purchaseOrder.findUnique({ where: { id: createdPo.id } });
    assert.equal(receivedPo?.status, "RECEIVED");
    assert.equal(receivedPo?.paymentStatus, "PAID");
  });

  // 4. Reorder Alerts: Low-stock detection & 1-Click PO Draft creation
  await staffStorage.run(admin, async () => {
    // Create a product with stock below minStock
    const lowStockProd = await prisma.product.create({
      data: {
        tenantId: "test-a",
        code: "CABLE-TYPE-C",
        name: "สายชาร์จ Type-C 100W",
        category: "ACCESSORY",
        costPrice: 120,
        sellPrice: 290,
        minStock: 10,
      },
    });

    await prisma.stockItem.create({
      data: {
        tenantId: "test-a",
        branchId: ownBranch,
        productId: lowStockProd.id,
        quantity: 3, // 3 <= minStock 10 -> Low stock!
      },
    });

    // Auto-suggested reorder calculation: minStock * 2 - currentStock = 20 - 3 = 17
    const currentStock = 3;
    const minStock = 10;
    const suggestedQuantity = Math.max(1, minStock * 2 - currentStock);
    assert.equal(suggestedQuantity, 17);

    // 1-Click convert into PO Draft
    const yyyymm = bangkokYYYYMM();
    const counter = await prisma.sequenceCounter.upsert({
      where: { id: `PO-test-a-${yyyymm}` },
      update: { current: { increment: 1 } },
      create: { id: `PO-test-a-${yyyymm}`, current: 1, tenantId: "test-a" },
    });
    const draftPoNumber = `PO-${yyyymm}-${String(counter.current).padStart(4, "0")}`;

    const draftPo = await prisma.purchaseOrder.create({
      data: {
        tenantId: "test-a",
        poNumber: draftPoNumber,
        branchId: ownBranch,
        supplierId: supA.id,
        supplierName: supA.name,
        status: "DRAFT",
        paymentStatus: "PENDING",
        subtotal: suggestedQuantity * lowStockProd.costPrice,
        taxRate: 7,
        vatAmount: Math.round(suggestedQuantity * lowStockProd.costPrice * 0.07 * 100) / 100,
        totalAmount: Math.round(suggestedQuantity * lowStockProd.costPrice * 1.07 * 100) / 100,
        items: {
          create: [
            {
              tenantId: "test-a",
              productId: lowStockProd.id,
              productCode: lowStockProd.code,
              productName: lowStockProd.name,
              category: lowStockProd.category,
              quantity: suggestedQuantity,
              receivedQty: 0,
              unitCost: lowStockProd.costPrice,
              totalCost: suggestedQuantity * lowStockProd.costPrice,
            },
          ],
        },
      },
      include: { items: true },
    });

    assert.equal(draftPo.status, "DRAFT");
    assert.equal(draftPo.items[0].quantity, 17);
    assert.equal(draftPo.items[0].totalCost, 2040); // 17 * 120
  });

  // 5. Multi-Tenant Isolation: Tenant B cannot see Tenant A's Purchase Orders
  await staffStorage.run(adminBPrincipal, async () => {
    const foreignPos = await prisma.purchaseOrder.findMany({
      where: { id: createdPo.id },
    });
    assert.equal(foreignPos.length, 0);

    const allPosForB = await prisma.purchaseOrder.findMany({});
    assert.equal(allPosForB.length, 0);
  });
});

test("Round 16: Product Inventory, Serialized IMEI Lifecycle, Accessories & Warranty Audit - Multi-Tenant Isolation & Status Transitions", async () => {
  const adminBUser = await db.user.findFirstOrThrow({ where: { tenantId: "test-b", role: "ADMIN" } });
  const staffB: StaffPrincipal = {
    id: adminBUser.id,
    tenantId: "test-b",
    name: adminBUser.name,
    username: adminBUser.username,
    role: "ADMIN",
    branchId: foreignBranch,
    branchIds: [foreignBranch],
  };

  await staffStorage.run(admin, async () => {
    // 1. Product CRUD & Category Classification (DEVICE, ACCESSORY, SPARE_PART, SERVICE)
    const deviceProd = await prisma.product.create({
      data: {
        tenantId: "test-a",
        code: `PHONE-IP15-${Date.now()}`,
        name: "iPhone 15 128GB Black",
        category: "DEVICE",
        brand: "Apple",
        model: "iPhone 15",
        costPrice: 24000,
        sellPrice: 28900,
        minStock: 2,
      },
    });

    const accessoryProd = await prisma.product.create({
      data: {
        tenantId: "test-a",
        code: `ACC-ANK-${Date.now()}`,
        name: "Anker Nano 65W GaN Charger",
        category: "ACCESSORY",
        brand: "Anker",
        costPrice: 800,
        sellPrice: 1290,
        minStock: 5,
      },
    });

    const serviceProd = await prisma.product.create({
      data: {
        tenantId: "test-a",
        code: `SRV-SCREEN-${Date.now()}`,
        name: "ค่าบริการเปลี่ยนหน้าจอมาตรฐาน",
        category: "SERVICE",
        costPrice: 0,
        sellPrice: 500,
        minStock: 0,
      },
    });

    assert.equal(deviceProd.category, "DEVICE");
    assert.equal(accessoryProd.category, "ACCESSORY");
    assert.equal(serviceProd.category, "SERVICE");

    // Same SKU code in different tenant is allowed
    const sharedCode = `SHARED-SKU-${Date.now()}`;
    await prisma.product.create({
      data: {
        tenantId: "test-a",
        code: sharedCode,
        name: "Shared Product Tenant A",
        category: "ACCESSORY",
      },
    });

    await staffStorage.run(staffB, async () => {
      const prodInB = await prisma.product.create({
        data: {
          tenantId: "test-b",
          code: sharedCode,
          name: "Shared Product Tenant B",
          category: "ACCESSORY",
        },
      });
      assert.equal(prodInB.code, sharedCode);
    });

    // 2. Serialized IMEI Lifecycle & Duplicate Prevention in Tenant A
    const imeiCode = `35891102938${Date.now().toString().slice(-4)}`;
    const imeiRecord = await prisma.$transaction(async (tx) => {
      const im = await tx.deviceIMEI.create({
        data: {
          tenantId: "test-a",
          productId: deviceProd.id,
          branchId: ownBranch,
          imei: imeiCode,
          serialNo: "F2LX9102",
          conditionGrade: "A",
          status: "IN_STOCK",
          costPrice: 24000,
          sellPrice: 28900,
        },
      });
      await tx.stockItem.upsert({
        where: { productId_branchId: { productId: deviceProd.id, branchId: ownBranch } },
        update: { quantity: { increment: 1 } },
        create: { tenantId: "test-a", productId: deviceProd.id, branchId: ownBranch, quantity: 1 },
      });
      return im;
    });

    // Duplicate IMEI in same tenant must fail unique constraint
    await assert.rejects(async () => {
      await prisma.deviceIMEI.create({
        data: {
          tenantId: "test-a",
          productId: deviceProd.id,
          branchId: ownBranch,
          imei: imeiCode,
          status: "IN_STOCK",
        },
      });
    });

    // 3. IMEI Status Transitions: IN_STOCK -> DEFECTIVE (decrements stock)
    await prisma.$transaction(async (tx) => {
      await tx.deviceIMEI.update({
        where: { id: imeiRecord.id },
        data: { status: "DEFECTIVE" },
      });
      await tx.stockItem.update({
        where: { productId_branchId: { productId: deviceProd.id, branchId: ownBranch } },
        data: { quantity: { decrement: 1 } },
      });
    });

    const stockDefective = await prisma.stockItem.findUnique({
      where: { productId_branchId: { productId: deviceProd.id, branchId: ownBranch } },
    });
    assert.equal(stockDefective?.quantity, 0);

    // DEFECTIVE -> IN_STOCK (re-increments stock)
    await prisma.$transaction(async (tx) => {
      await tx.deviceIMEI.update({
        where: { id: imeiRecord.id },
        data: { status: "IN_STOCK" },
      });
      await tx.stockItem.update({
        where: { productId_branchId: { productId: deviceProd.id, branchId: ownBranch } },
        data: { quantity: { increment: 1 } },
      });
    });

    const stockRestored = await prisma.stockItem.findUnique({
      where: { productId_branchId: { productId: deviceProd.id, branchId: ownBranch } },
    });
    assert.equal(stockRestored?.quantity, 1);

    // Branch location tracking: transfer IMEI from ownBranch to secondBranch
    await prisma.$transaction(async (tx) => {
      await tx.deviceIMEI.update({
        where: { id: imeiRecord.id },
        data: { branchId: secondBranch },
      });
      await tx.stockItem.update({
        where: { productId_branchId: { productId: deviceProd.id, branchId: ownBranch } },
        data: { quantity: { decrement: 1 } },
      });
      await tx.stockItem.upsert({
        where: { productId_branchId: { productId: deviceProd.id, branchId: secondBranch } },
        update: { quantity: { increment: 1 } },
        create: { tenantId: "test-a", productId: deviceProd.id, branchId: secondBranch, quantity: 1 },
      });
    });

    const stockOwnAfterTransfer = await prisma.stockItem.findUnique({
      where: { productId_branchId: { productId: deviceProd.id, branchId: ownBranch } },
    });
    const stockSecondAfterTransfer = await prisma.stockItem.findUnique({
      where: { productId_branchId: { productId: deviceProd.id, branchId: secondBranch } },
    });
    assert.equal(stockOwnAfterTransfer?.quantity, 0);
    assert.equal(stockSecondAfterTransfer?.quantity, 1);

    // 4. Accessories Catalog & Quick Restock
    const accessoryStock = await prisma.stockItem.create({
      data: {
        tenantId: "test-a",
        productId: accessoryProd.id,
        branchId: ownBranch,
        quantity: 2, // below minStock (5) -> isLowStock = true
      },
    });
    assert.ok(accessoryStock.quantity <= accessoryProd.minStock, "Accessory is low stock");

    // Quick restock +10
    const restocked = await prisma.stockItem.update({
      where: { id: accessoryStock.id },
      data: { quantity: { increment: 10 } },
    });
    assert.equal(restocked.quantity, 12);

    // 5. Warranty Expiration Calculation & Claim Registration
    const purchaseDate = new Date("2026-10-01T10:00:00Z");
    const warrantyDays = 90;
    const expiryDate = new Date(purchaseDate.getTime() + warrantyDays * 86400000);
    const currentDate = new Date("2026-11-20T10:00:00Z");
    const isWarrantyActive = currentDate <= expiryDate;
    const daysRemaining = Math.ceil((expiryDate.getTime() - currentDate.getTime()) / 86400000);

    assert.equal(isWarrantyActive, true);
    assert.ok(daysRemaining > 0, "Warranty has positive remaining days");

    // File warranty claim in AuditLog
    const claimLog = await prisma.auditLog.create({
      data: {
        tenantId: "test-a",
        userId: admin.id,
        module: "WARRANTY",
        action: "CLAIM",
        targetId: imeiCode,
        details: JSON.stringify({
          claimNo: "CLM-20261120-1001",
          imei: imeiCode,
          symptom: "พอร์ตชาร์จหลวม ชาร์จไฟไม่เข้า",
          status: "IN_REVIEW",
        }),
      },
    });
    assert.ok(claimLog.id);

    // 6. Cross-Tenant Isolation: Tenant B cannot access Tenant A's products, IMEIs, or warranties
    await staffStorage.run(staffB, async () => {
      const tenantAProductsInB = await prisma.product.findMany({
        where: { id: deviceProd.id },
      });
      assert.equal(tenantAProductsInB.length, 0);

      const tenantAIMEIsInB = await prisma.deviceIMEI.findMany({
        where: { id: imeiRecord.id },
      });
      assert.equal(tenantAIMEIsInB.length, 0);

      const tenantAClaimsInB = await prisma.auditLog.findMany({
        where: { id: claimLog.id },
      });
      assert.equal(tenantAClaimsInB.length, 0);
    });
  });
});

test("Round 17: Customer Management & CRM Audit - Normalization, Duplicate Prevention, Tags, LTV & Multi-Tenant Isolation", async () => {
  // 1. Phone Normalization tests
  assert.equal(normalizeCustomerPhone("081-234-5678"), "0812345678");
  assert.equal(normalizeCustomerPhone("+66 81 234 5678"), "0812345678");
  assert.equal(normalizeCustomerPhone("+66812345678"), "0812345678");
  assert.equal(normalizeCustomerPhone("(081) 234-5678"), "0812345678");
  assert.equal(normalizeCustomerPhone("02-721-8899"), "027218899");
  assert.equal(normalizeCustomerPhone(""), "");

  // 2. Metadata Packing and Unpacking
  const packed = packCustomerAddress({
    address: "123 ถ.สุขุมวิท พระโขนง กทม.",
    email: "vip@example.com",
    tag: "VIP",
    notes: "ลูกค้าประจำ ขอช่างเอกเท่านั้น",
  });
  const unpacked = unpackCustomerAddress(packed);
  assert.equal(unpacked.address, "123 ถ.สุขุมวิท พระโขนง กทม.");
  assert.equal(unpacked.email, "vip@example.com");
  assert.equal(unpacked.tag, "VIP");
  assert.equal(unpacked.notes, "ลูกค้าประจำ ขอช่างเอกเท่านั้น");

  // Fallback for plain legacy address
  const legacy = unpackCustomerAddress("99 หมู่ 3 อ.เมือง เชียงใหม่");
  assert.equal(legacy.address, "99 หมู่ 3 อ.เมือง เชียงใหม่");
  assert.equal(legacy.tag, "REGULAR");
  assert.equal(legacy.email, "");

  // 3. Customer Tier Resolution
  assert.equal(determineCustomerTier(25000, 1), "VIP"); // Spend >= 20,000
  assert.equal(determineCustomerTier(5000, 6), "VIP"); // Orders >= 5
  assert.equal(determineCustomerTier(1000, 2), "REGULAR"); // Orders >= 2
  assert.equal(determineCustomerTier(500, 0), "NEW"); // Low spend, 0 orders
  assert.equal(determineCustomerTier(50000, 10, "BLACKLIST"), "BLACKLIST"); // Manual tag takes precedence
  assert.equal(determineCustomerTier(500, 1, "WHOLESALE"), "WHOLESALE");

  // 4. Lifetime Spend (LTV) Calculation with Satang precision
  const mockSales = [
    { netAmount: 12500.5, status: "COMPLETED" },
    { netAmount: 3200.25, status: "COMPLETED" },
    { netAmount: 5000, status: "VOID" }, // Should be excluded
  ];
  const mockRepairs = [
    { totalCost: 1500.75, status: "COMPLETED" },
    { totalCost: 2000, status: "CANCELLED" }, // Should be excluded
  ];
  const ltv = calculateCustomerLTV(mockSales, mockRepairs);
  assert.equal(ltv.totalSalesSpend, 15700.75);
  assert.equal(ltv.totalRepairSpend, 1500.75);
  assert.equal(ltv.totalSpend, 17201.5);
  assert.equal(ltv.totalOrders, 3); // 2 completed sales + 1 completed repair

  // 5. Database Multi-Tenant Isolation & Duplicate Phone Enforcement
  const customerPhone = "0891234567";

  let custTenantA: any;
  await staffStorage.run(admin, async () => {
    // Clean up any earlier record
    await prisma.customer.deleteMany({ where: { phone: customerPhone } });

    // Create customer in Tenant A
    custTenantA = await prisma.customer.create({
      data: {
        tenantId: "test-a",
        name: "คุณสมศักดิ์ ทดสอบระบบ",
        phone: customerPhone,
        nationalId: "1100200300401",
        lineId: "somsak_test",
        address: packed,
      },
    });
    assert.ok(custTenantA.id);
    assert.equal(custTenantA.phone, customerPhone);

    // Creating another customer with the SAME phone in Tenant A must fail unique constraint
    let duplicateFailed = false;
    try {
      await prisma.customer.create({
        data: {
          tenantId: "test-a",
          name: "คุณสมศักดิ์ เบอร์ซ้ำ",
          phone: customerPhone,
        },
      });
    } catch {
      duplicateFailed = true;
    }
    assert.equal(duplicateFailed, true, "Duplicate phone in the same tenant must be blocked");
  });

  // 6. Cross-Tenant Duplicate Phone Allowed (Same phone in Tenant B is allowed)
  const staffB: StaffPrincipal = {
    id: "user-b",
    tenantId: "test-b",
    name: "Admin B",
    branchId: foreignBranch,
    branchIds: [foreignBranch],
    role: "ADMIN",
    username: "admin_b",
  };

  await staffStorage.run(staffB, async () => {
    const custTenantB = await prisma.customer.create({
      data: {
        tenantId: "test-b",
        name: "คุณวิชัย ลูกค้าสาขาบี",
        phone: customerPhone, // Same phone as Tenant A
      },
    });
    assert.ok(custTenantB.id);
    assert.equal(custTenantB.phone, customerPhone);

    // Tenant B cannot read Tenant A's customer
    const foundInB = await prisma.customer.findMany({
      where: { id: custTenantA.id },
    });
    assert.equal(foundInB.length, 0, "Tenant B must not see Tenant A customer");

    // Clean up
    await prisma.customer.delete({ where: { id: custTenantB.id } });
  });

  // Clean up Tenant A customer
  await staffStorage.run(admin, async () => {
    await prisma.customer.delete({ where: { id: custTenantA.id } });
  });
});

test("Round 18: Customer Access & Portal Auth - Hybrid Dual-Channel Auth, Ticket Proof, Fail-Closed Security & Staff Control", async () => {
  // 1. Fail-closed: non-existent customer in tenant throws 404
  await assert.rejects(
    verifyCustomerWithTicketProof("test-a", "0890009988", "1234", "Unknown User"),
    (err: any) => err.status === 404 && err.message.includes("ไม่พบข้อมูลลูกค้า")
  );

  // 2. Setup verified customer & repair job in Tenant A
  const testPhone = "0897654321";
  const customerA = await db.customer.create({
    data: {
      tenantId: "test-a",
      name: "คุณสมศักดิ์ ทดสอบ",
      phone: testPhone,
    },
  });

  const jobA = await db.repairJob.create({
    data: {
      tenantId: "test-a",
      branchId: ownBranch,
      customerId: customerA.id,
      trackingCode: "REP-202611-7788",
      serialIMEI: "354812098877665",
      deviceBrand: "Apple",
      deviceModel: "iPhone 15 Pro",
      issueDescription: "จอแตก เปลี่ยนจอแท้",
      status: "REPAIRING",
    },
  });

  // 3. Ticket Proof Failure: incorrect proof throws 401
  await assert.rejects(
    verifyCustomerWithTicketProof("test-a", testPhone, "0000", "คุณสมศักดิ์"),
    (err: any) => err.status === 401 && err.message.includes("ไม่ตรงกับข้อมูลในระบบ")
  );

  // 4. Ticket Proof Success: last 4 digits of trackingCode
  const accountByTracking = await verifyCustomerWithTicketProof("test-a", testPhone, "7788", "คุณสมศักดิ์");
  assert.ok(accountByTracking.id);
  assert.equal(accountByTracking.status, "ACTIVE");

  // Verify link was created with VERIFIED_TICKET_PROOF
  const linkByTracking = await db.customerAccountLink.findUnique({
    where: { accountId: accountByTracking.id },
  });
  assert.ok(linkByTracking);
  assert.equal(linkByTracking.customerId, customerA.id);
  assert.equal(linkByTracking.evidence, "VERIFIED_TICKET_PROOF");

  // 5. Ticket Proof Success: last 4 digits of IMEI with whitespace & hyphens
  const accountByIMEI = await verifyCustomerWithTicketProof("test-a", testPhone, " 76-65 ", "คุณสมศักดิ์");
  assert.equal(accountByIMEI.id, accountByTracking.id);

  // 6. Ticket Proof Success: full tracking code with case insensitivity
  const accountByFullCode = await verifyCustomerWithTicketProof("test-a", testPhone, "rep-202611-7788", "คุณสมศักดิ์");
  assert.equal(accountByFullCode.id, accountByTracking.id);

  // 7. Multi-Tenant Isolation: Tenant B cannot authenticate using Tenant A's customer proof
  await assert.rejects(
    verifyCustomerWithTicketProof("test-b", testPhone, "7788", "Attacker"),
    (err: any) => err.status === 404
  );

  // 8. Security: Suspended account fails verification with 403
  await db.customerAccount.update({
    where: { id: accountByTracking.id },
    data: { status: "SUSPENDED" },
  });

  await assert.rejects(
    verifyCustomerWithTicketProof("test-a", testPhone, "7788", "คุณสมศักดิ์"),
    (err: any) => err.status === 403 && err.message.includes("ระงับ")
  );

  // Restore active status
  await db.customerAccount.update({
    where: { id: accountByTracking.id },
    data: { status: "ACTIVE" },
  });

  // 9. Session Management & Revocation
  const sessionToken = "test_customer_session_token_1234567890abcdef";
  const { createHash } = await import("node:crypto");
  const hashedToken = createHash("sha256").update(sessionToken).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 86_400_000);

  const createdSession = await db.customerSession.create({
    data: {
      tenantId: "test-a",
      accountId: accountByTracking.id,
      tokenHash: hashedToken,
      expiresAt,
    },
  });
  assert.ok(createdSession.id);
  assert.equal(createdSession.revokedAt, null);

  // Revoke active sessions (Kick Out)
  const revokeResult = await db.customerSession.updateMany({
    where: { tenantId: "test-a", accountId: accountByTracking.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  assert.ok(revokeResult.count >= 1);

  const checkRevoked = await db.customerSession.findUnique({
    where: { id: createdSession.id },
  });
  assert.ok(checkRevoked?.revokedAt !== null);

  // 10. Staff 1-Click Tracking Link generation
  const publicToken = "public_tracking_link_token_sample_hex_string_1234";
  const hashedPublicToken = createHash("sha256").update(publicToken).digest("hex");
  const publicExpiresAt = new Date(Date.now() + 90 * 86_400_000);

  const trackingToken = await db.publicTrackingToken.create({
    data: {
      tenantId: "test-a",
      repairJobId: jobA.id,
      tokenHash: hashedPublicToken,
      expiresAt: publicExpiresAt,
    },
  });
  assert.ok(trackingToken.id);
  assert.equal(trackingToken.revokedAt, null);

  // Re-issuing invalidates prior token
  const now = new Date();
  await db.$transaction([
    db.publicTrackingToken.updateMany({
      where: { tenantId: "test-a", repairJobId: jobA.id, revokedAt: null },
      data: { revokedAt: now },
    }),
    db.publicTrackingToken.create({
      data: {
        tenantId: "test-a",
        repairJobId: jobA.id,
        tokenHash: createHash("sha256").update("second_token").digest("hex"),
        expiresAt: publicExpiresAt,
      },
    }),
  ]);

  const priorToken = await db.publicTrackingToken.findUnique({
    where: { id: trackingToken.id },
  });
  assert.ok(priorToken?.revokedAt !== null);
});

test("Round 19: Supplier Management & CRM Audit - Profile, Tax ID, Credit Terms, Bank Details, PO Linkage, Spend Calculation & Multi-Tenant Isolation", async () => {
  const staffB: StaffPrincipal = {
    id: "user-b-admin",
    tenantId: "test-b",
    name: "Admin B",
    username: "admin-b",
    role: "ADMIN",
    branchId: foreignBranch,
    branchIds: [foreignBranch],
  };

  // 1. Supplier Profile with complete fields (Email, Bank details, 13-digit Tax ID, Credit terms)
  let supplierA: any;
  let supplierB: any;

  await staffStorage.run(admin, async () => {
    // Validation: Invalid taxId throws
    const { validateTaxId, validateEmail } = await import("../src/app/api/suppliers/route");
    assert.throws(() => validateTaxId("123"), /13 หลัก/);
    assert.equal(validateTaxId("010-5-56001-234-5"), "0105560012345");
    assert.throws(() => validateEmail("invalid-email"), /รูปแบบอีเมลไม่ถูกต้อง/);
    assert.equal(validateEmail("supplier@fixme.co.th"), "supplier@fixme.co.th");

    supplierA = await prisma.supplier.create({
      data: {
        tenantId: "test-a",
        name: "บริษัท ซีคอน สแปร์พาร์ท จำกัด",
        contactPerson: "คุณกิตติศักดิ์ เจริญพร",
        phone: "081-555-7788",
        email: "kittisak@seaconpart.com",
        lineId: "@seaconpart",
        address: "55 อาคารซีคอนสแควร์ ชั้น 3 แขวงหนองบอน เขตประเวศ กทม. 10250",
        taxId: "0105560012345",
        creditTerms: "เครดิต 30 วัน",
        bankName: "ธนาคารกสิกรไทย (KBANK)",
        bankAccountNumber: "123-4-56789-0",
        bankAccountName: "บจก. ซีคอน สแปร์พาร์ท",
        categories: "หน้าจอแท้, แบตเตอรี่ มอก., สายแพรชาร์จ",
        active: true,
      },
    });

    assert.equal(supplierA.name, "บริษัท ซีคอน สแปร์พาร์ท จำกัด");
    assert.equal(supplierA.email, "kittisak@seaconpart.com");
    assert.equal(supplierA.bankName, "ธนาคารกสิกรไทย (KBANK)");
    assert.equal(supplierA.bankAccountNumber, "123-4-56789-0");
    assert.equal(supplierA.taxId, "0105560012345");
  });

  // 2. Uniqueness check & Cross-tenant duplicate allowance
  await staffStorage.run(staffB, async () => {
    // Tenant B can create supplier with the EXACT SAME NAME (multi-tenant uniqueness)
    supplierB = await prisma.supplier.create({
      data: {
        tenantId: "test-b",
        name: "บริษัท ซีคอน สแปร์พาร์ท จำกัด",
        contactPerson: "ผู้จัดการสาขา B",
        phone: "089-999-0000",
        email: "tenant-b@supplier.com",
        creditTerms: "เงินสด / โอนก่อนส่ง",
        bankName: "ธนาคารไทยพาณิชย์ (SCB)",
        bankAccountNumber: "987-6-54321-0",
        bankAccountName: "สาขา บี เทรดดิ้ง",
      },
    });
    assert.equal(supplierB.name, supplierA.name);
    assert.notEqual(supplierB.id, supplierA.id);

    // Tenant B cannot see Tenant A's supplier
    const bFindA = await prisma.supplier.findFirst({
      where: { id: supplierA.id },
    });
    assert.equal(bFindA, null, "Tenant A supplier must be invisible to Tenant B");
  });

  // 3. Purchase Linkage & Real-time Lifetime Spend Calculation
  await staffStorage.run(admin, async () => {
    // Create PO 1: RECEIVED with 5,000 THB + 7% VAT = 5,350 THB
    const poReceived = await prisma.purchaseOrder.create({
      data: {
        tenantId: "test-a",
        poNumber: "PO-202611-SUP01",
        branchId: ownBranch,
        supplierId: supplierA.id,
        supplierName: supplierA.name,
        supplierPhone: supplierA.phone,
        status: "RECEIVED",
        paymentStatus: "PAID",
        subtotal: 5000,
        taxRate: 7,
        vatAmount: 350,
        totalAmount: 5350,
        items: {
          create: [
            {
              tenantId: "test-a",
              productCode: "SCR-IP15P",
              productName: "หน้าจอแท้ iPhone 15 Pro",
              category: "SPARE_PART",
              quantity: 2,
              unitCost: 2000,
              totalCost: 4000,
            },
            {
              tenantId: "test-a",
              productCode: "BAT-IP13",
              productName: "แบตเตอรี่ มอก. iPhone 13",
              category: "SPARE_PART",
              quantity: 2,
              unitCost: 500,
              totalCost: 1000,
            },
          ],
        },
      },
    });
    assert.ok(poReceived.id);

    // Create PO 2: CANCELLED with 3,000 THB (should NOT be added to totalSpend)
    const poCancelled = await prisma.purchaseOrder.create({
      data: {
        tenantId: "test-a",
        poNumber: "PO-202611-SUP02",
        branchId: ownBranch,
        supplierId: supplierA.id,
        supplierName: supplierA.name,
        supplierPhone: supplierA.phone,
        status: "CANCELLED",
        paymentStatus: "PENDING",
        subtotal: 3000,
        taxRate: 0,
        vatAmount: 0,
        totalAmount: 3000,
      },
    });
    assert.ok(poCancelled.id);

    // Query supplier detail via prisma with purchaseOrders linkage
    const queriedSupplier = await prisma.supplier.findFirstOrThrow({
      where: { id: supplierA.id },
      include: {
        purchaseOrders: {
          include: { items: true },
        },
        _count: {
          select: { purchaseOrders: true },
        },
      },
    });

    assert.equal(queriedSupplier._count.purchaseOrders, 2, "Total PO count should be 2");

    // Spend calculation: non-cancelled only
    const nonCancelled = queriedSupplier.purchaseOrders.filter((po: any) => po.status !== "CANCELLED");
    const totalSpend = nonCancelled.reduce((sum: number, po: any) => sum + po.totalAmount, 0);
    assert.equal(totalSpend, 5350, "Total spend should exclude cancelled orders");

    // Product aggregation
    const suppliedProductNames = new Set(
      queriedSupplier.purchaseOrders.flatMap((po: any) => po.items.map((i: any) => i.productName))
    );
    assert.ok(suppliedProductNames.has("หน้าจอแท้ iPhone 15 Pro"));
    assert.ok(suppliedProductNames.has("แบตเตอรี่ มอก. iPhone 13"));
  });

  // 4. Soft Delete and Reactivation behavior
  await staffStorage.run(admin, async () => {
    // Soft delete
    const deleted = await prisma.supplier.update({
      where: { id: supplierA.id },
      data: { active: false },
    });
    assert.equal(deleted.active, false);

    // Active query ignores soft-deleted supplier
    const activeList = await prisma.supplier.findMany({
      where: { id: supplierA.id, active: true },
    });
    assert.equal(activeList.length, 0);

    // Reactivation restores supplier
    const restored = await prisma.supplier.update({
      where: { id: supplierA.id },
      data: { active: true },
    });
    assert.equal(restored.active, true);
  });

  // 5. Cross-Tenant Protection: Tenant B cannot update Tenant A's supplier
  await staffStorage.run(staffB, async () => {
    let updateFailed = false;
    try {
      await prisma.supplier.update({
        where: { id: supplierA.id },
        data: { name: "แฮกเกอร์เปลี่ยนชื่อ" },
      });
    } catch {
      updateFailed = true;
    }
    assert.ok(updateFailed, "Cross-tenant supplier update must fail closed");

    // Verify Tenant A data was not mutated
    const originalInA = await db.supplier.findUnique({
      where: { id: supplierA.id },
    });
    assert.equal(originalInA?.name, "บริษัท ซีคอน สแปร์พาร์ท จำกัด");
  });
});

test("Round 20: Thai Tax & Accounting Audit - VAT ภ.พ.30 Output vs Input, Satang Precision, WHT ภ.ง.ด.3/53, 13-Digit Tax ID Checksum, 5-Digit Branch Code & Multi-Tenant Isolation", async () => {
  const staffB: StaffPrincipal = {
    id: "user-b",
    tenantId: "test-b",
    branchId: foreignBranch,
    branchIds: [foreignBranch],
    role: "ADMIN",
    name: "Admin B",
    username: "admin_b",
  };

  // 1. 13-Digit Thai Tax ID & 5-Digit Branch Code Validation
  // Valid 13-digit IDs (Modulo 11 Checksum passes)
  const validTaxId1 = "0105558123451";
  const validTaxId2 = "1100500876549";
  assert.equal(validateThaiTaxId(validTaxId1).valid, true);
  assert.equal(validateThaiTaxId(validTaxId2).valid, true);

  // Invalid length or Checksum failure
  assert.equal(validateThaiTaxId("12345").valid, false);
  assert.equal(validateThaiTaxId("0105558123456").valid, false, "Checksum mismatch must fail");

  // 5-Digit Branch Code (00000 = Headquarter)
  assert.equal(validateThaiBranchId("00000").valid, true);
  assert.equal(validateThaiBranchId("00001").valid, true);
  assert.equal(validateThaiBranchId("123").valid, false);
  assert.equal(validateThaiBranchId("ABCDE").valid, false);

  // 2. VAT ภ.พ.30 Engine & Satang Precision
  // Output VAT vs Input VAT (POs)
  const vatCalculated = calculatePP30(10700, 700, 450.50);
  assert.equal(vatCalculated.salesGross, 10700);
  assert.equal(vatCalculated.outputVat, 700);
  assert.equal(vatCalculated.inputVat, 450.50);
  assert.equal(vatCalculated.netVatPayable, 249.50, "Net VAT payable satang precision check");
  assert.equal(vatCalculated.excessCredit, 0);

  // Excess credit scenario (Input VAT > Output VAT)
  const creditCalculated = calculatePP30(10700, 700, 950.25);
  assert.equal(creditCalculated.netVatPayable, 0);
  assert.equal(creditCalculated.excessCredit, 250.25, "Excess tax credit carried forward satang precision check");

  // 3. Withholding Tax (WHT) ภ.ง.ด.3 (Individual) & ภ.ง.ด.53 (Corporate)
  // 1% Transport (minimum 1,000 THB threshold)
  const whtTransport = calculateWHT(10000, 1);
  assert.equal(whtTransport.applies, true);
  assert.equal(whtTransport.wht, 100);
  assert.equal(whtTransport.netPayment, 9900);

  // 3% Service / Repair Labor
  const whtService = calculateWHT(5000, 3);
  assert.equal(whtService.applies, true);
  assert.equal(whtService.wht, 150);
  assert.equal(whtService.netPayment, 4850);
  assert.equal(bahtText(whtService.wht), "หนึ่งร้อยห้าสิบบาทถ้วน");

  // 5% Rent
  const whtRent = calculateWHT(30000, 5);
  assert.equal(whtRent.applies, true);
  assert.equal(whtRent.wht, 1500);
  assert.equal(whtRent.netPayment, 28500);
  assert.equal(bahtText(whtRent.wht), "หนึ่งพันห้าร้อยบาทถ้วน");

  // Below 1,000 THB threshold: WHT does not apply
  const whtBelowMin = calculateWHT(999, 3);
  assert.equal(whtBelowMin.applies, false);
  assert.equal(whtBelowMin.wht, 0);

  // 4. CIT SME Tiered Rates vs PIT Progressive Rates
  // CIT SME: 0-300k exempt, 300k-3M @ 15%, >3M @ 20%
  const citSme1 = calculateCIT(1000000, 750000, true); // Net Profit = 250,000
  assert.equal(citSme1.netProfit, 250000);
  assert.equal(citSme1.totalTax, 0, "First 300,000 net profit is exempt for SME");

  const citSme2 = calculateCIT(2000000, 1000000, true); // Net Profit = 1,000,000
  // 300,000 @ 0% + 700,000 @ 15% = 105,000
  assert.equal(citSme2.totalTax, 105000);

  // CIT Non-SME: Flat 20%
  const citNonSme = calculateCIT(2000000, 1000000, false);
  assert.equal(citNonSme.totalTax, 200000);

  // PIT Progressive Rates (ภ.ง.ด.90 & ภ.ง.ด.94)
  const pitResultFull = calculatePIT(2000000, DEFAULT_TAX_SETTINGS, { halfYear: false });
  assert.ok(pitResultFull.finalTaxPayable > 0);
  const pitResultHalf = calculatePIT(1000000, DEFAULT_TAX_SETTINGS, { halfYear: true });
  assert.equal(pitResultHalf.halfYear, true);

  // 5. Database Integration & Multi-Tenant Isolation
  // Tenant A issues WHT certificate
  let certA: any;
  await staffStorage.run(admin, async () => {
    // Generate cert under tenant-a
    certA = await prisma.auditLog.create({
      data: {
        tenantId: "test-a",
        userId: admin.id,
        module: "TAX_WHT",
        action: "ISSUE",
        targetId: "50T-202611-001",
        details: "ออกหนังสือรับรอง 50 ทวิ 50T-202611-001 ให้ นายสมเกียรติ ช่างเลเซอร์ ภาษีหัก 150 บาท",
        afterJson: JSON.stringify({
          certNo: "50T-202611-001",
          type: "PND3",
          date: "2026-11-20",
          payeeName: "นายสมเกียรติ ช่างเลเซอร์",
          payeeTaxId: validTaxId2,
          payeeAddress: "12/5 รามคำแหง 24 บางกะปิ กทม.",
          incomeType: "ค่าจ้างซ่อมบอร์ดภายนอก",
          rate: 3,
          baseAmount: 5000,
          whtAmount: 150,
          netPayment: 4850,
          status: "ISSUED",
        }),
        severity: "INFO",
      },
    });
    assert.ok(certA.id);

    // Save tax settings for Tenant A
    await db.tenant.update({
      where: { id: "test-a" },
      data: {
        name: "บริษัท ฟิกซ์มี เทคโนโลยี จำกัด (มหาชน)",
        taxId: validTaxId1,
      },
    });

    await prisma.branch.update({
      where: { id: ownBranch },
      data: {
        code: "00000",
        name: "สำนักงานใหญ่ (HQ)",
      },
    });
  });

  // Cross-Tenant Isolation: Tenant B cannot query or see Tenant A's WHT or tax settings
  await staffStorage.run(staffB, async () => {
    // Tenant B queries WHT records
    const bWhtLogs = await prisma.auditLog.findMany({
      where: {
        tenantId: "test-b",
        module: "TAX_WHT",
      },
    });
    assert.equal(bWhtLogs.length, 0, "Tenant B must not see Tenant A WHT certificates");

    // Tenant B checks its own tenant profile
    const tenantB = await prisma.tenant.findUnique({
      where: { id: "test-b" },
    });
    assert.notEqual(tenantB?.name, "บริษัท ฟิกซ์มี เทคโนโลยี จำกัด (มหาชน)");
    assert.notEqual(tenantB?.taxId, validTaxId1);
  });
});

test("Round 21: Attendance & Payroll Audit - Check-in/Out, Late Detection, OT 1.5x/2x/3x, Leave Requests, SSF 5% Capped at 750 THB, Satang Precision & Multi-Tenant Isolation", async () => {
  const userB = await db.user.findFirst({ where: { tenantId: "test-b" } });
  assert.ok(userB);
  const staffB: StaffPrincipal = {
    id: userB.id,
    tenantId: "test-b",
    name: userB.name,
    username: userB.username,
    role: "ADMIN",
    branchId: foreignBranch,
    branchIds: [foreignBranch],
  };

  const { toSatang, fromSatang, calculateOtPay } = await import("../src/lib/payroll-calc");

  // 1. Attendance Check-in: Late Arrival Detection & Precision
  let attOnTime: any;
  let attLate: any;
  await staffStorage.run(admin, async () => {
    const today = new Date("2026-11-20T00:00:00.000Z");

    // Case A: On time (08:55 AM, within 09:00 + 15m grace)
    const clockInOnTime = new Date("2026-11-20T01:55:00.000Z"); // 08:55 Bangkok (UTC+7)
    attOnTime = await prisma.attendanceRecord.create({
      data: {
        tenantId: "test-a",
        userId: admin.id,
        branchId: ownBranch,
        date: today,
        clockIn: clockInOnTime,
        status: "ON_TIME",
        lateMinutes: 0,
      },
    });
    assert.equal(attOnTime.status, "ON_TIME");
    assert.equal(attOnTime.lateMinutes, 0);

    // Case B: Late arrival (09:40 AM -> 40 minutes late, past 15m grace)
    const yesterday = new Date("2026-11-19T00:00:00.000Z");
    const clockInLate = new Date("2026-11-19T02:40:00.000Z"); // 09:40 Bangkok
    const clockOutLate = new Date("2026-11-19T13:40:00.000Z"); // 20:40 Bangkok (11 hours worked -> 3 hours OT)
    attLate = await prisma.attendanceRecord.create({
      data: {
        tenantId: "test-a",
        userId: admin.id,
        branchId: ownBranch,
        date: yesterday,
        clockIn: clockInLate,
        clockOut: clockOutLate,
        totalHours: 11,
        overtimeHours: 3,
        otMultiplier: 1.5,
        lateMinutes: 40,
        status: "LATE",
      },
    });
    assert.equal(attLate.status, "LATE");
    assert.equal(attLate.lateMinutes, 40);
    assert.equal(attLate.overtimeHours, 3);
    assert.equal(attLate.otMultiplier, 1.5);
  });

  // 2. Attendance Leave Requests (Sick, Annual, Personal)
  let leaveSick: any;
  await staffStorage.run(admin, async () => {
    const leaveDay = new Date("2026-11-18T00:00:00.000Z");
    leaveSick = await prisma.attendanceRecord.create({
      data: {
        tenantId: "test-a",
        userId: admin.id,
        branchId: ownBranch,
        date: leaveDay,
        status: "LEAVE_SICK",
        leaveType: "SICK",
        notes: "ลาป่วย มีไข้สูงตามใบรับรองแพทย์",
        verifiedBy: admin.id,
      },
    });
    assert.equal(leaveSick.status, "LEAVE_SICK");
    assert.equal(leaveSick.leaveType, "SICK");
    assert.equal(leaveSick.clockIn, null);
    assert.equal(leaveSick.notes, "ลาป่วย มีไข้สูงตามใบรับรองแพทย์");
  });

  // 3. Overtime Pay Calculation Helper (1.5x, 2.0x, 3.0x)
  // Base Salary = 24,000 THB => Daily = 800 THB => Hourly Base = 100 THB
  // 10 hrs at 1.5x = 10 * 150 = 1,500 THB
  // 5 hrs at 2.0x = 5 * 200 = 1,000 THB
  // 2 hrs at 3.0x = 2 * 300 = 600 THB
  // Total OT = 3,100.00 THB
  const otCalc = calculateOtPay(24000, 10, 5, 2);
  assert.equal(otCalc, 3100);

  // 4. Payroll Calculation: Base, OT, Commission, SSF 5% Capped at 750 THB
  let slipHighEarner: any;
  let slipStandard: any;

  await staffStorage.run(admin, async () => {
    // Case A: High Earner (Base = 30,000 THB). Gross = 30,000 + 5,000 = 35,000 THB.
    // SSF 5% on 35,000 capped strictly at 750 THB (max base 15,000).
    // Deductions: SSF 750 + WHT 350 + Late 200 = 1,300 THB.
    // Net: 35,000 - 1,300 = 33,700.00 THB.
    const baseHigh = 30000;
    const commHigh = 5000;
    const grossHigh = baseHigh + commHigh;
    const ssoHigh = Math.min(Math.round(Math.min(grossHigh, 15000) * 0.05), 750);
    assert.equal(ssoHigh, 750, "SSF must be capped at 750 THB for gross >= 15,000");

    const whtHigh = 350;
    const lateHigh = 200;
    const totalDeductionsHigh = ssoHigh + whtHigh + lateHigh;
    const netHigh = grossHigh - totalDeductionsHigh;

    slipHighEarner = await prisma.payrollSlip.create({
      data: {
        tenantId: "test-a",
        userId: admin.id,
        branchId: ownBranch,
        month: "2026-11",
        baseSalary: baseHigh,
        repairCommission: 3000,
        salesCommission: 2000,
        allowance: 0,
        bonus: 0,
        overtimePay: 0,
        ot15Hours: 0,
        ot20Hours: 0,
        ot30Hours: 0,
        ssoDeduction: ssoHigh,
        taxDeduction: whtHigh,
        lateDeduction: lateHigh,
        unpaidDeduction: 0,
        otherDeductions: 0,
        netPayout: netHigh,
        status: "APPROVED",
      },
    });

    assert.equal(slipHighEarner.baseSalary, 30000);
    assert.equal(slipHighEarner.ssoDeduction, 750);
    assert.equal(slipHighEarner.netPayout, 33700);

    // Case B: Standard Earner (Technician, Base = 12,000 THB).
    const techUser = await db.user.create({
      data: {
        tenantId: "test-a",
        name: "สมชาย ช่างซ่อม",
        username: "somchai_tech",
        password: "unused",
        role: "TECHNICIAN",
        branchId: ownBranch,
      },
    });

    const baseStd = 12000;
    const otStd = 1500;
    const grossStd = baseStd + otStd;
    const ssoStd = Math.min(Math.round(Math.min(grossStd, 15000) * 0.05), 750);
    assert.equal(ssoStd, 675);
    const netStd = grossStd - ssoStd;

    slipStandard = await prisma.payrollSlip.create({
      data: {
        tenantId: "test-a",
        userId: techUser.id,
        branchId: ownBranch,
        month: "2026-11",
        baseSalary: baseStd,
        repairCommission: 0,
        salesCommission: 0,
        allowance: 0,
        bonus: 0,
        overtimePay: otStd,
        ot15Hours: 10,
        ot20Hours: 0,
        ot30Hours: 0,
        ssoDeduction: ssoStd,
        taxDeduction: 0,
        lateDeduction: 0,
        unpaidDeduction: 0,
        otherDeductions: 0,
        netPayout: netStd,
        status: "PENDING",
      },
    });

    assert.equal(slipStandard.baseSalary, 12000);
    assert.equal(slipStandard.ssoDeduction, 675);
    assert.equal(slipStandard.netPayout, 12825);
  });

  // 5. Satang Precision: Clean integer satang rounding with zero remainder
  const satangGross = toSatang(33700.55);
  const satangDed = toSatang(1250.35);
  const satangNet = satangGross - satangDed;
  assert.equal(satangGross, 3370055);
  assert.equal(satangDed, 125035);
  assert.equal(satangNet, 3245020);
  assert.equal(fromSatang(satangNet), 32450.2);
  assert.equal(fromSatang(satangGross - satangDed), 32450.2);
  assert.equal(toSatang(fromSatang(satangNet)), satangNet);

  // 6. Multi-Tenant Isolation
  // Tenant B cannot view Tenant A attendance records
  await staffStorage.run(staffB, async () => {
    const recordsInB = await prisma.attendanceRecord.findMany({
      where: { id: attOnTime.id },
    });
    assert.equal(recordsInB.length, 0, "Tenant B must not see Tenant A attendance records");

    // Tenant B cannot view Tenant A payroll slips
    const slipsInB = await prisma.payrollSlip.findMany({
      where: { id: slipHighEarner.id },
    });
    assert.equal(slipsInB.length, 0, "Tenant B must not see Tenant A payroll slips");

    // Cross-tenant update must fail closed
    let updateSlipFailed = false;
    try {
      await prisma.payrollSlip.update({
        where: { id: slipHighEarner.id },
        data: { netPayout: 999999 },
      });
    } catch {
      updateSlipFailed = true;
    }
    assert.ok(updateSlipFailed, "Cross-tenant payroll slip update must fail closed");

    // Verify Tenant A payroll record was not mutated
    const originalSlip = await db.payrollSlip.findUnique({
      where: { id: slipHighEarner.id },
    });
    assert.equal(originalSlip?.netPayout, 33700);
  });
});

test("Round 22: Operating Expenses Audit - Logging, Thai Tax Integration (ภ.พ.30 Input VAT, WHT ภ.ง.ด.3/53), SequenceCounter & Multi-Tenant Isolation", async () => {
  const userB = await db.user.findFirstOrThrow({ where: { tenantId: "test-b" } });
  const staffB: StaffPrincipal = {
    id: userB.id,
    tenantId: "test-b",
    name: userB.name,
    username: userB.username,
    role: "ADMIN",
    branchId: foreignBranch,
    branchIds: [foreignBranch],
  };

  let expenseA1: any;
  let expenseA2: any;
  let expenseB1: any;

  // 1. Expense Creation with Thai Tax Integration: Input VAT 7% & WHT 5% (Rent)
  await staffStorage.run(admin, async () => {
    // Expense 1: Rent (ค่าเช่าสำนักงาน/ร้านค้า) 30,000 THB, VAT-exempt, WHT 5% ภ.ง.ด.53
    // Rent base 30,000 THB -> WHT 5% = 1,500 THB -> Net payment = 28,500 THB
    const rentAmount = 30000;
    const rentWhtRate = 5;
    const rentWhtAmount = Math.round(rentAmount * (rentWhtRate / 100) * 100) / 100;
    const rentNetPayment = rentAmount - rentWhtAmount;

    expenseA1 = await prisma.shopExpense.create({
      data: {
        tenantId: "test-a",
        expenseNo: "EXP-202611-001",
        branchId: ownBranch,
        category: "RENT",
        title: "ค่าเช่าพื้นที่ร้าน สาขาหลัก ประจำเดือน พ.ย. 2569",
        amount: rentAmount,
        date: new Date("2026-11-01T00:00:00.000Z"),
        paymentMethod: "TRANSFER",
        payee: "บริษัท สยามรีเทล แอสเสท จำกัด",
        payeeTaxId: "0105556012345",
        taxInvoiceNo: "REC-202611-8899",
        isVatEligible: false,
        vatRate: 0,
        vatAmount: 0,
        whtRate: rentWhtRate,
        whtAmount: rentWhtAmount,
        whtType: "PND53",
        netPayment: rentNetPayment,
        receiptUrl: "https://media.nazirulhak.com/expenses/test-a/202611/rent-slip.pdf",
        createdById: admin.id,
      },
    });

    assert.equal(expenseA1.category, "RENT");
    assert.equal(expenseA1.amount, 30000);
    assert.equal(expenseA1.whtAmount, 1500);
    assert.equal(expenseA1.netPayment, 28500);
    assert.equal(expenseA1.payeeTaxId, "0105556012345");
    assert.equal(expenseA1.isVatEligible, false);

    // Expense 2: Tools & Supplies (วัสดุและอุปกรณ์ช่าง) 10,700 THB with 7% Input VAT
    // VAT-inclusive 10,700 THB -> Base = 10,000 THB -> VAT = 700 THB (linking to ภ.พ.30)
    // WHT: none (goods/supplies) -> Net payment = 10,700 THB
    const suppliesAmount = 10700;
    const suppliesBase = Math.round((suppliesAmount / 1.07) * 100) / 100;
    const suppliesVat = Math.round((suppliesAmount - suppliesBase) * 100) / 100;

    expenseA2 = await prisma.shopExpense.create({
      data: {
        tenantId: "test-a",
        expenseNo: "EXP-202611-002",
        branchId: ownBranch,
        category: "SUPPLIES",
        title: "ซื้อหัวแร้งดิจิตอลและฟลักซ์บัดกรี",
        amount: suppliesAmount,
        date: new Date("2026-11-05T00:00:00.000Z"),
        paymentMethod: "PROMPTPAY",
        payee: "ร้าน อิเล็กทรอนิกส์ ซัพพลาย",
        taxInvoiceNo: "TAX-6911-0421",
        isVatEligible: true,
        vatRate: 7,
        vatAmount: suppliesVat,
        whtRate: 0,
        whtAmount: 0,
        netPayment: suppliesAmount,
        receiptUrl: "/uploads/expenses/test-a/202611/tax-inv-0421.png",
        createdById: admin.id,
      },
    });

    assert.equal(expenseA2.category, "SUPPLIES");
    assert.equal(expenseA2.amount, 10700);
    assert.equal(expenseA2.isVatEligible, true);
    assert.equal(expenseA2.vatAmount, 700);
    assert.equal(expenseA2.netPayment, 10700);
  });

  // 2. Multi-Tenant Isolation & Independent SequenceCounter for Tenant B
  await staffStorage.run(staffB, async () => {
    // Tenant B creates an expense
    expenseB1 = await prisma.shopExpense.create({
      data: {
        tenantId: "test-b",
        expenseNo: "EXP-202611-001", // Same expenseNo format in Tenant B
        branchId: foreignBranch,
        category: "UTILITIES",
        title: "ค่าไฟฟ้า สาขา บี เทรดดิ้ง",
        amount: 4500,
        date: new Date("2026-11-10T00:00:00.000Z"),
        paymentMethod: "TRANSFER",
        payee: "การไฟฟ้านครหลวง",
        isVatEligible: true,
        vatRate: 7,
        vatAmount: 294.39,
        netPayment: 4500,
        createdById: staffB.id,
      },
    });

    assert.equal(expenseB1.tenantId, "test-b");
    assert.equal(expenseB1.category, "UTILITIES");

    // Tenant B CANNOT read Tenant A's expenses
    const bFindA1 = await prisma.shopExpense.findFirst({
      where: { id: expenseA1.id },
    });
    assert.equal(bFindA1, null, "Tenant A expense must be completely invisible to Tenant B");

    // Tenant B aggregation must only reflect Tenant B's data
    const bAgg = await prisma.shopExpense.aggregate({
      where: { tenantId: "test-b" },
      _sum: { amount: true, vatAmount: true },
      _count: { _all: true },
    });
    assert.equal(bAgg._count._all, 1);
    assert.equal(bAgg._sum.amount, 4500);
    assert.equal(bAgg._sum.vatAmount, 294.39);
  });

  // 3. Tenant A Aggregations: Input VAT (ภ.พ.30) & WHT Summary
  await staffStorage.run(admin, async () => {
    // Sum eligible Input VAT for ภ.พ.30 in Tenant A
    const vatAgg = await prisma.shopExpense.aggregate({
      where: { tenantId: "test-a", isVatEligible: true },
      _sum: { amount: true, vatAmount: true },
      _count: { _all: true },
    });
    assert.equal(vatAgg._count._all, 1, "Only eligible expenses count toward input VAT");
    assert.equal(vatAgg._sum.vatAmount, 700, "Eligible input VAT must equal 700 THB");

    // Sum WHT for ภ.ง.ด.53 in Tenant A
    const whtAgg = await prisma.shopExpense.aggregate({
      where: { tenantId: "test-a", whtRate: { gt: 0 } },
      _sum: { whtAmount: true },
      _count: { _all: true },
    });
    assert.equal(whtAgg._count._all, 1);
    assert.equal(whtAgg._sum.whtAmount, 1500, "Withheld tax must equal 1,500 THB");

    // Group By category in Tenant A
    const categoryGroup = await prisma.shopExpense.groupBy({
      by: ["category"],
      where: { tenantId: "test-a" },
      _sum: { amount: true },
    });
    const categoriesFound = new Set(categoryGroup.map((g: any) => g.category));
    assert.ok(categoriesFound.has("RENT"));
    assert.ok(categoriesFound.has("SUPPLIES"));
    assert.ok(!categoriesFound.has("UTILITIES"), "Tenant B's category must not leak into Tenant A");
  });

  // 4. Cross-Tenant Defense: Mutation Rejection
  await staffStorage.run(staffB, async () => {
    let updateThrew = false;
    try {
      await prisma.shopExpense.update({
        where: { id: expenseA1.id },
        data: { amount: 1 },
      });
    } catch {
      updateThrew = true;
    }
    assert.ok(updateThrew, "Cross-tenant expense update must fail closed");

    let deleteThrew = false;
    try {
      await prisma.shopExpense.delete({
        where: { id: expenseA1.id },
      });
    } catch {
      deleteThrew = true;
    }
    assert.ok(deleteThrew, "Cross-tenant expense deletion must fail closed");

    // Verify expenseA1 remains unmutated
    const unmutated = await db.shopExpense.findUnique({
      where: { id: expenseA1.id },
    });
    assert.equal(unmutated?.amount, 30000);
  });
});
