import { NextRequest, NextResponse } from "next/server";
import { submitBid } from "@/lib/data";
import { buildRedirectPath } from "@/lib/redirect";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const memberId = parseInt(formData.get("member_id") as string);
  const month = parseInt(formData.get("month") as string);
  const year = parseInt(formData.get("year") as string);
  const amount = parseInt(formData.get("amount") as string);
  const pin = formData.get("pin") as string;

  try {
    await submitBid(memberId, month, year, amount, pin);
    return NextResponse.redirect(new URL(buildRedirectPath(req, "msg=เสนอราคาประมูลสำเร็จ"), req.url));
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("PIN") || msg.includes("รหัส")) {
      return NextResponse.redirect(new URL(buildRedirectPath(req, `member_id=${memberId}&error=ใส่รหัสไม่ถูกต้อง ติดต่อ admin เพื่อขอรหัส`), req.url));
    }
    return NextResponse.redirect(new URL(buildRedirectPath(req, `error=${encodeURIComponent(msg)}`), req.url));
  }
}