import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { SearchBar } from "@/components/web/SearchBar";
import { MobileHeaderMenu } from "@/components/web/MobileHeaderMenu";
import { HeaderUserMenu } from "@/components/web/HeaderUserMenu";
import { AUTH_ENABLED } from "@/lib/auth-flag";
import { Providers } from "@/components/web/Providers";
import { FloatingGetAppButton } from "@/components/web/FloatingGetAppButton";
import { SiteFooter } from "@/components/web/SiteFooter";

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
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
};

// This layout must stay synchronous and free of request-scoped APIs
// (`cookies()`, `headers()`, per-user data). Reading them here opts the
// ENTIRE route tree into dynamic rendering and silently disables ISR for
// every page. Auth + favorites hydrate client-side inside <Providers>.
export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
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
                "https://streamertimes.tv/screenshots/live-feed.webp",
                "https://streamertimes.tv/screenshots/epg-grid.webp",
                "https://streamertimes.tv/screenshots/multi-day.webp",
                "https://streamertimes.tv/screenshots/predictions.webp",
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
      <body className="min-h-screen bg-background">
        <Providers>
          <header className="sticky top-0 z-50 border-b border-divider bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="container mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 md:gap-4">
              <Link
                href="/"
                className="shrink-0 text-base font-bold text-white md:text-xl"
              >
                StreamerTimes
              </Link>
              <SearchBar className="ml-auto w-full max-w-md" />
              <Link
                href="/games"
                className="hidden h-9 items-center rounded-lg border border-border-default bg-background-elevated px-3 text-sm font-semibold text-text-secondary transition-colors hover:border-accent-cyan/40 hover:text-text-primary md:inline-flex"
              >
                Games
              </Link>
              <Link
                href="/app"
                className="hidden h-9 items-center rounded-lg border border-accent-cyan/40 bg-accent-cyan/10 px-3 text-sm font-semibold text-accent-cyan hover:bg-accent-cyan/20 transition-colors md:inline-flex"
              >
                Get the App
              </Link>
              {/* Static-safe: AUTH_ENABLED is a build-time constant, and
                  HeaderUserMenu reads auth state client-side via useAuth(). */}
              {AUTH_ENABLED && <HeaderUserMenu />}
              <div className="ml-auto md:hidden">
                <MobileHeaderMenu />
              </div>
            </div>
          </header>
          {children}
          {modal}
          <SiteFooter />
          <FloatingGetAppButton />
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
