import Image from 'next/image';
import Link from 'next/link';
import {
  getPartnerApi,
  PartnerApiError,
  type PublicStreamer,
} from '@/lib/server/partner-api';
import { getLiveStreamerIdSet } from '@/lib/server/live-streamers';
import { localeHref, resolveUiLang } from '@/lib/i18n-core';
import { uiLexFor } from '@/lib/i18n-ui';
import { InitialsAvatar } from './InitialsAvatar';

const MAX_RELATED = 8;
const MIN_BEFORE_FALLBACK = 4;

interface Props {
  currentId: string;
  /** Streamer's broadcaster language (BCP-47, e.g. "en", "de"); may be null.
   *  Drives the RELATION QUERY (same-language streamers) — content semantics,
   *  NOT the viewer locale. */
  language: string | null;
  // M22 (D6): heading/aria + link locale follow the viewer's locale; defaults
  // to the streamer's language for pre-M22 call sites.
  uiLanguage?: string | null;
}

type Settled<T> = { ok: true; value: T } | { ok: false; error: unknown };

/**
 * Wraps a promise so it never rejects. Lets us fire requests eagerly (for
 * concurrency) whose results may go unused — a plain floating promise that
 * rejects would crash the process as an unhandled rejection.
 */
function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
  return promise.then(
    (value) => ({ ok: true as const, value }),
    (error) => ({ ok: false as const, error }),
  );
}

/**
 * "Related streamers" block on each streamer detail page. Its purpose is SEO
 * internal linking: it gives every streamer page 6–8 crawlable links to other
 * streamer pages, so none of them is an orphan reachable only via the sitemap.
 * Empty-schedule pages benefit most — this is often their only outbound link to
 * sibling content.
 *
 * Relation basis with the current Partner API: same broadcaster language
 * (a reasonable "fans of X also watch" proxy), falling back to overall popular
 * streamers when the language is unknown or yields too few matches. A
 * game/category-based relation would be better but the list endpoint has no
 * category filter — left as a future enhancement.
 *
 * Async server component. Degrades to null on any Partner API error so it can
 * never break the host page.
 */
export async function RelatedStreamers({ currentId, language, uiLanguage }: Props) {
  const ui = uiLanguage ?? language;
  const api = getPartnerApi();
  const related: PublicStreamer[] = [];
  const seen = new Set<string>([currentId]);

  const take = (list: PublicStreamer[]) => {
    for (const s of list) {
      if (seen.has(s.id)) continue;
      related.push(s);
      seen.add(s.id);
      if (related.length >= MAX_RELATED) break;
    }
  };

  // All requests start immediately and run concurrently instead of the old
  // sequential language → popular → live-set chain. The popular fallback is
  // fired unconditionally: its URL is identical on every streamer page, so
  // it hits one shared data-cache entry per revalidate window — not a
  // per-page request. Results are consumed in the same order as before
  // (language first, popular only when too few), so the output is identical.
  const livePromise = getLiveStreamerIdSet().catch(() => new Set<string>());
  const languagePromise = language
    ? settle(
        api.listStreamers({ language, order: 'popular', limit: 12, revalidate: 300 }),
      )
    : null;
  const popularPromise = settle(
    api.listStreamers({ order: 'popular', limit: 16, revalidate: 300 }),
  );

  // Error semantics preserved from the sequential version: a Partner API
  // error on a response we actually need degrades the section to null (it
  // must never break the host page); anything else is a bug — rethrow.
  if (languagePromise) {
    const res = await languagePromise;
    if (!res.ok) {
      if (!(res.error instanceof PartnerApiError)) throw res.error;
      return null;
    }
    take(res.value.data);
  }
  if (related.length < MIN_BEFORE_FALLBACK) {
    const res = await popularPromise;
    if (!res.ok) {
      if (!(res.error instanceof PartnerApiError)) throw res.error;
      return null;
    }
    take(res.value.data);
  }

  if (related.length === 0) return null;

  // Best-effort live indicator — a failing live-status lookup must never
  // suppress the chips themselves (they carry the SEO value).
  const liveIds = await livePromise;

  return (
    <section
      className="mt-16 border-t border-divider pt-8"
      aria-labelledby="related-heading"
    >
      <h2
        id="related-heading"
        className="text-sm font-bold uppercase tracking-widest text-text-muted"
      >
        {uiLexFor(ui).related.heading}
      </h2>
      <nav
        aria-label={uiLexFor(ui).related.heading}
        className="mt-4 flex flex-wrap gap-2"
      >
        {related.map((s) => (
          <Link
            key={s.id}
            href={localeHref(resolveUiLang(ui), `/streamer/${encodeURIComponent(s.id)}`)}
            className="inline-flex items-center gap-2 rounded-full border border-border-default bg-background-elevated py-1 pl-1 pr-3 text-sm text-text-secondary transition-colors hover:border-accent-cyan/60 hover:text-text-primary"
          >
            {s.avatar_url ? (
              <Image
                src={s.avatar_url}
                alt=""
                width={26}
                height={26}
                unoptimized
                className="shrink-0 rounded-full border border-border-default"
              />
            ) : (
              <InitialsAvatar name={s.name} size={26} className="shrink-0" />
            )}
            <span className="truncate">{s.name}</span>
            {liveIds.has(s.id) && (
              <>
                <span className="live-pulse-dot shrink-0" aria-hidden="true">
                  <span className="live-pulse-ring" />
                </span>
                <span className="sr-only">{uiLexFor(language).related.liveNowSr}</span>
              </>
            )}
          </Link>
        ))}
      </nav>
    </section>
  );
}
