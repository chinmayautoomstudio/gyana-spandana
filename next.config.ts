import type { NextConfig } from "next";

function supabaseStorageRemotePattern():
  | { protocol: "https"; hostname: string; pathname: string }
  | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname;
    if (!hostname) return null;
    return {
      protocol: "https",
      hostname,
      pathname: "/storage/v1/object/public/**",
    };
  } catch {
    return null;
  }
}

/** Origins for CSP connect-src so browser Supabase client can reach custom or local URLs. */
function supabaseConnectSrcEntries(): string[] {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];
  try {
    const u = new URL(url);
    if (!u.hostname) return [];
    const hostPart = u.port ? `${u.hostname}:${u.port}` : u.hostname;
    if (u.protocol === "https:") {
      return [`https://${hostPart}`, `wss://${hostPart}`];
    }
    if (u.protocol === "http:") {
      return [`http://${hostPart}`, `ws://${hostPart}`];
    }
    return [];
  } catch {
    return [];
  }
}

const supabasePattern = supabaseStorageRemotePattern();
const supabaseConnectSrc = supabaseConnectSrcEntries();

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  serverExternalPackages: ["pdf-parse"],

  experimental: {
    inlineCss: true, // Inline critical CSS to eliminate render-blocking (Next.js 16)
    optimizePackageImports: [
      "recharts",
      "react-big-calendar",
      "@supabase/supabase-js",
    ],
    serverActions: {
      // SECURITY (VULN-15): Reduced from 20MB. Profile photos use the dedicated
      // /api/upload/profile-photo route instead, so 1MB is sufficient here.
      bodySizeLimit: 1 * 1024 * 1024, // 1MB
    },
  },

  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [70, 75, 85],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      ...(supabasePattern ? [supabasePattern] : []),
    ],
  },

  async headers() {
    return [
      // SECURITY (VULN-06): Apply critical security headers to all routes
      {
        source: "/(.*)",
        headers: [
          {
            // Prevent browsers from MIME-sniffing a response away from declared content-type
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            // Deny framing of this site to prevent clickjacking
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            // Force HTTPS for 1 year (only active over HTTPS)
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            // Limit referrer information sent to external sites
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            // Restrict access to sensitive browser APIs
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            // Content Security Policy — restrict sources for scripts, styles, images, etc.
            // 'unsafe-inline' is included for Next.js inline scripts/styles; tighten if possible.
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              [
                "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com",
                ...supabaseConnectSrc,
              ].join(" "),
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
      // Cache static image assets aggressively
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|gif)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
