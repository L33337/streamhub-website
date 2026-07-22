'use client';

export function CategoryChips({
  categories,
  selectedCategory,
  onSelect,
}: {
  categories: string[];
  selectedCategory: string | null;
  onSelect: (category: string | null) => void;
}) {
  const chipClass = (active: boolean) =>
    `shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
      active
        ? 'border-accent-cyan bg-accent-cyan/15 text-accent-cyan'
        : 'border-border-default bg-background-elevated text-text-secondary hover:border-accent-cyan/40 hover:text-text-primary'
    }`;

  // Overflow scrolling lives in the RailScroller wrapper (FeedClient) since
  // the 2026-07-22 UX round — this row only lays the chips out.
  return (
    <div className="flex gap-2 py-0.5" role="group" aria-label="Filter feed by category">
      <button
        type="button"
        className={chipClass(selectedCategory === null)}
        aria-pressed={selectedCategory === null}
        onClick={() => onSelect(null)}
      >
        All
      </button>
      {categories.map((category) => {
        const active = selectedCategory === category;
        return (
          <button
            key={category}
            type="button"
            className={chipClass(active)}
            aria-pressed={active}
            onClick={() => onSelect(active ? null : category)}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}
