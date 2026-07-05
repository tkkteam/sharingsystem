import { NextRequest, NextResponse } from "next/server";
import { submitBid } from "@/lib/data";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const memberId = parseInt(data.member_id as string);
    const month = parseInt(data.month as string);
    const year = parseInt(data.year as string);
    const amount = parseInt(data.amount as string);
    const pin = data.pin as string;

    if (!memberId || !month || !year || !amount || !pin) {
      return NextResponse.json({ success: false, error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
    }

    await submitBid(memberId, month, year, amount, pin);
    return NextResponse.json({ success: true, message: "เสนอราคาประมูลสำเร็จ" });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("PIN") || msg.includes("รหัส")) {
      return NextResponse.json({ success: false, error: "ใส่รหัสไม่ถูกต้อง ติดต่อ admin เพื่อขอรหัส" });
    }
    return NextResponse.json({ success: false, error: msg });
  }
}
