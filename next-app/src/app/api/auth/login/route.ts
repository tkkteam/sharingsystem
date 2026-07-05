import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/data";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const baseUrl = `${proto}://${host}`;

  if (checkAdmin(username, password)) {
    const msg = encodeURIComponent("เข้าสู่ระบบสำเร็จ");
    const response = NextResponse.redirect(new URL(`/admin?msg=${msg}`, baseUrl));
    response.cookies.set("admin_auth", "true", { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 });
    return response;
  }

  const error = encodeURIComponent("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  return NextResponse.redirect(new URL(`/admin?error=${error}`, baseUrl));
}