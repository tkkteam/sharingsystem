import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const msg = encodeURIComponent("ออกจากระบบสำเร็จ");
  const response = NextResponse.redirect(new URL(`/?msg=${msg}`, req.url));
  response.cookies.set("admin_auth", "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
