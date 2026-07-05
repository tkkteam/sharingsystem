import { NextRequest, NextResponse } from "next/server";
import { buildRedirectPath } from "@/lib/redirect";
import { getSlip, deleteSlip } from "@/lib/data";
import path from "path";
import fs from "fs/promises";

const UPLOAD_DIR = path.join(process.cwd(), "data", "slips");

export async function POST(req: NextRequest) {
  // Strict admin check
  const adminCookie = req.cookies.get("admin_auth");
  if (adminCookie?.value !== "true") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const formData = await req.formData();
    const memberId = parseInt(formData.get("member_id") as string);
    const month = parseInt(formData.get("month") as string);
    const year = parseInt(formData.get("year") as string);

    if (!memberId || !month || !year) {
      return NextResponse.redirect(
        new URL(buildRedirectPath(req, `error=${encodeURIComponent("ข้อมูลไม่ครบถ้วน")}`), req.url)
      );
    }

    // Delete file if exists
    const slip = await getSlip(memberId, month, year);
    if (slip) {
      try {
        await fs.unlink(path.join(UPLOAD_DIR, slip.file_name));
      } catch {
        // ignore file delete errors
      }
      await deleteSlip(memberId, month, year);
    }

    return NextResponse.redirect(
      new URL(
        buildRedirectPath(req, `msg=${encodeURIComponent("ลบสลิปเรียบร้อยแล้ว")}`),
        req.url
      )
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลบสลิป";
    return NextResponse.redirect(
      new URL(buildRedirectPath(req, `error=${encodeURIComponent(message)}`), req.url)
    );
  }
}