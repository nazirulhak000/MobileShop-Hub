import { NextRequest, NextResponse } from "next/server";
import { checkOrigin, requireStaffSession, throttle } from "@/lib/staff-auth";
import { safeError } from "@/lib/staff-http";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { isR2Configured, uploadToR2 } from "@/lib/r2";

export const dynamic = "force-dynamic";

// Strict 10MB file upload limit for receipts & tax invoices
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/**
 * Validate buffer against magic bytes to prevent MIME spoofing / executable masquerading
 */
function verifyMagicBytes(buffer: Buffer): "image/jpeg" | "image/png" | "image/webp" | "application/pdf" | null {
  if (buffer.length < 4) return null;

  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // JPEG magic bytes: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // WebP magic bytes: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50 // P
  ) {
    return "image/webp";
  }

  // PDF magic bytes: 25 50 44 46 (%PDF)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x25 && // %
    buffer[1] === 0x50 && // P
    buffer[2] === 0x44 && // D
    buffer[3] === 0x46 // F
  ) {
    return "application/pdf";
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    // 1. CSRF & Origin Validation
    checkOrigin(req);

    // 2. Staff Authentication
    const actor = await requireStaffSession(req);
    if (!["ADMIN", "MANAGER", "TECHNICIAN", "SALE"].includes(actor.role)) {
      return NextResponse.json(
        { success: false, error: "ไม่มีสิทธิ์อัปโหลดเอกสารค่าใช้จ่าย" },
        { status: 403 }
      );
    }

    // 3. Multi-Tenant Rate-limiting throttle
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    await throttle(`expenses:upload:${actor.tenantId}:${actor.id}`, 40, 60 * 1000);
    await throttle(`expenses:upload:ip:${ip}`, 60, 60 * 1000);

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { success: false, error: "รูปแบบคำขอต้องเป็น multipart/form-data" },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = (formData.get("file") || formData.get("receipt")) as File | null;

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, error: "ไม่พบไฟล์ใบเสร็จ/ใบกำกับภาษีที่อัปโหลด" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "ขนาดไฟล์ต้องไม่เกิน 10 MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const detectedType = verifyMagicBytes(buffer);

    if (!detectedType || !ALLOWED_MIME_TYPES.has(detectedType)) {
      return NextResponse.json(
        { success: false, error: "ประเภทรองรับเฉพาะรูปภาพ (JPG, PNG, WebP) หรือไฟล์ PDF เท่านั้น" },
        { status: 400 }
      );
    }

    const ext = EXTENSION_MAP[detectedType] || "bin";
    const timestamp = Date.now();
    const randomHex = randomBytes(8).toString("hex");
    const yyyymm = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" })
      .format(new Date())
      .slice(0, 7)
      .replace("-", "");

    // Cloudflare R2 upload path: expenses/{tenantId}/{yyyymm}/{timestamp}-{randomHex}.{ext}
    const r2Key = `expenses/${actor.tenantId}/${yyyymm}/${timestamp}-${randomHex}.${ext}`;

    let publicUrl: string;

    if (isR2Configured()) {
      publicUrl = await uploadToR2(buffer, r2Key, detectedType);
    } else {
      // Local development fallback
      const uploadDir = path.resolve(process.cwd(), "public", "uploads", "expenses", actor.tenantId, yyyymm);
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      const localFilename = `${timestamp}-${randomHex}.${ext}`;
      const localFilePath = path.join(uploadDir, localFilename);
      await writeFile(localFilePath, buffer);
      publicUrl = `/uploads/expenses/${actor.tenantId}/${yyyymm}/${localFilename}`;
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: file.name,
      size: file.size,
      mimeType: detectedType,
    });
  } catch (error) {
    return safeError(error);
  }
}
