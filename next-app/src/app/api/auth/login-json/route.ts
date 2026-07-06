import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/data";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (checkAdmin(username, password)) {
    const response = NextResponse.json({
      success: true,
      message: "เข้าสู่ระบบสำเร็จ",
    });
    response.cookies.set("admin_auth", "true", {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return response;
  }

  return NextResponse.json(
    {
      success: false,
      error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองอีกครั้ง",
    },
    { status: 401 }
  );
}