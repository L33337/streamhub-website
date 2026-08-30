'use client';

// Interest picker (M16, port of the app's interests screen): explicit
// category picks layered on top of the favorites-derived profile (blended
// 60/40 server-side). The save is diff-based (lib/feed/interests.ts); the
// next /feed render recomputes the profile — no cache to invalidate.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client-eager';
import { saveUserInterests } from '@/lib/feed/interests';

export function InterestsPicker({
  userId,
  options,
  initialPicked,
}: {
  userId: string;
  options: string[];
  initialPicked: string[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialPicked));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (category: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);
    try {
      await saveUserInterests(supabase, userId, Array.from(selected));
      router.push('/feed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save interests');
      setIsSaving(false);
    }
  };

  return (
    <div>
      <header className="flex items-center gap-3">
        <Link
          href="/feed"
          aria-label="Back to feed"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-default bg-background-elevated text-text-secondary transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan"
        >
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-3xl font-bold text-white">Interests</h1>
      </header>

      <p className="mt-4 text-sm leading-relaxed text-text-secondary">
        Pick categories you enjoy. Your feed combines these with what your favorite streamers
        play to suggest new streamers and highlights.
      </p>

      {options.length === 0 ? (
        <p className="mt-6 text-sm text-text-muted">
          No categories available right now — try again later.
        </p>
      ) : (
        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Interest categories">
          {options.map((category) => {
            const active = selected.has(category);
            return (
              <button
                key={category}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(category)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'border-accent-cyan bg-accent-cyan/15 text-accent-cyan'
                    : 'border-border-default bg-background-elevated text-text-secondary hover:border-accent-cyan/40 hover:text-text-primary'
                }`}
              >
                {active && <Check size={14} strokeWidth={2.5} />}
                {category}
              </button>
            );
          })}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <div className="mt-8 border-t border-border-default pt-4">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="inline-flex w-full items-center justify-center rounded-lg border border-accent-cyan/60 bg-accent-cyan/10 px-4 py-2.5 text-sm font-bold text-accent-cyan transition-colors hover:bg-accent-cyan/20 disabled:opacity-60 sm:w-auto"
        >
          {isSaving ? 'Saving…' : `Save${selected.size > 0 ? ` (${selected.size})` : ''}`}
        </button>
      </div>
    </div>
  );
}
