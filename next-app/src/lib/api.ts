import type { IndexData } from "./types";

export async function fetchIndexData(params: {
  month?: number;
  year?: number;
  search?: string;
  msg?: string;
  error?: string;
  member_id?: string;
}): Promise<IndexData> {
  const qs = new URLSearchParams();
  if (params.month) qs.set("month", String(params.month));
  if (params.year) qs.set("year", String(params.year));
  if (params.search) qs.set("search", params.search);
  if (params.msg) qs.set("msg", params.msg);
  if (params.error) qs.set("error", params.error);
  if (params.member_id) qs.set("member_id", params.member_id);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const url = `${baseUrl}/api/data?${qs.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }
  return res.json();
}

export const API_BASE = "";
