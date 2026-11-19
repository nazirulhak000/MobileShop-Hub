-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AttendanceRecord" (
    "tenantId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "clockIn" DATETIME,
    "clockOut" DATETIME,
    "totalHours" REAL,
    "status" TEXT NOT NULL DEFAULT 'ON_TIME',
    "notes" TEXT,
    "verifiedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttendanceRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AttendanceRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AttendanceRecord_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AttendanceRecord" ("branchId", "clockIn", "clockOut", "createdAt", "date", "id", "notes", "status", "tenantId", "totalHours", "userId", "verifiedBy") SELECT "branchId", "clockIn", "clockOut", "createdAt", "date", "id", "notes", "status", "tenantId", "totalHours", "userId", "verifiedBy" FROM "AttendanceRecord";
DROP TABLE "AttendanceRecord";
ALTER TABLE "new_AttendanceRecord" RENAME TO "AttendanceRecord";
CREATE INDEX "AttendanceRecord_branchId_date_idx" ON "AttendanceRecord"("branchId", "date");
CREATE UNIQUE INDEX "AttendanceRecord_userId_date_key" ON "AttendanceRecord"("userId", "date");
CREATE TABLE "new_DeviceIMEI" (
    "tenantId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "imei" TEXT NOT NULL,
    "serialNo" TEXT,
    "conditionGrade" TEXT NOT NULL DEFAULT 'A',
    "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "costPrice" REAL NOT NULL DEFAULT 0,
    "sellPrice" REAL NOT NULL DEFAULT 0,
    "tradeInContractId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeviceIMEI_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DeviceIMEI_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DeviceIMEI_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DeviceIMEI_tradeInContractId_fkey" FOREIGN KEY ("tradeInContractId") REFERENCES "TradeInContract" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DeviceIMEI" ("branchId", "conditionGrade", "costPrice", "createdAt", "id", "imei", "productId", "sellPrice", "serialNo", "status", "tenantId", "tradeInContractId", "updatedAt") SELECT "branchId", "conditionGrade", "costPrice", "createdAt", "id", "imei", "productId", "sellPrice", "serialNo", "status", "tenantId", "tradeInContractId", "updatedAt" FROM "DeviceIMEI";
DROP TABLE "DeviceIMEI";
ALTER TABLE "new_DeviceIMEI" RENAME TO "DeviceIMEI";
CREATE INDEX "DeviceIMEI_branchId_status_idx" ON "DeviceIMEI"("branchId", "status");
CREATE INDEX "DeviceIMEI_tenantId_idx" ON "DeviceIMEI"("tenantId");
CREATE INDEX "DeviceIMEI_productId_idx" ON "DeviceIMEI"("productId");
CREATE INDEX "DeviceIMEI_tradeInContractId_idx" ON "DeviceIMEI"("tradeInContractId");
CREATE UNIQUE INDEX "DeviceIMEI_tenantId_imei_key" ON "DeviceIMEI"("tenantId", "imei");
CREATE TABLE "new_InstallmentContract" (
    "tenantId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractNo" TEXT NOT NULL,
    "branchId" TEXT,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "nationalId" TEXT NOT NULL,
    "deviceModel" TEXT NOT NULL,
    "imei" TEXT NOT NULL,
    "totalPrice" REAL NOT NULL,
    "downPayment" REAL NOT NULL,
    "financedAmount" REAL NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "monthlyInterestRate" REAL NOT NULL DEFAULT 1.5,
    "monthlyPayment" REAL NOT NULL,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "paidMonths" INTEGER NOT NULL DEFAULT 0,
    "nextDueDate" DATETIME,
    "isOverdue" BOOLEAN NOT NULL DEFAULT false,
    "overdueDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InstallmentContract_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InstallmentContract_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InstallmentContract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_InstallmentContract" ("branchId", "contractNo", "createdAt", "customerId", "customerName", "customerPhone", "deviceModel", "downPayment", "financedAmount", "id", "imei", "isOverdue", "monthlyInterestRate", "monthlyPayment", "nationalId", "nextDueDate", "overdueDays", "paidMonths", "startDate", "status", "tenantId", "termMonths", "totalPrice", "updatedAt") SELECT "branchId", "contractNo", "createdAt", "customerId", "customerName", "customerPhone", "deviceModel", "downPayment", "financedAmount", "id", "imei", "isOverdue", "monthlyInterestRate", "monthlyPayment", "nationalId", "nextDueDate", "overdueDays", "paidMonths", "startDate", "status", "tenantId", "termMonths", "totalPrice", "updatedAt" FROM "InstallmentContract";
DROP TABLE "InstallmentContract";
ALTER TABLE "new_InstallmentContract" RENAME TO "InstallmentContract";
CREATE INDEX "InstallmentContract_branchId_status_idx" ON "InstallmentContract"("branchId", "status");
CREATE INDEX "InstallmentContract_customerPhone_idx" ON "InstallmentContract"("customerPhone");
CREATE INDEX "InstallmentContract_tenantId_idx" ON "InstallmentContract"("tenantId");
CREATE INDEX "InstallmentContract_customerId_idx" ON "InstallmentContract"("customerId");
CREATE UNIQUE INDEX "InstallmentContract_tenantId_contractNo_key" ON "InstallmentContract"("tenantId", "contractNo");
CREATE TABLE "new_InstallmentPayment" (
    "tenantId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractId" TEXT NOT NULL,
    "monthNumber" INTEGER NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "paidDate" DATETIME,
    "paymentRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InstallmentPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InstallmentPayment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "InstallmentContract" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_InstallmentPayment" ("amount", "contractId", "createdAt", "dueDate", "id", "monthNumber", "paidDate", "paymentRef", "status", "tenantId") SELECT "amount", "contractId", "createdAt", "dueDate", "id", "monthNumber", "paidDate", "paymentRef", "status", "tenantId" FROM "InstallmentPayment";
DROP TABLE "InstallmentPayment";
ALTER TABLE "new_InstallmentPayment" RENAME TO "InstallmentPayment";
CREATE INDEX "InstallmentPayment_contractId_idx" ON "InstallmentPayment"("contractId");
CREATE INDEX "InstallmentPayment_dueDate_status_idx" ON "InstallmentPayment"("dueDate", "status");
CREATE TABLE "new_PayrollSlip" (
    "tenantId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "baseSalary" REAL NOT NULL,
    "repairCommission" REAL NOT NULL DEFAULT 0,
    "salesCommission" REAL NOT NULL DEFAULT 0,
    "allowance" REAL NOT NULL DEFAULT 0,
    "overtimePay" REAL NOT NULL DEFAULT 0,
    "ssoDeduction" REAL NOT NULL DEFAULT 0,
    "taxDeduction" REAL NOT NULL DEFAULT 0,
    "otherDeductions" REAL NOT NULL DEFAULT 0,
    "netPayout" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PayrollSlip_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PayrollSlip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PayrollSlip_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PayrollSlip" ("allowance", "baseSalary", "branchId", "createdAt", "id", "month", "netPayout", "otherDeductions", "overtimePay", "paidDate", "repairCommission", "salesCommission", "ssoDeduction", "status", "taxDeduction", "tenantId", "updatedAt", "userId") SELECT "allowance", "baseSalary", "branchId", "createdAt", "id", "month", "netPayout", "otherDeductions", "overtimePay", "paidDate", "repairCommission", "salesCommission", "ssoDeduction", "status", "taxDeduction", "tenantId", "updatedAt", "userId" FROM "PayrollSlip";
DROP TABLE "PayrollSlip";
ALTER TABLE "new_PayrollSlip" RENAME TO "PayrollSlip";
CREATE INDEX "PayrollSlip_branchId_month_idx" ON "PayrollSlip"("branchId", "month");
CREATE UNIQUE INDEX "PayrollSlip_userId_month_key" ON "PayrollSlip"("userId", "month");
CREATE TABLE "new_Product" (
    "tenantId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "compatibleModels" TEXT,
    "costPrice" REAL NOT NULL DEFAULT 0,
    "sellPrice" REAL NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("brand", "category", "code", "compatibleModels", "costPrice", "createdAt", "id", "minStock", "model", "name", "sellPrice", "tenantId", "updatedAt") SELECT "brand", "category", "code", "compatibleModels", "costPrice", "createdAt", "id", "minStock", "model", "name", "sellPrice", "tenantId", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE INDEX "Product_category_idx" ON "Product"("category");
CREATE INDEX "Product_tenantId_idx" ON "Product"("tenantId");
CREATE UNIQUE INDEX "Product_tenantId_code_key" ON "Product"("tenantId", "code");
CREATE TABLE "new_RepairJob" (
    "tenantId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackingCode" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "technicianId" TEXT,
    "deviceBrand" TEXT NOT NULL,
    "deviceModel" TEXT NOT NULL,
    "deviceColor" TEXT,
    "serialIMEI" TEXT,
    "passcode" TEXT,
    "patternLock" TEXT,
    "preCheckData" TEXT,
    "postCheckData" TEXT,
    "issueDescription" TEXT NOT NULL,
    "customerSignature" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "estimatedFinish" DATETIME,
    "completedAt" DATETIME,
    "laborFee" REAL NOT NULL DEFAULT 0,
    "estimatedCost" REAL NOT NULL DEFAULT 0,
    "totalCost" REAL NOT NULL DEFAULT 0,
    "customerApproved" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "photos" TEXT,
    "warrantyDays" INTEGER NOT NULL DEFAULT 90,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RepairJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RepairJob_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RepairJob_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RepairJob_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RepairJob" ("branchId", "completedAt", "createdAt", "customerApproved", "customerId", "customerSignature", "deviceBrand", "deviceColor", "deviceModel", "estimatedCost", "estimatedFinish", "id", "issueDescription", "laborFee", "notes", "passcode", "patternLock", "photos", "postCheckData", "preCheckData", "serialIMEI", "status", "technicianId", "tenantId", "totalCost", "trackingCode", "updatedAt", "warrantyDays") SELECT "branchId", "completedAt", "createdAt", "customerApproved", "customerId", "customerSignature", "deviceBrand", "deviceColor", "deviceModel", "estimatedCost", "estimatedFinish", "id", "issueDescription", "laborFee", "notes", "passcode", "patternLock", "photos", "postCheckData", "preCheckData", "serialIMEI", "status", "technicianId", "tenantId", "totalCost", "trackingCode", "updatedAt", "warrantyDays" FROM "RepairJob";
DROP TABLE "RepairJob";
ALTER TABLE "new_RepairJob" RENAME TO "RepairJob";
CREATE INDEX "RepairJob_branchId_status_idx" ON "RepairJob"("branchId", "status");
CREATE INDEX "RepairJob_serialIMEI_idx" ON "RepairJob"("serialIMEI");
CREATE INDEX "RepairJob_tenantId_idx" ON "RepairJob"("tenantId");
CREATE INDEX "RepairJob_customerId_idx" ON "RepairJob"("customerId");
CREATE INDEX "RepairJob_technicianId_idx" ON "RepairJob"("technicianId");
CREATE INDEX "RepairJob_tenantId_createdAt_idx" ON "RepairJob"("tenantId", "createdAt");
CREATE UNIQUE INDEX "RepairJob_tenantId_trackingCode_key" ON "RepairJob"("tenantId", "trackingCode");
CREATE TABLE "new_RepairPartUsage" (
    "tenantId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "repairJobId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "costPrice" REAL NOT NULL DEFAULT 0,
    "sellPrice" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepairPartUsage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RepairPartUsage_repairJobId_fkey" FOREIGN KEY ("repairJobId") REFERENCES "RepairJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RepairPartUsage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_RepairPartUsage" ("costPrice", "createdAt", "id", "productId", "quantity", "repairJobId", "sellPrice", "tenantId") SELECT "costPrice", "createdAt", "id", "productId", "quantity", "repairJobId", "sellPrice", "tenantId" FROM "RepairPartUsage";
DROP TABLE "RepairPartUsage";
ALTER TABLE "new_RepairPartUsage" RENAME TO "RepairPartUsage";
CREATE INDEX "RepairPartUsage_repairJobId_idx" ON "RepairPartUsage"("repairJobId");
CREATE INDEX "RepairPartUsage_productId_idx" ON "RepairPartUsage"("productId");
CREATE TABLE "new_RepairStatusEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "repairJobId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "customerMessage" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepairStatusEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_RepairStatusEvent" ("actorId", "customerMessage", "id", "occurredAt", "repairJobId", "status", "tenantId") SELECT "actorId", "customerMessage", "id", "occurredAt", "repairJobId", "status", "tenantId" FROM "RepairStatusEvent";
DROP TABLE "RepairStatusEvent";
ALTER TABLE "new_RepairStatusEvent" RENAME TO "RepairStatusEvent";
CREATE INDEX "RepairStatusEvent_tenantId_repairJobId_idx" ON "RepairStatusEvent"("tenantId", "repairJobId");
CREATE TABLE "new_Sale" (
    "tenantId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNo" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "customerId" TEXT,
    "cashierId" TEXT,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "vatAmount" REAL NOT NULL DEFAULT 0,
    "netAmount" REAL NOT NULL DEFAULT 0,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "paymentDetails" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Sale_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Sale_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Sale" ("branchId", "cashierId", "createdAt", "customerId", "discount", "id", "invoiceNo", "netAmount", "paymentDetails", "paymentMethod", "status", "tenantId", "totalAmount", "updatedAt", "vatAmount") SELECT "branchId", "cashierId", "createdAt", "customerId", "discount", "id", "invoiceNo", "netAmount", "paymentDetails", "paymentMethod", "status", "tenantId", "totalAmount", "updatedAt", "vatAmount" FROM "Sale";
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";
CREATE INDEX "Sale_branchId_createdAt_idx" ON "Sale"("branchId", "createdAt");
CREATE INDEX "Sale_customerId_idx" ON "Sale"("customerId");
CREATE INDEX "Sale_tenantId_idx" ON "Sale"("tenantId");
CREATE INDEX "Sale_tenantId_createdAt_idx" ON "Sale"("tenantId", "createdAt");
CREATE UNIQUE INDEX "Sale_tenantId_invoiceNo_key" ON "Sale"("tenantId", "invoiceNo");
CREATE TABLE "new_SaleItem" (
    "tenantId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "deviceImeiId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "costPrice" REAL NOT NULL DEFAULT 0,
    "subtotal" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "SaleItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_deviceImeiId_fkey" FOREIGN KEY ("deviceImeiId") REFERENCES "DeviceIMEI" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SaleItem" ("costPrice", "deviceImeiId", "id", "productId", "quantity", "saleId", "subtotal", "tenantId", "unitPrice") SELECT "costPrice", "deviceImeiId", "id", "productId", "quantity", "saleId", "subtotal", "tenantId", "unitPrice" FROM "SaleItem";
DROP TABLE "SaleItem";
ALTER TABLE "new_SaleItem" RENAME TO "SaleItem";
CREATE UNIQUE INDEX "SaleItem_deviceImeiId_key" ON "SaleItem"("deviceImeiId");
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");
CREATE INDEX "SaleItem_productId_idx" ON "SaleItem"("productId");
CREATE TABLE "new_ShopExpense" (
    "tenantId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "expenseNo" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receiptUrl" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShopExpense_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ShopExpense_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ShopExpense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ShopExpense" ("amount", "branchId", "category", "createdAt", "createdById", "date", "expenseNo", "id", "receiptUrl", "tenantId", "title", "updatedAt") SELECT "amount", "branchId", "category", "createdAt", "createdById", "date", "expenseNo", "id", "receiptUrl", "tenantId", "title", "updatedAt" FROM "ShopExpense";
DROP TABLE "ShopExpense";
ALTER TABLE "new_ShopExpense" RENAME TO "ShopExpense";
CREATE INDEX "ShopExpense_branchId_date_idx" ON "ShopExpense"("branchId", "date");
CREATE INDEX "ShopExpense_tenantId_idx" ON "ShopExpense"("tenantId");
CREATE UNIQUE INDEX "ShopExpense_tenantId_expenseNo_key" ON "ShopExpense"("tenantId", "expenseNo");
CREATE TABLE "new_StockItem" (
    "tenantId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StockItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockItem_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_StockItem" ("branchId", "createdAt", "id", "productId", "quantity", "tenantId", "updatedAt") SELECT "branchId", "createdAt", "id", "productId", "quantity", "tenantId", "updatedAt" FROM "StockItem";
DROP TABLE "StockItem";
ALTER TABLE "new_StockItem" RENAME TO "StockItem";
CREATE INDEX "StockItem_branchId_quantity_idx" ON "StockItem"("branchId", "quantity");
CREATE UNIQUE INDEX "StockItem_productId_branchId_key" ON "StockItem"("productId", "branchId");
CREATE TABLE "new_TradeInContract" (
    "tenantId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractNo" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'BUYBACK',
    "branchId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "nationalId" TEXT NOT NULL,
    "deviceBrand" TEXT NOT NULL,
    "deviceModel" TEXT NOT NULL,
    "imei" TEXT NOT NULL,
    "conditionGrade" TEXT NOT NULL DEFAULT 'A',
    "inspectionData" TEXT,
    "declarationAgreed" BOOLEAN NOT NULL DEFAULT true,
    "customerPhoto" TEXT,
    "agreedPrice" REAL NOT NULL DEFAULT 0,
    "interestRateMonthly" REAL NOT NULL DEFAULT 2.5,
    "durationMonths" INTEGER NOT NULL DEFAULT 1,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TradeInContract_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TradeInContract_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TradeInContract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TradeInContract" ("agreedPrice", "branchId", "conditionGrade", "contractNo", "createdAt", "customerId", "customerPhoto", "declarationAgreed", "deviceBrand", "deviceModel", "dueDate", "durationMonths", "id", "imei", "inspectionData", "interestRateMonthly", "nationalId", "startDate", "status", "tenantId", "type", "updatedAt") SELECT "agreedPrice", "branchId", "conditionGrade", "contractNo", "createdAt", "customerId", "customerPhoto", "declarationAgreed", "deviceBrand", "deviceModel", "dueDate", "durationMonths", "id", "imei", "inspectionData", "interestRateMonthly", "nationalId", "startDate", "status", "tenantId", "type", "updatedAt" FROM "TradeInContract";
DROP TABLE "TradeInContract";
ALTER TABLE "new_TradeInContract" RENAME TO "TradeInContract";
CREATE INDEX "TradeInContract_branchId_status_dueDate_idx" ON "TradeInContract"("branchId", "status", "dueDate");
CREATE INDEX "TradeInContract_tenantId_idx" ON "TradeInContract"("tenantId");
CREATE INDEX "TradeInContract_customerId_idx" ON "TradeInContract"("customerId");
CREATE INDEX "TradeInContract_tenantId_type_idx" ON "TradeInContract"("tenantId", "type");
CREATE UNIQUE INDEX "TradeInContract_tenantId_contractNo_key" ON "TradeInContract"("tenantId", "contractNo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Appointment_branchId_idx" ON "Appointment"("branchId");

-- CreateIndex
CREATE INDEX "Appointment_slotId_idx" ON "Appointment"("slotId");

-- CreateIndex
CREATE INDEX "AppointmentEvent_appointmentId_idx" ON "AppointmentEvent"("appointmentId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuthThrottle_resetsAt_idx" ON "AuthThrottle"("resetsAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_expiresAt_idx" ON "OtpChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "StaffSession_expiresAt_idx" ON "StaffSession"("expiresAt");
