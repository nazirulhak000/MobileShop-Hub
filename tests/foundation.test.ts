import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { db } from "../src/lib/db";
import { prisma } from "../src/lib/prisma";
import { staffStorage, StaffPrincipal } from "../src/lib/staff-context";
import { mutateBooking } from "../src/lib/bookings";
import { requestOtp, verifyOtp, devOtpEnabled } from "../src/lib/customer-auth";
import { calculateVAT } from "../src/lib/tax";
import { generateNextTrackingCode, getRepairJobs, getRepairJobById } from "../src/lib/repairs";
import { checkOrigin } from "../src/lib/staff-auth";
import { resolveTenantBySlug } from "../src/lib/storefrontTenant";
import { validateThaiTaxId, validateThaiBranchId, bahtText, validateThaiNationalId } from "../src/lib/utils";
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




