import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Frozen once at `next build` on the build machine, then inlined into the
  // bundle — gives the sitemap an honest, stable build timestamp for static
  // pages instead of a per-cold-start "now". See app/sitemap.ts.
  env: {
    BUILD_TIME: new Date().toISOString(),
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Twitch avatars
      { protocol: "https", hostname: "static-cdn.jtvnw.net" },
      // YouTube thumbnails
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "*.ytimg.com" },
      // YouTube channel avatars
      { protocol: "https", hostname: "yt3.googleusercontent.com" },
      { protocol: "https", hostname: "*.ggpht.com" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.streamertimes.tv" }],
        destination: "https://streamertimes.tv/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    // Content-Security-Policy is shipped Report-Only first: it does NOT block
    // anything, it only reports what a strict policy WOULD block (visible in the
    // browser console). Validate against the live site, then rename the header
    // to "Content-Security-Policy" to enforce. connect-src lists Supabase
    // (auth/data + realtime websocket) and the public Partner API; img-src the
    // Twitch/YouTube avatar/thumbnail CDNs from images.remotePatterns above.
    //
    // challenges.cloudflare.com must stay in script-src, frame-src AND
    // connect-src: Turnstile loads api.js, renders its widget in an iframe, and
    // talks back to Cloudflare. Missing frame-src is the silent one — the script
    // loads fine and the challenge simply never appears. Since the auth forms
    // only mint a token on submit, enforcing a CSP without these would break
    // sign-in/sign-up without a single visible error on any other page.
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      // Google Analytics (gtag.js) is served from googletagmanager.com; its
      // beacons post to google-analytics.com / *.analytics.google.com.
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://static-cdn.jtvnw.net https://i.ytimg.com https://*.ytimg.com https://yt3.googleusercontent.com https://*.ggpht.com https://www.googletagmanager.com https://www.google-analytics.com",
      "font-src 'self' data:",
      "connect-src 'self' https://ypebfgtxythamjwgvoci.supabase.co wss://ypebfgtxythamjwgvoci.supabase.co https://api.streamertimes.com https://www.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://challenges.cloudflare.com",
      "frame-src 'self' https://challenges.cloudflare.com",
      "upgrade-insecure-requests",
    ].join("; ");

    // Low-risk, high-value headers — enforced immediately (HSTS is added by
    // Vercel for the custom domain, so it is intentionally not duplicated here).
    const securityHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
      },
      { key: "Content-Security-Policy-Report-Only", value: csp },
    ];

    return [
      {
        // Build artifacts (fonts, JS, CSS, statically-imported media). These are
        // render resources, never search results. noindex keeps them out of the
        // Google index while still allowing Googlebot to fetch them for page
        // rendering. Fixes GSC "Crawled - currently not indexed" for
        // /_next/static/*.woff2 (and the same class of JS/CSS chunks).
        source: "/_next/static/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
      {
        // Security headers on every route.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
