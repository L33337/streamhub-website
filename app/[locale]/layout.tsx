import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ConsentGatedAnalytics } from "@/components/web/ConsentGatedAnalytics";
import { ConsentBanner } from "@/components/web/ConsentBanner";
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

  // `whitespace-nowrap` because the pills are a fixed 36px tall: once the row
  // is even 1px over, flex shrinks these items and a two-word label ("En
  // directo") wraps to a second line that overflows the pill instead of the
  // row simply staying tight.
  const navLinkClass =
    "hidden h-9 items-center whitespace-nowrap rounded-lg border border-border-default bg-background-elevated px-3 text-sm font-semibold text-text-secondary transition-colors hover:border-accent-cyan/40 hover:text-text-primary md:inline-flex";

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <head>
        {/* Google Consent Mode v2 default — set BEFORE any gtag command so
            analytics_storage starts denied. gtag.js itself is not loaded until
            the visitor grants consent (see ConsentGatedAnalytics), so this
            only matters as the correct baseline the granted-update flips. Ad
            signals stay denied: the site runs no ads. Rendered inline in the
            static <head> (CSP allows 'unsafe-inline' script), gated on GA. */}
        {GA_MEASUREMENT_ID && (
          <script
            dangerouslySetInnerHTML={{
              __html:
                "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});",
            }}
          />
        )}
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
            {/* The height is PINNED, not derived from the content (it used to
                be `py-2.5` around the tallest child): --header-height in
                globals.css hard-codes 57/65px, and every sticky sub-nav on the
                site offsets against it. h-14/lg:h-16 reproduces exactly what
                the padding produced — 36px controls below `lg`, the 44px
                search input from `lg` — but now a taller child overflows
                visibly instead of silently desynchronising every sub-nav.

                gap-2 below `sm`: every item in the phone row is shrink-0, so
                the gaps are the only width left to give — without this the row
                runs past the viewport wherever the locale spells sign-in out
                ("Iniciar sesión", "Bejelentkezés"). */}
            <div className="container mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:gap-3 md:gap-4 lg:h-16">
              <Link
                href={localeHref(locale, "/")}
                // text-sm below `sm`: brand, search icon, sign-in button and
                // hamburger are ALL shrink-0 on a phone (the search stopped
                // being the flexible item when it became an icon), so the row
                // has no give left. 15px of brand plus the tighter gaps below
                // is what keeps "Bejelentkezés" (hu) inside a 360px screen.
                className="shrink-0 text-sm font-bold text-white sm:text-base md:text-xl"
              >
                StreamerTimes
              </Link>
              <SearchBar
                // Below `lg` this renders as a 36px icon that opens a panel
                // under the header (see SearchBar's `collapsible`): from `md`
                // up the four nav links join the row, and an inline field was
                // down to 48px on an iPad in portrait — present, unusable.
                //
                // `min-w-0` from `lg` up so the field is what yields width in
                // the header row: it is the only flexible item there, and
                // without it its intrinsic minimum pushed the hamburger
                // off-screen. The collapsed classes must NOT apply below `lg`,
                // where the wrapper is a fixed panel — a `w-full` there would
                // over-constrain it against inset-x.
                className="lg:ml-auto lg:w-full lg:min-w-0 lg:max-w-md"
                collapsible
                locale={locale}
                placeholder={chrome.nav.searchPlaceholder}
                resultsLabel={chrome.nav.searchResults}
                openLabel={chrome.nav.openSearch}
                closeLabel={chrome.nav.closeSearch}
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
              {/* From `lg`, not `md`: it is the widest label in the row
                  ("Descarga la app" is 134px) and on a tablet it was the item
                  that pushed the nav past the viewport. The floating Get-App
                  button covers the same intent on every page below `lg`. */}
              <Link
                href={localeHref(locale, "/app")}
                className="hidden h-9 items-center whitespace-nowrap rounded-lg border border-accent-cyan/40 bg-accent-cyan/10 px-3 text-sm font-semibold text-accent-cyan hover:bg-accent-cyan/20 transition-colors lg:inline-flex"
              >
                {chrome.nav.getApp}
              </Link>
              {/* Static-safe: AUTH_ENABLED is a build-time constant, and
                  HeaderUserMenu reads auth state client-side via useAuth(). */}
              {AUTH_ENABLED && (
                <HeaderUserMenu locale={locale} signInLabel={chrome.nav.signIn} />
              )}
              {/* No `ml-auto` of its own above 360px: the search button
                  already carries one, and TWO auto margins in a flex row split
                  the free space between them — which is what pushed the
                  hamburger to the far edge and left the search icon and the
                  sign-in button stranded mid-row. With one auto margin all
                  three controls sit together against the right edge.
                  Below 360px the search button steps out (see SearchBar) and
                  takes the auto margin with it — the sign-in button carries it
                  there instead (HeaderUserMenu). */}
              <div className="md:hidden">
                <MobileHeaderMenu locale={locale} strings={chrome.nav} />
              </div>
            </div>
          </header>
          <LocaleSuggestionBanner pageLocale={locale} />
          {children}
          {modal}
          <SiteFooter locale={locale} />
          <FloatingGetAppButton locale={locale} label={chrome.nav.getApp} />
        </Providers>
        <Analytics />
        <SpeedInsights />
        {/* Google Analytics 4 — gated on the build-time NEXT_PUBLIC_GA_ID env
            var (static-safe, inlined at `next build`) AND on the visitor's
            consent: ConsentGatedAnalytics injects gtag.js only after "Accept",
            so nothing loads for undecided or opted-out visitors (TTDSG opt-in).
            Both components read state client-side; the K1 static-rendering rule
            is preserved. Vercel Analytics/Speed Insights above are cookieless
            and need no consent. */}
        {GA_MEASUREMENT_ID && (
          <>
            <ConsentGatedAnalytics gaId={GA_MEASUREMENT_ID} />
            <ConsentBanner locale={locale} />
          </>
        )}
      </body>
    </html>
  );
}
