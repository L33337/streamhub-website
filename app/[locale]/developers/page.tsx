import type { Metadata } from 'next';
import Link from 'next/link';
import { WaitlistForm } from './components/WaitlistForm';

export const metadata: Metadata = {
  title: 'Partner API — Coming Soon | Streamer Times',
  description:
    'Public access to the Streamer Times Partner API is opening soon. Join the waitlist for early invites and launch updates.',
  alternates: { canonical: '/developers' },
  openGraph: {
    title: 'Streamer Times Partner API — Coming Soon',
    description:
      'Join the waitlist for early access to live streamer schedules and AI predictions.',
    url: 'https://streamertimes.tv/developers',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

const SUPPORT_EMAIL = 'streamertimes@icloud.com';

export default function DevelopersPage() {
  return (
    <main className="min-h-screen bg-background text-text-primary">
      <TopBar />

      <div className="mx-auto max-w-3xl px-4 md:px-8 py-16 lg:py-24 space-y-16">
        <Hero />
        <FeatureTease />
        <WaitlistSection />
        <SupportNote />
      </div>
    </main>
  );
}

function TopBar() {
  return (
    <header className="border-b border-border-default bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-12 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="font-semibold text-lg text-white hover:opacity-80 transition-opacity"
        >
          StreamerTimes
        </Link>
        <span className="font-mono uppercase text-xs tracking-wider text-accent-cyan">
          Developers
        </span>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="text-center">
      <p className="font-mono uppercase text-xs tracking-wider text-accent-cyan mb-3">
        Partner API · Coming Soon
      </p>
      <h1 className="text-4xl md:text-5xl font-semibold mb-4">
        Build with the same data that powers Streamer Times.
      </h1>
      <p className="text-lg text-text-secondary leading-relaxed">
        Public access to the Streamer Times Partner API is opening soon — live
        schedules and AI predictions for Twitch and YouTube via a single REST
        endpoint. We&apos;re onboarding pilot partners now. Drop your email to
        get an invite the moment public access opens.
      </p>
    </section>
  );
}

const TEASE_FEATURES = [
  {
    title: 'Live status & schedules',
    body: 'Real-time live/offline state, viewer counts, and confirmed upcoming streams across Twitch and YouTube.',
  },
  {
    title: 'AI predictions',
    body: 'Forecasted next streams with confidence levels and reasoning — the same model that powers the app.',
  },
  {
    title: 'Realtime webhooks',
    body: 'Push notifications for went-live events. No polling, no scraping. (Phase 2.)',
  },
];

function FeatureTease() {
  return (
    <section className="grid md:grid-cols-3 gap-4">
      {TEASE_FEATURES.map((f) => (
        <div
          key={f.title}
          className="rounded-lg border border-border-default p-5 bg-background-elevated/40"
        >
          <h3 className="text-base font-semibold text-text-primary mb-2">
            {f.title}
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">{f.body}</p>
        </div>
      ))}
    </section>
  );
}

function WaitlistSection() {
  return (
    <section id="waitlist" className="scroll-mt-24">
      <h2 className="text-2xl font-semibold mb-2">Join the waitlist</h2>
      <p className="text-text-secondary mb-6">
        Free tier on launch. Early signups get the first invites and a heads-up
        on tier pricing before it&apos;s public.
      </p>
      <WaitlistForm />
    </section>
  );
}

function SupportNote() {
  return (
    <section className="border-t border-border-default pt-8 text-sm text-text-muted">
      <p>
        Already in active conversation with us about a pilot integration? Reach
        us directly at{' '}
        <a
          className="text-accent-cyan underline font-mono"
          href={`mailto:${SUPPORT_EMAIL}`}
        >
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </section>
  );
}
