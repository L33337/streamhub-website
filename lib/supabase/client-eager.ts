'use client';

// Synchronous Supabase browser client — the ORIGINAL `createSupabaseBrowserClient`.
//
// Importing this module statically pulls the whole supabase-js bundle into the
// importing route's chunk (62 KB gzip). That is fine for components that only
// exist on auth-gated or query-dependent pages (feed, program, settings,
// onboarding, the auth forms, /search) where a signed-in visitor is the norm.
// Anything rendered on public ISR pages (root providers, game hub, streamer
// page) must go through `./client` and its lazy `getSupabaseBrowserClient()`
// instead, or the chunk lands on every page again.

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function createSupabaseBrowserClient(): SupabaseClient {
  if (_client) return _client;
  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return _client;
}
