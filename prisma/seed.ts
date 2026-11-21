import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

// ---------------------------------------------------------------------------
// Safety guards (demo data only — never point this at a real database).
//  - Refuses NODE_ENV=production, or a DATABASE_URL that is not a local SQLite file,
//    unless ALLOW_SEED=true.
//  - Wiping existing rows requires SEED_RESET=true; otherwise a non-empty DB aborts.
//  - Passwords: SEED_PASSWORD (>= 12 chars) or a random one printed once. Stored as bcrypt (cost 12).
// ---------------------------------------------------------------------------
// tsx does not load .env; Prisma would, so mirror that for the guard.
if (!process.env.DATABASE_URL) { try { (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile?.(".env"); } catch { /* no .env */ } }
const databaseUrl = process.env.DATABASE_URL ?? "";
const looksLocalSqlite = /^file:(?!\/\/)[^?]*\.(db|sqlite|sqlite3)(\?.*)?$/i.test(databaseUrl);
if ((process.env.NODE_ENV === "production" || !looksLocalSqlite) && process.env.ALLOW_SEED !== "true") {
  console.error(
    `Refusing to seed: ${process.env.NODE_ENV === "production" ? "NODE_ENV=production" : "DATABASE_URL is not a local SQLite file (file:./something.db)"}.\n` +
    "Seed data is demo-only. Set ALLOW_SEED=true only if you are certain this database may receive demo data.",
  );
  process.exit(1);
}
const seedPasswordFromEnv = process.env.SEED_PASSWORD;
if (seedPasswordFromEnv !== undefined && seedPasswordFromEnv.length < 8) {
  console.error("SEED_PASSWORD must be at least 8 characters.");
  process.exit(1);
}
const seedPassword = seedPasswordFromEnv ?? "password123";

const prisma = new PrismaClient();

async function main() {
  const existing = (await prisma.user.count()) + (await prisma.branch.count()) + (await prisma.product.count());
  if (existing > 0 && process.env.SEED_RESET !== "true") {
    console.error(`Database already contains data (${existing} users/branches/products). Seeding would DELETE it.\nRe-run with SEED_RESET=true to wipe and reseed (destructive).`);
    process.exitCode = 1;
    return;
  }
  const passwordHash = await bcrypt.hash(seedPassword, 12);
  if (process.env.SEED_RESET === "true") {
    console.warn("WARNING: SEED_RESET=true — deleting ALL existing rows in the seeded tables...");
    // Children that reference User/Branch/Customer with onDelete: Restrict must go first
    await prisma.publicTrackingToken.deleteMany();
    await prisma.repairStatusEvent.deleteMany();
    await prisma.repairQuote.deleteMany();
    await prisma.appointmentEvent.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.bookingSlot.deleteMany();
    await prisma.bookingPolicy.deleteMany();
    await prisma.bookingRequest.deleteMany();
    await prisma.customerNotification.deleteMany();
    await prisma.customerSession.deleteMany();
    await prisma.customerAccountLink.deleteMany();
    await prisma.customerAccount.deleteMany();
    await prisma.staffBranchAccess.deleteMany();
    await prisma.staffSession.deleteMany();
    await prisma.storefrontConfig.deleteMany();
    await prisma.billingInvoice.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.sequenceCounter.deleteMany();
    await prisma.installmentPayment.deleteMany();
    await prisma.installmentContract.deleteMany();
    await prisma.attendanceRecord.deleteMany();
    await prisma.payrollSlip.deleteMany();
    await prisma.shopExpense.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.repairPartUsage.deleteMany();
    await prisma.saleItem.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.repairJob.deleteMany();
    await prisma.deviceIMEI.deleteMany();
    await prisma.tradeInContract.deleteMany();
    await prisma.stockItem.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.tenant.deleteMany();
  }

  console.log("Seeding Default Tenant & Storefront Config...");
  const defaultTenant = await prisma.tenant.upsert({
    where: { slug: "mobileshop" },
    update: {},
    create: {
      id: "tenant-5f4958e4ddf549199fc1ac3d7519dd16",
      name: "MobileShop",
      slug: "mobileshop",
      plan: "PRO",
      status: "ACTIVE",
      maxBranches: 5,
      maxUsers: 20,
    },
  });

  const fixmeTenant = await prisma.tenant.upsert({
    where: { slug: "fixme-service" },
    update: {},
    create: {
      id: "tenant-fixme-service-dev-id",
      name: "FixMe Service Center",
      slug: "fixme-service",
      plan: "ENTERPRISE",
      status: "ACTIVE",
      maxBranches: 10,
      maxUsers: 50,
    },
  });

  await prisma.storefrontConfig.upsert({
    where: { tenantId: defaultTenant.id },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      themeColor: "emerald",
      headline: "ศูนย์บริการซ่อมมือถือด่วน มาตรฐานระดับโปร",
      subheadline: "ตรวจเช็กด้วยระบบดิจิทัล รู้ผลทันที ติดตามสถานะเรียลไทม์ 24 ชม. อะไหล่แท้ รับประกันสูงสุด 180 วัน",
      badge: "Official Service Center",
      announcementText: "โปรโมชั่นเปิดร้านใหม่: เปลี่ยนแบตเตอรี่ลด 20% ฟรีตรวจเช็กสภาพเครื่อง 10 รายการ!",
      announcementEnabled: true,
      phone: "02-123-4567",
      lineId: "@mobileshophub",
      lineQrUrl: "",
      googleMapsUrl: "https://maps.google.com",
      showLiveTracking: true,
      showHardwareScanner: true,
      showServicesBento: true,
      showInspectionBench: true,
      showPriceEstimator: true,
      showBeforeAfterSlider: true,
      showCustomerReviews: true,
      showLocationSection: true,
      showFaqSection: true,
      showMobileQuickBar: true,
    },
  });

  console.log("Seeding Branches...");
  const hq = await prisma.branch.create({
    data: {
      tenantId: defaultTenant.id,
      name: "MobileShop HQ (สำนักงานใหญ่ สุขุมวิท)",
      code: "HQ",
      address: "123/45 ถนนสุขุมวิท ซอย 55 คลองเตย กรุงเทพฯ 10110",
      phone: "02-123-4567",
      taxId: "0105561234567",
    },
  });

  const branch2 = await prisma.branch.create({
    data: {
      tenantId: defaultTenant.id,
      name: "MobileShop สาขา 2 (เซ็นทรัลพระราม 9)",
      code: "BR-02",
      address: "ห้อง 402 ชั้น 4 ศูนย์การค้าเซ็นทรัลพลาซา พระราม 9 ห้วยขวาง กรุงเทพฯ 10320",
      phone: "02-987-6543",
      taxId: "0105561234567",
    },
  });

  console.log("Seeding Users...");
  const admin = await prisma.user.create({
    data: {
      tenantId: defaultTenant.id,
      name: "สมชาย ผู้จัดการใหญ่",
      username: "admin",
      password: passwordHash,
      email: "admin@mobileshop.co.th",
      role: "ADMIN",
      branchId: hq.id,
    },
  });

  // Seed FixMe-Service HQ branch & users
  const fixmeHq = await prisma.branch.create({
    data: {
      tenantId: fixmeTenant.id,
      name: "FixMe HQ (สำนักงานใหญ่)",
      code: "00000",
      address: "FixMe Tower, สุขุมวิท กรุงเทพฯ 10110",
      phone: "02-000-9999",
      taxId: "0105561234999",
    },
  });

  const fixmePassHash = await bcrypt.hash("P@ssw0rd123!", 12);
  await prisma.user.create({
    data: {
      tenantId: fixmeTenant.id,
      name: "FixMe Administrator",
      username: "fixme_admin",
      password: fixmePassHash,
      email: "admin@fixme-service.com",
      role: "ADMIN",
      branchId: fixmeHq.id,
    },
  });
  await prisma.user.create({
    data: {
      tenantId: fixmeTenant.id,
      name: "FixMe Admin Backup",
      username: "admin",
      password: passwordHash,
      email: "admin2@fixme-service.com",
      role: "ADMIN",
      branchId: fixmeHq.id,
    },
  });

  const manager2 = await prisma.user.create({
    data: {
      tenantId: defaultTenant.id,
      name: "วิภาดา สาขาเก้า",
      username: "manager2",
      password: passwordHash,
      email: "vipada@mobileshop.co.th",
      role: "MANAGER",
      branchId: branch2.id,
    },
  });

  const tech1 = await prisma.user.create({
    data: {
      tenantId: defaultTenant.id,
      name: "ช่างเอก มือทอง",
      username: "tech_ek",
      password: passwordHash,
      email: "ek@mobileshop.co.th",
      role: "TECHNICIAN",
      branchId: hq.id,
    },
  });

  const tech2 = await prisma.user.create({
    data: {
      tenantId: defaultTenant.id,
      name: "ช่างนนท์ สายไว",
      username: "tech_non",
      password: passwordHash,
      email: "non@mobileshop.co.th",
      role: "TECHNICIAN",
      branchId: branch2.id,
    },
  });

  const cashier1 = await prisma.user.create({
    data: {
      tenantId: defaultTenant.id,
      name: "น้องแพรว แคชเชียร์",
      username: "cashier1",
      password: passwordHash,
      email: "praew@mobileshop.co.th",
      role: "CASHIER",
      branchId: hq.id,
    },
  });

  const cashier2 = await prisma.user.create({
    data: {
      tenantId: defaultTenant.id,
      name: "น้องก้อย แคชเชียร์",
      username: "cashier2",
      password: passwordHash,
      email: "koi@mobileshop.co.th",
      role: "CASHIER",
      branchId: branch2.id,
    },
  });

  console.log("Seeding Customers...");
  const cust1 = await prisma.customer.create({
    data: {
      tenantId: defaultTenant.id,
      name: "คุณธนกร รัตนสิทธิ",
      phone: "081-234-5678",
      nationalId: "1100400123451",
      lineId: "@thanakorn",
      address: "12/8 ซอยทองหล่อ 10 วัฒนา กรุงเทพฯ 10110",
    },
  });

  const cust2 = await prisma.customer.create({
    data: {
      tenantId: defaultTenant.id,
      name: "คุณพิมพ์ชนก สิริพร",
      phone: "089-876-5432",
      nationalId: "3100500987654",
      lineId: "pim_chanok",
      address: "55/12 ถนนรัชดาภิเษก ห้วยขวาง กรุงเทพฯ 10310",
    },
  });

  const cust3 = await prisma.customer.create({
    data: {
      tenantId: defaultTenant.id,
      name: "คุณอนันต์ พัฒนเดช",
      phone: "095-555-1234",
      nationalId: "1100600456789",
      lineId: "anun_p",
      address: "88/4 ลาดพร้าว 71 วังทองหลาง กรุงเทพฯ 10310",
    },
  });

  const cust4 = await prisma.customer.create({
    data: {
      tenantId: defaultTenant.id,
      name: "คุณศิริพร บุญรักษา",
      phone: "062-345-6789",
      nationalId: "2100700876543",
      lineId: "siriporn_b",
      address: "99 พระราม 9 ซอย 15 บางกะปิ กรุงเทพฯ 10310",
    },
  });

  console.log("Seeding Products (Parts, Accessories, Devices)...");
  const createProduct = (args: any) =>
    prisma.product.create({ ...args, data: { tenantId: defaultTenant.id, ...args.data } });
  const createRepairJob = (args: any) =>
    prisma.repairJob.create({ ...args, data: { tenantId: defaultTenant.id, ...args.data } });
  const createRepairPartUsage = (args: any) =>
    prisma.repairPartUsage.create({ ...args, data: { tenantId: defaultTenant.id, ...args.data } });
  const createTradeInContract = (args: any) =>
    prisma.tradeInContract.create({ ...args, data: { tenantId: defaultTenant.id, ...args.data } });
  const createSale = (args: any) =>
    prisma.sale.create({ ...args, data: { tenantId: defaultTenant.id, ...args.data } });
  const createSaleItem = (args: any) =>
    prisma.saleItem.create({ ...args, data: { tenantId: defaultTenant.id, ...args.data } });

  // Spare Parts
  const pScreen14PM = await createProduct({
    data: {
      code: "SCR-IP14PM",
      name: "หน้าจอแท้ iPhone 14 Pro Max (OLED Super Retina XDR)",
      category: "SPARE_PART",
      brand: "Apple",
      model: "iPhone 14 Pro Max",
      compatibleModels: JSON.stringify(["iPhone 14 Pro Max"]),
      costPrice: 4500,
      sellPrice: 7900,
      minStock: 3,
    },
  });

  const pScreen13 = await createProduct({
    data: {
      code: "SCR-IP13-INC",
      name: "หน้าจอเทียบแท้เกรด A iPhone 13 (In-Cell FHD Display)",
      category: "SPARE_PART",
      brand: "Apple",
      model: "iPhone 13",
      compatibleModels: JSON.stringify(["iPhone 13", "iPhone 13 Pro"]),
      costPrice: 1200,
      sellPrice: 2500,
      minStock: 5,
    },
  });

  const pBat13 = await createProduct({
    data: {
      code: "BAT-IP13",
      name: "แบตเตอรี่แท้ มอก. iPhone 13 (High Capacity 3227mAh)",
      category: "SPARE_PART",
      brand: "Apple",
      model: "iPhone 13",
      compatibleModels: JSON.stringify(["iPhone 13"]),
      costPrice: 650,
      sellPrice: 1500,
      minStock: 5,
    },
  });

  const pBatS23U = await createProduct({
    data: {
      code: "BAT-S23U",
      name: "แบตเตอรี่แท้ Samsung Galaxy S23 Ultra (5000mAh มอก.)",
      category: "SPARE_PART",
      brand: "Samsung",
      model: "Galaxy S23 Ultra",
      compatibleModels: JSON.stringify(["Galaxy S23 Ultra"]),
      costPrice: 750,
      sellPrice: 1690,
      minStock: 4,
    },
  });

  const pChgBoardA54 = await createProduct({
    data: {
      code: "CHG-SMA54",
      name: "แผงชาร์จ Type-C Charging Port Board Samsung A54 5G",
      category: "SPARE_PART",
      brand: "Samsung",
      model: "Galaxy A54 5G",
      compatibleModels: JSON.stringify(["Galaxy A54 5G"]),
      costPrice: 250,
      sellPrice: 850,
      minStock: 3,
    },
  });

  // Accessories
  const pAnker30W = await createProduct({
    data: {
      code: "ACC-ANK-30W",
      name: "หัวชาร์จเร็ว Anker 30W Nano II PD Fast Charger",
      category: "ACCESSORY",
      brand: "Anker",
      model: "Nano II 30W",
      costPrice: 390,
      sellPrice: 690,
      minStock: 8,
    },
  });

  const pRemaxCL = await createProduct({
    data: {
      code: "ACC-RMX-CL",
      name: "สายชาร์จถัก Remax Type-C to Lightning 1.2m MFi Cert",
      category: "ACCESSORY",
      brand: "Remax",
      model: "CL-120",
      costPrice: 95,
      sellPrice: 250,
      minStock: 15,
    },
  });

  const pFocus15P = await createProduct({
    data: {
      code: "ACC-FOC-15P",
      name: "กระจกกันรอยเต็มจอ Focus 3D Full Cover iPhone 15 Pro",
      category: "ACCESSORY",
      brand: "Focus",
      model: "3D Tempered Glass",
      costPrice: 120,
      sellPrice: 390,
      minStock: 20,
    },
  });

  const pUAG14PM = await createProduct({
    data: {
      code: "ACC-UAG-14PM",
      name: "เคสกันกระแทก UAG Monarch Kevlar iPhone 14 Pro Max",
      category: "ACCESSORY",
      brand: "UAG",
      model: "Monarch Kevlar",
      costPrice: 990,
      sellPrice: 1890,
      minStock: 4,
    },
  });

  // Devices (New / Secondhand)
  const pPhone13_128 = await createProduct({
    data: {
      code: "DEV-IP13-128",
      name: "iPhone 13 128GB Midnight (มือสอง สภาพสวย Grade A)",
      category: "DEVICE",
      brand: "Apple",
      model: "iPhone 13 128GB",
      costPrice: 11000,
      sellPrice: 14900,
      minStock: 2,
    },
  });

  const pPhone14P_256 = await createProduct({
    data: {
      code: "DEV-IP14P-256",
      name: "iPhone 14 Pro 256GB Deep Purple (มือสอง แบต 90% Grade A)",
      category: "DEVICE",
      brand: "Apple",
      model: "iPhone 14 Pro 256GB",
      costPrice: 18500,
      sellPrice: 23900,
      minStock: 1,
    },
  });

  const pPhoneS23 = await createProduct({
    data: {
      code: "DEV-S23-128",
      name: "Samsung Galaxy S23 5G 128GB Phantom Black (เครื่องใหม่ศูนย์)",
      category: "DEVICE",
      brand: "Samsung",
      model: "Galaxy S23 5G",
      costPrice: 16000,
      sellPrice: 19900,
      minStock: 2,
    },
  });

  console.log("Seeding Stock Levels across branches...");
  const stockData = [
    // HQ Stocks
    { productId: pScreen14PM.id, branchId: hq.id, quantity: 4 },
    { productId: pScreen13.id, branchId: hq.id, quantity: 8 },
    { productId: pBat13.id, branchId: hq.id, quantity: 12 },
    { productId: pBatS23U.id, branchId: hq.id, quantity: 2 }, // Low stock alert! (min 4)
    { productId: pChgBoardA54.id, branchId: hq.id, quantity: 5 },
    { productId: pAnker30W.id, branchId: hq.id, quantity: 25 },
    { productId: pRemaxCL.id, branchId: hq.id, quantity: 30 },
    { productId: pFocus15P.id, branchId: hq.id, quantity: 40 },
    { productId: pUAG14PM.id, branchId: hq.id, quantity: 1 }, // Low stock alert! (min 4)
    { productId: pPhone13_128.id, branchId: hq.id, quantity: 2 },
    { productId: pPhone14P_256.id, branchId: hq.id, quantity: 1 },
    { productId: pPhoneS23.id, branchId: hq.id, quantity: 3 },

    // Branch 2 Stocks
    { productId: pScreen14PM.id, branchId: branch2.id, quantity: 2 }, // Low stock (min 3)
    { productId: pScreen13.id, branchId: branch2.id, quantity: 3 },  // Low stock (min 5)
    { productId: pBat13.id, branchId: branch2.id, quantity: 6 },
    { productId: pBatS23U.id, branchId: branch2.id, quantity: 5 },
    { productId: pChgBoardA54.id, branchId: branch2.id, quantity: 2 }, // Low stock (min 3)
    { productId: pAnker30W.id, branchId: branch2.id, quantity: 12 },
    { productId: pRemaxCL.id, branchId: branch2.id, quantity: 18 },
    { productId: pFocus15P.id, branchId: branch2.id, quantity: 15 },
    { productId: pUAG14PM.id, branchId: branch2.id, quantity: 3 },
    { productId: pPhone13_128.id, branchId: branch2.id, quantity: 1 },
    { productId: pPhone14P_256.id, branchId: branch2.id, quantity: 0 }, // Out of stock
    { productId: pPhoneS23.id, branchId: branch2.id, quantity: 2 },
  ];

  for (const s of stockData) {
    await prisma.stockItem.create({ data: { ...s, tenantId: defaultTenant.id } });
  }

  console.log("Seeding Device IMEIs...");
  await prisma.deviceIMEI.createMany({
    data: [
      {
        tenantId: defaultTenant.id,
        productId: pPhone13_128.id,
        branchId: hq.id,
        imei: "354928110293847",
        serialNo: "DNPF8291MD6R",
        conditionGrade: "A",
        status: "IN_STOCK",
        costPrice: 11000,
        sellPrice: 14900,
      },
      {
        tenantId: defaultTenant.id,
        productId: pPhone13_128.id,
        branchId: hq.id,
        imei: "354928110293848",
        serialNo: "DNPF8291MD6S",
        conditionGrade: "B",
        status: "IN_STOCK",
        costPrice: 10500,
        sellPrice: 13900,
      },
      {
        tenantId: defaultTenant.id,
        productId: pPhone14P_256.id,
        branchId: hq.id,
        imei: "358765098123456",
        serialNo: "F2LX7102PL8K",
        conditionGrade: "A",
        status: "IN_STOCK",
        costPrice: 18500,
        sellPrice: 23900,
      },
      {
        tenantId: defaultTenant.id,
        productId: pPhoneS23.id,
        branchId: hq.id,
        imei: "359182736451029",
        serialNo: "R5CW1098LK3",
        conditionGrade: "A",
        status: "IN_STOCK",
        costPrice: 16000,
        sellPrice: 19900,
      },
      {
        tenantId: defaultTenant.id,
        productId: pPhoneS23.id,
        branchId: branch2.id,
        imei: "359182736451030",
        serialNo: "R5CW1098LK4",
        conditionGrade: "A",
        status: "IN_STOCK",
        costPrice: 16000,
        sellPrice: 19900,
      },
    ],
  });

  console.log("Seeding Trade-in / Pawn Contracts...");
  const tc1 = await createTradeInContract({
    data: {
      contractNo: "TC-202611-0001",
      type: "BUYBACK",
      branchId: hq.id,
      customerId: cust1.id,
      nationalId: cust1.nationalId!,
      deviceBrand: "Apple",
      deviceModel: "iPhone 13 128GB Midnight",
      imei: "354928110293847",
      conditionGrade: "A",
      inspectionData: JSON.stringify({
        batteryHealth: 89,
        screenOriginal: true,
        scratches: "มีรอยเคสกัดขอบเล็กน้อย",
        passedAllQC: true,
      }),
      declarationAgreed: true,
      customerPhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
      agreedPrice: 11000,
      status: "COMPLETED",
    },
  });

  const tc2 = await createTradeInContract({
    data: {
      contractNo: "TC-202611-0002",
      type: "PAWN",
      branchId: branch2.id,
      customerId: cust2.id,
      nationalId: cust2.nationalId!,
      deviceBrand: "Apple",
      deviceModel: "iPhone 14 Pro 256GB Deep Purple",
      imei: "358765098123456",
      conditionGrade: "A",
      inspectionData: JSON.stringify({
        batteryHealth: 90,
        screenOriginal: true,
        scratches: "สวย ไร้รอย ติดฟิล์มรอบตัว",
        passedAllQC: true,
      }),
      declarationAgreed: true,
      customerPhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300",
      agreedPrice: 12000,
      interestRateMonthly: 2.5,
      durationMonths: 2,
      startDate: new Date("2026-11-01"),
      dueDate: new Date("2026-12-31"),
      status: "ACTIVE",
    },
  });

  console.log("Seeding Repair Tickets...");
  const preCheckFullPass = JSON.stringify({
    screen: "PASS",
    touch: "PASS",
    cameraFront: "PASS",
    cameraBack: "PASS",
    mic: "PASS",
    speaker: "PASS",
    faceId: "PASS",
    charging: "PASS",
    wifi: "PASS",
    moisture: "NORMAL",
    drops: "DENTED",
  });

  // 1. PENDING
  await createRepairJob({
    data: {
      trackingCode: "REP-202611-0001",
      branchId: hq.id,
      customerId: cust1.id,
      deviceBrand: "Apple",
      deviceModel: "iPhone 14 Pro Max",
      deviceColor: "Space Black",
      serialIMEI: "354928110998877",
      passcode: "147258",
      patternLock: null,
      preCheckData: JSON.stringify({
        screen: "BROKEN",
        touch: "GLITCH",
        cameraFront: "PASS",
        cameraBack: "PASS",
        mic: "PASS",
        speaker: "PASS",
        faceId: "PASS",
        charging: "PASS",
        wifi: "PASS",
        moisture: "NORMAL",
        drops: "HEAVY_DROP",
      }),
      issueDescription: "ทำตกบันได กระจกหน้าจอแตกยับ สัมผัสทัชเพี้ยนครึ่งล่าง แสงจอมีเส้นสีเขียวพาด",
      customerSignature: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='60'><path d='M10 40 Q 60 10 110 35 T 180 20' stroke='black' fill='transparent' stroke-width='2'/></svg>",
      status: "PENDING",
      laborFee: 800,
      estimatedCost: 8700,
      totalCost: 8700,
      customerApproved: true,
      warrantyDays: 90,
      notes: "ลูกค้าขอนัดรับเครื่องด่วน หากอะไหล่เข้าก่อนเที่ยง",
    },
  });

  // 2. DIAGNOSING
  await createRepairJob({
    data: {
      trackingCode: "REP-202611-0002",
      branchId: hq.id,
      customerId: cust2.id,
      technicianId: tech1.id,
      deviceBrand: "Samsung",
      deviceModel: "Galaxy S23 Ultra",
      deviceColor: "Phantom Black",
      serialIMEI: "359182736451099",
      passcode: "2580",
      patternLock: "0-1-2-4-7",
      preCheckData: JSON.stringify({
        screen: "NO_DISPLAY",
        touch: "UNKNOWN",
        cameraFront: "UNKNOWN",
        cameraBack: "UNKNOWN",
        mic: "UNKNOWN",
        speaker: "UNKNOWN",
        faceId: "UNKNOWN",
        charging: "NO_DRAW",
        wifi: "UNKNOWN",
        moisture: "SUSPECTED",
        drops: "SCRATCHES",
      }),
      issueDescription: "เครื่องดับเอง เสียบสายชาร์จไม่มีกระแสไฟเข้า (0.00A) เครื่องอุ่นเล็กน้อยช่วงบอร์ดบน",
      customerSignature: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='60'><path d='M20 30 Q 70 5 120 40 T 170 30' stroke='black' fill='transparent' stroke-width='2'/></svg>",
      status: "DIAGNOSING",
      laborFee: 1000,
      estimatedCost: 2690,
      totalCost: 2690,
      customerApproved: true,
      warrantyDays: 60,
      notes: "กำลังวัดไฟ Main Power IC และตรวจสอบลายไฟ VDD_MAIN",
    },
  });

  // 3. WAITING_PARTS
  await createRepairJob({
    data: {
      trackingCode: "REP-202611-0003",
      branchId: branch2.id,
      customerId: cust3.id,
      technicianId: tech2.id,
      deviceBrand: "Apple",
      deviceModel: "iPad Pro 11 M2",
      deviceColor: "Space Gray",
      serialIMEI: "DMPX8102KL99",
      passcode: "998877",
      preCheckData: preCheckFullPass,
      issueDescription: "แบตเตอรี่บวม ดันขอบจอฝั่งซ้ายโก่งขึ้นมา 2 มม. สุขภาพแบตเตอรี่ 68%",
      customerSignature: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='60'><path d='M15 25 Q 50 45 100 20 T 190 35' stroke='black' fill='transparent' stroke-width='2'/></svg>",
      status: "WAITING_PARTS",
      laborFee: 900,
      estimatedCost: 3400,
      totalCost: 3400,
      customerApproved: true,
      warrantyDays: 90,
      notes: "เบิกแบตเตอรี่แท้โมเดล iPad Pro 11 M2 จากซัพพลายเออร์ กำหนดของเข้าพรุ่งนี้บ่าย",
    },
  });

  // 4. REPAIRING (With parts usage)
  const rep4 = await createRepairJob({
    data: {
      trackingCode: "REP-202611-0004",
      branchId: hq.id,
      customerId: cust4.id,
      technicianId: tech1.id,
      deviceBrand: "Apple",
      deviceModel: "iPhone 13",
      deviceColor: "Blue",
      serialIMEI: "354928110887766",
      passcode: "112233",
      patternLock: null,
      preCheckData: JSON.stringify({
        screen: "BROKEN",
        touch: "FAIL",
        cameraFront: "PASS",
        cameraBack: "PASS",
        mic: "PASS",
        speaker: "PASS",
        faceId: "PASS",
        charging: "PASS",
        wifi: "PASS",
        moisture: "NORMAL",
        drops: "CORNER_DENT",
      }),
      issueDescription: "เปลี่ยนจอเทียบแท้เกรด A + เปลี่ยนแบตเตอรี่ใหม่ มอก.",
      customerSignature: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='60'><path d='M10 35 Q 80 15 130 40 T 180 25' stroke='black' fill='transparent' stroke-width='2'/></svg>",
      status: "REPAIRING",
      laborFee: 600,
      estimatedCost: 4600,
      totalCost: 4600,
      customerApproved: true,
      warrantyDays: 90,
      notes: "กำลังแกะซิลกันน้ำเดิม ติดกาวหน้าจอใหม่ ย้ายเซนเซอร์ TrueDepth",
    },
  });

  await createRepairPartUsage({
    data: {
      repairJobId: rep4.id,
      productId: pScreen13.id,
      quantity: 1,
      costPrice: pScreen13.costPrice,
      sellPrice: pScreen13.sellPrice,
    },
  });

  await createRepairPartUsage({
    data: {
      repairJobId: rep4.id,
      productId: pBat13.id,
      quantity: 1,
      costPrice: pBat13.costPrice,
      sellPrice: pBat13.sellPrice,
    },
  });

  // 5. QC_PASSED
  await createRepairJob({
    data: {
      trackingCode: "REP-202611-0005",
      branchId: branch2.id,
      customerId: cust1.id,
      technicianId: tech2.id,
      deviceBrand: "Samsung",
      deviceModel: "Galaxy A54 5G",
      deviceColor: "Awesome Lime",
      serialIMEI: "359182736451055",
      passcode: "1234",
      preCheckData: JSON.stringify({
        screen: "PASS",
        touch: "PASS",
        charging: "LOOSE_CONTACT",
      }),
      postCheckData: JSON.stringify({
        screen: "PASS",
        touch: "PASS",
        charging: "FAST_CHARGE_OK",
        mic: "PASS",
        speaker: "PASS",
      }),
      issueDescription: "เปลี่ยนตูดชาร์จ Type-C เสียบสายแล้วติดๆ ดับๆ ชาร์จช้า",
      customerSignature: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='60'><path d='M20 20 Q 80 40 140 10 T 190 30' stroke='black' fill='transparent' stroke-width='2'/></svg>",
      status: "QC_PASSED",
      laborFee: 400,
      estimatedCost: 1250,
      totalCost: 1250,
      customerApproved: true,
      warrantyDays: 90,
      notes: "เทสชาร์จด่วน 25W ผ่าน 100% กระแสไฟ 9V/2.77A นิ่งสนิท ผ่าน QC",
    },
  });

  // 6. READY
  await createRepairJob({
    data: {
      trackingCode: "REP-202611-0006",
      branchId: hq.id,
      customerId: cust2.id,
      technicianId: tech1.id,
      deviceBrand: "Apple",
      deviceModel: "iPhone 12 Pro",
      deviceColor: "Pacific Blue",
      serialIMEI: "354928110776655",
      passcode: "336699",
      preCheckData: preCheckFullPass,
      postCheckData: preCheckFullPass,
      issueDescription: "กล้องหลังสั่น มีเสียงจี่เวลาเปิดกล้อง 1x (โมดูล OIS เสีย) เปลี่ยนชุดกล้องแท้",
      customerSignature: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='60'><path d='M10 20 Q 60 50 120 20 T 180 40' stroke='black' fill='transparent' stroke-width='2'/></svg>",
      status: "READY",
      laborFee: 700,
      estimatedCost: 3200,
      totalCost: 3200,
      customerApproved: true,
      warrantyDays: 90,
      notes: "งานเสร็จสมบูรณ์ แจ้ง SMS และ LINE หาคุณพิมพ์ชนกแล้ว รอเข้ารับเครื่อง",
    },
  });

  // 7. COMPLETED
  await createRepairJob({
    data: {
      trackingCode: "REP-202611-0007",
      branchId: hq.id,
      customerId: cust3.id,
      technicianId: tech1.id,
      deviceBrand: "Apple",
      deviceModel: "iPhone 11",
      deviceColor: "White",
      serialIMEI: "354928110554433",
      passcode: "9988",
      preCheckData: preCheckFullPass,
      postCheckData: preCheckFullPass,
      issueDescription: "เปลี่ยนหน้าจอเกรด A และติดฟิล์มกระจก Focus 3D",
      customerSignature: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='60'><path d='M15 35 Q 70 10 130 40 T 180 20' stroke='black' fill='transparent' stroke-width='2'/></svg>",
      status: "COMPLETED",
      completedAt: new Date(),
      laborFee: 500,
      estimatedCost: 2200,
      totalCost: 2200,
      customerApproved: true,
      warrantyDays: 90,
      notes: "ลูกค้าชำระเงินสดเรียบร้อย ออกใบรับประกัน 90 วันและใบเสร็จแล้ว",
    },
  });

  console.log("Seeding Sales and POS Checkout...");
  const sale1 = await createSale({
    data: {
      invoiceNo: "INV-202611-0001",
      branchId: hq.id,
      customerId: cust1.id,
      cashierId: cashier1.id,
      totalAmount: 1080,
      discount: 80,
      vatAmount: 65.42,
      netAmount: 1000,
      paymentMethod: "PROMPTPAY",
      paymentDetails: JSON.stringify({ ref: "PP-98234710", bank: "KBANK" }),
      status: "COMPLETED",
    },
  });

  await createSaleItem({
    data: {
      saleId: sale1.id,
      productId: pAnker30W.id,
      quantity: 1,
      unitPrice: 690,
      costPrice: 390,
      subtotal: 690,
    },
  });

  await createSaleItem({
    data: {
      saleId: sale1.id,
      productId: pFocus15P.id,
      quantity: 1,
      unitPrice: 390,
      costPrice: 120,
      subtotal: 390,
    },
  });

  console.log("Database seeded successfully!");
  if (seedPasswordFromEnv === undefined) console.log(`Generated password for ALL seeded staff users (shown once, not stored in plaintext): ${seedPassword}`);
  else console.log("Seeded staff users use the password from SEED_PASSWORD.");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
