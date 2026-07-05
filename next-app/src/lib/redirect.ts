import { NextRequest } from "next/server";

/**
 * Build a redirect URL preserving the current page context (admin vs public).
 * Uses the Referer header to determine where to send the user back.
 * Falls back to the provided defaultPath if Referer is missing/invalid.
 */
export function buildRedirectPath(
  req: NextRequest,
  queryPart: string,
  defaultPath: "/" | "/admin" = "/"
): string {
  const referer = req.headers.get("referer") || "";
  let basePath = defaultPath;

  if (referer) {
    try {
      const url = new URL(referer);
      // Preserve the path (/ or /admin) and the month/year/search query params
      const isAdmin = url.pathname.startsWith("/admin");
      basePath = isAdmin ? "/admin" : "/";
      const existingParams = url.searchParams;
      const month = existingParams.get("month");
      const year = existingParams.get("year");
      const search = existingParams.get("search");

      // Build new query: keep month/year/search, then append our new queryPart
      const newParams = new URLSearchParams();
      if (month) newParams.set("month", month);
      if (year) newParams.set("year", year);
      if (search) newParams.set("search", search);

      // Parse queryPart (e.g. "msg=xxx" or "member_id=1&error=yyy") and merge
      if (queryPart) {
        const incoming = new URLSearchParams(queryPart);
        incoming.forEach((value, key) => newParams.set(key, value));
      }

      const qs = newParams.toString();
      return qs ? `${basePath}?${qs}` : `${basePath}`;
    } catch {
      // ignore parse errors, fall through to default
    }
  }

  if (!queryPart) return basePath;
  const fallbackParams = new URLSearchParams(queryPart);
  return `${basePath}?${fallbackParams.toString()}`;
}