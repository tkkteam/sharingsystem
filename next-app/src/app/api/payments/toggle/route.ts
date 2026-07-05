import { NextRequest, NextResponse } from "next/server";
import { buildRedirectPath } from "@/lib/redirect";
import { togglePayment } from "@/lib/data";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const memberId = parseInt(formData.get("member_id") as string);
  const month = parseInt(formData.get("month") as string);
  const year = parseInt(formData.get("year") as string);

  await togglePayment(memberId, month, year);
  return NextResponse.redirect(new URL(buildRedirectPath(req, ""), req.url));
}