import Image from 'next/image';
import Link from 'next/link';
import { hubLexFor } from '@/lib/i18n-hub';
import type { UiLang } from '@/lib/i18n-core';
import { AUTH_UI_VISIBLE, signInGateRedirect } from '@/lib/auth-flag';
import { GetAppLink } from '@/components/web/GetAppLink';

/**
 * Conversion interrupt card (E2, homepage rebuild 2026-07-27): placed after
 * the first two content sections, once the value has been experienced —
 * "this page, but with only your streamers". Avatar stack comes from the
 * popular-streamers fetch. The sign-in CTA follows AUTH_UI_VISIBLE.
 */
export function HomeInterruptCard({
  avatarUrls,
  locale = 'en',
}: {
  avatarUrls: string[];
  locale?: UiLang;
}) {
  const L = hubLexFor(locale);
  const avatars = avatarUrls.slice(0, 3);

  return (
    <section
      aria-label={L.homeFeed.interrupt.title}
      className="mt-10 rounded-2xl border border-accent-cyan/40 bg-gradient-to-br from-accent-cyan/10 via-transparent to-accent-pink/10 p-6 shadow-[0_0_24px_rgba(0,240,255,0.08)]"
    >
      <div className="flex flex-col items-start gap-5 md:flex-row md:items-center">
        {avatars.length > 0 && (
          <div className="flex shrink-0" aria-hidden="true">
            {avatars.map((url, index) => (
              <Image
                key={url}
                src={url}
                alt=""
                width={40}
                height={40}
                unoptimized
                className={`h-10 w-10 rounded-full border-2 border-accent-pink object-cover shadow-[0_0_8px_rgba(255,0,170,0.4)] ${index > 0 ? '-ml-2.5' : ''}`}
              />
            ))}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-white">{L.homeFeed.interrupt.title}</h2>
          <p className="mt-1 max-w-xl text-sm text-text-secondary">
            {L.homeFeed.interrupt.body}
          </p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-text-muted">
            {L.homeFeed.interrupt.note}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <GetAppLink className="rounded-lg bg-accent-cyan px-5 py-2.5 text-center text-sm font-bold text-background transition-opacity hover:opacity-90">
            {L.homeFeed.interrupt.appCta}
          </GetAppLink>
          {AUTH_UI_VISIBLE && (
            <Link
              href={signInGateRedirect('/feed')}
              className="rounded-lg border border-accent-cyan px-5 py-2.5 text-center text-sm font-bold text-accent-cyan transition-colors hover:bg-accent-cyan/10"
            >
              {L.homeFeed.interrupt.loginCta}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
