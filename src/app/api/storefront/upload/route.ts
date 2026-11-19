import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { hashToken, staffTokens } from "@/lib/staff-auth";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";

// Maximum 5MB file upload limit
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/gif",
]);

const EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/gif": "gif",
};

export async function POST(req: NextRequest) {
  try {
    // Check staff session authentication
    const cookieStore = await cookies();
    const token = staffTokens(cookieStore)[0];
    if (!token) {
      return NextResponse.json(
        { success: false, error: "กรุณาเข้าสู่ระบบก่อนทำการอัปโหลดไฟล์" },
        { status: 401 }
      );
    }

    const session = await db.staffSession.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { tenantId: true, expiresAt: true, revokedAt: true },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      return NextResponse.json(
        { success: false, error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง" },
        { status: 401 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    const uploadDir = path.join(process.cwd(), "public", "uploads", "storefront");

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 1. Handle multipart/form-data upload
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

      const mimeType = file.type || "image/png";
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return NextResponse.json(
          { success: false, error: "ประเภทรองรับเฉพาะ JPG, PNG, WEBP, SVG, GIF เท่านั้น" },
          { status: 400 }
        );
      }

      const ext = EXTENSION_MAP[mimeType] || "png";
      const filename = `${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;
      const filePath = path.join(uploadDir, filename);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await writeFile(filePath, buffer);

      const publicUrl = `/uploads/storefront/${filename}`;
      return NextResponse.json({
        success: true,
        url: publicUrl,
        filename,
        size: file.size,
        mimeType,
      });
    }

    // 2. Handle JSON payload (base64 Data URL or raw base64 string)
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const rawData = body.dataUrl || body.image || body.base64;

      if (!rawData || typeof rawData !== "string") {
        return NextResponse.json(
          { success: false, error: "กรุณาระบุข้อมูล dataUrl หรือ image รูปแบบ base64" },
          { status: 400 }
        );
      }

      // Format: data:image/png;base64,iVBORw0KGgo...
      const matches = rawData.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9\+\-\.]+);base64,(.+)$/);
      let mimeType = "image/png";
      let base64String = rawData;

      if (matches) {
        mimeType = matches[1];
        base64String = matches[2];
      }

      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return NextResponse.json(
          { success: false, error: "ประเภทรองรับเฉพาะ JPG, PNG, WEBP, SVG, GIF เท่านั้น" },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(base64String, "base64");
      if (buffer.length > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: "ขนาดไฟล์ต้องไม่เกิน 5 MB" },
          { status: 400 }
        );
      }

      const ext = EXTENSION_MAP[mimeType] || "png";
      const filename = `${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;
      const filePath = path.join(uploadDir, filename);

      await writeFile(filePath, buffer);

      const publicUrl = `/uploads/storefront/${filename}`;
      return NextResponse.json({
        success: true,
        url: publicUrl,
        dataUrl: rawData.startsWith("data:") ? rawData : `data:${mimeType};base64,${base64String}`,
        filename,
        size: buffer.length,
        mimeType,
      });
    }

    return NextResponse.json(
      { success: false, error: "รูปแบบ Content-Type ไม่ถูกต้อง" },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST /api/storefront/upload error:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการอัปโหลดไฟล์" },
      { status: 500 }
    );
  }
}
