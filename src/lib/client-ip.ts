// Client IP for abuse throttling only (never for authorization decisions).
//
// - TRUST_PROXY=true: the app runs behind a reverse proxy / platform (Vercel, Nginx, Cloudflare) that
//   sets X-Forwarded-For. We take the first hop (the original client as reported by the proxy chain).
//   Only enable this when the proxy overwrites/sanitises the header, otherwise clients can spoof it.
// - Otherwise: X-Real-IP if present, else "unknown".
//
// Callers must treat "unknown" as "no per-IP signal": a shared "unknown" bucket would let one abuser
// throttle every user, so per-IP limits should be skipped (see isKnownIp) and other limits relied on.
const MAX_IP_LENGTH = 64;
const IP_PATTERN = /^[0-9a-fA-F:.]+$/;

function clean(value: string | null | undefined): string | null {
  if (!value) return null;
  let ip = value.trim();
  // Strip IPv6 brackets and a trailing :port on IPv4 ("1.2.3.4:5678").
  if (ip.startsWith("[")) ip = ip.slice(1, ip.indexOf("]") > 0 ? ip.indexOf("]") : undefined);
  else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.slice(0, ip.lastIndexOf(":"));
  if (!ip || ip.length > MAX_IP_LENGTH || !IP_PATTERN.test(ip)) return null;
  return ip.toLowerCase();
}

export function clientIp(request: Request): string {
  const headers = request.headers;
  if (process.env.TRUST_PROXY === "true") {
    const first = headers.get("x-forwarded-for")?.split(",")[0];
    const forwarded = clean(first);
    if (forwarded) return forwarded;
  }
  return clean(headers.get("x-real-ip")) ?? "unknown";
}

export const isKnownIp = (ip: string | null | undefined): ip is string => !!ip && ip !== "unknown";

/** True when the request targets the local machine (used to gate development-only behaviour). */
export function isLocalRequest(request: Request): boolean {
  let host: string;
  try { host = new URL(request.url).hostname; } catch { return false; }
  const header = request.headers.get("host")?.replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
  const local = (h: string | undefined) => !!h && ["localhost", "127.0.0.1", "::1"].includes(h.replace(/^\[|\]$/g, "").toLowerCase());
  return local(host) && (header === undefined || local(header));
}
