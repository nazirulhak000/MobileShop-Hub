-- DropIndex
DROP INDEX "Branch_code_key";

-- DropIndex
DROP INDEX "User_username_key";

-- DropIndex
DROP INDEX "Customer_phone_key";

-- DropIndex
DROP INDEX "RepairJob_trackingCode_key";

-- DropIndex
DROP INDEX "Product_code_key";

-- DropIndex
DROP INDEX "DeviceIMEI_imei_key";

-- DropIndex
DROP INDEX "Sale_invoiceNo_key";

-- DropIndex
DROP INDEX "TradeInContract_contractNo_key";

-- DropIndex
DROP INDEX "InstallmentContract_contractNo_key";

-- DropIndex
DROP INDEX "ShopExpense_expenseNo_key";

-- AlterTable
ALTER TABLE "SequenceCounter" ADD COLUMN "tenantId" TEXT;

-- AlterTable
ALTER TABLE "RepairJob" ADD COLUMN "tenantId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "tenantId" TEXT;

-- AlterTable
ALTER TABLE "StockItem" ADD COLUMN "tenantId" TEXT;

-- AlterTable
ALTER TABLE "DeviceIMEI" ADD COLUMN "tenantId" TEXT;

-- AlterTable
ALTER TABLE "RepairPartUsage" ADD COLUMN "tenantId" TEXT;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "tenantId" TEXT;

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN "tenantId" TEXT;

-- AlterTable
ALTER TABLE "TradeInContract" ADD COLUMN "tenantId" TEXT;

-- AlterTable
ALTER TABLE "InstallmentContract" ADD COLUMN "tenantId" TEXT;

-- AlterTable
ALTER TABLE "InstallmentPayment" ADD COLUMN "tenantId" TEXT;

-- AlterTable
ALTER TABLE "ShopExpense" ADD COLUMN "tenantId" TEXT;

-- AlterTable
ALTER TABLE "AttendanceRecord" ADD COLUMN "tenantId" TEXT;

-- AlterTable
ALTER TABLE "PayrollSlip" ADD COLUMN "tenantId" TEXT;

-- CreateTable
CREATE TABLE "StaffSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AuthThrottle" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "resetsAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StaffBranchAccess" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffSession_tokenHash_key" ON "StaffSession"("tokenHash");

-- CreateIndex
CREATE INDEX "StaffSession_userId_tenantId_idx" ON "StaffSession"("userId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffBranchAccess_userId_branchId_key" ON "StaffBranchAccess"("userId", "branchId");

-- CreateIndex
CREATE INDEX "Branch_tenantId_idx" ON "Branch"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_tenantId_code_key" ON "Branch"("tenantId", "code");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_username_key" ON "User"("tenantId", "username");

-- CreateIndex
CREATE INDEX "Customer_tenantId_idx" ON "Customer"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_tenantId_phone_key" ON "Customer"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "RepairJob_tenantId_idx" ON "RepairJob"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "RepairJob_tenantId_trackingCode_key" ON "RepairJob"("tenantId", "trackingCode");

-- CreateIndex
CREATE INDEX "Product_tenantId_idx" ON "Product"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_code_key" ON "Product"("tenantId", "code");

-- CreateIndex
CREATE INDEX "DeviceIMEI_tenantId_idx" ON "DeviceIMEI"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceIMEI_tenantId_imei_key" ON "DeviceIMEI"("tenantId", "imei");

-- CreateIndex
CREATE INDEX "Sale_tenantId_idx" ON "Sale"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_tenantId_invoiceNo_key" ON "Sale"("tenantId", "invoiceNo");

-- CreateIndex
CREATE INDEX "TradeInContract_tenantId_idx" ON "TradeInContract"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TradeInContract_tenantId_contractNo_key" ON "TradeInContract"("tenantId", "contractNo");

-- CreateIndex
CREATE INDEX "InstallmentContract_tenantId_idx" ON "InstallmentContract"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "InstallmentContract_tenantId_contractNo_key" ON "InstallmentContract"("tenantId", "contractNo");

-- CreateIndex
CREATE INDEX "ShopExpense_tenantId_idx" ON "ShopExpense"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopExpense_tenantId_expenseNo_key" ON "ShopExpense"("tenantId", "expenseNo");
