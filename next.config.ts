import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: lets the dev server serve its JS chunks/HMR socket when opened
  // from a phone on the same Wi-Fi via the machine's LAN IP (e.g. testing the
  // PWA install flow on a real device). Set ALLOWED_DEV_ORIGINS in .env.local;
  // without it, Next.js 16 silently blocks those requests.
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean),
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ];
  },
  images: {
    // Local placeholder illustrations are hand-authored SVGs (no user-supplied
    // SVG uploads ever pass through here), so the usual SVG/XSS risk doesn't apply.
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
