import { NextRequest, NextResponse } from "next/server";
import { buildRedirectPath } from "@/lib/redirect";
import { saveSlip } from "@/lib/data";
import path from "path";
import fs from "fs/promises";

const UPLOAD_DIR = path.join(process.cwd(), "data", "slips");
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const memberId = parseInt(formData.get("member_id") as string);
    const month = parseInt(formData.get("month") as string);
    const year = parseInt(formData.get("year") as string);
    const file = formData.get("slip") as File | null;

    if (!memberId || !month || !year) {
      return NextResponse.redirect(
        new URL(buildRedirectPath(req, `error=${encodeURIComponent("ข้อมูลไม่ครบถ้วน")}`), req.url)
      );
    }

    if (!file || file.size === 0) {
      return NextResponse.redirect(
        new URL(buildRedirectPath(req, `error=${encodeURIComponent("กรุณาเลือกไฟล์สลิป")}`), req.url)
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.redirect(
        new URL(buildRedirectPath(req, `error=${encodeURIComponent("ไฟล์ใหญ่เกิน 5MB")}`), req.url)
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.redirect(
        new URL(buildRedirectPath(req, `error=${encodeURIComponent("รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP, GIF)")}`), req.url)
      );
    }

    // Ensure directory exists
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    // Build safe file name
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
    const fileName = `slip_${memberId}_${month}_${year}_${Date.now()}.${safeExt}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    // Save record in DB
    await saveSlip(memberId, month, year, fileName);

    return NextResponse.redirect(
      new URL(
        buildRedirectPath(req, `msg=${encodeURIComponent("อัพโหลดสลิปสำเร็จ รอแอดมินตรวจสอบ")}`),
        req.url
      )
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอัพโหลดสลิป";
    return NextResponse.redirect(
      new URL(buildRedirectPath(req, `error=${encodeURIComponent(message)}`), req.url)
    );
  }
}