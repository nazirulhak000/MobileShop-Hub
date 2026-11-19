CREATE TABLE IF NOT EXISTS "PublicTrackingToken" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "repairJobId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "revokedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "PublicTrackingToken_tokenHash_key" ON "PublicTrackingToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "PublicTrackingToken_tenantId_repairJobId_idx" ON "PublicTrackingToken"("tenantId", "repairJobId");
