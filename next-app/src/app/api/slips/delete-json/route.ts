import { NextRequest, NextResponse } from "next/server";
import { getSlip, deleteSlip } from "@/lib/data";
import { deleteSlip as deleteSlipFile } from "@/lib/slip-storage";

export async function POST(req: NextRequest) {
  // Strict admin check
  const adminCookie = req.cookies.get("admin_auth");
  if (adminCookie?.value !== "true") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const memberId = parseInt(formData.get("member_id") as string);
    const month = parseInt(formData.get("month") as string);
    const year = parseInt(formData.get("year") as string);

    if (!memberId || !month || !year) {
      return NextResponse.json({ success: false, error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
    }

    // Delete file if exists
    const slip = await getSlip(memberId, month, year);
    if (slip) {
      await deleteSlipFile(slip.file_name);
      await deleteSlip(memberId, month, year);
    }

    return NextResponse.json({ success: true, message: "ลบสลิปเรียบร้อยแล้ว" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลบสลิป";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}