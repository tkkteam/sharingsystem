import { NextRequest, NextResponse } from "next/server";
import { buildRedirectPath } from "@/lib/redirect";
import { saveSlip } from "@/lib/data";
import { uploadSlip } from "@/lib/slip-storage";

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

    // Upload via storage helper (Vercel Blob or local fallback)
    const fileIdentifier = await uploadSlip(memberId, month, year, file!);

    // Save record in DB
    await saveSlip(memberId, month, year, fileIdentifier);

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