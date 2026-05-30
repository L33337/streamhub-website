import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { SlotCard } from './SlotCard';

interface Props {
  slots: PublicStreamSlot[];
}

export function UpcomingGrid({ slots }: Props) {
  return (
    <section aria-labelledby="upcoming-heading" className="mt-12">
      <h2 id="upcoming-heading" className="text-2xl font-bold text-white mb-4">
        Coming up next
      </h2>
      {slots.length === 0 ? (
        <EmptyUpcoming />
      ) : (
        <ul
          className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          aria-label="Upcoming streams"
        >
          {slots.map((slot) => (
            <li key={slot.id}>
              <SlotCard slot={slot} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EmptyUpcoming() {
  return (
    <div className="gradient-border p-8 text-center">
      <p className="text-text-secondary">
        Nothing scheduled right now — check back soon.
      </p>
    </div>
  );
}
