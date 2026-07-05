import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { buildRedirectPath } from "@/lib/redirect";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const id = parseInt(formData.get("id") as string);
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const firstName = formData.get("first_name") as string || "";
  const lastName = formData.get("last_name") as string || "";
  const bankName = formData.get("bank_name") as string || "";
  const accountNumber = formData.get("account_number") as string || "";

  if (!id) {
    return NextResponse.json({ success: false, error: "Member ID is required" }, { status: 400 });
  }

  // Update details in local PostgreSQL database
  await query(
    `UPDATE members
     SET name = $1, phone = $2, first_name = $3, last_name = $4, bank_name = $5, account_number = $6
     WHERE id = $7`,
    [name, phone, firstName, lastName, bankName, accountNumber, id]
  );

  return NextResponse.redirect(new URL(buildRedirectPath(req, "msg=อัพเดทรายละเอียดข้อมูลผู้ใช้สำเร็จ"), req.url));
}
