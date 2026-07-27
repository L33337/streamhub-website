import Link from 'next/link';
import { hubLexFor } from '@/lib/i18n-hub';
import type { UiLang } from '@/lib/i18n-core';
import { AUTH_UI_VISIBLE, signInGateRedirect } from '@/lib/auth-flag';
import { GetAppLink } from '@/components/web/GetAppLink';

/** Shared look for both inline CTA links (cyan is the site-wide link colour). */
const CTA_LINK_CLASS =
  'text-accent-cyan underline decoration-accent-cyan/40 underline-offset-4 transition-colors hover:text-white hover:decoration-accent-cyan';

/**
 * Homepage masthead (rebuild round 2 — 2026-07-27): the claim plus a single
 * conversion line, nothing else. Dropped in this round: the date/kicker
 * overline, the live/soon ticker (the live count still heads the Live rail)
 * and the store badges (they live on in HomeEndCap, where the app pitch
 * belongs).
 *
 * The whole section is for SIGNED-OUT visitors only — page.tsx wraps it in
 * <SignedOutOnly>, since its only job is pointing at sign-in / the app.
 *
 * The app link routes per device (GetAppLink: iOS → App Store, Android →
 * Google Play, desktop + SSR → the /app landing page with QR + badges); the
 * sign-in link follows AUTH_UI_VISIBLE, so a build with the auth UI switched
 * off degrades to the app-only sentence instead of an inert "Log in".
 */
export function HomeMasthead({ locale = 'en' }: { locale?: UiLang }) {
  const L = hubLexFor(locale);

  // mb-6: the gap to whatever follows (section nav / first rail) belongs to
  // the masthead, not to the nav — otherwise signed-in visitors, for whom the
  // masthead is gone, would open the page on an empty strip.
  return (
    <section className="mb-6 border-b border-divider pb-6 pt-2">
      <h1 className="text-balance text-3xl font-bold tracking-tight text-white md:text-4xl">
        {L.hero.claim}
      </h1>
      <p className="mt-3 text-lg font-semibold text-white/70">
        {AUTH_UI_VISIBLE ? (
          <>
            <Link href={signInGateRedirect('/feed')} className={CTA_LINK_CLASS}>
              {L.hero.ctaLogin}
            </Link>
            {L.hero.ctaMid}
            <GetAppLink className={CTA_LINK_CLASS}>{L.hero.ctaApp}</GetAppLink>
            {L.hero.ctaTail}
          </>
        ) : (
          <>
            <GetAppLink className={CTA_LINK_CLASS}>{L.hero.ctaAppOnlyLink}</GetAppLink>
            {L.hero.ctaAppOnlyTail}
          </>
        )}
      </p>
    </section>
  );
}
