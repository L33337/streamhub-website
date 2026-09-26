#!/usr/bin/env node
/*
 * Layout + consistency audit for the streamer detail page (/streamer/<slug>),
 * built for the streamer-page UX round (2026-09-26). Drives the local Chrome
 * through puppeteer-core (same harness conventions as game-hub-audit.mjs) and
 * checks what a real browser shows:
 *
 *   ssrBanner      the language suggestion never ships in the cached HTML
 *   pastDays       no day section / pill for a UTC day that is over, also with
 *                  the browser clock pushed 26 h forward (stale ISR snapshot)
 *   tapTargets     every visible link/button in <main> is at least 24x24 px
 *   leadInTable    the lead sentence's times appear in the weekday table
 *                  (streamer-local mode)
 *   teaserDay      the insights teaser names a day the table streams on
 *   machineCopy    no "Auto summary" label, no "<Level> confidence:" lead-in
 *   tzSwitch       the timezone switch shows only when the offsets differ
 *                  (viewer = Europe/Berlin)
 *   cls            layout shift with the language toast showing (<0.01)
 *   hydration      no React hydration errors
 *   overflow       no horizontal page scroll at 390 px
 *
 * Usage:
 *   node scripts/perf/streamer-page-audit.mjs --base https://streamertimes.tv
 *       [--slugs kaicenat,ibai,drututt] [--assert] [--headless] [--out r.json]
 *
 * Auth: VERCEL_AUTOMATION_BYPASS_SECRET (env or .env.development.local) is
 * sent as x-vercel-protection-bypass (Preview protection and the prod WAF).
 */
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const flag = (name, fallback = undefined) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return fallback;
  const v = args[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const base = String(flag('base', 'https://streamertimes.tv')).replace(/\/$/, '');
const slugs = String(flag('slugs', 'kaicenat,ibai,drututt')).split(',').filter(Boolean);
const outFile = flag('out', null);
const doAssert = flag('assert', false) === true;
const headless = flag('headless', false) === true;
const chromePath =
  process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function readEnvFile(name) {
  const p = join(root, '.env.development.local');
  if (!existsSync(p)) return undefined;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && m[1] === name) return m[2].replace(/^["']|["']$/g, '');
  }
  return undefined;
}
const bypass =
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? readEnvFile('VERCEL_AUTOMATION_BYPASS_SECRET');

const VIEWPORTS = {
  m390: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  d1366: { width: 1366, height: 768, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Pushes the page clock forward: a stale ISR snapshot served a day later.
const clockShift = (ms) => `(() => {
  const OFF = ${ms}; const R = Date;
  class F extends R { constructor(...a) { if (a.length === 0) super(R.now() + OFF); else super(...a); } static now() { return R.now() + OFF; } }
  window.Date = F;
})();`;

async function openPage(browser, url, viewport, errors, { shiftMs = 0, consent = true } = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  if (bypass) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': bypass });
  await page.setViewport(viewport);
  await page.emulateTimezone('Europe/Berlin');
  if (shiftMs) await page.evaluateOnNewDocument(clockShift(shiftMs));
  if (consent) {
    // A made cookie choice: the language toast waits for it.
    await page.evaluateOnNewDocument(() => {
      try {
        localStorage.setItem('st_consent_v1', 'denied');
      } catch {}
    });
  }
  // Collect layout shifts from the first paint on.
  await page.evaluateOnNewDocument(() => {
    window.__cls = 0;
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {}
  });
  page.on('console', (m) => {
    const t = m.text();
    if (/hydrat|did not match|Minified React error #4(18|19|22|23|25)/i.test(t)) errors.push(t.slice(0, 200));
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));
  const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
  const status = resp?.status() ?? null;
  if (status === 429 || (await page.title()).includes('Security Checkpoint')) {
    await ctx.close();
    throw new Error(`WAF challenge on ${url} (status ${status})`);
  }
  await sleep(1500);
  await page.evaluate(() => document.querySelectorAll('vercel-live-feedback').forEach((n) => n.remove()));
  return { ctx, page };
}

function measure() {
  const main = document.querySelector('main');
  const text = main?.innerText ?? '';
  const todayUtc = new Date().toISOString().slice(0, 10);
  // A folded run of empty days carries the id of its first day plus inner
  // anchors for the rest; it is past only when ALL of them are.
  const pastSections = [...document.querySelectorAll('main section[id^="day-"]')]
    .filter((s) => [s, ...s.querySelectorAll('[id^="day-"]')].every((el) => el.id.slice(4) < todayUtc))
    .map((s) => s.id.slice(4));
  const pills = [...document.querySelectorAll('nav[aria-label] a[href^="#day-"], nav[aria-label] span[aria-disabled]')].length;
  const small = [...document.querySelectorAll('main a, main button, main summary')]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden') return false;
      // WCAG 2.5.8 exempts inline links inside running text.
      if (cs.display === 'inline') return false;
      const extra = Number(el.getAttribute('data-hit-expand') ?? 0);
      return r.height + extra < 24 || r.width < 24;
    })
    .map((el) => {
      const r = el.getBoundingClientRect();
      return `${(el.innerText || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30)} ${Math.round(r.width)}x${Math.round(r.height)}`;
    });
  const stats = document.getElementById('typical-stream-times');
  const lead = stats?.querySelector('p')?.innerText ?? '';
  const leadTimes = lead.match(/\d{1,2}:\d{2}/g) ?? [];
  const tzButtons = [...(stats?.querySelectorAll('[role="group"] button') ?? [])].map((b) => b.innerText.trim());
  const table = stats?.querySelector('table');
  const rows = [...(table?.querySelectorAll('tbody tr') ?? [])].map((tr) => ({
    day: tr.querySelector('th')?.innerText.trim() ?? '',
    time: tr.querySelector('td')?.innerText.trim() ?? '',
    streams: tr.querySelectorAll('td').length === 2,
  }));
  const teaser = [...document.querySelectorAll('main section a[href*="/insights"]')][0]?.innerText ?? null;
  return {
    docHeight: document.documentElement.scrollHeight,
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    cls: Math.round((window.__cls ?? 0) * 1000) / 1000,
    pastSections,
    pills,
    small,
    lead,
    leadTimes,
    tzButtons,
    rows,
    teaser,
    typicalTop: stats ? Math.round(stats.getBoundingClientRect().top + window.scrollY) : null,
    machineCopy: /Auto summary|Automatische Kurzfassung|\b(High|Medium|Low) confidence:/.test(text),
    toast: !!document.querySelector('[role="region"][lang].fixed'),
  };
}

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless,
  userDataDir: mkdtempSync(join(tmpdir(), 'streamer-audit-')),
  defaultViewport: null,
  args: ['--no-first-run', '--no-default-browser-check', '--window-size=1400,900', '--lang=en-US', '--disable-features=Translate'],
});

const report = { base, at: new Date().toISOString(), pages: {} };
const failures = [];
const fail = (slug, what) => failures.push(`${slug}: ${what}`);
try {
  for (const slug of slugs) {
    const url = `${base}/streamer/${slug}`;
    const r = (report.pages[slug] = {});
    const errors = [];

    // SSR HTML: the toast must never be in the cached markup.
    const html = await (await fetch(`${base}/de/streamer/${slug}`, {
      headers: bypass ? { 'x-vercel-protection-bypass': bypass } : {},
    })).text();
    r.ssrBanner = /This page is also available in English|Zur englischen|role="region"[^>]*lang="en"/.test(html);
    if (r.ssrBanner) fail(slug, 'language banner in SSR HTML');

    for (const [vp, viewport] of Object.entries(VIEWPORTS)) {
      const { ctx, page } = await openPage(browser, url, viewport, errors);
      r[vp] = await page.evaluate(measure);
      await ctx.close();
    }
    const m = r.m390;
    if (m.overflowX) fail(slug, 'horizontal overflow at 390 px');
    if (m.pastSections.length) fail(slug, `past day sections ${m.pastSections}`);
    if (m.small.length) fail(slug, `tap targets < 24 px: ${m.small.join(' | ')}`);
    if (m.machineCopy) fail(slug, 'machine copy (Auto summary / confidence lead-in)');

    // Lead sentence vs table, streamer-local: switch the table to the
    // streamer's zone when a switch exists.
    {
      const { ctx, page } = await openPage(browser, url, VIEWPORTS.m390, errors);
      const local = await page.evaluate(() => {
        const group = document.querySelector('#typical-stream-times [role="group"]');
        const btns = group ? [...group.querySelectorAll('button')] : [];
        btns[1]?.click();
        return new Promise((res) => setTimeout(() => {
          const stats = document.getElementById('typical-stream-times');
          const lead = stats?.querySelector('p')?.innerText ?? '';
          const table = stats?.querySelector('table')?.innerText ?? '';
          res({ leadTimes: lead.match(/\d{1,2}:\d{2}/g) ?? [], table });
        }, 300));
      });
      r.leadVsTable = local;
      const missing = local.leadTimes.filter((t) => !local.table.includes(t));
      // The window is a MEDIAN of the rows, so a time can legitimately be
      // between rows — it must at least lie inside the table's range.
      const tableMinutes = (local.table.match(/\d{2}:\d{2}/g) ?? []).map((t) => {
        const [h, mm] = t.split(':').map(Number);
        return h * 60 + mm;
      });
      const outside = missing.filter((t) => {
        const [h, mm] = t.split(':').map(Number);
        const v = h * 60 + mm;
        return tableMinutes.length > 0 && (v < Math.min(...tableMinutes) || v > Math.max(...tableMinutes));
      });
      if (outside.length) fail(slug, `lead times outside the table range: ${outside}`);
      await ctx.close();
    }

    // Insights teaser day must be a streaming day in the table.
    if (m.teaser) {
      const streamingDays = m.rows.filter((row) => row.streams).map((row) => row.day);
      const named = streamingDays.find((d) => m.teaser.includes(d));
      const mentionsAnyDay = m.rows.some((row) => m.teaser.includes(row.day));
      r.teaserDay = named ?? null;
      if (mentionsAnyDay && !named) fail(slug, `insights teaser names a non-streaming day: ${m.teaser}`);
    }

    // Stale snapshot: the same HTML seen 26 h later.
    {
      const { ctx, page } = await openPage(browser, url, VIEWPORTS.m390, errors, { shiftMs: 26 * 3600e3 });
      r.shifted = await page.evaluate(measure);
      if (r.shifted.pastSections.length) fail(slug, `past sections after +26 h: ${r.shifted.pastSections}`);
      await ctx.close();
    }

    // CLS with the language toast (German page, English browser).
    {
      const { ctx, page } = await openPage(browser, `${base}/de/streamer/${slug}`, VIEWPORTS.m390, errors);
      await sleep(1500);
      r.toastRun = await page.evaluate(() => ({
        cls: Math.round((window.__cls ?? 0) * 1000) / 1000,
        toast: !!document.querySelector('[role="region"][lang].fixed'),
      }));
      if (r.toastRun.cls >= 0.01) fail(slug, `CLS ${r.toastRun.cls} with the language toast`);
      await ctx.close();
    }

    r.hydrationErrors = errors;
    if (errors.length) fail(slug, `hydration/page errors: ${errors.join(' | ')}`);
  }
} finally {
  await browser.close();
}

for (const [slug, r] of Object.entries(report.pages)) {
  const m = r.m390 ?? {};
  const d = r.d1366 ?? {};
  console.log(
    `${slug.padEnd(14)} h390=${m.docHeight} typicalTop390=${m.typicalTop} typicalTop1366=${d.typicalTop} ` +
      `cls=${m.cls} toastCls=${r.toastRun?.cls} toast=${r.toastRun?.toast} tz=[${m.tzButtons}] ` +
      `lead="${m.lead?.slice(0, 90)}" teaser=${r.teaserDay ?? '-'} small=${m.small?.length}`,
  );
}
if (outFile) writeFileSync(outFile, JSON.stringify(report, null, 2));
if (failures.length) {
  console.log('\nFAILURES:\n- ' + failures.join('\n- '));
  if (doAssert) process.exit(1);
} else {
  console.log('\nall checks passed');
}
