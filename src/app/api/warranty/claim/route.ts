import { AccessError, staffContext } from "@/lib/staff-context";
import { readJson, safeError, withStaff } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/warranty/claim - File a claim
async function handlePOST(request: NextRequest) {
  try {
    const actor = staffContext();
    const body = await readJson(request);
    const { imei, invoiceNo, targetId, symptom, customerName, customerPhone, branchCode } = body;

    const claimReason = (symptom || body.reason || "").trim();
    if (!claimReason) {
      return NextResponse.json({ success: false, error: "กรุณาระบุอาการที่ต้องการเคลม" }, { status: 400 });
    }

    const lookupKey = (targetId || imei || invoiceNo || "").trim();
    if (!lookupKey) {
      return NextResponse.json({ success: false, error: "กรุณาระบุหมายเลข IMEI หรือเลขที่ใบเสร็จ" }, { status: 400 });
    }

    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const claimNo = `CLM-${datePrefix}-${randomSuffix}`;

    const log = await prisma.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "WARRANTY",
        action: "CLAIM",
        targetId: lookupKey,
        details: JSON.stringify({
          claimNo,
          imei: imei || lookupKey,
          invoiceNo: invoiceNo || null,
          symptom: claimReason,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          branchCode: branchCode || null,
          status: "IN_REVIEW",
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `เปิดคำขอเคลมประกันสำเร็จ (หมายเลขเคลม: ${claimNo})`,
      claim: {
        claimNo,
        date: log.createdAt.toISOString().slice(0, 10),
        symptom: claimReason,
        resolution: "รับเรื่องเรียบร้อย เจ้าหน้าที่จะติดต่อกลับ",
        status: "IN_REVIEW",
      },
    });
  } catch (error) {
    return safeError(error);
  }
}

export const POST = withStaff(handlePOST, ["ADMIN", "MANAGER", "CASHIER", "TECHNICIAN"]);
