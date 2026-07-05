import { NextRequest, NextResponse } from "next/server";
import { computeIndexData } from "@/lib/data";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = parseInt(searchParams.get("month") || "0") || 0;
  const year = parseInt(searchParams.get("year") || "0") || 0;
  const search = searchParams.get("search") || "";
  const msg = searchParams.get("msg") || "";
  const error = searchParams.get("error") || "";

  const m = month || new Date().getMonth() + 1;
  const y = year || new Date().getFullYear();

  const data = await computeIndexData(m, y, search);

  const cookieStore = cookies();
  const adminCookie = cookieStore.get("admin_auth");
  data.IsAdmin = adminCookie?.value === "true";

  if (msg) data.AlertMsg = decodeURIComponent(msg);
  if (error) data.AlertErr = decodeURIComponent(error);

  return NextResponse.json(data);
}
