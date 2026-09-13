#!/usr/bin/env node
// Googlebot crawl snapshot for the Indexing-API ping experiment (SEO plan
// F1b, 14-day "pings off" window starting 2026-09-14).
//
// Vercel keeps request-level observability data for only ~2 days, so this has
// to run at least every 2 days. Each run pulls the last complete UTC days and
// UPSERTS one row per day (re-running is safe; a day is rewritten, never
// duplicated):
//
//   docs/measurements/googlebot-2026-09.csv                  M1 + M2 counts per day
//   docs/measurements/googlebot-2026-09-streamer-paths.csv   every streamer page Googlebot fetched
//
// The second file exists for M2b ("share of crawled streamers that had a live
// transition in the previous 24 h"): the website cannot see stream history, so
// join the slugs against the backend in SQL (stream_slots status history).
//
//   node scripts/googlebot-snapshot.mjs                     # last 2 complete UTC days
//   node scripts/googlebot-snapshot.mjs --days 1 --note "W2 deploy"
//   node scripts/googlebot-snapshot.mjs --dry-run           # print, write nothing
//   node scripts/googlebot-snapshot.mjs --self-test         # pure-function checks, no network
//
// Token: VERCEL_TOKEN from the environment, else from --env <file> (default
// .env.local). Same full-account token as the Supabase secret VERCEL_TOKEN.
//
// API traits this relies on (see the backend's _shared/vercel-api.ts):
//   - `filter` is an OData-style STRING ("bot_name eq 'googlebot'") applied
//     before the top-N cut; the `filters` ARRAY is silently ignored.
//   - `limit` ≤ 500 rows per query; a day that hits it is flagged `truncated`.
//   - Windows outside retention are silently clamped/shifted: the echoed
//     query.startTime/endTime is compared with the requested day and a
//     mismatching day is skipped instead of being written under the wrong date.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const TEAM_ID = 'team_ui6Cv5SbgnCTQ0BtjR5CN1eu';
const PROJECT_ID = 'prj_1qNFSBubJnzvZa5hTfieSYJ54mJH';
const API = 'https://api.vercel.com/v2/observability/query';
const ROW_LIMIT = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

const OUT_DEFAULT = 'docs/measurements/googlebot-2026-09.csv';
const PATHS_DEFAULT = 'docs/measurements/googlebot-2026-09-streamer-paths.csv';

export const SUMMARY_COLUMNS = [
  'date',
  'gb_requests_total',
  'gb_streamer_page',
  'gb_streamer_page_200',
  'gb_streamer_subpages',
  'gb_game_hub',
  'gb_robots',
  'gb_sitemap',
  'gb_distinct_streamers',
  // Requests on streamer PAGE paths regardless of route/status. Exceeds
  // gb_streamer_page when Googlebot follows /en/streamer/x (308 from the
  // middleware, counted under no page route) — M2 is path-based, M1 route-based.
  'gb_streamer_path_requests',
  'truncated',
  'captured_at',
  'note',
];
const PATH_COLUMNS = ['date', 'slug', 'requests', 'paths'];

// ============================================
// Pure helpers (covered by --self-test)
// ============================================

const STREAMER_ROUTE = '/[locale]/streamer/[slug]';
const GAME_HUB_ROUTE = '/[locale]/game/[slug]';
// Unprefixed (/streamer/x, rewritten to /en) or locale-prefixed (/de/streamer/x).
const STREAMER_PAGE_PATH = /^(?:\/[a-z]{2})?\/streamer\/([^/?#]+)\/?$/;

/** Streamer slug of a streamer PAGE path (not /wiki, /insights …), else null. */
export function streamerSlugFromPath(path) {
  const m = STREAMER_PAGE_PATH.exec(String(path ?? ''));
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]).toLowerCase();
  } catch {
    return m[1].toLowerCase();
  }
}

/**
 * One day's summary from the two grouped queries. `routeRows` carry
 * {route, http_status, count}; `pathRows` carry {request_path, count}.
 */
export function summarizeDay(date, routeRows, pathRows) {
  const sum = (rows) => rows.reduce((acc, r) => acc + (Number(r.count) || 0), 0);
  const byRoute = (pred) => sum(routeRows.filter((r) => pred(String(r.route ?? ''), String(r.http_status ?? ''))));

  const streamers = new Map();
  for (const r of pathRows) {
    const slug = streamerSlugFromPath(r.request_path);
    if (!slug) continue;
    const entry = streamers.get(slug) ?? { requests: 0, paths: new Set() };
    entry.requests += Number(r.count) || 0;
    entry.paths.add(r.request_path);
    streamers.set(slug, entry);
  }

  return {
    summary: {
      date,
      gb_requests_total: sum(routeRows),
      gb_streamer_page: byRoute((route) => route === STREAMER_ROUTE),
      gb_streamer_page_200: byRoute((route, status) => route === STREAMER_ROUTE && status === '200'),
      gb_streamer_subpages: byRoute((route) => route.startsWith(`${STREAMER_ROUTE}/`)),
      gb_game_hub: byRoute((route) => route === GAME_HUB_ROUTE),
      gb_robots: byRoute((route) => route === '/robots.txt'),
      gb_sitemap: byRoute((route) => route.includes('sitemap')),
      gb_distinct_streamers: streamers.size,
      gb_streamer_path_requests: [...streamers.values()].reduce((acc, e) => acc + e.requests, 0),
      truncated: routeRows.length >= ROW_LIMIT || pathRows.length >= ROW_LIMIT ? 'yes' : 'no',
    },
    paths: [...streamers.entries()]
      .sort((a, b) => b[1].requests - a[1].requests || a[0].localeCompare(b[0]))
      .map(([slug, e]) => ({ date, slug, requests: e.requests, paths: [...e.paths].sort().join(' ') })),
  };
}

function csvCell(value) {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Minimal RFC-4180 parser (quoted cells, doubled quotes, CRLF tolerant). */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || r[0] !== '');
}

export function toCsv(columns, records) {
  return [columns.join(','), ...records.map((r) => columns.map((c) => csvCell(r[c])).join(','))].join('\n') + '\n';
}

/**
 * Replace every existing row whose date is in `replaceDates` by `incoming`,
 * keep all other rows, sort by date (then input order). A summary row keeps its
 * previous `note` when the new run passes none — notes are hand-written.
 */
export function upsertByDate(existingText, columns, incoming, replaceDates) {
  const parsed = existingText ? parseCsv(existingText) : [];
  const header = parsed[0] ?? columns;
  const old = parsed.slice(1).map((cells) => Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ''])));
  const oldNotes = new Map(old.filter((r) => r.note).map((r) => [r.date, r.note]));
  const kept = old.filter((r) => !replaceDates.has(r.date));
  const merged = [
    ...kept,
    ...incoming.map((r) => ('note' in r && !r.note && oldNotes.has(r.date) ? { ...r, note: oldNotes.get(r.date) } : r)),
  ];
  merged.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return toCsv(columns, merged);
}

/** Complete UTC days ending before `nowMs`: the most recent `days` of them, oldest first. */
export function completeUtcDays(nowMs, days) {
  const today = Math.floor(nowMs / DAY_MS) * DAY_MS;
  const out = [];
  for (let i = days; i >= 1; i--) {
    const from = today - i * DAY_MS;
    out.push({ date: new Date(from).toISOString().slice(0, 10), from, to: from + DAY_MS });
  }
  return out;
}

// ============================================
// Vercel query
// ============================================

async function queryGooglebot(token, day, groupBy) {
  const body = {
    scope: { type: 'owner', ownerId: TEAM_ID, projectIds: [PROJECT_ID] },
    metric: 'vercel.request.count',
    from: day.from,
    to: day.to,
    granularity: { minutes: 1440 },
    groupBy,
    filter: "bot_name eq 'googlebot'",
    limit: ROW_LIMIT,
  };
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await fetch(`${API}?teamId=${TEAM_ID}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (res.ok) {
      const json = JSON.parse(text);
      const echoFrom = Date.parse(json.query?.startTime ?? '');
      if (echoFrom !== day.from) {
        throw new Error(
          `window for ${day.date} came back as ${json.query?.startTime}–${json.query?.endTime} ` +
            '(outside the ~2-day retention?) — skipping instead of mislabeling',
        );
      }
      if (json.query?.filter !== body.filter) {
        throw new Error(`filter was not applied (echo: ${JSON.stringify(json.query?.filter)})`);
      }
      const key = Object.keys(json.query?.rollups ?? {})[0] ?? 'vercel_request_count_sum';
      return (json.data ?? [])
        .filter((r) => Date.parse(r.timestamp) >= day.from && Date.parse(r.timestamp) < day.to)
        .map((r) => ({ ...r, count: Number(r[key]) || 0 }));
    }
    lastError = new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
    if (res.status < 500 && res.status !== 429 && !text.includes('query_timeout')) break;
  }
  throw lastError;
}

// ============================================
// CLI
// ============================================

function readToken(envFile) {
  if (process.env.VERCEL_TOKEN) return process.env.VERCEL_TOKEN.trim();
  if (!existsSync(envFile)) return null;
  const line = readFileSync(envFile, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('VERCEL_TOKEN='));
  return line ? line.slice('VERCEL_TOKEN='.length).trim().replace(/^["']|["']$/g, '') : null;
}

function parseArgs(argv) {
  const args = { days: 2, note: '', dryRun: false, selfTest: false, env: '.env.local', out: OUT_DEFAULT, pathsOut: PATHS_DEFAULT };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--days') args.days = Number(argv[++i]);
    else if (a === '--note') args.note = argv[++i] ?? '';
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--self-test') args.selfTest = true;
    else if (a === '--env') args.env = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--paths-out') args.pathsOut = argv[++i];
    else throw new Error(`unknown argument ${a}`);
  }
  if (!Number.isInteger(args.days) || args.days < 1 || args.days > 3) {
    throw new Error('--days must be 1, 2 or 3 (Vercel keeps ~2 days)');
  }
  return args;
}

function selfTest() {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`self-test failed: ${msg}`);
  };
  assert(streamerSlugFromPath('/streamer/xqc') === 'xqc', 'unprefixed page');
  assert(streamerSlugFromPath('/de/streamer/Gronkh/') === 'gronkh', 'locale prefix + trailing slash + case');
  assert(streamerSlugFromPath('/streamer/caf%C3%A9') === 'café', 'percent-decoding');
  assert(streamerSlugFromPath('/streamer/xqc/wiki') === null, 'subpage is not a page');
  assert(streamerSlugFromPath('/game/fortnite') === null, 'other routes');
  assert(streamerSlugFromPath(undefined) === null, 'undefined path');

  const { summary, paths } = summarizeDay(
    '2026-09-13',
    [
      { route: STREAMER_ROUTE, http_status: '200', count: 27 },
      { route: STREAMER_ROUTE, http_status: '404', count: 2 },
      { route: `${STREAMER_ROUTE}/wiki`, http_status: '200', count: 3 },
      { route: GAME_HUB_ROUTE, http_status: '200', count: 5 },
      { route: '/robots.txt', http_status: '200', count: 20 },
      { route: '/sitemap.xml', http_status: '200', count: 1 },
    ],
    [
      { request_path: '/streamer/xqc', count: 2 },
      { request_path: '/de/streamer/xqc', count: 1 },
      { request_path: '/streamer/gronkh', count: 4 },
      { request_path: '/streamer/gronkh/wiki', count: 3 },
    ],
  );
  assert(summary.gb_requests_total === 58, `total ${summary.gb_requests_total}`);
  assert(summary.gb_streamer_page === 29 && summary.gb_streamer_page_200 === 27, 'streamer page counts');
  assert(summary.gb_streamer_subpages === 3 && summary.gb_game_hub === 5, 'subpages + game hub');
  assert(summary.gb_robots === 20 && summary.gb_sitemap === 1, 'robots + sitemap');
  assert(summary.gb_distinct_streamers === 2 && summary.truncated === 'no', 'distinct streamers');
  assert(summary.gb_streamer_path_requests === 7, `path requests ${summary.gb_streamer_path_requests}`);
  assert(paths[0].slug === 'gronkh' && paths[1].requests === 3, 'paths sorted by requests, locales merged');
  assert(paths[1].paths === '/de/streamer/xqc /streamer/xqc', 'paths joined');

  const csv = upsertByDate(
    toCsv(['date', 'value', 'note'], [
      { date: '2026-09-12', value: '1', note: 'baseline' },
      { date: '2026-09-13', value: '2', note: 'W1 deploy, "day 0"' },
    ]),
    ['date', 'value', 'note'],
    [
      { date: '2026-09-14', value: '4', note: '' },
      { date: '2026-09-13', value: '3', note: '' },
    ],
    new Set(['2026-09-13', '2026-09-14']),
  );
  const rows = parseCsv(csv);
  assert(rows.length === 4, `upsert row count ${rows.length}`);
  assert(rows[2][0] === '2026-09-13' && rows[2][1] === '3', 'rewritten day, sorted');
  assert(rows[2][2] === 'W1 deploy, "day 0"', 'hand-written note (with comma + quotes) survives a rewrite');
  assert(rows[3][0] === '2026-09-14', 'new day appended in order');

  const days = completeUtcDays(Date.parse('2026-09-14T10:30:00Z'), 2);
  assert(days.length === 2 && days[0].date === '2026-09-12' && days[1].date === '2026-09-13', 'complete days only');
  assert(days[1].to === Date.parse('2026-09-14T00:00:00Z'), 'day window ends at midnight UTC');
  console.log('self-test ok');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) return selfTest();

  const token = readToken(args.env);
  if (!token) throw new Error(`no VERCEL_TOKEN in the environment or ${args.env}`);

  const summaries = [];
  const pathRecords = [];
  const capturedAt = new Date().toISOString();
  for (const day of completeUtcDays(Date.now(), args.days)) {
    try {
      const [routeRows, pathRows] = await Promise.all([
        queryGooglebot(token, day, ['route', 'http_status']),
        queryGooglebot(token, day, ['request_path']),
      ]);
      const { summary, paths } = summarizeDay(day.date, routeRows, pathRows);
      summaries.push({ ...summary, captured_at: capturedAt, note: args.note });
      pathRecords.push(...paths);
      console.log(
        `${day.date}: total=${summary.gb_requests_total} streamer_page=${summary.gb_streamer_page} ` +
          `(200: ${summary.gb_streamer_page_200}) distinct_streamers=${summary.gb_distinct_streamers} ` +
          `game_hub=${summary.gb_game_hub} robots=${summary.gb_robots} truncated=${summary.truncated}`,
      );
    } catch (err) {
      console.warn(`${day.date}: skipped — ${err instanceof Error ? err.message : err}`);
    }
  }

  if (summaries.length === 0) throw new Error('no day could be captured');
  if (args.dryRun) return;

  const dates = new Set(summaries.map((s) => s.date));
  mkdirSync(dirname(args.out), { recursive: true });
  const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');
  writeFileSync(args.out, upsertByDate(read(args.out), SUMMARY_COLUMNS, summaries, dates));
  writeFileSync(args.pathsOut, upsertByDate(read(args.pathsOut), PATH_COLUMNS, pathRecords, dates));
  console.log(`wrote ${summaries.length} day(s) → ${args.out}, ${pathRecords.length} streamer rows → ${args.pathsOut}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
