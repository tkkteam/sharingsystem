import { NextRequest, NextResponse } from "next/server";
import { adminPay } from "@/lib/data";
import { buildRedirectPath } from "@/lib/redirect";

export async function POST(req: NextRequest) {
  // Admin check
  const adminCookie = req.cookies.get("admin_auth");
  if (adminCookie?.value !== "true") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const formData = await req.formData();
  const memberId = parseInt(formData.get("member_id") as string);
  const month = parseInt(formData.get("month") as string);
  const year = parseInt(formData.get("year") as string);
  const type = formData.get("type") as string; // "CASH" or "TRANSFER"

  if (!memberId || !month || !year || !type) {
    return NextResponse.json({ success: false, error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
  }

  try {
    await adminPay(memberId, month, year, type);
    return NextResponse.redirect(new URL(buildRedirectPath(req, "msg=บันทึกการชำระเงินสำเร็จ"), req.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกการชำระเงิน";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
