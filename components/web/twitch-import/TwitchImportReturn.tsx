'use client';

// Return page of the Twitch implicit-grant follows-import flow
// (redirect target /auth/twitch-import). Twitch hands back the access token in
// the URL fragment, so this has to run in the browser: it reads the fragment +
// the state we stashed before leaving, persists the token, and bounces back to
// the wizard's import step (or wherever the flow started). See
// lib/web/twitchConnect.ts for the outbound half.

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { writeTwitchToken } from '@/lib/web/twitchToken';
import {
  TWITCH_IMPORT_OAUTH_STATE_KEY,
  type TwitchImportOAuthState,
} from '@/lib/web/twitchConnect';
import {
  evaluateTwitchImportReturn,
  twitchImportReturnTarget,
} from '@/lib/web/twitchImportReturn';

function readStoredState(): TwitchImportOAuthState | null {
  try {
    const raw = sessionStorage.getItem(TWITCH_IMPORT_OAUTH_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TwitchImportOAuthState>;
    if (typeof parsed?.state === 'string' && typeof parsed?.next === 'string') {
      return { state: parsed.state, next: parsed.next };
    }
    return null;
  } catch {
    return null;
  }
}

export function TwitchImportReturn() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    // Fragment parsing + token persistence must happen exactly once.
    if (ran.current) return;
    ran.current = true;

    const stored = readStoredState();
    try {
      sessionStorage.removeItem(TWITCH_IMPORT_OAUTH_STATE_KEY);
    } catch {
      /* ignore */
    }

    const result = evaluateTwitchImportReturn({
      hash: window.location.hash,
      search: window.location.search,
      storedState: stored?.state ?? null,
      storedNext: stored?.next ?? null,
    });

    if (result.token) {
      writeTwitchToken(result.token);
    }

    // router.replace drops the token-bearing fragment from history and
    // re-mounts the wizard, which auto-loads the follows from the fresh token.
    router.replace(twitchImportReturnTarget(result));
  }, [router]);

  return (
    <main className="container mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-text-secondary" role="status" aria-live="polite">
        Finishing your Twitch import…
      </p>
    </main>
  );
}
