import Image from 'next/image';
import Link from 'next/link';
import heroPhone from '@/public/hero-phone.webp';
import { hubLexFor } from '@/lib/i18n-hub';
import type { UiLang } from '@/lib/i18n-core';
import { AUTH_UI_VISIBLE, signInGateRedirect } from '@/lib/auth-flag';
import { AppQrCode } from '@/components/web/AppQrCode';
import { StoreBadges } from './StoreBadges';

/**
 * App end-cap (E3, homepage rebuild 2026-07-27): the former hero's phone
 * screenshot, QR code and store badges move to the page end, where they pitch
 * concrete features (push, widget, sync) to a visitor who has just scrolled
 * the whole feed. Below-the-fold → the image stays lazy (no priority).
 *
 * Layout (UX round 2026-07-31) — a 2-column grid instead of the old
 * stack-then-row flex, because the photo has to sit BESIDE the copy on phones
 * and tablets too, not only from `md` up:
 *
 *   phone            sm+              lg+
 *   ┌────┬───────┐   ┌────┬───────┐   ┌────┬───────┬────┐
 *   │img │ copy  │   │img │ copy  │   │img │ copy  │ QR │
 *   ├────┴───────┤   │    ├───────┤   │    ├───────┤    │
 *   │    CTA     │   │    │  CTA  │   │    │  CTA  │    │
 *   └────────────┘   └────┴───────┘   └────┴───────┴────┘
 *
 * The CTA block (store badges + web line) is the only cell that moves: on a
 * phone it spans the full width so the two badges fit side by side, from `sm`
 * up it slots back under the copy while the image stretches across both rows.
 * Everything renders once — no duplicated links for a screen reader to walk.
 */
export function HomeEndCap({ locale = 'en' }: { locale?: UiLang }) {
  const L = hubLexFor(locale);

  return (
    <section
      aria-label={L.homeFeed.endcap.title}
      className="endcap-sheen mt-12 rounded-2xl p-3 min-[380px]:p-4 sm:p-6 md:mt-14 md:p-8"
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-5 sm:gap-x-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-x-8">
        {/* The photo takes the height of whatever sits next to it (the copy on a
            phone, copy + CTA from `sm` up) and crops to fit. It is positioned
            ABSOLUTE inside its cell on purpose: a normal <img> would contribute
            its own 2:3 intrinsic height to the grid row and push a gap of dead
            card under the bullets on mid-size screens. min-h-32 is the floor for
            short translations. */}
        <div className="relative col-start-1 row-start-1 min-h-32 w-[clamp(80px,23vw,112px)] self-stretch sm:row-span-2 sm:w-28 md:w-36">
          <Image
            src={heroPhone}
            alt={L.hero.phoneAlt}
            sizes="(max-width: 768px) 112px, 144px"
            placeholder="blur"
            className="absolute inset-0 h-full w-full rounded-2xl object-cover"
          />
        </div>

        <div className="col-start-2 row-start-1 min-w-0">
          <h2 className="text-balance text-base font-bold text-white sm:text-lg md:text-xl">
            {L.homeFeed.endcap.title}
          </h2>
          <ul className="mt-2 grid gap-1.5 text-[13px] leading-snug text-text-secondary sm:mt-3 sm:text-sm sm:leading-normal">
            {L.homeFeed.endcap.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-2">
                <span aria-hidden="true" className="text-accent-cyan">
                  ▸
                </span>
                {bullet}
              </li>
            ))}
          </ul>
        </div>

        <div className="col-span-2 col-start-1 row-start-2 min-w-0 sm:col-span-1 sm:col-start-2">
          <StoreBadges locale={locale} />
          {AUTH_UI_VISIBLE && (
            <p className="mt-4 border-t border-divider pt-3 text-[13px] text-text-secondary sm:text-sm">
              {L.homeFeed.endcap.webLead}{' '}
              <Link
                href={signInGateRedirect('/feed')}
                className="font-semibold text-accent-cyan hover:underline"
              >
                {L.homeFeed.endcap.webLink}
              </Link>{' '}
              {L.homeFeed.endcap.webTail}
            </p>
          )}
        </div>

        <div className="hidden lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:flex lg:items-center">
          <AppQrCode
            className="flex max-w-44 flex-col items-center gap-2 text-center"
            title={L.home.qrTitle}
            heading={L.home.qrHeading}
            hint={L.home.qrHint}
          />
        </div>
      </div>
    </section>
  );
}
