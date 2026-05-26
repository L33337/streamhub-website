'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { clearTwitchToken } from '@/lib/web/twitchToken';
import { SettingsSection } from './SettingsSection';

type Status = 'idle' | 'submitting' | 'error';

export function DeleteAccountButton() {
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  const closeModal = useCallback(() => {
    if (status === 'submitting') return;
    setOpen(false);
    setConfirmed(false);
    setStatus('idle');
    setErrorMessage(null);
  }, [status]);

  useEffect(() => {
    if (!open) return;
    cancelButtonRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeModal();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, closeModal]);

  async function handleDelete() {
    setStatus('submitting');
    setErrorMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not signed in. Please reload and try again.');
      }
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Delete failed (HTTP ${res.status})`);
      }

      clearTwitchToken();
      try {
        await signOut();
      } catch {
        window.location.assign('/?account-deleted=1');
      }
    } catch (err) {
      console.error('[delete-account] failed:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  }

  return (
    <SettingsSection
      title="Delete account"
      description="Permanently remove your account, favorites, and all associated data. This cannot be undone."
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center rounded-lg border border-accent-pink/50 bg-accent-pink/10 px-4 text-sm font-semibold text-accent-pink hover:bg-accent-pink/20 transition-colors"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Delete account
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md gradient-border p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="delete-account-title"
              className="text-xl font-bold text-accent-pink"
            >
              Delete your account?
            </h3>
            <p className="mt-3 text-sm text-text-secondary">
              We will permanently delete:
            </p>
            <ul className="mt-2 list-disc pl-5 text-sm text-text-secondary space-y-1">
              <li>Your account profile</li>
              <li>Your favorite streamers</li>
              <li>Your push tokens and notification preferences</li>
            </ul>
            <p className="mt-3 text-sm font-semibold text-text-primary">
              This is permanent and cannot be undone.
            </p>

            <label className="mt-5 flex items-start gap-2 text-sm text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                disabled={status === 'submitting'}
                className="mt-0.5 h-4 w-4 accent-accent-pink"
              />
              <span>I understand this is permanent and cannot be undone.</span>
            </label>

            {errorMessage ? (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-accent-pink/40 bg-accent-pink/10 px-3 py-2 text-sm text-accent-pink"
              >
                {errorMessage}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={closeModal}
                disabled={status === 'submitting'}
                className="inline-flex h-10 items-center rounded-lg border border-border-default bg-background-elevated px-4 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!confirmed || status === 'submitting'}
                className="inline-flex h-10 items-center rounded-lg border border-accent-pink/60 bg-accent-pink/20 px-4 text-sm font-semibold text-accent-pink hover:bg-accent-pink/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {status === 'submitting' ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </SettingsSection>
  );
}
