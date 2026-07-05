import { NextRequest, NextResponse } from "next/server";
import { saveSlip } from "@/lib/data";
import { fetchGASData } from "@/lib/gas-api";
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
    const pin = formData.get("pin") as string | null;
    const file = formData.get("slip") as File | null;

    if (!memberId || !month || !year || !pin) {
      return NextResponse.json({ success: false, error: "ข้อมูลไม่ครบถ้วน หรือไม่ได้กรอก PIN" }, { status: 400 });
    }

    // Validate PIN
    const gasData = await fetchGASData();
    const member = gasData.members.find((m) => m.id === memberId);
    if (!member) {
      return NextResponse.json({ success: false, error: "ไม่พบข้อมูลสมาชิก" }, { status: 400 });
    }
    if (member.bid_password !== pin) {
      return NextResponse.json({ success: false, error: "ใส่รหัสไม่ถูกต้อง ติดต่อ admin เพื่อขอรหัส" }, { status: 400 });
    }

    if (!file || file.size === 0) {
      return NextResponse.json({ success: false, error: "กรุณาเลือกไฟล์สลิป" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: "ไฟล์ใหญ่เกิน 5MB" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP, GIF)" },
        { status: 400 }
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

    return NextResponse.json({
      success: true,
      message: "อัพโหลดสลิปสำเร็จ รอแอดมินตรวจสอบ",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอัพโหลดสลิป";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}