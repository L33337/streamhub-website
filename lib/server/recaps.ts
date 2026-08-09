// Failure-isolated data loaders for the AI recap articles (2026-08-09):
// hub teaser cards, /rankings/recap archive + article pages, OG images.
// React cache() dedupes within one render (generateMetadata + body + OG);
// across requests the fetches share the data cache (15-min revalidate inside
// the client). Never throws: a throw during prerender aborts the whole
// production build — the hub falls back to its static intro, the archive to
// its warming state, the article route to notFound().

import { cache } from 'react';
import {
  getPartnerApi,
  type PublicRecapArticle,
  type PublicRecapListItem,
} from '@/lib/server/partner-api';

/** Enough for the hub cards, the archive page AND prev/next lookups: ~1.5
 *  years of weekly + monthly editions before older ones drop off the page. */
const LIST_LIMIT = 50;

export const loadRecapsList = cache(async (lang: string): Promise<PublicRecapListItem[]> => {
  try {
    const api = getPartnerApi(); // throws when the key is unset — stay inside try
    const res = await api.listRecaps({ lang, limit: LIST_LIMIT });
    return res.data;
  } catch {
    return [];
  }
});

export const loadRecap = cache(
  async (slug: string, lang: string): Promise<PublicRecapArticle | null> => {
    try {
      const api = getPartnerApi();
      return await api.getRecap(slug, { lang });
    } catch {
      // API down ≠ unknown slug, but both render the same way (notFound with
      // ISR self-heal) — the distinction isn't worth a broken prerender.
      return null;
    }
  },
);
