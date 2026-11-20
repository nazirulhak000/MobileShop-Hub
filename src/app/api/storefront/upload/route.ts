import { NextRequest, NextResponse } from "next/server";
import { checkOrigin, requireStaffSession, throttle } from "@/lib/staff-auth";
import { safeError } from "@/lib/staff-http";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { isR2Configured, uploadToR2 } from "@/lib/r2";
import { isSvgContent, inspectAndSanitizeSvg } from "@/lib/storefrontSecurity";

export const dynamic = "force-dynamic";

// Strict 5MB file upload limit (Round 13)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Strictly allowed MIME types
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]);

const EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

/**
 * Validate buffer against magic bytes signature to prevent MIME spoofing / executable masquerading
 */
function verifyMagicBytes(buffer: Buffer): "image/jpeg" | "image/png" | "image/webp" | "image/svg+xml" | null {
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

  // SVG inspection check
  if (isSvgContent(buffer)) {
    return "image/svg+xml";
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Round 11: CSRF & Origin Validation
    checkOrigin(req);

    // 2. Round 11: Unauthenticated mutation rejection
    const actor = await requireStaffSession(req);
    if (!["ADMIN", "MANAGER"].includes(actor.role)) {
      return NextResponse.json(
        { success: false, error: "ไม่มีสิทธิ์อัปโหลดไฟล์ (เฉพาะ ADMIN หรือ MANAGER)" },
        { status: 403 }
      );
    }

    // 3. Round 11: Rate-limiting throttle per IP and tenant
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    await throttle(`storefront:upload:${actor.tenantId}:${actor.id}`, 30, 60 * 1000);
    await throttle(`storefront:upload:ip:${ip}`, 50, 60 * 1000);

    const contentType = req.headers.get("content-type") || "";
    const uploadDir = path.resolve(process.cwd(), "public", "uploads", "storefront");

    if (!isR2Configured() && !existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 4. Handle multipart/form-data upload
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = (formData.get("file") || formData.get("image")) as File | null;

      if (!file || typeof file === "string") {
        return NextResponse.json(
          { success: false, error: "ไม่พบไฟล์รูปภาพที่อัปโหลด" },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: "ขนาดไฟล์ต้องไม่เกิน 5 MB" },
          { status: 400 }
        );
      }

      const mimeType = (file.type || "image/png").toLowerCase();
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return NextResponse.json(
          { success: false, error: "ประเภทรองรับเฉพาะ JPG, PNG, WEBP, SVG เท่านั้น" },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      let buffer = Buffer.from(arrayBuffer);

      if (buffer.length === 0 || buffer.length > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: "ขนาดไฟล์ต้องไม่เกิน 5 MB" },
          { status: 400 }
        );
      }

      // Verify actual magic bytes
      const detectedMime = verifyMagicBytes(buffer);
      if (!detectedMime || !ALLOWED_MIME_TYPES.has(detectedMime)) {
        return NextResponse.json(
          { success: false, error: "ไฟล์ไม่ใช่รูปภาพ JPG, PNG, WEBP หรือ SVG ที่ถูกต้อง" },
          { status: 400 }
        );
      }

      // Round 13: SVG Script-Strip & Block
      if (detectedMime === "image/svg+xml") {
        const svgText = buffer.toString("utf8");
        const svgAudit = inspectAndSanitizeSvg(svgText);
        if (!svgAudit.safe) {
          return NextResponse.json(
            {
              success: false,
              error: `ตรวจพบสคริปต์หรือองค์ประกอบที่ไม่ปลอดภัยในไฟล์ SVG: ${svgAudit.reason} (SVG Script Injection Blocked)`,
            },
            { status: 400 }
          );
        }
        buffer = Buffer.from(svgAudit.sanitized, "utf8");
      }

      const ext = EXTENSION_MAP[detectedMime] || "png";
      const filename = `${Date.now()}-${randomBytes(16).toString("hex")}.${ext}`;

      // Strictly guard against directory traversal
      if (!/^[a-zA-Z0-9_\-]+\.(jpg|jpeg|png|webp|svg)$/i.test(filename) || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
        return NextResponse.json(
          { success: false, error: "ตรวจพบชื่อไฟล์ที่ไม่ปลอดภัย" },
          { status: 400 }
        );
      }

      let publicUrl: string;

      if (isR2Configured()) {
        publicUrl = await uploadToR2(buffer, filename, detectedMime);
      } else {
        const filePath = path.resolve(uploadDir, filename);
        if (!filePath.startsWith(uploadDir + path.sep)) {
          return NextResponse.json(
            { success: false, error: "ตรวจพบพาธที่ไม่ปลอดภัย (Path Traversal Detected)" },
            { status: 400 }
          );
        }
        await writeFile(filePath, buffer);
        publicUrl = `/uploads/storefront/${filename}`;
      }

      return NextResponse.json({
        success: true,
        url: publicUrl,
        filename,
        size: buffer.length,
        mimeType: detectedMime,
      });
    }

    // 5. Handle JSON payload (base64 Data URL or raw base64 string)
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return NextResponse.json(
          { success: false, error: "รูปแบบข้อมูล JSON ไม่ถูกต้อง" },
          { status: 400 }
        );
      }
      const rawData = body.dataUrl || body.image || body.base64;

      if (!rawData || typeof rawData !== "string") {
        return NextResponse.json(
          { success: false, error: "กรุณาระบุข้อมูล dataUrl หรือ image รูปแบบ base64" },
          { status: 400 }
        );
      }

      // Memory DoS guard: 5MB binary payload is ~7MB base64
      if (rawData.length > 8 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: "ขนาดไฟล์ต้องไม่เกิน 5 MB" },
          { status: 400 }
        );
      }

      // Format: data:image/png;base64,iVBORw0KGgo...
      const matches = rawData.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9\+\-\.]+);base64,(.+)$/);
      let claimedMimeType = "image/png";
      let base64String = rawData.trim();

      if (matches) {
        claimedMimeType = matches[1].toLowerCase();
        base64String = matches[2].trim();
      }

      if (!ALLOWED_MIME_TYPES.has(claimedMimeType)) {
        return NextResponse.json(
          { success: false, error: "ประเภทรองรับเฉพาะ JPG, PNG, WEBP, SVG เท่านั้น" },
          { status: 400 }
        );
      }

      const cleanBase64 = base64String.replace(/\s+/g, "");
      if (!/^[A-Za-z0-9+/=]+$/.test(cleanBase64)) {
        return NextResponse.json(
          { success: false, error: "รูปแบบ base64 ไม่ถูกต้อง" },
          { status: 400 }
        );
      }

      let buffer = Buffer.from(cleanBase64, "base64");
      if (buffer.length === 0 || buffer.length > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: "ขนาดไฟล์ต้องไม่เกิน 5 MB" },
          { status: 400 }
        );
      }

      // Verify actual magic bytes
      const detectedMime = verifyMagicBytes(buffer);
      if (!detectedMime || !ALLOWED_MIME_TYPES.has(detectedMime)) {
        return NextResponse.json(
          { success: false, error: "ไฟล์ไม่ใช่รูปภาพ JPG, PNG, WEBP หรือ SVG ที่ถูกต้อง" },
          { status: 400 }
        );
      }

      // Round 13: SVG Script-Strip & Block
      if (detectedMime === "image/svg+xml") {
        const svgText = buffer.toString("utf8");
        const svgAudit = inspectAndSanitizeSvg(svgText);
        if (!svgAudit.safe) {
          return NextResponse.json(
            {
              success: false,
              error: `ตรวจพบสคริปต์หรือองค์ประกอบที่ไม่ปลอดภัยในไฟล์ SVG: ${svgAudit.reason} (SVG Script Injection Blocked)`,
            },
            { status: 400 }
          );
        }
        buffer = Buffer.from(svgAudit.sanitized, "utf8");
      }

      const ext = EXTENSION_MAP[detectedMime] || "png";
      const filename = `${Date.now()}-${randomBytes(16).toString("hex")}.${ext}`;

      // Strictly guard against directory traversal
      if (!/^[a-zA-Z0-9_\-]+\.(jpg|jpeg|png|webp|svg)$/i.test(filename) || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
        return NextResponse.json(
          { success: false, error: "ตรวจพบชื่อไฟล์ที่ไม่ปลอดภัย" },
          { status: 400 }
        );
      }

      let publicUrl: string;

      if (isR2Configured()) {
        publicUrl = await uploadToR2(buffer, filename, detectedMime);
      } else {
        const filePath = path.resolve(uploadDir, filename);
        if (!filePath.startsWith(uploadDir + path.sep)) {
          return NextResponse.json(
            { success: false, error: "ตรวจพบพาธที่ไม่ปลอดภัย (Path Traversal Detected)" },
            { status: 400 }
          );
        }
        await writeFile(filePath, buffer);
        publicUrl = `/uploads/storefront/${filename}`;
      }

      return NextResponse.json({
        success: true,
        url: publicUrl,
        filename,
        size: buffer.length,
        mimeType: detectedMime,
      });
    }

    return NextResponse.json(
      { success: false, error: "รูปแบบ Content-Type ไม่ถูกต้อง" },
      { status: 400 }
    );
  } catch (error) {
    return safeError(error);
  }
}
