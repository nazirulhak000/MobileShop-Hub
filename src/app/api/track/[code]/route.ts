import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashToken, throttle } from "@/lib/staff-auth";
import { safeError } from "@/lib/staff-http";
import { clientIp, isKnownIp } from "@/lib/client-ip";

export const dynamic = "force-dynamic";

const TOKEN_FORMAT = /^[a-f0-9]{64}$/i;

function parsePhotosList(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((u): u is string => typeof u === "string" && u.trim().length > 0);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((u): u is string => typeof u === "string" && u.trim().length > 0);
      if (typeof parsed === "string" && parsed.trim().length > 0) return [parsed.trim()];
    } catch (_) {
      if (raw.startsWith("http") || raw.startsWith("/") || raw.startsWith("data:")) {
        return [raw.trim()];
      }
    }
  }
  return [];
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const rawCode = decodeURIComponent(resolvedParams?.code || "").trim().toLowerCase();

    if (!TOKEN_FORMAT.test(rawCode)) {
      return NextResponse.json(
        { success: false, error: "กรุณาสแกน QR จากใบรับซ่อมฉบับใหม่ หรือติดต่อร้านเพื่อรับลิงก์ติดตาม" },
        { status: 404 }
      );
    }

    // IP-based throttle protection against brute force
    const ip = clientIp(request);
    if (isKnownIp(ip)) await throttle(`tracking-ip:${ip}`, 60, 60_000);
    else await throttle("tracking-ip:unknown", 1000, 60_000);

    const token = await db.publicTrackingToken.findUnique({
      where: { tokenHash: hashToken(rawCode) },
    });

    if (!token || token.revokedAt || token.expiresAt <= new Date()) {
      return NextResponse.json(
        { success: false, error: "ลิงก์ไม่พร้อมใช้งาน กรุณาติดต่อร้าน" },
        { status: 404 }
      );
    }

    const job = await db.repairJob.findFirst({
      where: {
        id: token.repairJobId,
        tenantId: token.tenantId,
        branch: { tenantId: token.tenantId, tenant: { status: { in: ["ACTIVE", "TRIAL"] } } },
      },
      select: {
        id: true,
        trackingCode: true,
        deviceBrand: true,
        deviceModel: true,
        status: true,
        estimatedFinish: true,
        updatedAt: true,
        photos: true,
        branch: { select: { name: true, phone: true } },
        tenant: { select: { name: true, slug: true } },
      },
    });

    if (!job) {
      return NextResponse.json(
        { success: false, error: "ไม่พบงานซ่อม" },
        { status: 404 }
      );
    }

    const photos = parsePhotosList(job.photos);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: job.id,
          trackingCode: job.trackingCode,
          deviceBrand: job.deviceBrand,
          deviceModel: job.deviceModel,
          status: job.status,
          estimatedFinish: job.estimatedFinish,
          updatedAt: job.updatedAt,
          photos,
          branch: job.branch,
          tenant: job.tenant,
        },
      },
      { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } }
    );
  } catch (error) {
    return safeError(error);
  }
}

// Tracking links grant limited read access only. Decisions require authenticated ownership.
export async function POST() {
  return NextResponse.json(
    { success: false, error: "กรุณาเข้าสู่บัญชีลูกค้าเพื่อยืนยันหรืออนุมัติใบเสนอราคา" },
    { status: 403 }
  );
}
