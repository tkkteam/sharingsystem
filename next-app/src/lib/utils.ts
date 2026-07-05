export const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

export function formatMoney(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return "0";
  const s = Math.round(amount).toString();
  if (s.length <= 3) return s;
  const result: string[] = [];
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) result.push(",");
    result.push(s[i]);
  }
  return result.join("");
}

export function parseThaiDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  // If it's a local ISO string (e.g. "2026-07-04T22:30") and doesn't contain a timezone offset, append +07:00
  if (dateStr.includes("T") && !dateStr.includes("+") && !dateStr.endsWith("Z")) {
    return new Date(dateStr + "+07:00");
  }
  return new Date(dateStr);
}

export function formatThaiTime(t: string | null | undefined): string {
  if (!t) return "";
  try {
    const d = parseThaiDate(t);
    if (!d || isNaN(d.getTime())) return "";

    // Format in Asia/Bangkok timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(d);
    const partMap = new Map(parts.map(p => [p.type, p.value]));
    
    const day = partMap.get("day");
    const month = partMap.get("month");
    const year = partMap.get("year");
    const hour = partMap.get("hour");
    const minute = partMap.get("minute");
    
    return `${day}/${month}/${year} ${hour}:${minute}`;
  } catch {
    return "";
  }
}

export function getThaiDate(): Date {
  const d = new Date();
  // Adjust to Asia/Bangkok (UTC+7)
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  return new Date(utc + 3600000 * 7);
}

export function getCurrentMonth(): number {
  return getThaiDate().getMonth() + 1;
}

export function getCurrentYear(): number {
  return getThaiDate().getFullYear();
}

