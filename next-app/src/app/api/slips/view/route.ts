import { NextRequest, NextResponse } from "next/server";
import { getSlip } from "@/lib/data";
import { readSlip } from "@/lib/slip-storage";

export async function GET(req: NextRequest) {
  // Strict admin check
  const adminCookie = req.cookies.get("admin_auth");
  if (adminCookie?.value !== "true") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const memberId = parseInt(searchParams.get("member_id") || "0");
  const month = parseInt(searchParams.get("month") || "0");
  const year = parseInt(searchParams.get("year") || "0");

  if (!memberId || !month || !year) {
    return new NextResponse("Missing parameters", { status: 400 });
  }

  const slip = await getSlip(memberId, month, year);
  if (!slip) {
    return new NextResponse("Slip not found", { status: 404 });
  }

  const result = await readSlip(slip.file_name);
  if (!result) {
    return new NextResponse("File not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      "Content-Type": result.mime,
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}