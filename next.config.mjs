/** @type {import('next').NextConfig} */

// Baseline security headers for every route. CSP is limited to frame-ancestors
// (clickjacking protection) so it cannot break scripts/styles.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // camera=(self) keeps same-origin barcode/IMEI scanning possible; no page uses mic or geolocation.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  poweredByHeader: false,
  distDir: process.env.PORTAL_E2E === "true" ? ".local/next-e2e" : ".next",
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Public tracking links carry a secret code in the URL; never leak it via Referer.
      { source: "/track/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
    ];
  },
  async redirects() {
    return [
      { source: "/sales", destination: "/pos", permanent: true },
      { source: "/stock", destination: "/inventory", permanent: true },
      { source: "/repair", destination: "/repairs", permanent: true },
    ];
  },
};

export default nextConfig;
