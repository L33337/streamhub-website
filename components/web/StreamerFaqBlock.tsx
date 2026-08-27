import type {
  PublicStreamer,
  PublicStreamerStats,
  PublicStreamSlot,
} from '@/lib/server/partner-api';
import { buildStreamerFaqItems } from '@/lib/streamer-faq';
import { uiLexFor } from '@/lib/i18n-ui';
import { dirFor } from '@/lib/seo';
import { FAQItem } from './FAQItem';

interface Props {
  streamer: PublicStreamer;
  liveSlots: PublicStreamSlot[];
  upcomingSlots: PublicStreamSlot[];
  stats?: PublicStreamerStats | null;
  // M22 (D6): FAQ copy follows the viewer's locale; defaults to the
  // streamer's language for pre-M22 call sites.
  uiLanguage?: string | null;
}

/**
 * Auto-generated, data-driven FAQ for a streamer page. Renders nothing when the
 * available data yields no questions (so it never adds boilerplate). No FAQPage
 * JSON-LD — see lib/streamer-faq.ts for why; the value is the visible text.
 */
export function StreamerFaqBlock({
  streamer,
  liveSlots,
  upcomingSlots,
  stats = null,
  uiLanguage,
}: Props) {
  const ui = uiLanguage ?? streamer.language;
  const items = buildStreamerFaqItems(streamer, liveSlots, upcomingSlots, stats, ui);
  if (items.length === 0) return null;

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="mt-16 border-t border-divider pt-8"
    >
      <h2 id="faq-heading" className="text-2xl font-bold text-white">
        {uiLexFor(ui).faq.heading}
      </h2>
      {/* dir only on the prose container (RTL languages) — never on layout. */}
      <div className="mt-4" dir={dirFor(ui)}>
        {items.map((item) => (
          <FAQItem
            key={item.question}
            question={item.question}
            answer={item.answer}
            more={item.more}
          />
        ))}
      </div>
    </section>
  );
}
