import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "../globals.css";
import { SearchBar } from "@/components/web/SearchBar";
import { MobileHeaderMenu } from "@/components/web/MobileHeaderMenu";
import { HeaderUserMenu } from "@/components/web/HeaderUserMenu";
import { AUTH_ENABLED } from "@/lib/auth-flag";
import { jsonLdHtml } from "@/lib/seo";
import { Providers } from "@/components/web/Providers";
import { FloatingGetAppButton } from "@/components/web/FloatingGetAppButton";
import { SiteFooter } from "@/components/web/SiteFooter";
import { LocaleSuggestionBanner } from "@/components/web/LocaleSuggestionBanner";
import { UI_LANGS, isUiLang, localeHref, type UiLang } from "@/lib/i18n-core";
import { chromeLexFor } from "@/lib/i18n-chrome";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  // Mono is only rendered by the home page promo blocks, /developers and
  // /app — not by the high-traffic streamer/schedule pages. preload: false
  // drops the 29 KB woff2 preload from every page's critical window (it
  // competed with the render-blocking CSS); pages that use the family still
  // load it on demand (display: swap). Do NOT remove the font entirely:
  // globals.css maps --font-mono to it inside `font:` shorthands, which
  // become invalid wholesale if the variable is undefined.
  preload: false,
});

// GA4 Measurement ID (format "G-XXXXXXXXXX"). Public + build-time inlined via
// the NEXT_PUBLIC_ prefix, so referencing it here keeps the layout static.
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID;

export const metadata: Metadata = {
  title: "Streamer Times - Your Livestream Guide for Twitch & YouTube",
  description:
    "Streamer Times: Your Livestream Guide. AI-powered predictions, EPG grid view, and real-time notifications for Twitch and YouTube streamers. Free for iOS and Android.",
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

// M22: the locale segment is part of the static cache key — every UI language
// is prebuilt. Unprefixed URLs are rewritten to /en by middleware.ts.
export function generateStaticParams() {
  return UI_LANGS.map((locale) => ({ locale }));
}

// K1 rule (updated for M22): this layout must stay free of REQUEST-SCOPED
// APIs (`cookies()`, `headers()`, per-user data) — reading them here opts the
// ENTIRE route tree into dynamic rendering and silently disables ISR for
// every page. Awaiting `params` is fine: route params are part of the static
// cache key, not request state. Auth + favorites hydrate client-side inside
// <Providers>.
export default async function RootLayout({
  children,
  modal,
  params,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale: rawLocale } = await params;
  // Middleware rewrites unknown first segments into the /en tree, so an
  // unknown locale here means a direct hit that bypassed it — 404.
  if (!isUiLang(rawLocale)) notFound();
  const locale: UiLang = rawLocale;
  const chrome = chromeLexFor(locale);

  const navLinkClass =
    "hidden h-9 items-center rounded-lg border border-border-default bg-background-elevated px-3 text-sm font-semibold text-text-secondary transition-colors hover:border-accent-cyan/40 hover:text-text-primary md:inline-flex";

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdHtml({
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
                href={localeHref(locale, "/")}
                className="shrink-0 text-base font-bold text-white md:text-xl"
              >
                StreamerTimes
              </Link>
              <SearchBar
                className="ml-auto w-full max-w-md"
                locale={locale}
                placeholder={chrome.nav.searchPlaceholder}
                resultsLabel={chrome.nav.searchResults}
              />
              <Link href={localeHref(locale, "/live")} className={navLinkClass}>
                {chrome.nav.live}
              </Link>
              <Link href={localeHref(locale, "/games")} className={navLinkClass}>
                {chrome.nav.games}
              </Link>
              <Link href={localeHref(locale, "/rankings")} className={navLinkClass}>
                {chrome.nav.rankings}
              </Link>
              <Link
                href={localeHref(locale, "/app")}
                className="hidden h-9 items-center rounded-lg border border-accent-cyan/40 bg-accent-cyan/10 px-3 text-sm font-semibold text-accent-cyan hover:bg-accent-cyan/20 transition-colors md:inline-flex"
              >
                {chrome.nav.getApp}
              </Link>
              {/* Static-safe: AUTH_ENABLED is a build-time constant, and
                  HeaderUserMenu reads auth state client-side via useAuth(). */}
              {AUTH_ENABLED && <HeaderUserMenu />}
              <div className="ml-auto md:hidden">
                <MobileHeaderMenu locale={locale} strings={chrome.nav} />
              </div>
            </div>
          </header>
          <LocaleSuggestionBanner pageLocale={locale} />
          {children}
          {modal}
          <SiteFooter locale={locale} />
          <FloatingGetAppButton />
        </Providers>
        <Analytics />
        <SpeedInsights />
        {/* Google Analytics 4 — gated on the build-time NEXT_PUBLIC_GA_ID env
            var (static-safe, inlined at `next build`). Renders nothing when the
            var is unset, so local/preview builds without the ID stay clean.
            <GoogleAnalytics> uses next/script (afterInteractive) + a route-change
            listener for SPA pageviews; it never reads request-scoped APIs, so
            the K1 static-rendering rule is preserved. */}
        {GA_MEASUREMENT_ID && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}
      </body>
    </html>
  );
}
