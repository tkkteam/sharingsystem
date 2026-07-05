import { NextRequest, NextResponse } from "next/server";
import { getSlip } from "@/lib/data";
import path from "path";
import fs from "fs/promises";

const UPLOAD_DIR = path.join(process.cwd(), "data", "slips");

const MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

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

  const filePath = path.join(UPLOAD_DIR, slip.file_name);
  try {
    const data = await fs.readFile(filePath);
    const ext = slip.file_name.split(".").pop()?.toLowerCase() || "jpg";
    const mime = MIME_MAP[ext] || "image/jpeg";
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch {
    return new NextResponse("File not found", { status: 404 });
  }
}