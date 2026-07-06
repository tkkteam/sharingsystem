import { put, del } from "@vercel/blob";
import path from "path";
import fs from "fs/promises";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Detect whether Vercel Blob is configured.
 * When BLOB_READ_WRITE_TOKEN is set (auto-injected by Vercel), use Blob storage.
 * Otherwise fall back to local filesystem (for local development).
 */
export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "data", "slips");

function getSafeExt(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
  return ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
}

function validateFile(file: File): void {
  if (!file || file.size === 0) {
    throw new Error("กรุณาเลือกไฟล์สลิป");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("ไฟล์ใหญ่เกิน 5MB");
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP, GIF)");
  }
}

/**
 * Upload a slip file. Returns an identifier stored in DB:
 *  - Blob mode: the full public URL (https://xxx.public.blob.vercel-storage.com/...)
 *  - Local mode: the filename only (slip_1_7_2025_123.jpg)
 *
 * Special values "TRANSFER" and "CASH" are used for non-file slip records
 * and are handled outside this module.
 */
export async function uploadSlip(
  memberId: number,
  month: number,
  year: number,
  file: File
): Promise<string> {
  validateFile(file);

  const safeExt = getSafeExt(file.name);
  const baseName = `slip_${memberId}_${month}_${year}_${Date.now()}.${safeExt}`;

  if (isBlobConfigured()) {
    const blob = await put(`slips/${baseName}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    });
    return blob.url;
  }

  // Local fallback
  await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(LOCAL_UPLOAD_DIR, baseName), buffer);
  return baseName;
}

/**
 * Resolve a slip identifier (stored in DB) to readable bytes.
 * Returns { buffer, mime } for streaming through the API (keeps admin-only control).
 */
export async function readSlip(fileName: string): Promise<{ buffer: Buffer; mime: string } | null> {
  // Special values are not readable as images
  if (fileName === "TRANSFER" || fileName === "CASH") return null;

  const MIME_MAP: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
  };

  // Blob URL
  if (fileName.startsWith("http")) {
    try {
      const res = await fetch(fileName);
      if (!res.ok) return null;
      const arrayBuffer = await res.arrayBuffer();
      const mime = res.headers.get("content-type") || "image/jpeg";
      return { buffer: Buffer.from(arrayBuffer), mime };
    } catch {
      return null;
    }
  }

  // Local file
  try {
    const data = await fs.readFile(path.join(LOCAL_UPLOAD_DIR, fileName));
    const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
    return { buffer: data, mime: MIME_MAP[ext] || "image/jpeg" };
  } catch {
    return null;
  }
}

/**
 * Delete a slip file from storage.
 * Silently ignores missing files and special values.
 */
export async function deleteSlip(fileName: string): Promise<void> {
  if (fileName === "TRANSFER" || fileName === "CASH") return;

  // Blob URL
  if (fileName.startsWith("http")) {
    try {
      await del(fileName);
    } catch {
      // ignore delete errors
    }
    return;
  }

  // Local file
  try {
    await fs.unlink(path.join(LOCAL_UPLOAD_DIR, fileName));
  } catch {
    // ignore file delete errors
  }
}