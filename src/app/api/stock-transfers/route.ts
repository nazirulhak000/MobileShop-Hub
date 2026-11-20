import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AccessError, staffContext } from "@/lib/staff-context";
import {
  withStaff,
  readJson,
  safeError,
  reqId,
  reqInt,
  assertTransition,
  bangkokYYYYMM,
  takeParam,
} from "@/lib/staff-http";

export const dynamic = "force-dynamic";

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

const TRANSFER_TRANSITIONS: Record<string, readonly string[]> = {
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

/**
 * GET /api/stock-transfers
 */
async function handleGET(request: NextRequest) {
  const actor = staffContext();
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status")?.trim().toUpperCase() || "ALL";
  const branchKey = searchParams.get("branch")?.trim() || "";
  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const take = takeParam(searchParams.get("take"), 100, 300);

  const transferMap = await getTenantTransfers(actor.tenantId);
  let list = Array.from(transferMap.values());

  // Branch filter (source or dest)
  let filterBranchId: string | undefined;
  if (branchKey) {
    const branch = await prisma.branch.findFirst({
      where: {
        tenantId: actor.tenantId,
        OR: [{ code: branchKey }, { id: branchKey }],
      },
      select: { id: true },
    });
    if (branch) filterBranchId = branch.id;
  }

  // Role scoping: Cashier/Staff limited to their assigned branches
  const isAllBranchRole = actor.role === "ADMIN" || actor.role === "MANAGER";
  if (!isAllBranchRole) {
    list = list.filter(
      (t) =>
        actor.branchIds.includes(t.sourceBranchId) ||
        actor.branchIds.includes(t.destBranchId)
    );
  }

  if (filterBranchId) {
    list = list.filter(
      (t) =>
        t.sourceBranchId === filterBranchId || t.destBranchId === filterBranchId
    );
  }

  // Status filter
  if (statusFilter && statusFilter !== "ALL") {
    list = list.filter((t) => t.status === statusFilter);
  }

  // Search filter
  if (search) {
    list = list.filter(
      (t) =>
        t.transferNo.toLowerCase().includes(search) ||
        t.sourceBranchName.toLowerCase().includes(search) ||
        t.destBranchName.toLowerCase().includes(search) ||
        t.items.some(
          (i) =>
            (i.productName || "").toLowerCase().includes(search) ||
            (i.productCode || "").toLowerCase().includes(search)
        )
    );
  }

  // Order desc by createdAt
  list.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json({
    success: true,
    transfers: list.slice(0, take),
    total: list.length,
  });
}

/**
 * POST /api/stock-transfers
 * Supports:
 * 1. Creating new transfer:
 *    { action: "CREATE", sourceBranchId, destBranchId, items: [...], trackingNote?, status?: "PENDING" | "IN_TRANSIT" }
 * 2. Status Transition:
 *    { action: "DISPATCH" | "RECEIVE" | "REJECT" | "CANCEL", transferId, note? }
 */
async function handlePOST(request: NextRequest) {
  const actor = staffContext();
  const body = await readJson(request);
  const action = (body?.action || "CREATE").toUpperCase();

  // -------------------------------------------------------------
  // ACTION: Status Transition (DISPATCH, RECEIVE, REJECT, CANCEL)
  // -------------------------------------------------------------
  if (["DISPATCH", "RECEIVE", "REJECT", "CANCEL"].includes(action)) {
    const transferId = reqId(body?.transferId || body?.id, "transferId");
    const note = typeof body?.note === "string" ? body.note.trim() : "";

    const targetStatusMap: Record<string, StockTransferRecord["status"]> = {
      DISPATCH: "IN_TRANSIT",
      RECEIVE: "RECEIVED",
      REJECT: "REJECTED",
      CANCEL: "CANCELLED",
    };
    const targetStatus = targetStatusMap[action];

    const transferMap = await getTenantTransfers(actor.tenantId, transferId);
    const transfer = transferMap.get(transferId);
    if (!transfer) {
      throw new AccessError(404, "ไม่พบข้อมูลใบโอนย้ายสินค้า");
    }

    // Role branch check
    const isAllBranchRole = actor.role === "ADMIN" || actor.role === "MANAGER";
    if (!isAllBranchRole) {
      if (
        action === "DISPATCH" &&
        !actor.branchIds.includes(transfer.sourceBranchId)
      ) {
        throw new AccessError(403, "ไม่มีสิทธิ์จัดส่งสินค้าจากสาขาต้นทางนี้");
      }
      if (
        action === "RECEIVE" &&
        !actor.branchIds.includes(transfer.destBranchId)
      ) {
        throw new AccessError(403, "ไม่มีสิทธิ์ตรวจรับสินค้าเข้าสาขาปลายทางนี้");
      }
      if (
        (action === "REJECT" || action === "CANCEL") &&
        !actor.branchIds.includes(transfer.sourceBranchId) &&
        !actor.branchIds.includes(transfer.destBranchId)
      ) {
        throw new AccessError(403, "ไม่มีสิทธิ์ยกเลิกใบโอนสินค้านี้");
      }
    }

    // Assert transition validity
    assertTransition(TRANSFER_TRANSITIONS, transfer.status, targetStatus);

    await prisma.$transaction(async (tx) => {
      // 1. DISPATCH: Source stock is deducted
      if (targetStatus === "IN_TRANSIT" && transfer.status === "PENDING") {
        for (const item of transfer.items) {
          const stock = await tx.stockItem.findUnique({
            where: {
              productId_branchId: {
                productId: item.productId,
                branchId: transfer.sourceBranchId,
              },
            },
          });
          const available = stock ? stock.quantity : 0;
          if (available < item.quantity) {
            throw new AccessError(
              409,
              `สต็อกสาขาต้นทางไม่เพียงพอ: ${item.productName || item.productId} (คงเหลือ ${available} ชิ้น, ต้องการจัดส่ง ${item.quantity} ชิ้น)`
            );
          }

          await tx.stockItem.update({
            where: { id: stock!.id },
            data: { quantity: available - item.quantity },
          });

          // Serialized IMEIs update to IN_TRANSIT
          if (item.imeiIds && item.imeiIds.length > 0) {
            await tx.deviceIMEI.updateMany({
              where: {
                id: { in: item.imeiIds },
                tenantId: actor.tenantId,
                branchId: transfer.sourceBranchId,
              },
              data: { status: "IN_TRANSIT" },
            });
          }

          // Inventory audit
          await tx.auditLog.create({
            data: {
              tenantId: actor.tenantId,
              userId: actor.id,
              module: "INVENTORY",
              action: "STOCK_TRANSFER_OUT",
              targetId: item.productId,
              details: JSON.stringify({
                transferNo: transfer.transferNo,
                transferId: transfer.id,
                sourceBranchId: transfer.sourceBranchId,
                destBranchId: transfer.destBranchId,
                quantity: item.quantity,
                fromQty: available,
                toQty: available - item.quantity,
                imeis: item.imeis || [],
              }),
              beforeJson: JSON.stringify({ quantity: available }),
              afterJson: JSON.stringify({ quantity: available - item.quantity }),
              severity: "INFO",
            },
          });
        }
      }

      // 2. RECEIVE: Destination stock is credited
      else if (targetStatus === "RECEIVED") {
        for (const item of transfer.items) {
          const destStock = await tx.stockItem.upsert({
            where: {
              productId_branchId: {
                productId: item.productId,
                branchId: transfer.destBranchId,
              },
            },
            update: {
              quantity: { increment: item.quantity },
            },
            create: {
              tenantId: actor.tenantId,
              productId: item.productId,
              branchId: transfer.destBranchId,
              quantity: item.quantity,
            },
          });

          // Serialized IMEIs update branchId and return to IN_STOCK
          if (item.imeiIds && item.imeiIds.length > 0) {
            await tx.deviceIMEI.updateMany({
              where: {
                id: { in: item.imeiIds },
                tenantId: actor.tenantId,
              },
              data: {
                branchId: transfer.destBranchId,
                status: "IN_STOCK",
              },
            });
          }

          // Inventory audit
          await tx.auditLog.create({
            data: {
              tenantId: actor.tenantId,
              userId: actor.id,
              module: "INVENTORY",
              action: "STOCK_TRANSFER_IN",
              targetId: item.productId,
              details: JSON.stringify({
                transferNo: transfer.transferNo,
                transferId: transfer.id,
                sourceBranchId: transfer.sourceBranchId,
                destBranchId: transfer.destBranchId,
                quantity: item.quantity,
                receivedStockQty: destStock.quantity,
                imeis: item.imeis || [],
              }),
              severity: "INFO",
            },
          });
        }
      }

      // 3. REJECT / CANCEL from IN_TRANSIT: Revert deducted stock back to source
      else if (
        (targetStatus === "CANCELLED" || targetStatus === "REJECTED") &&
        transfer.status === "IN_TRANSIT"
      ) {
        for (const item of transfer.items) {
          await tx.stockItem.upsert({
            where: {
              productId_branchId: {
                productId: item.productId,
                branchId: transfer.sourceBranchId,
              },
            },
            update: {
              quantity: { increment: item.quantity },
            },
            create: {
              tenantId: actor.tenantId,
              productId: item.productId,
              branchId: transfer.sourceBranchId,
              quantity: item.quantity,
            },
          });

          // Serialized IMEIs revert back to IN_STOCK at source branch
          if (item.imeiIds && item.imeiIds.length > 0) {
            await tx.deviceIMEI.updateMany({
              where: {
                id: { in: item.imeiIds },
                tenantId: actor.tenantId,
              },
              data: {
                branchId: transfer.sourceBranchId,
                status: "IN_STOCK",
              },
            });
          }

          // Inventory revert audit
          await tx.auditLog.create({
            data: {
              tenantId: actor.tenantId,
              userId: actor.id,
              module: "INVENTORY",
              action: "STOCK_TRANSFER_REVERT",
              targetId: item.productId,
              details: JSON.stringify({
                transferNo: transfer.transferNo,
                transferId: transfer.id,
                revertedToBranchId: transfer.sourceBranchId,
                quantity: item.quantity,
                reason: note || "ยกเลิกคำขอโอนย้ายสินค้า",
              }),
              severity: "WARNING",
            },
          });
        }
      }

      // Record transfer status change in AuditLog
      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          module: "STOCK_TRANSFER",
          action: targetStatus,
          targetId: transfer.id,
          severity: targetStatus === "CANCELLED" || targetStatus === "REJECTED" ? "WARNING" : "INFO",
          details: JSON.stringify({
            transferId: transfer.id,
            transferNo: transfer.transferNo,
            fromStatus: transfer.status,
            toStatus: targetStatus,
            updatedBy: actor.name,
            note: note || undefined,
            timestamp: new Date().toISOString(),
          }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `เปลี่ยนสถานะเป็น ${targetStatus} เรียบร้อยแล้ว`,
      status: targetStatus,
    });
  }

  // -------------------------------------------------------------
  // ACTION: CREATE New Stock Transfer
  // -------------------------------------------------------------
  const sourceKey = reqId(
    body?.sourceBranchId || body?.sourceBranchCode || body?.fromBranch,
    "sourceBranch"
  );
  const destKey = reqId(
    body?.destBranchId || body?.destBranchCode || body?.toBranch,
    "destBranch"
  );
  const rawItems = Array.isArray(body?.items) ? body.items : [];
  const trackingNote = typeof body?.trackingNote === "string" ? body.trackingNote.trim() : (body?.note || "");
  const initialStatus = body?.status === "IN_TRANSIT" ? "IN_TRANSIT" : "PENDING";

  if (rawItems.length === 0) {
    throw new AccessError(400, "กรุณาระบุรายการสินค้าที่ต้องการโอนย้ายอย่างน้อย 1 รายการ");
  }

  // Multi-Tenant Isolation: BOTH source and destination branch MUST belong to actor.tenantId!
  const [sourceBranch, destBranch] = await Promise.all([
    prisma.branch.findFirst({
      where: {
        tenantId: actor.tenantId,
        OR: [{ id: sourceKey }, { code: sourceKey }, { name: sourceKey }],
      },
    }),
    prisma.branch.findFirst({
      where: {
        tenantId: actor.tenantId,
        OR: [{ id: destKey }, { code: destKey }, { name: destKey }],
      },
    }),
  ]);

  if (!sourceBranch) {
    throw new AccessError(404, `ไม่พบสาขาต้นทาง (${sourceKey}) ในองค์กรของคุณ`);
  }
  if (!destBranch) {
    throw new AccessError(404, `ไม่พบสาขาปลายทาง (${destKey}) ในองค์กรของคุณ`);
  }

  if (sourceBranch.tenantId !== actor.tenantId || destBranch.tenantId !== actor.tenantId) {
    throw new AccessError(403, "ไม่อนุญาตให้โอนย้ายสินค้าระหว่างต่าง Tenant (Cross-tenant transfer blocked)");
  }

  if (sourceBranch.id === destBranch.id) {
    throw new AccessError(400, "สาขาต้นทางและสาขาปลายทางต้องไม่เป็นสาขาเดียวกัน");
  }

  // Role scoping: Cashier can only initiate transfers from their own branch
  const isAllBranchRole = actor.role === "ADMIN" || actor.role === "MANAGER";
  if (!isAllBranchRole && !actor.branchIds.includes(sourceBranch.id)) {
    throw new AccessError(403, "ไม่มีสิทธิ์ขอโอนย้ายสินค้าออกจากสาขาอื่น");
  }

  // Validate products and quantities
  const validatedItems: TransferItemPayload[] = [];
  for (const it of rawItems) {
    const pKey = reqId(it.productId || it.productCode || it.productName, "productId");
    const qty = reqInt(it.quantity, "quantity", 1, 100_000);

    const product = await prisma.product.findFirst({
      where: {
        tenantId: actor.tenantId,
        OR: [{ id: pKey }, { code: pKey }, { name: pKey }],
      },
      include: {
        stockItems: { where: { branchId: sourceBranch.id } },
      },
    });

    if (!product) {
      throw new AccessError(404, `ไม่พบสินค้า (${pKey}) ในองค์กรของคุณ`);
    }

    const availableStock = product.stockItems[0]?.quantity ?? 0;

    // Check IMEIs if provided
    let imeiIds: string[] = [];
    let imeiStrings: string[] = [];
    if (Array.isArray(it.imeiIds) && it.imeiIds.length > 0) {
      const imeiRecords = await prisma.deviceIMEI.findMany({
        where: {
          tenantId: actor.tenantId,
          branchId: sourceBranch.id,
          id: { in: it.imeiIds },
          status: "IN_STOCK",
        },
      });

      if (imeiRecords.length !== it.imeiIds.length) {
        throw new AccessError(
          400,
          `หมายเลข IMEI บางรายการไม่พร้อมโอนย้าย หรือไม่อยู่ที่สาขาต้นทาง (${sourceBranch.name})`
        );
      }
      imeiIds = imeiRecords.map((i) => i.id);
      imeiStrings = imeiRecords.map((i) => i.imei);
    }

    // If dispatching immediately, verify stock sufficiency
    if (initialStatus === "IN_TRANSIT" && availableStock < qty) {
      throw new AccessError(
        409,
        `สต็อกสาขาต้นทาง (${sourceBranch.name}) ไม่เพียงพอสำหรับ ${product.name} (คงเหลือ ${availableStock} ชิ้น, ต้องการโอน ${qty} ชิ้น)`
      );
    }

    validatedItems.push({
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      quantity: qty,
      imeiIds: imeiIds.length > 0 ? imeiIds : undefined,
      imeis: imeiStrings.length > 0 ? imeiStrings : undefined,
    });
  }

  const yyyymm = bangkokYYYYMM();
  const transferId = `trf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const createdTransfer = await prisma.$transaction(async (tx) => {
    // Monotonic sequential numbering TRF-YYYYMM-XXXX
    const counter = await tx.sequenceCounter.upsert({
      where: { id: `TRF-${yyyymm}` },
      update: { current: { increment: 1 } },
      create: { id: `TRF-${yyyymm}`, current: 1 },
    });
    const transferNo = `TRF-${yyyymm}-${String(counter.current).padStart(4, "0")}`;

    // If initialStatus is IN_TRANSIT, deduct source stock immediately
    if (initialStatus === "IN_TRANSIT") {
      for (const item of validatedItems) {
        const stock = await tx.stockItem.findUnique({
          where: {
            productId_branchId: {
              productId: item.productId,
              branchId: sourceBranch.id,
            },
          },
        });
        const currentQty = stock ? stock.quantity : 0;
        if (currentQty < item.quantity) {
          throw new AccessError(
            409,
            `สต็อกไม่เพียงพอสำหรับจัดส่ง: ${item.productName}`
          );
        }

        await tx.stockItem.update({
          where: { id: stock!.id },
          data: { quantity: currentQty - item.quantity },
        });

        if (item.imeiIds && item.imeiIds.length > 0) {
          await tx.deviceIMEI.updateMany({
            where: { id: { in: item.imeiIds }, tenantId: actor.tenantId },
            data: { status: "IN_TRANSIT" },
          });
        }

        await tx.auditLog.create({
          data: {
            tenantId: actor.tenantId,
            userId: actor.id,
            module: "INVENTORY",
            action: "STOCK_TRANSFER_OUT",
            targetId: item.productId,
            details: JSON.stringify({
              transferNo,
              transferId,
              sourceBranchId: sourceBranch.id,
              destBranchId: destBranch.id,
              quantity: item.quantity,
              fromQty: currentQty,
              toQty: currentQty - item.quantity,
            }),
            beforeJson: JSON.stringify({ quantity: currentQty }),
            afterJson: JSON.stringify({ quantity: currentQty - item.quantity }),
            severity: "INFO",
          },
        });
      }
    }

    const payload = {
      transferId,
      transferNo,
      sourceBranchId: sourceBranch.id,
      sourceBranchCode: sourceBranch.code,
      sourceBranchName: sourceBranch.name,
      destBranchId: destBranch.id,
      destBranchCode: destBranch.code,
      destBranchName: destBranch.name,
      items: validatedItems,
      status: initialStatus,
      requestedBy: actor.name,
      dispatchedBy: initialStatus === "IN_TRANSIT" ? actor.name : undefined,
      dispatchedAt: initialStatus === "IN_TRANSIT" ? new Date().toISOString() : undefined,
      trackingNote: trackingNote || undefined,
      createdAt: new Date().toISOString(),
    };

    // AuditLog for Transfer Creation
    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "STOCK_TRANSFER",
        action: "CREATE",
        targetId: transferId,
        severity: "INFO",
        details: JSON.stringify(payload),
      },
    });

    return {
      id: transferId,
      ...payload,
      updatedAt: new Date().toISOString(),
      history: [
        {
          status: initialStatus,
          action: "CREATE",
          actor: actor.name,
          time: new Date().toISOString(),
          note: trackingNote || undefined,
        },
      ],
    };
  });

  return NextResponse.json({
    success: true,
    transfer: createdTransfer,
  });
}

export const GET = withStaff(handleGET, ["ADMIN", "MANAGER", "TECHNICIAN", "CASHIER"]);
export const POST = withStaff(handlePOST, ["ADMIN", "MANAGER", "TECHNICIAN", "CASHIER"]);
