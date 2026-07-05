import { NextRequest, NextResponse } from "next/server";
import { buildRedirectPath } from "@/lib/redirect";
import { saveWinner } from "@/lib/data";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const memberId = parseInt(formData.get("member_id") as string);
  const interestAmount = parseInt(formData.get("interest_amount") as string);
  const month = parseInt(formData.get("month") as string);
  const year = parseInt(formData.get("year") as string);

  await saveWinner(memberId, interestAmount, month, year);
  return NextResponse.redirect(new URL(buildRedirectPath(req, "msg=บันทึกผู้ได้รับแชร์สำเร็จ"), req.url));
}
