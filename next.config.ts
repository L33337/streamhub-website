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
    ];
  },
};

export default nextConfig;
