import { NextRequest, NextResponse } from "next/server";
import { addMember } from "@/lib/data";
import { buildRedirectPath } from "@/lib/redirect";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const bidPassword = formData.get("bid_password") as string;

  await addMember(name, phone, bidPassword);
  return NextResponse.redirect(new URL(buildRedirectPath(req, "msg=เพิ่มสมาชิกสำเร็จ"), req.url));
}
