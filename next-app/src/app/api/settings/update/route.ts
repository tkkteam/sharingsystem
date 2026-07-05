import { NextRequest, NextResponse } from "next/server";
import { buildRedirectPath } from "@/lib/redirect";
import { updateSettings } from "@/lib/data";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const monthlyAmount = parseInt(formData.get("monthly_amount") as string);
  const auctionStart = (formData.get("auction_start") as string) || null;
  const auctionDeadline = (formData.get("auction_deadline") as string) || null;
  const auctionActive = formData.get("auction_active") === "on";

  await updateSettings(monthlyAmount, auctionStart, auctionDeadline, auctionActive);
  return NextResponse.redirect(new URL(buildRedirectPath(req, "msg=บันทึกค่าตั้งค่าสำเร็จ"), req.url));
}
