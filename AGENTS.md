<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Personalized feed (M16)

`/feed` (+ `/feed/interests`) is the logged-in port of the mobile app's M13 Home Feed. Design doc: `StreamHub/docs/Epics/Epic Milestone 16.md`. Key facts:

- **Auth-gated, never cached**: both pages are `force-dynamic`, `robots: noindex`, and follow the `/favorites` convention (`getUser()` → `redirect('/app')`). Website auth is currently dormant — the pages are unreachable for normal visitors until login is re-enabled (mount `HeaderUserMenu`, un-redirect `/auth/login`). The root layout MUST stay static — never read `cookies()`/auth there.
- **Layering in `lib/feed/`**: `logic.ts` + `transforms.ts` are pure (unit-tested via `npm run test`, vitest); `service.ts`/`interests.ts`/`preferences.ts` take a `SupabaseClient` (server or browser — same functions serve SSR and client refresh); `loadFeed.ts` orchestrates 6 parallel error-isolated section fetches; `events.ts` is the client-only feed_events queue (30s flush, 50-cap, drop-on-failure, keepalive POST straight to PostgREST so leave-flushes survive `pagehide`).
- **Data comes from Supabase directly** (RPCs `compute_user_interest_profile`, `recommend_featured_streamers`, `fetch_feed_recent_streams`, `fetch_trending_categories` + tables `stream_slots`, `stream_clips`, `ai_predictions`, `user_interests`, `user_feed_preferences`, `feed_events`), NOT from the Partner API. The RPCs are granted to `authenticated` only and use `auth.uid()` — they must run under the user's session. Pass the interest profile back to `recommend_featured_streamers` verbatim (snake_case).
- **Watermark cookie** `st_feed_seen` (ISO timestamp, 30d, written client-side on leave): the server computes `since = max(now − 24h, cookie)` for "New for you"; the client keeps that value in a ref so in-session refreshes never shrink the section.
- **Constants in `lib/feed/constants.ts` mirror the app** (`useHomeFeed.ts`) — keep them in sync. Deviations from the app are deliberate and documented in the epic: `streamers.is_hidden` filtering, cancelled-slot exclusion from Up Next, no 24h interest-profile cache (recomputed per request).
- **Local E2E loop** (website auth is dormant, so a dev-only bypass exists):
  1. StreamHub repo: `npx supabase start` && `npx supabase db reset` (seeds feed fixtures).
  2. Create `.env.development.local` (dev-only; prod builds ignore it) pointing at the local stack: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key from npx supabase status>`, `SUPABASE_SERVICE_ROLE_KEY=<secret key>`, `PARTNER_API_BASE_URL=http://127.0.0.1:54321/functions/v1/partner-api-v1`, `PARTNER_API_KEY=<stk_test_ key from seed.sql>`, `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
  3. `node scripts/seed-dev-user.mjs` (refuses non-localhost URLs).
  4. `npm run dev` → open `http://localhost:3000/api/dev-login` → lands signed-in on `/feed`. The route is triple-guarded (NODE_ENV=development + localhost Supabase URL + service key present) and 404s in production builds; it signs in via admin `generateLink` + `verifyOtp` because the local auth config has hCaptcha enabled.
