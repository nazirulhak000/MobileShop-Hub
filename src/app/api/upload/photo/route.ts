import { NextRequest, NextResponse } from "next/server";
import { checkOrigin, requireStaffSession, throttle } from "@/lib/staff-auth";
import { safeError } from "@/lib/staff-http";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { isR2Configured, uploadToR2 } from "@/lib/r2";

export const dynamic = "force-dynamic";

// 10MB limit for high-res smartphone camera photos
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function verifyMagicBytes(buffer: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buffer.length < 4) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
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

  // JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // WebP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const actor = await requireStaffSession(req);

    // Multi-tenant throttle: 60 uploads per minute per user
    await throttle(`photo:upload:${actor.tenantId}:${actor.id}`, 60, 60 * 1000);

    const contentType = req.headers.get("content-type") || "";
    let buffer: Buffer;
    let originalName = "camera-capture.jpg";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = (formData.get("file") || formData.get("photo") || formData.get("image")) as File | null;
      if (!file || typeof file === "string") {
        return NextResponse.json({ success: false, error: "ไม่พบไฟล์รูปภาพที่อัปโหลด" }, { status: 400 });
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ success: false, error: "ขนาดรูปภาพต้องไม่เกิน 10 MB" }, { status: 400 });
      }
      originalName = file.name || originalName;
      buffer = Buffer.from(await file.arrayBuffer());
    } else if (contentType.includes("application/json")) {
      const json = await req.json().catch(() => null);
      if (!json || !json.dataUrl || typeof json.dataUrl !== "string") {
        return NextResponse.json({ success: false, error: "รูปแบบ Data URL ไม่ถูกต้อง" }, { status: 400 });
      }
      const match = json.dataUrl.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
      if (!match) {
        return NextResponse.json({ success: false, error: "รองรับเฉพาะ Data URL ของรูปภาพ JPG, PNG, WebP" }, { status: 400 });
      }
      buffer = Buffer.from(match[2], "base64");
      if (buffer.length > MAX_FILE_SIZE) {
        return NextResponse.json({ success: false, error: "ขนาดรูปภาพต้องไม่เกิน 10 MB" }, { status: 400 });
      }
    } else {
      return NextResponse.json({ success: false, error: "รูปแบบ Content-Type ต้องเป็น multipart/form-data หรือ application/json" }, { status: 400 });
    }

    const detectedType = verifyMagicBytes(buffer);
    if (!detectedType || !ALLOWED_MIME_TYPES.has(detectedType)) {
      return NextResponse.json({ success: false, error: "รองรับเฉพาะไฟล์รูปภาพ JPG, PNG หรือ WebP เท่านั้น" }, { status: 400 });
    }

    const ext = EXTENSION_MAP[detectedType] || "jpg";
    const timestamp = Date.now();
    const randomHex = randomBytes(8).toString("hex");
    const yyyymm = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" })
      .format(new Date())
      .slice(0, 7)
      .replace("-", "");

    const r2Key = `photos/${actor.tenantId}/${yyyymm}/${timestamp}-${randomHex}.${ext}`;
    let publicUrl: string;

    if (isR2Configured()) {
      publicUrl = await uploadToR2(buffer, r2Key, detectedType);
    } else {
      const uploadDir = path.resolve(process.cwd(), "public", "uploads", "photos", actor.tenantId, yyyymm);
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      const localFilename = `${timestamp}-${randomHex}.${ext}`;
      const localFilePath = path.join(uploadDir, localFilename);
      await writeFile(localFilePath, buffer);
      publicUrl = `/uploads/photos/${actor.tenantId}/${yyyymm}/${localFilename}`;
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: originalName,
      size: buffer.length,
      mimeType: detectedType,
    });
  } catch (error) {
    return safeError(error);
  }
}
