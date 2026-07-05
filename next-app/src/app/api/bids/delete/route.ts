import { NextRequest, NextResponse } from "next/server";
import { deleteBid } from "@/lib/data";
import { buildRedirectPath } from "@/lib/redirect";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const memberId = parseInt(formData.get("member_id") as string);
  const month = parseInt(formData.get("month") as string);
  const year = parseInt(formData.get("year") as string);

  await deleteBid(memberId, month, year);
  return NextResponse.redirect(new URL(buildRedirectPath(req, "msg=ลบการเสนอราคาสำเร็จ"), req.url));
}
