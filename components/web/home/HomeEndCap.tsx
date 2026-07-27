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
 */
export function HomeEndCap({ locale = 'en' }: { locale?: UiLang }) {
  const L = hubLexFor(locale);

  return (
    <section
      aria-label={L.homeFeed.endcap.title}
      className="mt-14 rounded-2xl border border-border-default bg-[radial-gradient(120%_160%_at_85%_20%,rgba(145,70,255,0.16),transparent_55%)] bg-background-elevated p-6 md:p-8"
    >
      <div className="flex flex-col items-center gap-8 md:flex-row">
        <div className="w-32 shrink-0 md:w-36">
          <Image
            src={heroPhone}
            alt={L.hero.phoneAlt}
            sizes="(max-width: 768px) 128px, 144px"
            placeholder="blur"
            className="rounded-2xl"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-white">{L.homeFeed.endcap.title}</h2>
          <ul className="mt-3 grid gap-1.5 text-sm text-text-secondary">
            {L.homeFeed.endcap.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-2">
                <span aria-hidden="true" className="text-accent-cyan">
                  ▸
                </span>
                {bullet}
              </li>
            ))}
          </ul>
          <StoreBadges locale={locale} className="mt-4" />
          {AUTH_UI_VISIBLE && (
            <p className="mt-4 border-t border-divider pt-3 text-sm text-text-secondary">
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
        <div className="hidden shrink-0 lg:block">
          <AppQrCode className="flex max-w-44 flex-col items-center gap-2 text-center" />
        </div>
      </div>
    </section>
  );
}
