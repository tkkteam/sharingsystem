import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const msg = encodeURIComponent("ออกจากระบบสำเร็จ");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const baseUrl = `${proto}://${host}`;

  const response = NextResponse.redirect(new URL(`/?msg=${msg}`, baseUrl));
  response.cookies.set("admin_auth", "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
