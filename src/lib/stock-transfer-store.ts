import { prisma } from "@/lib/prisma";

export interface TransferItemPayload {
  productId: string;
  productName?: string;
  productCode?: string;
  quantity: number;
  imeiIds?: string[];
  imeis?: string[];
}

export interface StockTransferRecord {
  id: string;
  transferNo: string;
  sourceBranchId: string;
  sourceBranchCode: string;
  sourceBranchName: string;
  destBranchId: string;
  destBranchCode: string;
  destBranchName: string;
  items: TransferItemPayload[];
  status: "PENDING" | "IN_TRANSIT" | "RECEIVED" | "REJECTED" | "CANCELLED";
  requestedBy: string;
  dispatchedBy?: string;
  receivedBy?: string;
  cancelledBy?: string;
  trackingNote?: string;
  createdAt: string;
  updatedAt: string;
  dispatchedAt?: string;
  receivedAt?: string;
  cancelledAt?: string;
  history: Array<{
    status: string;
    action: string;
    actor: string;
    time: string;
    note?: string;
  }>;
}

export const TRANSFER_TRANSITIONS: Record<string, readonly string[]> = {
  PENDING: ["IN_TRANSIT", "CANCELLED", "REJECTED"],
  IN_TRANSIT: ["RECEIVED", "REJECTED", "CANCELLED"],
  RECEIVED: [],
  REJECTED: [],
  CANCELLED: [],
};

/**
 * Reconstructs all transfers for the current tenant from AuditLog.
 */
export async function getTenantTransfers(
  tenantId: string,
  filterTransferId?: string
): Promise<Map<string, StockTransferRecord>> {
  const logs = await prisma.auditLog.findMany({
    where: {
      tenantId,
      module: "STOCK_TRANSFER",
      ...(filterTransferId ? { targetId: filterTransferId } : {}),
    },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const transfers = new Map<string, StockTransferRecord>();

  for (const log of logs) {
    let details: any = {};
    try {
      details = JSON.parse(log.details);
    } catch {
      continue;
    }

    const tId = log.targetId || details.transferId || log.id;

    if (log.action === "CREATE") {
      const record: StockTransferRecord = {
        id: tId,
        transferNo: details.transferNo || `TRF-${tId.slice(-6)}`,
        sourceBranchId: details.sourceBranchId,
        sourceBranchCode: details.sourceBranchCode || "",
        sourceBranchName: details.sourceBranchName || "ต้นทาง",
        destBranchId: details.destBranchId,
        destBranchCode: details.destBranchCode || "",
        destBranchName: details.destBranchName || "ปลายทาง",
        items: details.items || [],
        status: details.status || "PENDING",
        requestedBy: details.requestedBy || log.user?.name || "เจ้าหน้าที่",
        trackingNote: details.trackingNote || undefined,
        createdAt: details.createdAt || log.createdAt.toISOString(),
        updatedAt: log.createdAt.toISOString(),
        history: [
          {
            status: details.status || "PENDING",
            action: "CREATE",
            actor: details.requestedBy || log.user?.name || "เจ้าหน้าที่",
            time: log.createdAt.toISOString(),
            note: details.trackingNote,
          },
        ],
      };
      transfers.set(tId, record);
    } else {
      const record = transfers.get(tId);
      if (!record) continue;

      const newStatus = log.action as StockTransferRecord["status"];
      record.status = newStatus;
      record.updatedAt = log.createdAt.toISOString();
      const actorName = details.updatedBy || log.user?.name || "เจ้าหน้าที่";

      if (newStatus === "IN_TRANSIT") {
        record.dispatchedAt = log.createdAt.toISOString();
        record.dispatchedBy = actorName;
      } else if (newStatus === "RECEIVED") {
        record.receivedAt = log.createdAt.toISOString();
        record.receivedBy = actorName;
      } else if (newStatus === "CANCELLED" || newStatus === "REJECTED") {
        record.cancelledAt = log.createdAt.toISOString();
        record.cancelledBy = actorName;
      }

      if (details.note) {
        record.trackingNote = details.note;
      }

      record.history.push({
        status: newStatus,
        action: log.action,
        actor: actorName,
        time: log.createdAt.toISOString(),
        note: details.note,
      });
    }
  }

  return transfers;
}
