'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { AUTH_UI_VISIBLE, signInGateRedirect } from '@/lib/auth-flag';
import { GetAppLink } from '@/components/web/GetAppLink';

/**
 * Strings for the conversion sheet — resolved server-side (i18n-hub is
 * server-only) and passed down as plain strings.
 */
export interface UpsellSheetStrings {
  title: string;
  body: string;
  appCta: string;
  loginCta: string;
  close: string;
}

/**
 * Small conversion dialog behind the implicit hooks (reminder bell I2, locked
 * favorites chip I3). Explains what an account/the app unlocks at the moment
 * of intent — no auto-popups, dismiss is always one tap. The sign-in path
 * follows AUTH_UI_VISIBLE like FavoriteButton (app-only while auth is
 * stealth-hidden).
 */
export function HomeUpsellSheet({
  strings,
  onClose,
}: {
  strings: UpsellSheetStrings;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={strings.title}
    >
      <button
        type="button"
        aria-label={strings.close}
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-accent-cyan/40 bg-background-elevated p-6 shadow-[0_0_32px_rgba(0,240,255,0.15)]">
        <button
          type="button"
          aria-label={strings.close}
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:text-white"
        >
          <X size={16} />
        </button>
        <h2 className="pr-8 text-lg font-bold text-white">{strings.title}</h2>
        <p className="mt-2 text-sm text-text-secondary">{strings.body}</p>
        <div className="mt-5 flex flex-col gap-2">
          <GetAppLink className="rounded-lg bg-accent-cyan px-4 py-2.5 text-center text-sm font-bold text-background transition-opacity hover:opacity-90">
            {strings.appCta}
          </GetAppLink>
          {AUTH_UI_VISIBLE && (
            <Link
              href={signInGateRedirect('/feed')}
              className="rounded-lg border border-accent-cyan px-4 py-2.5 text-center text-sm font-bold text-accent-cyan transition-colors hover:bg-accent-cyan/10"
            >
              {strings.loginCta}
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="py-1 text-center text-xs text-text-muted transition-colors hover:text-text-secondary"
          >
            {strings.close}
          </button>
        </div>
      </div>
    </div>
  );
}
