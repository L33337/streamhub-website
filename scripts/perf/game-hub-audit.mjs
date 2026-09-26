#!/usr/bin/env node
/*
 * Layout + interaction audit for the game hub (/game/<slug>), built for the
 * game-hub UX round (2026-09-24). Drives the locally installed Chrome through
 * puppeteer-core and reports what a real browser lays out — section offsets,
 * document height, the sticky zone, tap-target overlaps, the heatmap's colour
 * spread, horizontal overflow — plus the interactions that the collapsed
 * schedule has to survive (day pills, ranking deep links, inbound #day-
 * hashes, filters). Works against the old markup too, so the same run gives
 * the production baseline and the preview result.
 *
 * Usage:
 *   node scripts/perf/game-hub-audit.mjs --base https://streamertimes.tv
 *       [--slugs valorant,just-chatting] [--locales en,de,pl,ru,ja,ar]
 *       [--out result.json] [--assert] [--headless]
 *
 * --assert exits non-zero when a post-round target is missed (see TARGETS).
 * Auth against the Vercel WAF / preview protection: VERCEL_AUTOMATION_BYPASS_SECRET
 * (env or .env.development.local) is sent as x-vercel-protection-bypass.
 * Headful by default — headless Chrome is challenged even with the header.
 */
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// ---------- args ----------
const args = process.argv.slice(2);
const flag = (name, fallback = undefined) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return fallback;
  const v = args[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const base = String(flag('base', 'https://streamertimes.tv')).replace(/\/$/, '');
const slugs = String(flag('slugs', 'valorant,just-chatting')).split(',').filter(Boolean);
const locales = String(flag('locales', 'en,de,pl,ru,ja,ar')).split(',').filter(Boolean);
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
if (!bypass) console.warn('warning: no VERCEL_AUTOMATION_BYPASS_SECRET — the WAF may challenge the runs');

// Post-round targets (390 px unless noted). Only enforced with --assert.
const TARGETS = {
  docHeightMobile: 8000,
  firstLiveTopMobile: 700,
  stickyZoneMobile: 120,
  icsOverlaps: 0,
  followersHidden: 0,
  heatmapMedianAlphaMax: 0.55,
  htmlBytesMax: 800_000,
  overflow320: 0,
  hydrationErrors: 0,
};

const VIEWPORTS = {
  m390: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  m320: { width: 320, height: 568, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  d1366: { width: 1366, height: 768, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- in-page measurement ----------
function measure() {
  const vw = window.innerWidth;
  const q = (s, r = document) => Array.from(r.querySelectorAll(s));
  const topOf = (el) => (el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : null);
  const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const sectionIds = ['watching-now', 'most-followed', 'stream-times', 'best-time', 'schedule', 'related-games'];
  const sections = {};
  for (const id of sectionIds) {
    const el = document.getElementById(id);
    sections[id] = el ? { top: topOf(el), h: Math.round(el.getBoundingClientRect().height), visible: visible(el) } : null;
  }
  const firstLive = q('#watching-now li[data-game-live-id]').find(visible) ?? null;
  const daySections = q('section[data-day]');
  const slots = q('li[data-slot]');
  const visibleSlots = slots.filter(visible);

  // Sticky zone: header + any sticky element pinned right under it.
  const header = document.querySelector('header');
  const dayNav = document.querySelector('#schedule nav');
  const stickyZone =
    (header ? Math.round(header.getBoundingClientRect().height) : 0) +
    (dayNav && getComputedStyle(dayNav).position === 'sticky' ? Math.round(dayNav.getBoundingClientRect().height) : 0);

  // Ranking: every follower cell must lie inside the viewport.
  const followerCells = q('#most-followed tbody td.text-accent-cyan').filter(visible);
  const followersHidden = followerCells.filter((td) => {
    const r = td.getBoundingClientRect();
    return r.right > vw + 1 || r.width === 0;
  }).length;

  // .ics button vs. the status line of the card it overlays.
  let icsChecked = 0;
  let icsOverlaps = 0;
  for (const li of visibleSlots) {
    const btn = li.querySelector('button');
    const status = li.querySelector('article span.truncate');
    if (!btn || !status || !visible(btn) || !visible(status)) continue;
    icsChecked++;
    const b = btn.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(status);
    const t = range.getBoundingClientRect();
    const s = status.getBoundingClientRect();
    const textRight = Math.min(t.right, s.right);
    const clipped = status.scrollWidth > status.clientWidth + 1;
    const vOverlap = t.bottom > b.top && t.top < b.bottom;
    if (vOverlap && (textRight > b.left || clipped && s.right > b.left)) icsOverlaps++;
  }

  // Heatmap colour spread (grid cells carry inline rgba(0, 240, 255, a)).
  const alphas = q('#stream-times [style*="rgba(0, 240, 255"]')
    .filter((el) => visible(el) && el.getBoundingClientRect().height >= 8 && el.getBoundingClientRect().width >= 8)
    .map((el) => Number((el.style.backgroundColor.match(/rgba\(0, 240, 255, ([\d.]+)\)/) ?? [])[1]))
    .filter((a) => Number.isFinite(a))
    .sort((a, b) => a - b);
  const pct = (p) => (alphas.length ? alphas[Math.floor(p * (alphas.length - 1))] : null);
  const heatmapScroll = document.querySelector('#stream-times .overflow-x-auto');

  const overflow = q('body *')
    .filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.right <= vw + 1) return false;
      if (getComputedStyle(el).position === 'fixed') return false;
      return !el.closest('.overflow-x-auto, [class*="overflow-x-auto"], [class*="overflow-hidden"], .truncate');
    })
    .slice(0, 10)
    .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)} "${(el.textContent ?? '').trim().slice(0, 30)}"`);

  return {
    vw,
    docH: document.documentElement.scrollHeight,
    docW: document.documentElement.scrollWidth,
    h1: document.querySelector('h1')?.textContent?.trim() ?? null,
    h1Top: topOf(document.querySelector('h1')),
    intro: document.querySelector('main h1 ~ p')?.textContent?.trim() ?? null,
    heroBottom: document.querySelector('main h1')?.closest('div.flex')
      ? Math.round(document.querySelector('main h1').closest('div.flex').getBoundingClientRect().bottom + window.scrollY)
      : null,
    chips: q('li', document.querySelector('main h1')?.parentElement?.querySelector('ul[aria-label]') ?? document.createElement('ul')).map((li) => li.textContent.trim()),
    nextUp: document.querySelector('[data-next-up]')?.textContent?.trim() ?? null,
    sections,
    firstLiveTop: topOf(firstLive),
    firstDayTop: topOf(daySections.find(visible)),
    days: daySections.length,
    daysVisible: daySections.filter(visible).length,
    slots: slots.length,
    slotsVisible: visibleSlots.length,
    fullCardsVisible: visibleSlots.filter((li) => li.querySelector('article')).length,
    stickyZone,
    followersChecked: followerCells.length,
    followersHidden,
    icsChecked,
    icsOverlaps,
    heatmap: {
      cells: alphas.length,
      min: pct(0),
      median: pct(0.5),
      p90: pct(0.9),
      above05: alphas.filter((a) => a > 0.5).length,
      hScroll: heatmapScroll ? heatmapScroll.scrollWidth > heatmapScroll.clientWidth + 1 : false,
    },
    headings: q('main h2, main h3').filter(visible).slice(0, 14).map((h) => `${h.tagName}:${h.textContent.trim().slice(0, 40)}`),
    overflow,
    hasBrokenText: /undefined|\bNaN\b|\[object/.test(document.body.innerText),
  };
}

// ---------- page helpers ----------
async function openPage(browser, url, viewport, consoleErrors) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  if (bypass) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': bypass, 'accept-language': 'en-US,en;q=0.9' });
  await page.setViewport(viewport);
  page.on('console', (m) => {
    const t = m.text();
    if (/hydrat|did not match|Minified React error #4(18|19|22|23|25)/i.test(t)) consoleErrors.push(t.slice(0, 200));
  });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${String(e).slice(0, 200)}`));
  const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
  const status = resp?.status() ?? null;
  if (status === 429 || (await page.title()).includes('Security Checkpoint')) {
    await ctx.close();
    throw new Error(`WAF challenge on ${url} (status ${status})`);
  }
  await sleep(1200);
  // Dismiss the cookie + locale banners so they do not skew fold metrics, and
  // drop the Vercel preview toolbar (preview deployments only, never in
  // production), which otherwise swallows clicks in the lower right.
  await page.evaluate(() => {
    document.querySelectorAll('vercel-live-feedback').forEach((n) => n.remove());
    for (const b of document.querySelectorAll('button')) {
      if (/^(Reject|Ablehnen)$/.test(b.textContent.trim())) b.click();
    }
    for (const b of document.querySelectorAll('button[aria-label]')) {
      if (/dismiss|schließen|close/i.test(b.getAttribute('aria-label') ?? '')) b.click();
    }
  });
  await sleep(500);
  return { ctx, page, status };
}

async function htmlBytes(url) {
  const r = await fetch(url, { headers: bypass ? { 'x-vercel-protection-bypass': bypass } : {} });
  const text = await r.text();
  return { status: r.status, bytes: Buffer.byteLength(text, 'utf8'), cache: r.headers.get('x-vercel-cache') };
}

/**
 * The site scrolls smoothly (html { scroll-behavior: smooth }), and a jump into
 * day 5 travels ~7,000px — measuring after a fixed delay caught it mid-flight.
 * Wait until scrollY has not moved for 300ms (max 5s).
 */
async function waitScrollSettled(page) {
  let last = -1;
  let stableSince = Date.now();
  const start = Date.now();
  while (Date.now() - start < 5000) {
    const y = await page.evaluate(() => Math.round(window.scrollY));
    if (y !== last) {
      last = y;
      stableSince = Date.now();
    } else if (Date.now() - stableSince >= 300) {
      return;
    }
    await sleep(50);
  }
}

/** Real mouse click on the element (scrolled into view instantly first). */
async function realClick(page, selector) {
  // The preview toolbar is injected lazily, so remove it right before clicking.
  await page.evaluate(() => document.querySelectorAll('vercel-live-feedback').forEach((n) => n.remove()));
  const el = await page.$(selector);
  if (!el) return false;
  await el.evaluate((n) => n.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }));
  await waitScrollSettled(page);
  const box = await el.boundingBox();
  if (!box) return false;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  // Something else on top of the target (sticky bar, banner, FAB) would eat
  // the click; report it instead of silently clicking the wrong element.
  const blocker = await el.evaluate((n, px, py) => {
    const hit = document.elementFromPoint(px, py);
    return hit && (hit === n || n.contains(hit))
      ? null
      : `${hit?.tagName ?? 'nothing'}.${String(hit?.className ?? '').slice(0, 50)}`;
  }, x, y);
  if (blocker) return `blocked by ${blocker} at ${Math.round(x)},${Math.round(y)}`;
  await page.mouse.click(x, y);
  await sleep(150);
  await waitScrollSettled(page);
  return true;
}

/** Is `#day-<key>` painted and scrolled near the top of the viewport? */
async function dayIsShownNearTop(page, key) {
  return page.evaluate((k) => {
    const el = document.getElementById(`day-${k}`);
    if (!el || el.getClientRects().length === 0) return { shown: false, top: null };
    const top = Math.round(el.getBoundingClientRect().top);
    return { shown: true, top, nearTop: top >= -5 && top < 320 };
  }, key);
}

async function interactions(browser, url, consoleErrors) {
  const out = {};
  const { ctx, page } = await openPage(browser, url, VIEWPORTS.m390, consoleErrors);
  try {
    const collapsed = await page.evaluate(() =>
      Array.from(document.querySelectorAll('section[data-day]'))
        .filter((s) => s.getClientRects().length === 0 && !s.hidden)
        .map((s) => s.id.replace(/^day-/, '')),
    );
    out.collapsedDays = collapsed;
    const toggle = await page.$('[data-schedule-toggle]');
    out.hasToggle = !!toggle;
    if (collapsed.length > 0) {
      // (a) day pill of a collapsed day expands + scrolls (real mouse click on
      // the sticky pill, like a thumb would)
      const key = collapsed[collapsed.length - 1];
      await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = 'auto';
        document.querySelector('#schedule').scrollIntoView({ block: 'start' });
        document.documentElement.style.scrollBehavior = '';
      });
      await waitScrollSettled(page);
      const clicked = await realClick(page, `#schedule nav a[href="#day-${key}"]`);
      out.pillExpands = { click: clicked, ...(await dayIsShownNearTop(page, key)) };
      // (g) "show fewer" collapses again and scrolls to the schedule
      await realClick(page, '[data-schedule-toggle]');
      out.collapseAgain = await page.evaluate((k) => {
        const el = document.getElementById(`day-${k}`);
        return { hidden: !!el && el.getClientRects().length === 0 };
      }, key);
      // (b) ranking deep link into a collapsed day (if the table links one)
      const rankKey = await page.evaluate((keys) => {
        const a = Array.from(document.querySelectorAll('#most-followed a[href^="#day-"]')).find(
          (x) => keys.includes(x.getAttribute('href').slice(5)) && x.getClientRects().length > 0,
        );
        return a ? a.getAttribute('href').slice(5) : null;
      }, collapsed);
      if (rankKey) {
        // The visible copy of the link (mobile: inside the streamer cell).
        const sel = `#most-followed a[href="#day-${rankKey}"]`;
        const idx = await page.evaluate(
          (s) => Array.from(document.querySelectorAll(s)).findIndex((x) => x.getClientRects().length > 0),
          sel,
        );
        await page.evaluate(
          (s, i) => Array.from(document.querySelectorAll(s))[i].setAttribute('data-audit-target', ''),
          sel,
          idx,
        );
        await realClick(page, '[data-audit-target]');
        out.rankingDeepLink = { key: rankKey, ...(await dayIsShownNearTop(page, rankKey)) };
      } else out.rankingDeepLink = 'no ranking link into a collapsed day';
    }
    await ctx.close();

    // (h) the hero "next up" row jumps to its (open) day
    const nu = await openPage(browser, url, VIEWPORTS.m390, consoleErrors);
    const nextHref = await nu.page.evaluate(() => document.querySelector('[data-next-up]')?.getAttribute('href') ?? null);
    if (nextHref?.startsWith('#day-')) {
      await realClick(nu.page, '[data-next-up]');
      out.nextUp = { href: nextHref, ...(await dayIsShownNearTop(nu.page, nextHref.slice(5))) };
    } else out.nextUp = nextHref ?? 'no next-up row';
    await nu.ctx.close();

    if (collapsed.length > 0) {
      // (c) inbound hash to a collapsed day
      const key = collapsed[0];
      const hashRun = await openPage(browser, `${url}#day-${key}`, VIEWPORTS.m390, consoleErrors);
      await waitScrollSettled(hashRun.page);
      out.inboundHash = { key, ...(await dayIsShownNearTop(hashRun.page, key)) };
      await hashRun.ctx.close();
    }

    // (d/e) filters: every non-filtered day must be visible, toggle gone
    const f = await openPage(browser, url, VIEWPORTS.m390, consoleErrors);
    for (const label of [/low confidence|niedrig/i, /^YouTube$/]) {
      const clicked = await f.page.evaluate((src, flags) => {
        const re = new RegExp(src, flags);
        const b = Array.from(document.querySelectorAll('#schedule [role="group"] button')).find((x) => re.test(x.textContent.trim()));
        if (!b) return false;
        b.click();
        return true;
      }, label.source, label.flags);
      if (!clicked) continue;
      await sleep(500);
      out[`filter_${label.source.slice(0, 12)}`] = await f.page.evaluate(() => {
        const days = Array.from(document.querySelectorAll('section[data-day]'));
        const notFiltered = days.filter((d) => !d.hidden);
        return {
          notFilteredDays: notFiltered.length,
          paintedDays: notFiltered.filter((d) => d.getClientRects().length > 0).length,
          togglePainted: !!document.querySelector('[data-schedule-toggle]')?.getClientRects().length,
        };
      });
      // undo
      await f.page.evaluate((src, flags) => {
        const re = new RegExp(src, flags);
        Array.from(document.querySelectorAll('#schedule [role="group"] button')).find((x) => re.test(x.textContent.trim()))?.click();
        Array.from(document.querySelectorAll('#schedule [role="group"] button'))[0]?.click();
      }, label.source, label.flags);
      await sleep(300);
    }
    // (f) live language filter: the visible cards all match the chosen language
    out.liveLanguage = await f.page.evaluate(() => {
      const sel = document.querySelector('#watching-now select');
      if (!sel || sel.options.length < 2) return 'no language choice';
      return `options=${sel.options.length}`;
    });
    await f.ctx.close();
  } catch (err) {
    out.error = String(err?.message ?? err);
    try { await ctx.close(); } catch {}
  }
  return out;
}

// ---------- no-JS: collapsed days must be readable ----------
async function noScript(browser, url) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  if (bypass) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': bypass });
  await page.setJavaScriptEnabled(false);
  await page.setViewport(VIEWPORTS.m390);
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 90000 });
    return await page.evaluate(() => {
      const days = Array.from(document.querySelectorAll('section[data-day]'));
      return {
        days: days.length,
        painted: days.filter((d) => d.getClientRects().length > 0).length,
        toggleVisible: !!document.querySelector('[data-schedule-toggle]')?.getClientRects().length,
      };
    });
  } catch (err) {
    return { error: String(err?.message ?? err) };
  } finally {
    await ctx.close();
  }
}

// ---------- main ----------
const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless,
  userDataDir: mkdtempSync(join(tmpdir(), 'game-audit-')),
  defaultViewport: null,
  args: ['--no-first-run', '--no-default-browser-check', '--window-size=1400,900', '--lang=en-US', '--disable-features=Translate'],
});

const report = { base, at: new Date().toISOString(), pages: {} };
const failures = [];
try {
  for (const slug of slugs) {
    const url = `${base}/game/${slug}`;
    const consoleErrors = [];
    const entry = { url, html: await htmlBytes(url), viewports: {} };
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      const { ctx, page, status } = await openPage(browser, url, vp, consoleErrors);
      entry.viewports[vpName] = { status, ...(await page.evaluate(measure)) };
      await ctx.close();
    }
    entry.interactions = await interactions(browser, url, consoleErrors);
    entry.noScript = await noScript(browser, url);
    entry.consoleErrors = consoleErrors;
    report.pages[slug] = entry;

    const m = entry.viewports.m390;
    const d = entry.viewports.d1366;
    const s = entry.viewports.m320;
    console.log(`\n== ${url}  html ${Math.round(entry.html.bytes / 1024)} KB (${entry.html.cache})`);
    console.log(`  390: docH ${m.docH} | hero→${m.heroBottom} | firstLive ${m.firstLiveTop} | firstDay ${m.firstDayTop} | schedule h ${m.sections.schedule?.h ?? '-'} | days ${m.daysVisible}/${m.days} | slots ${m.slotsVisible}/${m.slots} (full ${m.fullCardsVisible}) | sticky ${m.stickyZone}`);
    console.log(`       ics ${m.icsOverlaps}/${m.icsChecked} overlap | followers hidden ${m.followersHidden}/${m.followersChecked} | heatmap hScroll ${m.heatmap.hScroll} cells ${m.heatmap.cells}`);
    console.log(`  320: docW ${s.docW} | overflow ${s.overflow.length} | followers hidden ${s.followersHidden}/${s.followersChecked} | ics ${s.icsOverlaps}/${s.icsChecked}`);
    console.log(`  1366: docH ${d.docH} | heatmap alpha min ${d.heatmap.min} median ${d.heatmap.median} p90 ${d.heatmap.p90} >0.5: ${d.heatmap.above05}/${d.heatmap.cells}`);
    console.log(`  h1: ${m.h1}`);
    console.log(`  intro: ${m.intro}`);
    console.log(`  chips: ${m.chips.join(' | ')}`);
    console.log(`  next up: ${m.nextUp}`);
    console.log(`  interactions: ${JSON.stringify(entry.interactions)}`);
    console.log(`  noScript: ${JSON.stringify(entry.noScript)} | console: ${consoleErrors.length}`);

    if (doAssert) {
      const check = (ok, msg) => { if (!ok) failures.push(`${slug}: ${msg}`); };
      check(m.docH <= TARGETS.docHeightMobile, `390 docH ${m.docH} > ${TARGETS.docHeightMobile}`);
      if (m.firstLiveTop != null) check(m.firstLiveTop <= TARGETS.firstLiveTopMobile, `firstLive ${m.firstLiveTop} > ${TARGETS.firstLiveTopMobile}`);
      check(m.stickyZone <= TARGETS.stickyZoneMobile, `sticky ${m.stickyZone} > ${TARGETS.stickyZoneMobile}`);
      check(m.icsOverlaps + s.icsOverlaps + d.icsOverlaps === 0, `ics overlaps 390=${m.icsOverlaps} 320=${s.icsOverlaps} 1366=${d.icsOverlaps}`);
      check(m.followersHidden + s.followersHidden === 0, `followers hidden 390=${m.followersHidden} 320=${s.followersHidden}`);
      if (d.heatmap.median != null) check(d.heatmap.median <= TARGETS.heatmapMedianAlphaMax, `heatmap median ${d.heatmap.median}`);
      check(!m.heatmap.hScroll, 'heatmap scrolls horizontally on mobile');
      check(entry.html.bytes <= TARGETS.htmlBytesMax, `html ${entry.html.bytes} B`);
      check(s.docW <= s.vw, `320 document overflow ${s.docW}`);
      check(consoleErrors.length <= TARGETS.hydrationErrors, `console: ${consoleErrors.join(' / ')}`);
      const it = entry.interactions;
      if (typeof it.nextUp === 'object') check(it.nextUp.nearTop === true, `next-up jump ${JSON.stringify(it.nextUp)}`);
      if (it.collapsedDays?.length) {
        check(it.pillExpands?.nearTop === true, `pill → collapsed day ${JSON.stringify(it.pillExpands)}`);
        check(it.collapseAgain?.hidden === true, 'show-fewer did not collapse');
        check(it.inboundHash?.nearTop === true, `inbound hash ${JSON.stringify(it.inboundHash)}`);
        if (typeof it.rankingDeepLink === 'object') check(it.rankingDeepLink.nearTop === true, `ranking deep link ${JSON.stringify(it.rankingDeepLink)}`);
        for (const [k, v] of Object.entries(it)) {
          if (k.startsWith('filter_') && v) check(v.paintedDays === v.notFilteredDays && !v.togglePainted, `${k} ${JSON.stringify(v)}`);
        }
      }
      if (entry.noScript.days) check(entry.noScript.painted === entry.noScript.days, `no-JS days ${JSON.stringify(entry.noScript)}`);
    }
  }

  // Locale smoke at 320 px on the first slug.
  report.locales = {};
  for (const lang of locales) {
    const url = lang === 'en' ? `${base}/game/${slugs[0]}` : `${base}/${lang}/game/${slugs[0]}`;
    const consoleErrors = [];
    const { ctx, page } = await openPage(browser, url, VIEWPORTS.m320, consoleErrors);
    const m = await page.evaluate(measure);
    await ctx.close();
    report.locales[lang] = { url, docW: m.docW, overflow: m.overflow, h1: m.h1, broken: m.hasBrokenText, consoleErrors };
    console.log(`  [${lang}] 320 docW ${m.docW} overflow ${m.overflow.length} broken ${m.hasBrokenText} console ${consoleErrors.length} | ${m.h1}`);
    if (doAssert) {
      if (m.docW > 320) failures.push(`${lang}: document overflow ${m.docW}`);
      if (m.hasBrokenText) failures.push(`${lang}: broken text (undefined/NaN)`);
      if (consoleErrors.length) failures.push(`${lang}: console ${consoleErrors.join(' / ')}`);
    }
  }
} finally {
  await browser.close();
}

if (outFile && outFile !== true) {
  writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(`\nwrote ${outFile}`);
}
if (doAssert) {
  if (failures.length) {
    console.log(`\nASSERT FAILED (${failures.length}):\n  - ${failures.join('\n  - ')}`);
    process.exit(1);
  }
  console.log('\nASSERT OK');
}
