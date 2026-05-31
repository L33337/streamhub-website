import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
};

export default nextConfig;
