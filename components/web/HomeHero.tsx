import Image from 'next/image';
import Link from 'next/link';

function todayLabel(): string {
  return new Date()
    .toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    .toUpperCase();
}

export function HomeHero() {
  const today = todayLabel();

  return (
    <section className="hero">
      {/* Decorative particles */}
      <span
        className="hero-particle"
        style={{
          left: '4%',
          top: '14%',
          width: 3,
          height: 3,
          background: '#00F0FF',
          boxShadow: '0 0 8px #00F0FF',
          animationDelay: '0s',
        }}
      />
      <span
        className="hero-particle"
        style={{
          left: '46%',
          top: '22%',
          width: 2,
          height: 2,
          background: '#FF00AA',
          boxShadow: '0 0 8px #FF00AA',
          animationDelay: '0.8s',
        }}
      />
      <span
        className="hero-particle"
        style={{
          left: '92%',
          top: '68%',
          width: 3,
          height: 3,
          background: '#9146FF',
          boxShadow: '0 0 8px #9146FF',
          animationDelay: '1.4s',
        }}
      />
      <span
        className="hero-particle"
        style={{
          left: '30%',
          top: '82%',
          width: 2,
          height: 2,
          background: '#fff',
          boxShadow: '0 0 6px #fff',
          animationDelay: '0.4s',
        }}
      />

      <div className="hero-top">
        <p className="hero-overline">
          <span className="iso">{today}</span>
          <span className="sep" />
          Live streamer guide
        </p>
      </div>

      <div className="hero-grid">
        <div>
          <div className="bracket-frame home-hero-bracket">
            <span className="home-hero-wordmark">StreamerTimes</span>
          </div>

          <span className="hero-launch-badge">
            <span className="label">New</span>
            Now live on iOS &amp; Android
          </span>

          <h1 className="hero-h1">
            The TV guide for <span className="key">streamers.</span>
          </h1>

          <p className="hero-sub">
            One feed for Twitch and YouTube. Real-time live status, AI-predicted
            next slots, and zero noise. Free, no account required —{' '}
            <Link href="/app" className="hero-link">
              get the app
            </Link>{' '}
            for live alerts.
          </p>

          <div className="hero-stores">
            <a
              href="https://apps.apple.com/app/id6760627630"
              target="_blank"
              rel="noopener noreferrer"
              className="store-badge"
              aria-label="Download on the App Store"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <span className="store-badge-stack">
                <span className="store-badge-sub">Download on the</span>
                <span className="store-badge-main">App Store</span>
              </span>
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.streamhub.tv.app"
              target="_blank"
              rel="noopener noreferrer"
              className="store-badge"
              aria-label="Get it on Google Play"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                <path d="M3.61 1.814 13.793 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734c0-.384.22-.72.61-.92zM14.5 12.707l2.55 2.55-8.37 4.78L14.5 12.707zM19.41 11.1l-2.2 1.26L14.5 12l2.71-.36 2.2-1.26c.5-.28.5-.72 0-1L17.21 8.12 14.5 12l2.71.36 2.2 1.26c.22.12.22.26 0 .38zM8.68 3.963l8.37 4.78L14.5 11.293 8.68 3.963z" />
              </svg>
              <span className="store-badge-stack">
                <span className="store-badge-sub">GET IT ON</span>
                <span className="store-badge-main">Google Play</span>
              </span>
            </a>
          </div>
        </div>

        <div className="hero-portrait">
          <figure className="hero-portrait-frame">
            <Image
              src="/hero-phone.webp"
              alt="A streamer browsing tonight's lineup on her phone"
              width={768}
              height={1152}
              priority
              unoptimized
            />
            <figcaption className="hero-portrait-cap">
              <span className="hpc-mono">02:14 · Berlin</span>
              <span className="hpc-sep" />
              <span>Checking tonight&rsquo;s lineup</span>
            </figcaption>
          </figure>
        </div>
      </div>

      <div className="stat-strip">
        <div className="stat-cell">
          <span className="stat-value">
            Twitch
            <span className="stat-amp">&amp;</span>
            YouTube
          </span>
          <span className="stat-label">Both platforms, one guide</span>
        </div>
        <div className="stat-cell">
          <span className="stat-value">
            Your favorites<span className="stat-plus">+</span>
          </span>
          <span className="stat-label">Add any channel in seconds</span>
        </div>
        <div className="stat-cell">
          <span className="stat-value">Public API</span>
          <span className="stat-label">Available now · free tier</span>
        </div>
      </div>
    </section>
  );
}
