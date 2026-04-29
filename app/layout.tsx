import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Streamer Times - Your Livestream Guide for Twitch & YouTube",
  description:
    "Streamer Times: Your Livestream Guide. AI-powered predictions, EPG grid view, and real-time notifications for Twitch and YouTube streamers. Free for iOS and Android.",
  keywords: [
    "twitch schedule",
    "youtube live guide",
    "stream predictions",
    "live stream tv guide",
    "when is streamer live",
    "twitch tv guide",
    "streaming schedule app",
    "streamer times",
  ],
  authors: [{ name: "Streamer Times" }],
  metadataBase: new URL("https://streamertimes.tv"),
  openGraph: {
    title: "Streamer Times - Your Livestream Guide for Twitch & YouTube",
    description:
      "Streamer Times: Your Livestream Guide. AI-powered predictions, EPG grid view, and real-time notifications for Twitch and YouTube.",
    url: "https://streamertimes.tv",
    siteName: "Streamer Times",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Streamer Times - Your Livestream Guide",
    description:
      "AI-powered predictions for Twitch & YouTube. Never miss a stream.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Streamer Times",
              alternateName: "StreamerTimes",
              operatingSystem: "iOS, Android",
              applicationCategory: "EntertainmentApplication",
              applicationSubCategory: "LiveStreamingApplication",
              description:
                "Your Livestream Guide for Twitch & YouTube with AI-powered predictions.",
              url: "https://streamertimes.tv",
              screenshot: [
                "https://streamertimes.tv/screenshots/live-feed.jpg",
                "https://streamertimes.tv/screenshots/epg-grid.jpg",
                "https://streamertimes.tv/screenshots/multi-day.jpg",
                "https://streamertimes.tv/screenshots/predictions.jpg",
              ],
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
            }),
          }}
        />
      </head>
      <body className="min-h-screen bg-background">{children}</body>
    </html>
  );
}
