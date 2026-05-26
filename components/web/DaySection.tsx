import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { SlotCard } from './SlotCard';

interface Props {
  dateKey: string;
  label: string;
  slots: PublicStreamSlot[];
}

export function DaySection({ dateKey, label, slots }: Props) {
  return (
    <section
      id={`day-${dateKey}`}
      aria-labelledby={`heading-${dateKey}`}
      className="mt-10 scroll-mt-[calc(var(--header-height)+5rem)]"
    >
      <h2
        id={`heading-${dateKey}`}
        className="text-2xl font-bold gradient-text mb-4 flex items-baseline gap-3"
      >
        {label}
        <span className="text-sm font-normal text-text-muted">
          {slots.length} {slots.length === 1 ? 'stream' : 'streams'}
        </span>
      </h2>
      <ul className="grid gap-3" aria-label={`Streams on ${label}`}>
        {slots.map((slot) => (
          <li key={slot.id}>
            <SlotCard slot={slot} />
          </li>
        ))}
      </ul>
    </section>
  );
}
