import Image from 'next/image';
import Link from 'next/link';
import { hubLexFor } from '@/lib/i18n-hub';
import type { UiLang } from '@/lib/i18n-core';
import { AUTH_UI_VISIBLE, signInGateRedirect } from '@/lib/auth-flag';
import { GetAppLink } from '@/components/web/GetAppLink';
import { sizedAvatarUrl } from '@/lib/format/image-size';

/**
 * Shared box metrics of both CTAs — equal split on a phone, natural width from
 * `sm` up. Only the skin (filled vs outlined) differs per button.
 *
 * The 1px border on BOTH is load-bearing: `flex-basis: 0` resolves against the
 * border box, so if only the outlined button carried a ring it would end up
 * 2px wider than the filled one once the free space is shared out. The colour
 * is set per skin, never here — two colour utilities on one element are
 * resolved by stylesheet order, not by class order, and a `border-transparent`
 * in the base silently wins over the caller's `border-accent-cyan`.
 */
const CTA_BASE_CLASS =
  'flex min-h-11 flex-1 items-center justify-center text-balance break-words rounded-lg border px-2.5 py-2 text-center text-[13px] font-bold leading-tight sm:flex-none sm:px-5 sm:py-2.5 sm:text-sm md:min-h-0';

/**
 * Conversion interrupt card (E2, homepage rebuild 2026-07-27): placed after
 * the first two content sections, once the value has been experienced —
 * "this page, but with only your streamers". Avatar stack comes from the
 * popular-streamers fetch. The sign-in CTA follows AUTH_UI_VISIBLE.
 *
 * CTA layout (UX round 2026-07-31) — three states instead of the former
 * "stacked everywhere but desktop":
 *
 *   phone (<640px)        sm+ (row, auto width)     md+ (side column)
 *   ┌──────┬──────┐       ┌──────┐┌─────────┐       … copy …  ┌────────┐
 *   │ app  │ web  │       │ app  ││   web   │                 │  app   │
 *   └──────┴──────┘       └──────┘└─────────┘                 ├────────┤
 *                                                             │  web   │
 *                                                             └────────┘
 *
 * On a phone the two buttons split the card width evenly (flex-1) and shrink
 * their type/padding so the longest localized labels — "Zaloguj się w
 * przeglądarce" (pl), "Завантажити застосунок" (uk) — still fit a 320px
 * screen; they wrap to two lines there and the row's default stretch keeps
 * both boxes the same height. min-h-11 holds the 44px touch target even when
 * a label stays on one line. With AUTH_UI_VISIBLE off there is only one
 * button, which then spans the full width — the intended look for a lone CTA.
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
      className="mt-10 rounded-2xl border border-accent-cyan/40 bg-gradient-to-br from-accent-cyan/10 via-transparent to-accent-pink/10 p-5 shadow-[0_0_24px_rgba(0,240,255,0.08)] sm:p-6"
    >
      <div className="flex flex-col items-start gap-5 md:flex-row md:items-center">
        {avatars.length > 0 && (
          <div className="flex shrink-0" aria-hidden="true">
            {avatars.map((url, index) => (
              <Image
                key={url}
                src={sizedAvatarUrl(url, 40)}
                // Deliberately empty: the wrapper is aria-hidden, this stack is
                // pure decoration for the headline next to it.
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
        <div className="flex w-full shrink-0 gap-2 sm:w-auto md:flex-col">
          <GetAppLink
            className={`${CTA_BASE_CLASS} border-transparent bg-accent-cyan text-background transition-opacity hover:opacity-90`}
          >
            {L.homeFeed.interrupt.appCta}
          </GetAppLink>
          {AUTH_UI_VISIBLE && (
            <Link
              href={signInGateRedirect('/feed')}
              className={`${CTA_BASE_CLASS} border-accent-cyan text-accent-cyan transition-colors hover:bg-accent-cyan/10`}
            >
              {L.homeFeed.interrupt.loginCta}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
