import type { PublicStreamSlot } from '@/lib/server/partner-api';
import type { UiLang } from '@/lib/i18n-core';
import { hubLexFor } from '@/lib/i18n-hub';
import { SlotCard } from './SlotCard';

interface Props {
  slots: PublicStreamSlot[];
  locale?: UiLang;
}

export function UpcomingGrid({ slots, locale = 'en' }: Props) {
  const L = hubLexFor(locale);
  return (
    <section aria-labelledby="upcoming-heading" className="mt-12">
      <h2 id="upcoming-heading" className="text-2xl font-bold text-white mb-4">
        {L.upcoming.heading}
      </h2>
      {slots.length === 0 ? (
        <EmptyUpcoming text={L.upcoming.empty} />
      ) : (
        <ul
          className="grid gap-3 grid-cols-1 md:grid-cols-2"
          aria-label={L.upcoming.aria}
        >
          {slots.map((slot) => (
            <li key={slot.id}>
              <SlotCard slot={slot} language={locale} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EmptyUpcoming({ text }: { text: string }) {
  return (
    <div className="gradient-border p-8 text-center">
      <p className="text-text-secondary">{text}</p>
    </div>
  );
}
