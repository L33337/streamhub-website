<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Personalized feed (M16)

`/feed` (+ `/feed/interests`) is the logged-in port of the mobile app's M13 Home Feed. Design doc: `StreamHub/docs/Epics/Epic Milestone 16.md`. Key facts:

- **Auth-gated, never cached**: both pages are `force-dynamic`, `robots: noindex`, and follow the `/favorites` convention (`getUser()` gate). Website auth is DORMANT but fully prepared behind a build-time flag — see the "Auth activation flag" section below. The root layout MUST stay static — never read `cookies()`/auth there (the flag is safe: a build-time constant).
- **Layering in `lib/feed/`**: `logic.ts` + `transforms.ts` are pure (unit-tested via `npm run test`, vitest); `service.ts`/`interests.ts`/`preferences.ts` take a `SupabaseClient` (server or browser — same functions serve SSR and client refresh); `loadFeed.ts` orchestrates 6 parallel error-isolated section fetches; `events.ts` is the client-only feed_events queue (30s flush, 50-cap, drop-on-failure, keepalive POST straight to PostgREST so leave-flushes survive `pagehide`).
- **Data comes from Supabase directly** (RPCs `compute_user_interest_profile`, `recommend_featured_streamers`, `fetch_feed_recent_streams`, `fetch_trending_categories` + tables `stream_slots`, `stream_clips`, `ai_predictions`, `user_interests`, `user_feed_preferences`, `feed_events`), NOT from the Partner API. The RPCs are granted to `authenticated` only and use `auth.uid()` — they must run under the user's session. Pass the interest profile back to `recommend_featured_streamers` verbatim (snake_case).
- **Watermark cookie** `st_feed_seen` (ISO timestamp, 30d, written client-side on leave): the server computes `since = max(now − 24h, cookie)` for "New for you"; the client keeps that value in a ref so in-session refreshes never shrink the section.
- **Constants in `lib/feed/constants.ts` mirror the app** (`useHomeFeed.ts`) — keep them in sync. Deviations from the app are deliberate and documented in the epic: `streamers.is_hidden` filtering, cancelled-slot exclusion from Up Next, no 24h interest-profile cache (recomputed per request).
- **Local E2E loop** (website auth is dormant, so a dev-only bypass exists):
  1. StreamHub repo: `npx supabase start` && `npx supabase db reset` (seeds feed fixtures).
  2. Create `.env.development.local` (dev-only; prod builds ignore it) pointing at the local stack: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key from npx supabase status>`, `SUPABASE_SERVICE_ROLE_KEY=<secret key>`, `PARTNER_API_BASE_URL=http://127.0.0.1:54321/functions/v1/partner-api-v1`, `PARTNER_API_KEY=<stk_test_ key from seed.sql>`, `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
  3. `node scripts/seed-dev-user.mjs` (refuses non-localhost URLs).
  4. `npm run dev` → open `http://localhost:3000/api/dev-login` → lands signed-in on `/feed`. The route is triple-guarded (NODE_ENV=development + localhost Supabase URL + service key present) and 404s in production builds; it signs in via admin `generateLink` + `verifyOtp` because the local auth config has hCaptcha enabled.
  Gotcha: `TaskStop`/Ctrl-C can leave a detached `next dev` holding port 3000 — the next `npm run dev` then errors with "Another next dev server is already running" and prints the PID; `taskkill /PID <pid> /F` it.

# Performance baseline (M20 Phase 0)

Web-Vitals tooling for the perf-health runbook (`StreamHub/docs/performance-health.md`):

- **`npm run lighthouse`** → `scripts/lighthouse-baseline.mjs`: runs the local `lighthouse` CLI over the URLs in `lighthouserc.json` (3 mobile runs each), prints median LCP/TBT/CLS/score + LCP element. **Windows-robust**: it writes each LHR before Chrome's teardown (chrome-launcher throws `EPERM` on Windows temp-cleanup *after* the report generates, which makes a bare `lhci autorun` abort with no output). `LH_RUNS=1` for a quick smoke run.
- **`npm run lighthouse:ci`** → `lhci autorun` (Linux/CI only — the teardown bug doesn't fire there) — also enforces the budget assertions in `lighthouserc.json`. This is the hook for a future Lighthouse-CI budget (M20 S5.2).
- Baseline finding to remember: streamer-page LCP is **render-delay-bound**, the LCP element is a text `<p>`, **not** the hero avatar — so adding `priority` to the avatar is a non-lever for LCP. Re-diagnose via the `largest-contentful-paint-element` audit before any LCP work.

# Repo hygiene (added 2026-07-07 after a stale-branch cleanup)

- `main` is the single source of truth and the GitHub default branch; it is protected against force-pushes and deletion. Vercel deploys production from `main`.
- Merge finished, verified feature branches into main promptly, then delete the branch local + remote (`git branch -d` + `git push origin --delete`). GitHub auto-deletes head branches of merged PRs (`delete_branch_on_merge` is ON).
- If a branch's content reached main another way (cherry-pick/re-implementation), verify with `git cherry main <branch>` and delete it.
- Remove git worktrees when their story is done (`git worktree remove`); never park uncommitted work in a worktree.
- Doc-only or config-only tweaks may be committed directly on main.

# Auth activation flag (`NEXT_PUBLIC_AUTH_ENABLED`)

Website auth ships dormant and is activated WITHOUT code changes by setting the Vercel env var `NEXT_PUBLIC_AUTH_ENABLED=true` and redeploying (the value is inlined at build time — a runtime toggle is impossible by design, which is what keeps the static root layout static). Single source of truth: `lib/auth-flag.ts` (`AUTH_ENABLED`, `safeNextPath`, `signInGateRedirect`).

Flag OFF (default) — exact dormant behavior: `/auth/login` redirects to `/app`, no user menu in the header, gated pages (`/feed`, `/feed/interests`, `/favorites`, `/settings`) redirect signed-out visitors to `/app`, FavoriteButton's signed-out state points to `/app?from=favorite`.

Flag ON: `/auth/login` renders the Twitch/Google sign-in UI, the header mounts `HeaderUserMenu` (Sign-in link → avatar dropdown with My feed / My favorites / Settings / Sign out), gated pages redirect to `/auth/login?next=<page>` and return there after login (the `next` path survives the OAuth round-trip via the callback's `?next=` param), FavoriteButton's signed-out state leads to sign-in with a return path. `next` values are sanitized against open redirects (`safeNextPath`: same-site absolute paths only) in the login page, the server actions, and the callback route.

**Activation checklist (in order):**
1. Supabase dashboard: Twitch + Google OAuth providers configured, `https://streamertimes.tv/auth/callback` in the redirect allowlist, site URL correct.
2. Vercel: set `NEXT_PUBLIC_AUTH_ENABLED=true` → redeploy.
3. Smoke-test: `/auth/login` renders; complete one Twitch and one Google login; `/feed` loads and `st_feed_seen`/`feed_events` behave; sign-out works.
4. Rollback = unset the env var + redeploy (fully reversible, no data impact).

# SEO surface

Marketing/hub SEO conventions (last extended 2026-07-12 — keywords cleanup, global 404, llms.txt, per-hub OG images):

- **Metadata**: no `keywords` meta anywhere (Google ignores it; removed from the root layout). `metadataBase` is set ONCE in `app/layout.tsx`; every page owns its `title`/`description`/`alternates.canonical`/`openGraph`. Intent split: the homepage keeps the "Stream Guide" wording, `/app` targets download/alert intent ("Go-Live Alerts & AI Stream Predictions") so the two don't cannibalize.
- **OpenGraph images** (file-based `opengraph-image.tsx` per route segment; a route without one inherits the nearest ancestor's — the site-wide fallback is `app/opengraph-image.tsx`):
  - Shared branded frame in `lib/og/frame.tsx` (`renderOgFrame({ title, subtitle, eyebrow?, pills? })` + `OG_SIZE`) — dark canvas, cyan radial glow, cyan/magenta corner brackets, "Streamer Times" eyebrow, STREAMERTIMES.TV footer. Reuse it for any new OG image; declare `runtime`/`size`/`alt`/`contentType` inline per route (Next reads them per segment).
  - Hub images are DYNAMIC (`app/live`, `app/games`, `app/streamers`, `app/game/[slug]`): `runtime = 'nodejs'` (so `PARTNER_API_KEY` reaches the route in `next dev`), one cheap Partner API call for a counter/title, `revalidate = 300`. **Every fetch — including the `getPartnerApi()` call itself, which throws when the key is unset — is wrapped in `try/catch` and degrades to a count-free fallback. Never throw: a throw during prerender aborts the whole production build** (documented incident 2026-07-07). The Partner API exposes no total-row count (`PaginationInfo = {next_cursor, has_more}`), so `/live` and `/streamers` show the 60s-cached live-now count (`getLiveStreamerIdSet`), `/games` counts `listGames` rows, and `/game/[slug]` shows the resolved category name (slug prettified on failure).
  - The pre-existing root `app/opengraph-image.tsx` (edge) and `app/streamer/[slug]/opengraph-image.tsx` (nodejs, per-streamer) are unchanged — they predate the shared helper.
- **Global 404** `app/not-found.tsx`: fully static (synchronous, `Link`-only, NO data fetch / `cookies()` / segment config) so it renders inside the static root layout without breaking ISR — same rule as the layout itself. Also serves the catch-all/unmatched-route 404; links to Home + the four hubs.
- **`public/llms.txt`**: served at `/llms.txt`, a curated Markdown map (USP + core URLs + Partner API) for LLM crawlers. Keep its URL list in sync with `app/sitemap.ts` `STATIC_URLS`.
