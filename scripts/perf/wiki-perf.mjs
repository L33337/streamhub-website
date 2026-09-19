#!/usr/bin/env node
/*
 * Real-browser perf harness for a page (built for the wiki perf round,
 * 2026-09-19; works for any URL). Drives the locally installed Chrome through
 * puppeteer-core with DevTools throttling and reports what a real browser
 * observed — NOT a Lighthouse/Lantern simulation, which reported a 7.1 s LCP
 * for a page whose observed LCP is 1.8 s (audit 2026-09-18).
 *
 * Scenarios (interleaved per run so drift hits every scenario equally, fresh
 * browser context = cold cache per run):
 *   mobile   412x915 @ DPR 2.625, touch, Slow 4G (1.6 Mbps / 750 Kbps / 150 ms), CPU 4x
 *   desktop  1366x768, no throttling
 *
 * Per run it records TTFB, FCP, LCP (+ element), load, CLS, long tasks
 * (TBT-ish = sum of task time above 50 ms), request count and bytes by type,
 * and the list of RSC prefetches (`_rsc` requests with their
 * `next-router-segment-prefetch` header). Optional phases: --scroll (to the
 * footer) and --hover <css selector> (e.g. the header logo) each report the
 * requests they triggered on top of the initial load.
 *
 * Usage:
 *   node scripts/perf/wiki-perf.mjs --url https://streamertimes.tv/streamer/timthetatman/wiki
 *       [--runs 5] [--scenario mobile|desktop|all] [--scroll] [--hover "header a[href='/']"]
 *       [--chrome "C:\\...\\chrome.exe"] [--out result.json] [--headless]
 *
 * Auth against the Vercel WAF / preview protection: the bypass secret is read
 * from VERCEL_AUTOMATION_BYPASS_SECRET (env or .env.development.local) and sent
 * as the x-vercel-protection-bypass header. Chrome runs HEADFUL by default:
 * headless Chrome is challenged by the WAF even with the header
 * (memory: reference_vercel_preview_bypass).
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
const url = flag('url');
if (!url || url === true) {
  console.error('usage: node scripts/perf/wiki-perf.mjs --url <url> [--runs 5] [--scenario all] [--scroll] [--hover <selector>] [--out file.json]');
  process.exit(2);
}
const runs = Number(flag('runs', 5)) || 5;
const scenarioArg = String(flag('scenario', 'all'));
const doScroll = flag('scroll', false) === true;
const hoverSelector = flag('hover', null);
const outFile = flag('out', null);
const headless = flag('headless', false) === true;
const chromePath =
  flag('chrome', null) ??
  process.env.CHROME_PATH ??
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
if (!existsSync(chromePath)) {
  console.error(`Chrome not found at ${chromePath} — pass --chrome or set CHROME_PATH`);
  process.exit(2);
}

// ---------- bypass secret ----------
function readEnvFile(name) {
  const p = join(root, '.env.development.local');
  if (!existsSync(p)) return undefined;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && m[1] === name) return m[2].replace(/^["']|["']$/g, '');
  }
  return undefined;
}
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? readEnvFile('VERCEL_AUTOMATION_BYPASS_SECRET');
if (!bypass) console.warn('warning: no VERCEL_AUTOMATION_BYPASS_SECRET — the WAF may challenge the runs');

// ---------- scenarios ----------
const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const SCENARIOS = {
  mobile: {
    viewport: { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true },
    userAgent: MOBILE_UA,
    // DevTools "Slow 4G" preset.
    network: { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 },
    cpu: 4,
  },
  desktop: {
    viewport: { width: 1366, height: 768, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
    userAgent: null,
    network: null,
    cpu: 1,
  },
};
const scenarios = scenarioArg === 'all' ? Object.keys(SCENARIOS) : scenarioArg.split(',');
for (const s of scenarios) {
  if (!SCENARIOS[s]) {
    console.error(`unknown scenario ${s}`);
    process.exit(2);
  }
}

// ---------- observers injected before any page script ----------
const OBSERVER_SCRIPT = `
  window.__perf = { lcp: null, cls: 0, longTasks: [] };
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        const el = e.element;
        window.__perf.lcp = {
          time: e.renderTime || e.loadTime || e.startTime,
          size: e.size,
          url: e.url || null,
          element: el ? (el.tagName + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0, 2).join('.') : '')) : null,
          text: el && el.textContent ? el.textContent.slice(0, 60) : null,
        };
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {}
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__perf.longTasks.push({ start: e.startTime, duration: e.duration });
    }).observe({ type: 'longtask', buffered: true });
  } catch {}
`;

const median = (a) => {
  const s = a.filter((x) => typeof x === 'number' && !Number.isNaN(x)).sort((x, y) => x - y);
  if (s.length === 0) return NaN;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function typeOf(cdpType, mime, reqUrl) {
  if (reqUrl.includes('_rsc=')) return 'rsc';
  if (cdpType === 'Document') return 'document';
  if (cdpType === 'Script') return 'script';
  if (cdpType === 'Stylesheet') return 'style';
  if (cdpType === 'Image' || /^image\//.test(mime)) return 'image';
  if (cdpType === 'Font') return 'font';
  if (cdpType === 'Fetch' || cdpType === 'XHR') return 'fetch';
  return 'other';
}

async function settle(page, idleMs = 1500, timeout = 20000) {
  try {
    await page.waitForNetworkIdle({ idleTime: idleMs, timeout });
  } catch {
    // Long-polling/analytics can keep the network busy; carry on with what we have.
  }
}

async function runOnce(browser, scenarioName) {
  const sc = SCENARIOS[scenarioName];
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const cdp = await page.createCDPSession();

  // Network accounting.
  const requests = new Map(); // requestId -> { url, type, headers, bytes, status, phase }
  let phase = 'load';
  await cdp.send('Network.enable');
  cdp.on('Network.requestWillBeSent', (e) => {
    requests.set(e.requestId, {
      url: e.request.url,
      type: e.type ?? 'Other',
      headers: Object.fromEntries(Object.entries(e.request.headers).map(([k, v]) => [k.toLowerCase(), v])),
      bytes: 0,
      status: null,
      mime: '',
      phase,
    });
  });
  cdp.on('Network.requestWillBeSentExtraInfo', (e) => {
    const r = requests.get(e.requestId);
    if (r) Object.assign(r.headers, Object.fromEntries(Object.entries(e.headers).map(([k, v]) => [k.toLowerCase(), v])));
  });
  cdp.on('Network.responseReceived', (e) => {
    const r = requests.get(e.requestId);
    if (r) {
      r.status = e.response.status;
      r.mime = e.response.mimeType ?? '';
      r.fromCache = e.response.fromDiskCache || e.response.fromPrefetchCache || false;
    }
  });
  cdp.on('Network.loadingFinished', (e) => {
    const r = requests.get(e.requestId);
    if (r) r.bytes = e.encodedDataLength;
  });

  if (bypass) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': bypass });
  if (sc.userAgent) await page.setUserAgent(sc.userAgent);
  await page.setViewport(sc.viewport);
  if (sc.network) await cdp.send('Network.emulateNetworkConditions', sc.network);
  if (sc.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: sc.cpu });
  await page.evaluateOnNewDocument(OBSERVER_SCRIPT);

  const result = { scenario: scenarioName, ok: false };
  try {
    const t0 = Date.now();
    const response = await page.goto(url, { waitUntil: 'load', timeout: 90000 });
    result.status = response?.status() ?? null;
    result.cache = response?.headers()['x-vercel-cache'] ?? null;
    if (result.status === 429 || (await page.title()).includes('Security Checkpoint')) {
      throw new Error(`WAF challenge (status ${result.status})`);
    }
    await settle(page);
    // Give LCP a moment to finalise after network idle.
    await sleep(500);

    const nav = await page.evaluate(() => {
      const n = performance.getEntriesByType('navigation')[0];
      const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      return {
        ttfb: n ? n.responseStart : null,
        fcp: fcp ? fcp.startTime : null,
        load: n ? n.loadEventEnd : null,
        domContentLoaded: n ? n.domContentLoadedEventEnd : null,
        perf: window.__perf,
      };
    });
    result.ttfb = nav.ttfb;
    result.fcp = nav.fcp;
    result.load = nav.load;
    result.lcp = nav.perf.lcp?.time ?? null;
    result.lcpElement = nav.perf.lcp
      ? `${nav.perf.lcp.element ?? '?'}${nav.perf.lcp.url ? ` ${nav.perf.lcp.url.slice(-60)}` : nav.perf.lcp.text ? ` "${nav.perf.lcp.text.trim()}"` : ''}`
      : null;
    result.cls = nav.perf.cls;
    result.tbt = nav.perf.longTasks.reduce((s, t) => s + Math.max(0, t.duration - 50), 0);
    result.longTasks = nav.perf.longTasks.length;
    result.wallLoad = Date.now() - t0;

    if (doScroll) {
      phase = 'scroll';
      await page.evaluate(async () => {
        const step = window.innerHeight * 0.8;
        for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
        window.scrollTo(0, document.documentElement.scrollHeight);
      });
      await settle(page, 1500, 15000);
    }
    if (hoverSelector) {
      phase = 'hover';
      const el = await page.$(hoverSelector);
      if (!el) throw new Error(`hover selector not found: ${hoverSelector}`);
      await el.hover();
      await settle(page, 1500, 10000);
    }
    result.ok = true;
  } catch (err) {
    result.error = String(err?.message ?? err);
  }

  // Aggregate requests.
  const byPhase = {};
  const byType = {};
  const prefetches = [];
  let total = 0;
  let count = 0;
  for (const r of requests.values()) {
    if (!r.status) continue;
    const t = typeOf(r.type, r.mime, r.url);
    total += r.bytes;
    count += 1;
    (byType[t] ??= { bytes: 0, count: 0 }).bytes += r.bytes;
    byType[t].count += 1;
    (byPhase[r.phase] ??= { bytes: 0, count: 0 }).bytes += r.bytes;
    byPhase[r.phase].count += 1;
    if (t === 'rsc') {
      const u = new URL(r.url);
      prefetches.push({
        phase: r.phase,
        path: u.pathname,
        segment: r.headers['next-router-segment-prefetch'] ?? null,
        prefetch: r.headers['next-router-prefetch'] ?? null,
        bytes: r.bytes,
        status: r.status,
      });
    }
  }
  result.requests = count;
  result.bytes = total;
  result.byType = byType;
  result.byPhase = byPhase;
  result.prefetches = prefetches;

  await context.close();
  return result;
}

// ---------- main ----------
const userDataDir = mkdtempSync(join(tmpdir(), 'wiki-perf-'));
const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless,
  userDataDir,
  defaultViewport: null,
  args: ['--no-first-run', '--no-default-browser-check', '--window-size=1400,900', '--disable-features=Translate'],
});

const results = [];
try {
  for (let i = 1; i <= runs; i++) {
    for (const s of scenarios) {
      const r = await runOnce(browser, s);
      results.push(r);
      const kib = (n) => `${Math.round(n / 1024)} KiB`;
      if (r.ok) {
        const rsc = r.prefetches.filter((p) => p.phase === 'load').reduce((a, p) => a + p.bytes, 0);
        console.log(
          `${s.padEnd(7)} #${i} ${r.cache ?? '-'} ttfb ${Math.round(r.ttfb)} fcp ${Math.round(r.fcp)} lcp ${Math.round(r.lcp ?? NaN)} load ${Math.round(r.load)} cls ${r.cls.toFixed(3)} tbt ${Math.round(r.tbt)} | ${r.requests} req ${kib(r.bytes)} (img ${kib(r.byType.image?.bytes ?? 0)}, rsc ${kib(rsc)})` +
            (r.byPhase.scroll ? ` | scroll +${r.byPhase.scroll.count} req ${kib(r.byPhase.scroll.bytes)}` : '') +
            (r.byPhase.hover ? ` | hover +${r.byPhase.hover.count} req ${kib(r.byPhase.hover.bytes)}` : '') +
            ` | LCP ${r.lcpElement ?? '?'}`,
        );
      } else {
        console.log(`${s.padEnd(7)} #${i} FAILED: ${r.error}`);
      }
    }
  }
} finally {
  await browser.close();
  try {
    rmSync(userDataDir, { recursive: true, force: true });
  } catch {
    // Chrome sometimes keeps a handle a moment longer on Windows; harmless.
  }
}

console.log('\n=== Medians (observed, real Chrome) ===');
const summary = {};
for (const s of scenarios) {
  const ok = results.filter((r) => r.scenario === s && r.ok);
  if (ok.length === 0) {
    console.log(`${s}: no successful runs`);
    continue;
  }
  const m = {
    runs: ok.length,
    ttfb: median(ok.map((r) => r.ttfb)),
    fcp: median(ok.map((r) => r.fcp)),
    lcp: median(ok.map((r) => r.lcp)),
    load: median(ok.map((r) => r.load)),
    cls: median(ok.map((r) => r.cls)),
    tbt: median(ok.map((r) => r.tbt)),
    requests: median(ok.map((r) => r.requests)),
    bytes: median(ok.map((r) => r.bytes)),
    imageBytes: median(ok.map((r) => r.byType.image?.bytes ?? 0)),
    rscLoadBytes: median(ok.map((r) => r.prefetches.filter((p) => p.phase === 'load').reduce((a, p) => a + p.bytes, 0))),
    lcpElement: ok[0].lcpElement,
  };
  summary[s] = m;
  console.log(
    `${s}: TTFB ${Math.round(m.ttfb)} ms | FCP ${Math.round(m.fcp)} ms | LCP ${Math.round(m.lcp)} ms | load ${Math.round(m.load)} ms | CLS ${m.cls.toFixed(3)} | TBT ${Math.round(m.tbt)} ms | ${m.requests} req | ${Math.round(m.bytes / 1024)} KiB (images ${Math.round(m.imageBytes / 1024)} KiB, RSC prefetch on load ${Math.round(m.rscLoadBytes / 1024)} KiB) | LCP el: ${m.lcpElement}`,
  );
  // Prefetch list from the first successful run (they are deterministic per build).
  const first = ok[0];
  if (first.prefetches.length > 0) {
    console.log(`  RSC prefetches (${s}, run 1):`);
    for (const p of first.prefetches) {
      console.log(`    [${p.phase}] ${p.path} seg=${p.segment ?? '-'} ${Math.round(p.bytes / 1024)} KiB`);
    }
  }
}

if (outFile && outFile !== true) {
  writeFileSync(outFile, JSON.stringify({ url, runs, scenarios, summary, results }, null, 2));
  console.log(`\nwrote ${outFile}`);
}
