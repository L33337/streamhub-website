import {
  Brain,
  Monitor,
  LayoutGrid,
  Zap,
  Heart,
  Search,
  ChevronDown,
  Gamepad2,
  Camera,
  Music,
  Mic,
  Radio,
  Tv,
  Globe,
  Star,
  Film,
  Headphones,
} from "lucide-react";
import Link from "next/link";

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
      "A classic TV guide layout. See multiple streamers side by side, just like a traditional program guide.",
    accent: "cyan" as const,
  },
  {
    icon: Zap,
    title: "Real-Time Updates",
    description:
      "Instant live status via Twitch EventSub and YouTube WebSub webhooks. Know the moment a stream starts.",
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

const FLOATING_ICONS = [
  { icon: Gamepad2, x: "8%", y: "15%", size: 22, color: "text-accent-cyan", bg: "bg-accent-cyan/10", border: "border-accent-cyan/30", anim: "animate-float", delay: "0s" },
  { icon: Camera, x: "85%", y: "20%", size: 18, color: "text-accent-pink", bg: "bg-accent-pink/10", border: "border-accent-pink/30", anim: "animate-float-slow", delay: "0.5s" },
  { icon: Music, x: "90%", y: "55%", size: 16, color: "text-accent-pink", bg: "bg-accent-pink/10", border: "border-accent-pink/30", anim: "animate-float-reverse", delay: "1s" },
  { icon: Mic, x: "5%", y: "50%", size: 20, color: "text-accent-cyan", bg: "bg-accent-cyan/10", border: "border-accent-cyan/30", anim: "animate-float-slow", delay: "0.8s" },
  { icon: Radio, x: "15%", y: "80%", size: 16, color: "text-accent-pink", bg: "bg-accent-pink/10", border: "border-accent-pink/30", anim: "animate-float", delay: "1.2s" },
  { icon: Tv, x: "78%", y: "78%", size: 20, color: "text-accent-purple", bg: "bg-accent-purple/10", border: "border-accent-purple/30", anim: "animate-float-reverse", delay: "0.3s" },
  { icon: Globe, x: "25%", y: "25%", size: 14, color: "text-accent-cyan", bg: "bg-accent-cyan/10", border: "border-accent-cyan/30", anim: "animate-float-reverse", delay: "1.5s" },
  { icon: Star, x: "70%", y: "12%", size: 14, color: "text-live", bg: "bg-live/10", border: "border-live/30", anim: "animate-float", delay: "0.7s" },
  { icon: Film, x: "92%", y: "40%", size: 16, color: "text-accent-purple", bg: "bg-accent-purple/10", border: "border-accent-purple/30", anim: "animate-float-slow", delay: "1.8s" },
  { icon: Headphones, x: "3%", y: "35%", size: 16, color: "text-accent-purple", bg: "bg-accent-purple/10", border: "border-accent-purple/30", anim: "animate-float", delay: "2s" },
];

const PARTICLES = [
  { x: "20%", y: "30%", size: 3, color: "bg-accent-cyan", delay: "0s" },
  { x: "60%", y: "18%", size: 2, color: "bg-accent-pink", delay: "1s" },
  { x: "75%", y: "65%", size: 3, color: "bg-accent-cyan", delay: "0.5s" },
  { x: "35%", y: "70%", size: 2, color: "bg-text-primary", delay: "1.5s" },
  { x: "50%", y: "85%", size: 2, color: "bg-accent-pink", delay: "2s" },
  { x: "12%", y: "65%", size: 3, color: "bg-accent-cyan", delay: "0.8s" },
  { x: "88%", y: "30%", size: 2, color: "bg-accent-purple", delay: "1.2s" },
  { x: "45%", y: "10%", size: 2, color: "bg-text-primary", delay: "0.3s" },
  { x: "30%", y: "45%", size: 2, color: "bg-accent-pink", delay: "1.8s" },
  { x: "65%", y: "50%", size: 3, color: "bg-accent-cyan", delay: "0.6s" },
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
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <a
        href="#"
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
        href="#"
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

export default function Home() {
  return (
    <main>
      {/* Hero Section — Splash Screen Style */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
        {/* Background gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-surface to-background" />
        {/* Radial glow behind title */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-cyan/5 blur-[120px]" />

        {/* Floating Icons (Circular Badges) */}
        {FLOATING_ICONS.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={i}
              className={`pointer-events-none absolute hidden sm:flex items-center justify-center rounded-full border ${item.border} ${item.bg} ${item.anim}`}
              style={{
                left: item.x,
                top: item.y,
                width: item.size * 2.4,
                height: item.size * 2.4,
                animationDelay: item.delay,
              }}
            >
              <Icon size={item.size} strokeWidth={1.5} className={`${item.color} opacity-70`} />
            </div>
          );
        })}

        {/* Particles / Glowing Dots */}
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

        {/* Center content with bracket frame */}
        <div className="relative z-10 max-w-3xl">
          {/* Bracket Frame */}
          <div className="bracket-frame relative inline-block px-8 py-6">
            <div className="bracket-frame-inner absolute inset-0" />
            <h1 className="glow-text-white text-5xl font-bold tracking-tight text-text-primary sm:text-7xl">
              StreamHub
            </h1>
          </div>

          <p className="mt-6 mb-2 text-xl font-medium text-text-secondary sm:text-2xl">
            Your TV Guide for Live Streams
          </p>

          <p className="mx-auto mb-10 max-w-lg text-base text-text-muted">
            AI-powered predictions. Real-time notifications. Twitch &amp; YouTube
            in one app. Never miss a stream again.
          </p>

          <StoreBadges />

          <a
            href="#features"
            className="mt-16 inline-block animate-bounce text-text-muted"
            aria-label="Scroll to features"
          >
            <ChevronDown size={28} strokeWidth={1.5} />
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center text-3xl font-bold text-text-primary sm:text-4xl">
            Everything you need.{" "}
            <span className="gradient-text">Nothing you don&apos;t.</span>
          </h2>
          <p className="mx-auto mb-16 max-w-2xl text-center text-text-secondary">
            StreamHub combines schedule tracking, AI predictions, and real-time
            notifications into one beautiful interface.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-divider px-6 py-24">
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
                desc: "Real-time webhooks notify you the instant your favorites go live. Plan your day around their schedule.",
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

      {/* Platform Section */}
      <section className="border-t border-divider px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-8 flex items-center justify-center gap-8">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-twitch shadow-[0_0_8px_rgba(145,70,255,0.5)]" />
              <span className="text-sm font-semibold tracking-wider uppercase text-twitch">
                Twitch
              </span>
            </div>
            <span className="text-text-muted">+</span>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-youtube shadow-[0_0_8px_rgba(255,0,51,0.5)]" />
              <span className="text-sm font-semibold tracking-wider uppercase text-youtube">
                YouTube
              </span>
            </div>
          </div>

          <h2 className="mb-4 text-3xl font-bold text-text-primary sm:text-4xl">
            Two platforms.{" "}
            <span className="gradient-text-pink">One guide.</span>
          </h2>
          <p className="text-text-secondary">
            StreamHub automatically detects streamers who broadcast on both
            platforms and merges their schedules into a single view.
          </p>
        </div>
      </section>

      {/* Download CTA */}
      <section className="border-t border-divider px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="glow-text mb-4 text-3xl font-bold text-accent-cyan sm:text-4xl">
            Download StreamHub
          </h2>
          <p className="mb-10 text-text-secondary">
            Free on iOS and Android. No account required to get started.
          </p>
          <StoreBadges />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-divider px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-between">
            <div>
              <span className="glow-text-white text-lg font-bold text-text-primary">
                StreamHub
              </span>
              <p className="mt-1 text-sm text-text-muted">
                Your TV guide for live streams.
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
            </nav>
          </div>

          <div className="mt-8 border-t border-divider pt-8 text-center text-sm text-text-muted">
            &copy; {new Date().getFullYear()} StreamHub. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
