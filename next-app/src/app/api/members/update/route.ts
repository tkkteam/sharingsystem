import { NextRequest, NextResponse } from "next/server";
import { updateMember } from "@/lib/data";
import { buildRedirectPath } from "@/lib/redirect";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const id = parseInt(formData.get("id") as string);
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const bidPassword = formData.get("bid_password") as string;
  const hasReceivedShare = formData.get("has_received_share") === "on";
  const interestAmount = parseInt(formData.get("interest_amount") as string) || 0;
  const receivedMonth = parseInt(formData.get("received_month") as string) || 0;
  const receivedYear = parseInt(formData.get("received_year") as string) || 0;

  // Extra fields
  const firstName = formData.get("first_name") as string || "";
  const lastName = formData.get("last_name") as string || "";
  const bankName = formData.get("bank_name") as string || "";
  const accountNumber = formData.get("account_number") as string || "";

  await updateMember(
    id, name, phone, bidPassword, 
    hasReceivedShare, interestAmount, receivedMonth, receivedYear,
    firstName, lastName, bankName, accountNumber
  );
  return NextResponse.redirect(new URL(buildRedirectPath(req, "msg=แก้ไขข้อมูลสมาชิกสำเร็จ"), req.url));
}
