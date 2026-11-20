/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  poweredByHeader: false,
  distDir: process.env.PORTAL_E2E === "true" ? ".local/next-e2e" : ".next",
  webpack: (config) => {
    config.resolve.plugins = config.resolve.plugins || [];
    config.resolve.plugins.push({
      apply: (resolver) => {
        const target = resolver.ensureHook("resolve");
        resolver.getHook("resolve").tapAsync("CrossDriveWorktreePlugin", (request, resolveContext, callback) => {
          if (request.request && /^\.[\\/][A-Za-z]:[\\/]/.test(request.request)) {
            const fixedPath = request.request.replace(/^\.[\\/]/, "");
            const obj = { ...request, request: fixedPath };
            return resolver.doResolve(target, obj, null, resolveContext, callback);
          }
          callback();
        });
      },
    });
    return config;
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/api/portal/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
    ];
  },
};

export default nextConfig;
