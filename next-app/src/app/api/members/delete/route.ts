import { NextRequest, NextResponse } from "next/server";
import { deleteMember } from "@/lib/data";
import { buildRedirectPath } from "@/lib/redirect";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const id = parseInt(formData.get("id") as string);

  await deleteMember(id);
  return NextResponse.redirect(new URL(buildRedirectPath(req, "msg=ลบสมาชิกสำเร็จ"), req.url));
}
