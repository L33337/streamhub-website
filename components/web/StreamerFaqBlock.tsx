import type {
  PublicStreamer,
  PublicStreamerStats,
  PublicStreamSlot,
} from '@/lib/server/partner-api';
import { buildStreamerFaqItems } from '@/lib/streamer-faq';
import { FAQItem } from './FAQItem';

interface Props {
  streamer: PublicStreamer;
  liveSlots: PublicStreamSlot[];
  upcomingSlots: PublicStreamSlot[];
  stats?: PublicStreamerStats | null;
}

/**
 * Auto-generated, data-driven FAQ for a streamer page. Renders nothing when the
 * available data yields no questions (so it never adds boilerplate). No FAQPage
 * JSON-LD — see lib/streamer-faq.ts for why; the value is the visible text.
 */
export function StreamerFaqBlock({ streamer, liveSlots, upcomingSlots, stats = null }: Props) {
  const items = buildStreamerFaqItems(streamer, liveSlots, upcomingSlots, stats);
  if (items.length === 0) return null;

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="mt-16 border-t border-divider pt-8"
    >
      <h2 id="faq-heading" className="text-2xl font-bold text-white">
        Frequently asked questions
      </h2>
      <div className="mt-4">
        {items.map((item) => (
          <FAQItem key={item.question} question={item.question} answer={item.answer} />
        ))}
      </div>
    </section>
  );
}
