import Link from 'next/link';
import {
  getPartnerApi,
  PartnerApiError,
  type PublicStreamer,
} from '@/lib/server/partner-api';

const MAX_RELATED = 8;
const MIN_BEFORE_FALLBACK = 4;

interface Props {
  currentId: string;
  /** Streamer's broadcaster language (BCP-47, e.g. "en", "de"); may be null. */
  language: string | null;
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
export async function RelatedStreamers({ currentId, language }: Props) {
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

  try {
    if (language) {
      const resp = await api.listStreamers({
        language,
        order: 'popular',
        limit: 12,
        revalidate: 300,
      });
      take(resp.data);
    }
    if (related.length < MIN_BEFORE_FALLBACK) {
      const resp = await api.listStreamers({
        order: 'popular',
        limit: 16,
        revalidate: 300,
      });
      take(resp.data);
    }
  } catch (err) {
    if (!(err instanceof PartnerApiError)) throw err;
    return null;
  }

  if (related.length === 0) return null;

  return (
    <section
      className="mt-16 border-t border-divider pt-8"
      aria-labelledby="related-heading"
    >
      <h2
        id="related-heading"
        className="text-sm font-bold uppercase tracking-widest text-text-muted"
      >
        Related streamers
      </h2>
      <nav aria-label="Related streamers" className="mt-4 flex flex-wrap gap-2">
        {related.map((s) => (
          <Link
            key={s.id}
            href={`/streamer/${encodeURIComponent(s.id)}`}
            className="inline-flex items-center rounded-full border border-border-default bg-background-elevated px-3 py-1.5 text-sm text-text-secondary transition-colors hover:border-accent-cyan/60 hover:text-text-primary"
          >
            {s.name}
          </Link>
        ))}
      </nav>
    </section>
  );
}
