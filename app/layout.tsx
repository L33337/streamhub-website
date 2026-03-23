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
  title: "StreamHub - Your TV Guide for Twitch & YouTube Live Streams",
  description:
    "Never miss a live stream. AI-powered predictions, EPG grid view, and real-time notifications for Twitch and YouTube streamers. Free for iOS and Android.",
  keywords: [
    "twitch schedule",
    "youtube live guide",
    "stream predictions",
    "live stream tv guide",
    "when is streamer live",
    "twitch tv guide",
    "streaming schedule app",
  ],
  authors: [{ name: "StreamHub" }],
  metadataBase: new URL("https://streamhub.sh"),
  openGraph: {
    title: "StreamHub - Your TV Guide for Twitch & YouTube Live Streams",
    description:
      "Never miss a live stream. AI-powered predictions, EPG grid view, and real-time notifications for Twitch and YouTube.",
    url: "https://streamhub.sh",
    siteName: "StreamHub",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "StreamHub - TV Guide for Live Streams",
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
              name: "StreamHub",
              operatingSystem: "iOS, Android",
              applicationCategory: "EntertainmentApplication",
              description:
                "Your TV guide for Twitch & YouTube live streams with AI-powered predictions.",
              url: "https://streamhub.sh",
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
