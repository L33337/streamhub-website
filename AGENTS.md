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
- **`/streamers` pagination (M20 S1.5, 5k-scale):** `components/web/StreamersIndexView.tsx` fetches only its own 60 streamers via the partner API's `?offset=` param (returns exact `pagination.total`) — **do NOT revert to fetch-all-slice** (that reintroduced a 2,000-streamer cap). Routes: `/streamers` (page 1) + `/streamers/page/[n]` (2+), self-canonical per page, `/page/1` + out-of-range → 404, soft-404 rule preserved. The cross-page A–Z jump bar was intentionally dropped (can't map letters→pages without the full roster); in-page letter headers + numeric nav remain. If you ever want the jump bar back, add a letter-histogram endpoint — don't fetch the whole roster.
- Schedule-page LCP diagnosis (M20 S1.6, 2026-07-13): **live-slot pages** (`thumbnail_url` set) have the hero thumbnail as LCP element — it now carries `priority`. **Prediction-slot pages** (no thumbnail) have a text `<p>` LCP like the streamer page; their avatar-fallback hero deliberately stays lazy.
- **Every dynamic route that should be ISR-cached MUST export `generateStaticParams`** (an empty array is fine). Without it, Next builds the route as `ƒ` (per-request dynamic) and never caches the HTML — `export const revalidate` alone does nothing for the route cache. This bit `/schedule/[id]` until M20 S1.6 (every visitor paid a full server render, `Cache-Control: private, no-store`); `/streamer/[slug]` documents the same pattern. Check the build output: the route must show `●`, not `ƒ`.

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

# Email auth sub-flag (`NEXT_PUBLIC_EMAIL_AUTH_ENABLED`)

Email login/registration ships dormant on top of the base auth flag: `EMAIL_AUTH_ENABLED` (lib/auth-flag.ts) is only true when BOTH `NEXT_PUBLIC_AUTH_ENABLED=true` AND `NEXT_PUBLIC_EMAIL_AUTH_ENABLED=true`. This lets OAuth-only auth go live first and email auth follow (or roll back) independently.

Sub-flag OFF: `/auth/login` shows only the OAuth buttons; `/auth/sign-up`, `/auth/forgot-password`, `/auth/reset-password` redirect to `/auth/login` (base auth on) or `/app` (everything off) via `emailAuthGateRedirect()`. Sub-flag ON: `/auth/login` additionally renders the email/password form (`components/web/auth/EmailLoginForm`) with sign-up + forgot-password links, and the three pages render their forms. `app/auth/confirm/route.ts` is deliberately NOT flag-gated: in-flight confirmation/recovery email links must keep working even if the sub-flag is rolled back mid-flight (with a bogus/expired token it only ever redirects to an error page).

Key mechanics (don't break these):
- **hCaptcha is mandatory in prod**: the Supabase project enforces captcha on auth endpoints (same as the mobile app). All email-auth calls go through the browser Supabase client from client components, with a token from `components/web/auth/HCaptchaField` (invisible mode, `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`). When the sitekey env is unset the forms skip captcha — only valid against a captcha-free stack. Local dev: hCaptcha test sitekey `10000000-ffff-ffff-ffff-000000000001` + start the local Supabase stack with `HCAPTCHA_SECRET=0x0000000000000000000000000000000000000000` (config.toml reads `env(HCAPTCHA_SECRET)`).
- **Confirmation/recovery links use `token_hash` + `/auth/confirm` (verifyOtp)**, NOT the `?code=` PKCE exchange — this makes cross-device clicks work (sign up on desktop, confirm on phone). It depends on the CONDITIONAL Supabase email templates ("Confirm signup" / "Reset password") that branch on the exact `{{ .RedirectTo }}` strings built by `lib/auth-email.ts` (`signupEmailRedirectTo`, `recoveryRedirectTo` — unit-frozen in `lib/__tests__/auth-email.test.ts`). The templates' `else` branch keeps `{{ .ConfirmationURL }}` for the mobile app — NEVER remove it, and never change the redirect strings without updating the templates in the Supabase dashboard. Without the template change (e.g. local dev defaults), website links fall back to the same-browser `?code=` flow through `/auth/callback`.
- Auth emails are sent from `noreply@streamertimes.info` via Resend custom SMTP (Supabase dashboard → Auth → SMTP); the domain is verified in Resend (SPF/DKIM). The default Supabase mailer is limited to ~2 emails/hour — never rely on it in prod.

**Activation checklist (in order; base auth flag must already be live):**
1. Resend: `streamertimes.info` domain verified (DKIM/SPF DNS records); sending API key created.
2. Supabase dashboard → Auth → SMTP: `smtp.resend.com:465`, user `resend`, pass = API key, sender `noreply@streamertimes.info` / "Streamer Times". Bump Auth rate limit "emails per hour" (2 → ~60). Smoke-test a password reset from the MOBILE app (sender changes for the app too).
3. Supabase dashboard → Auth → URL Configuration: add `https://streamertimes.tv/auth/callback?next=/auth/reset-password` to the redirect allowlist (`…/auth/callback` should already be there). Do NOT change the Site URL — the app's signup flow depends on it.
4. Supabase dashboard → Auth → Emails: snapshot the current "Confirm signup" + "Reset password" bodies, then wrap them in the conditional (`{{ if eq .RedirectTo "https://streamertimes.tv/auth/callback" }}` → confirm link `https://streamertimes.tv/auth/confirm?token_hash={{ .TokenHash }}&type=signup`; recovery: match `https://streamertimes.tv/auth/callback?next=/auth/reset-password` → `…&type=recovery`; `else` = snapshot). After EACH template save, re-test the matching mobile-app flow.
5. hCaptcha dashboard: add `streamertimes.tv` to the allowed hostnames of the app's sitekey.
6. Vercel: set `NEXT_PUBLIC_HCAPTCHA_SITE_KEY=<sitekey>` and `NEXT_PUBLIC_EMAIL_AUTH_ENABLED=true` → redeploy.
7. Smoke-test: sign-up with a scratch email on desktop, confirm ON A PHONE (cross-device proof) → signed in; wrong-password error copy; forgot → reset roundtrip; one Twitch + one Google login (regression); mobile-app signup + reset with a scratch account (template regression); mail headers show DKIM pass via Resend.
8. Rollback = unset `NEXT_PUBLIC_EMAIL_AUTH_ENABLED` + redeploy. Steps 1–5 can stay in place harmlessly.

# SEO surface

Marketing/hub SEO conventions (last extended 2026-07-12 — keywords cleanup, global 404, llms.txt, per-hub OG images):

- **Metadata**: no `keywords` meta anywhere (Google ignores it; removed from the root layout). `metadataBase` is set ONCE in `app/layout.tsx`; every page owns its `title`/`description`/`alternates.canonical`/`openGraph`. Intent split: the homepage keeps the "Stream Guide" wording, `/app` targets download/alert intent ("Go-Live Alerts & AI Stream Predictions") so the two don't cannibalize.
- **OpenGraph images** (file-based `opengraph-image.tsx` per route segment; a route without one inherits the nearest ancestor's — the site-wide fallback is `app/opengraph-image.tsx`):
  - Shared branded frame in `lib/og/frame.tsx` (`renderOgFrame({ title, subtitle, eyebrow?, pills? })` + `OG_SIZE`) — dark canvas, cyan radial glow, cyan/magenta corner brackets, "Streamer Times" eyebrow, STREAMERTIMES.TV footer. Reuse it for any new OG image; declare `runtime`/`size`/`alt`/`contentType` inline per route (Next reads them per segment).
  - Hub images are DYNAMIC (`app/live`, `app/games`, `app/streamers`, `app/game/[slug]`): `runtime = 'nodejs'` (so `PARTNER_API_KEY` reaches the route in `next dev`), one cheap Partner API call for a counter/title, `revalidate = 300`. **Every fetch — including the `getPartnerApi()` call itself, which throws when the key is unset — is wrapped in `try/catch` and degrades to a count-free fallback. Never throw: a throw during prerender aborts the whole production build** (documented incident 2026-07-07). The Partner API exposes no total-row count (`PaginationInfo = {next_cursor, has_more}`), so `/live` and `/streamers` show the 60s-cached live-now count (`getLiveStreamerIdSet`), `/games` counts `listGames` rows, and `/game/[slug]` shows the resolved category name (slug prettified on failure).
  - The pre-existing root `app/opengraph-image.tsx` (edge) and `app/streamer/[slug]/opengraph-image.tsx` (nodejs, per-streamer) are unchanged — they predate the shared helper.
- **Global 404** `app/not-found.tsx`: fully static (synchronous, `Link`-only, NO data fetch / `cookies()` / segment config) so it renders inside the static root layout without breaking ISR — same rule as the layout itself. Also serves the catch-all/unmatched-route 404; links to Home + the four hubs.
- **`public/llms.txt`**: served at `/llms.txt`, a curated Markdown map (USP + core URLs + Partner API) for LLM crawlers. Keep its URL list in sync with `app/sitemap.ts` `STATIC_URLS`.
- **`/schedule/*` slot pages** (decision 2026-07-15): noindex + robots.txt disallow **for Googlebot only** + 308 to `/streamer/[slug]` on expired `ai_slot_pred_*` ids (`lib/prediction-redirect.ts`). The ids churn every prediction cycle, so GSC listing them under "Page with redirect" / "Blocked by robots.txt" is EXPECTED and neutral — never start a GSC validation for those buckets (it fails by design). The `*` robots group deliberately does NOT block `/schedule/`: Discordbot/Twitterbot respect robots.txt and would stop rendering embeds of user-shared slot URLs (structure frozen by `app/__tests__/robots.test.ts`).
- **Auth-gated routes in robots.txt**: `/settings`, `/favorites`, and `/feed` (added 2026-07-15; prefix also covers `/feed/interests`) are disallowed for ALL bots — they 307 every anonymous crawler (to `/app` while auth is dormant, to the login page once enabled), so their pre-render `noindex` metadata never takes effect and any crawl would only log a redirect. Keep new login-gated routes in this list.
- **OG image URLs in GSC** (`/streamer/[slug]/opengraph-image?<hash>` etc.): appear under "Crawled – currently not indexed" because they serve a PNG, not HTML; the `?hash` changes per deploy, so entries accumulate. Harmless and REQUIRED to stay crawlable — never robots-block or noindex them, or Discord/Twitter/Google previews of streamer pages break.
- **`/rankings` leaderboards** (added 2026-07-17): hub + four Top-100 pages (`most-followed`, `most-watched`, `most-active`, `most-reliable`) fed by `GET /v1/rankings/{metric}` (`getRankings`), plus depth-50 per-game rankings at `/rankings/game/[slug]`. Index gate: **< 10 sanitized entries → `robots: noindex,follow`** (`isRankingIndexable` in `lib/rankings.ts`) — pages always render (empty state, never 404) and flip indexable as data accrues (most-reliable launches thin by design). The sitemap mirrors the per-game gate via the cheap `streamer_count >= 10` proxy; the four leaderboard URLs are static sitemap entries. One shared OG image at `app/rankings/opengraph-image.tsx` (subpages inherit). Copy/columns live in the `RANKING_PAGES` registry (`lib/rankings.ts`, unit-tested); tables render via `components/web/RankingTable.tsx`. Titles degrade honestly with entry count — never claim "Top 100" with fewer rows.
