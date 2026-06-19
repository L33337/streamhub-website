import type { Metadata } from "next";
import {
  Brain,
  Monitor,
  LayoutGrid,
  Zap,
  Heart,
  Search,
  ChevronDown,
  Sparkles,
  Bell,
  Shield,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { AppQrCode } from "@/components/web/AppQrCode";
import { GetAppLink } from "@/components/web/GetAppLink";

export const metadata: Metadata = {
  title:
    "Download Streamer Times — Free Twitch & YouTube Stream Guide App | iOS & Android",
  description:
    "Download Streamer Times free for iOS and Android. AI-powered live predictions, EPG grid view, and instant go-live alerts for your favorite Twitch and YouTube streamers.",
  alternates: { canonical: "https://streamertimes.tv/app" },
  openGraph: {
    title: "Download Streamer Times — Free Livestream Guide App",
    description:
      "AI-powered Twitch & YouTube stream predictions and go-live alerts. Free on iOS & Android.",
    url: "https://streamertimes.tv/app",
    siteName: "Streamer Times",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Download Streamer Times",
    description:
      "AI-powered Twitch & YouTube stream predictions. Free on iOS & Android.",
  },
};

const FEATURES = [
  {
    icon: Brain,
    title: "AI Predictions",
    description:
      "Know when streamers will go live before they do. Our AI analyzes streaming patterns to predict schedules.",
    accent: "cyan" as const,
  },
  {
    icon: Monitor,
    title: "Twitch & YouTube",
    description:
      "Track streamers across both platforms in one unified app. Cross-platform detection built in.",
    accent: "purple" as const,
  },
  {
    icon: LayoutGrid,
    title: "EPG Grid View",
    description:
      "See your streamers' schedules at a glance — side by side, just like a traditional TV guide. Plan your day around their slots.",
    accent: "cyan" as const,
  },
  {
    icon: Zap,
    title: "Real-Time Updates",
    description:
      "Know the moment your favorite streamer goes live. Instant notifications — no more manual checking.",
    accent: "green" as const,
  },
  {
    icon: Heart,
    title: "Personalized Favorites",
    description:
      "Follow your favorite streamers and filter your view. Favorites sync across all your sessions.",
    accent: "pink" as const,
  },
  {
    icon: Search,
    title: "Streamer Discovery",
    description:
      "Search and add any streamer. Auto-detects cross-platform creators who stream on both Twitch and YouTube.",
    accent: "cyan" as const,
  },
];

const ACCENT_TEXT = {
  cyan: "text-accent-cyan",
  pink: "text-accent-pink",
  green: "text-live",
  purple: "text-accent-purple",
} as const;

// The four things you can ONLY do in the app. The first two are the exact
// actions that most often redirect people here (add a streamer, save a favorite).
const APP_ONLY = [
  { icon: Search, title: "Add any streamer", desc: "Track any Twitch or YouTube creator.", accent: "cyan" as const },
  { icon: Heart, title: "Save favorites", desc: "Build your personal guide, synced.", accent: "pink" as const },
  { icon: Bell, title: "Go-live alerts", desc: "Get notified the instant they're live.", accent: "green" as const },
  { icon: Sparkles, title: "AI predictions", desc: "Know when they'll stream next.", accent: "purple" as const },
];

// Context-aware banner shown when we know why the visitor was sent here
// (via ?from= on the redirecting link). Class strings are static lookups so
// Tailwind can see them — do NOT interpolate token names into class strings.
const BANNER_CLASS = {
  cyan: "border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan",
  pink: "border-accent-pink/40 bg-accent-pink/10 text-accent-pink",
  green: "border-live/40 bg-live/10 text-live",
} as const;

const INTENT_BANNERS = {
  add: { icon: Search, text: "Want to add a streamer? That's in the app →", accent: "cyan" as const },
  favorite: { icon: Heart, text: "Saving a favorite? Do it in the app →", accent: "pink" as const },
  alerts: { icon: Bell, text: "Want go-live alerts? Turn them on in the app →", accent: "green" as const },
};

const FLOATING_ICONS = [
  { emoji: "🎮", x: "8%", y: "15%", size: 22, bg: "bg-accent-cyan/10", border: "border-accent-cyan/30", anim: "animate-float", delay: "0s", live: false },
  { emoji: "🎥", x: "85%", y: "20%", size: 18, bg: "bg-accent-pink/10", border: "border-accent-pink/30", anim: "animate-float-slow", delay: "0.5s", live: true },
  { emoji: "🎵", x: "90%", y: "55%", size: 16, bg: "bg-accent-pink/10", border: "border-accent-pink/30", anim: "animate-float-reverse", delay: "1s", live: false },
  { emoji: "🎙️", x: "5%", y: "50%", size: 20, bg: "bg-accent-cyan/10", border: "border-accent-cyan/30", anim: "animate-float-slow", delay: "0.8s", live: false },
  { emoji: "📻", x: "15%", y: "80%", size: 16, bg: "bg-accent-pink/10", border: "border-accent-pink/30", anim: "animate-float", delay: "1.2s", live: true },
  { emoji: "📺", x: "78%", y: "78%", size: 20, bg: "bg-accent-purple/10", border: "border-accent-purple/30", anim: "animate-float-reverse", delay: "0.3s", live: false },
  { emoji: "🌍", x: "25%", y: "25%", size: 14, bg: "bg-accent-cyan/10", border: "border-accent-cyan/30", anim: "animate-float-reverse", delay: "1.5s", live: false },
  { emoji: "⭐", x: "70%", y: "12%", size: 14, bg: "bg-live/10", border: "border-live/30", anim: "animate-float", delay: "0.7s", live: true },
];

const PARTICLES = [
  { x: "20%", y: "30%", size: 3, color: "bg-accent-cyan", delay: "0s" },
  { x: "60%", y: "18%", size: 2, color: "bg-accent-pink", delay: "1s" },
  { x: "75%", y: "65%", size: 3, color: "bg-accent-cyan", delay: "0.5s" },
  { x: "35%", y: "70%", size: 2, color: "bg-text-primary", delay: "1.5s" },
  { x: "12%", y: "65%", size: 3, color: "bg-accent-cyan", delay: "0.8s" },
  { x: "88%", y: "30%", size: 2, color: "bg-accent-purple", delay: "1.2s" },
];

const ACCENT_STYLES = {
  cyan: {
    glow: "group-hover:shadow-[0_0_20px_rgba(0,240,255,0.15)]",
    icon: "text-accent-cyan",
  },
  green: {
    glow: "group-hover:shadow-[0_0_20px_rgba(0,255,136,0.15)]",
    icon: "text-live",
  },
  pink: {
    glow: "group-hover:shadow-[0_0_20px_rgba(255,0,170,0.15)]",
    icon: "text-accent-pink",
  },
  purple: {
    glow: "group-hover:shadow-[0_0_20px_rgba(145,70,255,0.15)]",
    icon: "text-accent-purple",
  },
};

const SCREENSHOTS = [
  {
    src: "/screenshots/live-feed.webp",
    alt: "Streamer Times Live Feed showing currently live streamers",
    label: "Live Feed",
  },
  {
    src: "/screenshots/predictions.webp",
    alt: "Streamer detail page with AI predictions",
    label: "AI Predictions",
  },
  {
    src: "/screenshots/epg-grid.webp",
    alt: "EPG Grid View with AI-predicted stream schedules",
    label: "EPG Grid View",
  },
  {
    src: "/screenshots/multi-day.webp",
    alt: "Multi-day schedule view with multiple streamers",
    label: "Multi-Day Schedule",
  },
];

const FAQ_ITEMS = [
  {
    question: "Is Streamer Times really free?",
    answer:
      "Yes! Streamer Times is completely free to use. All core features — AI predictions, live notifications, EPG grid view — are included at no cost.",
  },
  {
    question: "How accurate are the AI predictions?",
    answer:
      "Our AI analyzes each streamer's past broadcasting patterns to predict future streams. Accuracy depends on how consistently a streamer keeps their schedule — regular streamers see high prediction accuracy.",
  },
  {
    question: "Do I need an account?",
    answer:
      "No account required to get started. Streamer Times works right away with anonymous access. You can optionally create an account to sync your favorites across devices.",
  },
  {
    question: "Which streamers can I track?",
    answer:
      "Any streamer on Twitch or YouTube! Just search for their name and add them to your guide. Streamer Times automatically detects if they stream on both platforms.",
  },
  {
    question: "Does it work on both iOS and Android?",
    answer:
      "Yes, Streamer Times is available as a native app on both iOS (App Store) and Android (Google Play).",
  },
];

function buildFaqJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  accent,
}: (typeof FEATURES)[number]) {
  const styles = ACCENT_STYLES[accent];

  return (
    <div
      className={`group relative rounded-xl border border-border-default bg-background-elevated p-6 transition-all duration-200 hover:border-border-accent/40 ${styles.glow}`}
    >
      <div
        className={`mb-4 inline-flex rounded-lg bg-background-highlight p-3 ${styles.icon}`}
      >
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-text-primary">{title}</h3>
      <p className="text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
    </div>
  );
}

function StoreBadges() {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      <a
        href="https://apps.apple.com/app/id6760627630"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-[52px] items-center gap-3 rounded-xl border border-border-default bg-background-elevated px-5 transition-all duration-200 hover:border-border-accent/40 hover:shadow-[0_0_15px_rgba(0,240,255,0.15)]"
        aria-label="Download on the App Store"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7 fill-text-primary">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
        <div className="flex flex-col">
          <span className="text-[10px] leading-tight text-text-secondary">
            Download on the
          </span>
          <span className="text-base font-semibold leading-tight text-text-primary">
            App Store
          </span>
        </div>
      </a>

      <a
        href="https://play.google.com/store/apps/details?id=com.streamhub.tv.app"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-[52px] items-center gap-3 rounded-xl border border-border-default bg-background-elevated px-5 transition-all duration-200 hover:border-border-accent/40 hover:shadow-[0_0_15px_rgba(0,240,255,0.15)]"
        aria-label="Get it on Google Play"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-text-primary">
          <path d="M3.61 1.814L13.793 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734c0-.384.22-.72.61-.92zM14.5 12.707l2.55 2.55-8.37 4.78L14.5 12.707zM19.41 11.1l-2.2 1.26L14.5 12l2.71-.36 2.2-1.26c.5-.28.5-.72 0-1L17.21 8.12 14.5 12l2.71.36 2.2 1.26c.22.12.22.26 0 .38zM8.68 3.963l8.37 4.78L14.5 11.293 8.68 3.963z" />
        </svg>
        <div className="flex flex-col">
          <span className="text-[10px] leading-tight text-text-secondary">
            GET IT ON
          </span>
          <span className="text-base font-semibold leading-tight text-text-primary">
            Google Play
          </span>
        </div>
      </a>
    </div>
  );
}

function PhoneMockup({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="relative mx-auto overflow-hidden rounded-[2.5rem] border-[3px] border-border-default/60 bg-background-elevated shadow-[0_0_40px_rgba(0,240,255,0.08)]">
        <div className="absolute top-0 left-1/2 z-10 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-background-elevated" />
        <Image
          src={src}
          alt={alt}
          width={280}
          height={607}
          className="block w-full"
          priority
        />
      </div>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group border-b border-divider">
      <summary className="flex cursor-pointer items-center justify-between py-5 text-left text-text-primary transition-colors hover:text-accent-cyan">
        <span className="pr-4 font-medium">{question}</span>
        <ChevronDown
          size={18}
          className="shrink-0 text-text-muted transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      <p className="pb-5 text-sm leading-relaxed text-text-secondary">
        {answer}
      </p>
    </details>
  );
}

export default async function AppPromoPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const intent =
    from && from in INTENT_BANNERS
      ? INTENT_BANNERS[from as keyof typeof INTENT_BANNERS]
      : null;

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildFaqJsonLd()),
        }}
      />

      {/* Hero Section */}
      <section className="relative flex min-h-screen items-center overflow-hidden px-6 pt-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-surface to-background" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-cyan/5 blur-[120px]" />

        {FLOATING_ICONS.map((item, i) => {
          const badgeSize = item.size * 2.4;
          return (
            <div
              key={i}
              className={`pointer-events-none absolute hidden lg:flex items-center justify-center rounded-full border ${item.border} ${item.bg} ${item.anim}`}
              style={{
                left: item.x,
                top: item.y,
                width: badgeSize,
                height: badgeSize,
                animationDelay: item.delay,
                fontSize: item.size,
                lineHeight: 1,
              }}
            >
              <span role="img">{item.emoji}</span>
              {item.live && (
                <span
                  className={`animate-pulse-glow absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-sm px-1 py-px text-[7px] font-bold uppercase leading-none text-white ${
                    item.border.includes("pink")
                      ? "bg-accent-pink"
                      : item.border.includes("live")
                        ? "bg-live"
                        : "bg-accent-cyan"
                  }`}
                >
                  LIVE
                </span>
              )}
            </div>
          );
        })}

        {PARTICLES.map((p, i) => (
          <div
            key={`p-${i}`}
            className={`pointer-events-none absolute rounded-full ${p.color} animate-twinkle`}
            style={{
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
              boxShadow: `0 0 ${p.size * 3}px currentColor`,
            }}
          />
        ))}

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            {intent && (
              <div
                className={`mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${BANNER_CLASS[intent.accent]}`}
              >
                <intent.icon size={15} />
                {intent.text}
              </div>
            )}

            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-cyan">
              Get the app to add streamers &amp; save favorites
            </p>

            <div className="bracket-frame relative inline-block px-5 py-4 sm:px-8 sm:py-6">
              <div className="bracket-frame-inner absolute inset-0" />
              <h1 className="glow-text-white text-4xl font-bold tracking-tight text-text-primary sm:text-7xl">
                StreamerTimes
              </h1>
            </div>

            <p className="mx-auto mt-6 mb-8 max-w-xl text-lg font-medium text-text-secondary sm:text-xl lg:mx-0">
              Add any Twitch or YouTube streamer, save your favorites, and get
              go-live alerts &mdash; all in the free app.
            </p>

            <div className="mb-8 rounded-2xl border border-border-default bg-background-elevated/60 p-4 sm:p-5">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                Only in the app
              </p>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {APP_ONLY.map(({ icon: Icon, title, desc, accent }) => (
                  <li key={title} className="flex items-start gap-3 text-left">
                    <span
                      className={`inline-flex shrink-0 rounded-lg bg-background-highlight p-2 ${ACCENT_TEXT[accent]}`}
                    >
                      <Icon size={18} strokeWidth={1.5} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-text-primary">
                        {title}
                      </span>
                      <span className="block text-xs leading-snug text-text-secondary">
                        {desc}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-6 flex items-center justify-center gap-2 lg:justify-start">
              <Shield size={14} className="text-live" />
              <span className="text-sm text-text-secondary">
                Free &middot; No account required
              </span>
            </div>

            <div className="flex flex-col items-center gap-4 lg:items-start">
              <GetAppLink className="inline-flex h-[52px] items-center justify-center gap-2 rounded-xl bg-accent-cyan px-7 text-base font-semibold text-background shadow-[0_0_28px_-6px_rgba(0,240,255,0.7)] transition-colors hover:bg-[#4dfaff]">
                Get the free app
              </GetAppLink>
              <StoreBadges />
            </div>

            <AppQrCode className="mt-6 hidden items-center gap-4 lg:flex" />
          </div>

          <div className="hidden lg:flex justify-center">
            <PhoneMockup
              src="/screenshots/live-feed.webp"
              alt="Streamer Times Live Feed"
              className="w-[280px]"
            />
          </div>

          <div className="flex justify-center lg:hidden">
            <PhoneMockup
              src="/screenshots/live-feed.webp"
              alt="Streamer Times Live Feed"
              className="w-[220px]"
            />
          </div>
        </div>
      </section>

      <section id="features" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center text-3xl font-bold text-text-primary sm:text-4xl">
            Everything you need.{" "}
            <span className="gradient-text">Nothing you don&apos;t.</span>
          </h2>
          <p className="mx-auto mb-16 max-w-2xl text-center text-text-secondary">
            Streamer Times combines schedule tracking, AI predictions, and real-time
            notifications into one beautiful interface.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <section id="screenshots" className="border-t border-divider px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center text-3xl font-bold text-text-primary sm:text-4xl">
            See it in{" "}
            <span className="gradient-text-pink">action</span>
          </h2>
          <p className="mx-auto mb-16 max-w-2xl text-center text-text-secondary">
            A TV guide designed for the streaming era. Track live streams,
            browse schedules, and get AI-powered predictions — all in one app.
          </p>

          <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4">
            {SCREENSHOTS.map((screenshot) => (
              <div key={screenshot.label} className="text-center">
                <div className="relative mx-auto overflow-hidden rounded-[1.5rem] border-[2px] border-border-default/50 bg-background-elevated shadow-[0_0_25px_rgba(0,240,255,0.06)] transition-all duration-300 hover:border-accent-cyan/30 hover:shadow-[0_0_30px_rgba(0,240,255,0.12)]">
                  <Image
                    src={screenshot.src}
                    alt={screenshot.alt}
                    width={280}
                    height={607}
                    className="block w-full"
                  />
                </div>
                <p className="mt-3 text-sm font-medium text-text-secondary">
                  {screenshot.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-divider px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-16 text-center text-3xl font-bold text-text-primary sm:text-4xl">
            How it <span className="text-accent-cyan glow-text">works</span>
          </h2>

          <div className="grid gap-12 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Add Streamers",
                desc: "Search for your favorite Twitch and YouTube creators and add them to your personal guide.",
              },
              {
                step: "2",
                title: "Get Predictions",
                desc: "Our AI analyzes streaming patterns and predicts when each streamer will go live next.",
              },
              {
                step: "3",
                title: "Never Miss a Stream",
                desc: "Get notified the instant your favorites go live. Plan your day around their schedule.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="glow-cyan mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-accent-cyan/30 bg-background-elevated font-mono text-xl font-bold text-accent-cyan">
                  {item.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-text-primary">
                  {item.title}
                </h3>
                <p className="text-sm text-text-secondary">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-divider px-6 py-16">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-8">
          <div className="flex items-center gap-3 rounded-xl border border-border-default bg-background-elevated px-5 py-3">
            <div className="h-3 w-3 rounded-full bg-twitch shadow-[0_0_8px_rgba(145,70,255,0.5)]" />
            <span className="text-sm font-medium text-text-secondary">
              Works with <span className="text-twitch-fg">Twitch</span>
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border-default bg-background-elevated px-5 py-3">
            <div className="h-3 w-3 rounded-full bg-youtube shadow-[0_0_8px_rgba(255,0,51,0.5)]" />
            <span className="text-sm font-medium text-text-secondary">
              Works with <span className="text-youtube-fg">YouTube</span>
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border-default bg-background-elevated px-5 py-3">
            <Shield size={16} className="text-live" />
            <span className="text-sm font-medium text-text-secondary">
              No tracking
            </span>
          </div>
        </div>
      </section>

      <section className="border-t border-divider px-6 py-24">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-text-primary sm:text-4xl">
            Frequently asked{" "}
            <span className="gradient-text">questions</span>
          </h2>
          <div className="rounded-xl border border-border-default bg-background-elevated p-6">
            {FAQ_ITEMS.map((item) => (
              <FAQItem key={item.question} {...item} />
            ))}
          </div>
        </div>
      </section>

      <section id="download" className="border-t border-divider px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="glow-text mb-4 text-3xl font-bold text-accent-cyan sm:text-4xl">
            Download Streamer Times
          </h2>
          <p className="mb-10 text-text-secondary">
            Free on iOS and Android. No account required to get started.
          </p>
          <StoreBadges />
        </div>
      </section>

      <footer className="border-t border-divider px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-between">
            <div>
              <span className="glow-text-white text-lg font-bold text-text-primary">
                StreamerTimes
              </span>
              <p className="mt-1 text-sm text-text-muted">
                Your Livestream Guide.
              </p>
            </div>

            <nav className="flex gap-6 text-sm">
              <Link
                href="/privacy-policy"
                className="text-text-secondary transition-colors hover:text-accent-cyan"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms-of-service"
                className="text-text-secondary transition-colors hover:text-accent-cyan"
              >
                Terms of Service
              </Link>
              <Link
                href="/support"
                className="text-text-secondary transition-colors hover:text-accent-cyan"
              >
                Support
              </Link>
              <Link
                href="/impressum"
                className="text-text-secondary transition-colors hover:text-accent-cyan"
              >
                Impressum
              </Link>
            </nav>
          </div>

          <div className="mt-8 border-t border-divider pt-8 text-center text-sm text-text-muted">
            &copy; {new Date().getFullYear()} Streamer Times. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
