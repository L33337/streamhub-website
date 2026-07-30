'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { AUTH_UI_VISIBLE } from '@/lib/auth-flag';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import { initialsFromName } from './InitialsAvatar';

function avatarUrlFromUser(user: ReturnType<typeof useAuth>['user']): string | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  return (
    (meta.avatar_url as string | undefined) ??
    (meta.picture as string | undefined) ??
    null
  );
}

function nameFromUser(user: ReturnType<typeof useAuth>['user']): string {
  if (!user) return '';
  const meta = user.user_metadata ?? {};
  return (
    (meta.full_name as string | undefined) ??
    (meta.name as string | undefined) ??
    (meta.user_name as string | undefined) ??
    user.email ??
    'User'
  );
}

export function HeaderUserMenu({
  locale = 'en',
  signInLabel = 'Sign in',
}: {
  /** Keeps the sign-in link inside the reader's language tree. */
  locale?: UiLang;
  signInLabel?: string;
} = {}) {
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  if (!user) {
    // Stealth mode (NEXT_PUBLIC_AUTH_LINKS_HIDDEN): auth works via direct URL
    // but signed-out visitors get no entry point in the header.
    if (!AUTH_UI_VISIBLE) return null;
    return (
      <Link
        href={localeHref(locale, '/auth/login')}
        // `shrink-0` + `whitespace-nowrap`: in the mobile header row the greedy
        // search field squeezed this button down to its padding and the label
        // broke across two lines ("Sign / in"). The search input is the element
        // that should give up width here, not the button.
        // `before:-inset-1` lifts the touch target to 44px without changing the
        // 36px visual box — the header height is a layout contract
        // (--header-height feeds every sticky offset on the site).
        className="relative inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-lg border border-accent-cyan/40 bg-accent-cyan/10 px-3 text-sm font-semibold text-accent-cyan transition-colors before:absolute before:-inset-1 before:content-[''] hover:bg-accent-cyan/20"
      >
        {signInLabel}
      </Link>
    );
  }

  const avatar = avatarUrlFromUser(user);
  const displayName = nameFromUser(user);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${displayName}`}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border-default bg-background-elevated hover:border-accent-cyan/60 transition-colors overflow-hidden"
      >
        {avatar ? (
          <Image
            src={avatar}
            alt=""
            width={36}
            height={36}
            unoptimized
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <span className="text-xs font-bold text-text-primary" aria-hidden="true">
            {initialsFromName(displayName)}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-[12rem] gradient-border overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-divider">
            <p className="text-xs text-text-muted">Signed in as</p>
            <p className="truncate text-sm font-medium text-text-primary" title={displayName}>
              {displayName}
            </p>
          </div>
          <Link
            role="menuitem"
            href="/feed"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-text-secondary hover:bg-background-highlight hover:text-text-primary transition-colors"
          >
            My feed
          </Link>
          <Link
            role="menuitem"
            href="/program"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-text-secondary hover:bg-background-highlight hover:text-text-primary transition-colors"
          >
            Program
          </Link>
          <Link
            role="menuitem"
            href="/favorites"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-text-secondary hover:bg-background-highlight hover:text-text-primary transition-colors"
          >
            My favorites
          </Link>
          <Link
            role="menuitem"
            href="/settings"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-text-secondary hover:bg-background-highlight hover:text-text-primary transition-colors"
          >
            Settings
          </Link>
          <button
            role="menuitem"
            type="button"
            disabled={loading}
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
            className="block w-full px-3 py-2 text-left text-sm text-text-secondary hover:bg-background-highlight hover:text-text-primary disabled:opacity-50 transition-colors border-t border-divider"
          >
            {loading ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}
