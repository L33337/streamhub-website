'use client';

// "Feed usage data" opt-out toggle (M16) — the website counterpart of the
// app's Settings switch. Persists to user_feed_preferences (upsert) and
// flips the in-memory events gate so an open feed tab stops logging
// immediately.

import { useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { setFeedAnalyticsEnabled } from '@/lib/feed/preferences';
import { setFeedEventsEnabled } from '@/lib/feed/events';
import { SettingsSection } from './SettingsSection';

export function FeedAnalyticsToggle({
  userId,
  initialEnabled,
}: {
  userId: string;
  initialEnabled: boolean;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    const next = !enabled;
    setEnabled(next); // optimistic
    setError(null);
    setIsSaving(true);
    setFeedEventsEnabled(next);
    try {
      await setFeedAnalyticsEnabled(supabase, userId, next);
    } catch {
      setEnabled(!next); // revert
      setFeedEventsEnabled(!next);
      setError('Could not save your preference. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsSection
      title="Feed usage data"
      description="Log taps on feed cards to improve suggestions. Deleted after 90 days."
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-text-secondary">
          {enabled ? 'Logging is on' : 'Logging is off'}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Feed usage data logging"
          disabled={isSaving}
          onClick={() => void handleToggle()}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:opacity-60 ${
            enabled
              ? 'border-accent-cyan/60 bg-accent-cyan/40'
              : 'border-border-default bg-background-highlight'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </SettingsSection>
  );
}
