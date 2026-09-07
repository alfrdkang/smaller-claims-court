/** Branding for the letterhead and the landing page. Set it to your event's name. */
export const COURT_NAME =
  process.env.NEXT_PUBLIC_COURT_NAME || "Petty Disputes Division";

/**
 * Absolute origin for share links and QR codes.
 *
 * Prefers an explicit NEXT_PUBLIC_BASE_URL, then Vercel's deployment URL, then
 * the forwarded headers of the request in hand.
 */
export function baseUrl(req?: Request): string {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  if (req) {
    const headers = req.headers;
    const host = headers.get("x-forwarded-host") || headers.get("host");
    if (host) {
      const proto =
        headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
      return `${proto}://${host}`;
    }
  }

  return "http://localhost:3000";
}

export function caseUrl(id: string, req?: Request): string {
  return `${baseUrl(req)}/case/${id}`;
}

/** "PC-2026-0001-ada-v-grace.pdf" */
export function orderFilename(caseNumber: string, plaintiff: string, defendant: string): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "party";
  return `${caseNumber}-${slug(plaintiff)}-v-${slug(defendant)}.pdf`;
}
