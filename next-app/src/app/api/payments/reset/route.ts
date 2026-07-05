import { NextRequest, NextResponse } from "next/server";
import { buildRedirectPath } from "@/lib/redirect";
import { resetPayments } from "@/lib/data";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const month = parseInt(formData.get("month") as string);
  const year = parseInt(formData.get("year") as string);

  await resetPayments(month, year);
  return NextResponse.redirect(new URL(buildRedirectPath(req, "msg=รีเซ็ตสถานะชำระเงินสำเร็จ"), req.url));
}
