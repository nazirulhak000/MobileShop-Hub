-- CreateTable
CREATE TABLE "CustomerAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CustomerAccountLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CustomerSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RepairStatusEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "repairJobId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "customerMessage" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RepairQuote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "repairJobId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "amountSatang" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" DATETIME NOT NULL,
    "decidedAt" DATETIME,
    "decidedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BookingPolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "opensMinute" INTEGER NOT NULL DEFAULT 540,
    "closesMinute" INTEGER NOT NULL DEFAULT 1200,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "closedWeekdays" TEXT NOT NULL DEFAULT '[]',
    "closedDates" TEXT NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "BookingSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "capacity" INTEGER NOT NULL,
    "reservedCount" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "deviceModel" TEXT NOT NULL,
    "issueDescription" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "bookingRef" TEXT NOT NULL,
    "repairJobId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AppointmentEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BookingRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "CustomerNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAccount_tenantId_phone_key" ON "CustomerAccount"("tenantId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAccountLink_accountId_key" ON "CustomerAccountLink"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAccountLink_customerId_key" ON "CustomerAccountLink"("customerId");

-- CreateIndex
CREATE INDEX "CustomerAccountLink_tenantId_idx" ON "CustomerAccountLink"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSession_tokenHash_key" ON "CustomerSession"("tokenHash");

-- CreateIndex
CREATE INDEX "CustomerSession_tenantId_accountId_idx" ON "CustomerSession"("tenantId", "accountId");

-- CreateIndex
CREATE INDEX "OtpChallenge_tenantId_phone_idx" ON "OtpChallenge"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "RepairStatusEvent_tenantId_repairJobId_idx" ON "RepairStatusEvent"("tenantId", "repairJobId");

-- CreateIndex
CREATE INDEX "RepairQuote_tenantId_repairJobId_idx" ON "RepairQuote"("tenantId", "repairJobId");

-- CreateIndex
CREATE UNIQUE INDEX "RepairQuote_repairJobId_version_key" ON "RepairQuote"("repairJobId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "BookingPolicy_branchId_key" ON "BookingPolicy"("branchId");

-- CreateIndex
CREATE INDEX "BookingSlot_tenantId_startsAt_idx" ON "BookingSlot"("tenantId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "BookingSlot_branchId_startsAt_key" ON "BookingSlot"("branchId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_bookingRef_key" ON "Appointment"("bookingRef");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_repairJobId_key" ON "Appointment"("repairJobId");

-- CreateIndex
CREATE INDEX "Appointment_tenantId_accountId_idx" ON "Appointment"("tenantId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingRequest_tenantId_accountId_action_key_key" ON "BookingRequest"("tenantId", "accountId", "action", "key");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerNotification_eventKey_key" ON "CustomerNotification"("eventKey");

-- CreateIndex
CREATE INDEX "CustomerNotification_tenantId_accountId_idx" ON "CustomerNotification"("tenantId", "accountId");
