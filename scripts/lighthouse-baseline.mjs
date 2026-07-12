#!/usr/bin/env node
/*
 * Perf baseline runner — M20 Phase 0 (S0.2), see ../docs is in the app repo:
 * StreamHub/docs/performance-health.md.
 *
 * Windows-robust wrapper around the local `lighthouse` CLI. It writes each
 * run's JSON to .lighthouseci/ with --output-path BEFORE Chrome tears down,
 * because chrome-launcher's temp-dir cleanup throws EPERM on Windows AFTER the
 * report is generated — which makes a plain `lhci autorun` abort with no output
 * on this platform. On Linux/CI `npm run lighthouse:ci` (lhci autorun) works
 * directly and also enforces the budgets in lighthouserc.json.
 *
 * URLs, run count and (informational) assertions all come from lighthouserc.json
 * so there is a single source of truth. Override the run count for a quick smoke
 * check with LH_RUNS=1.
 *
 * Mobile emulation (Moto G4, 4x CPU, slow-4G) is Lighthouse's default form
 * factor — we do not override it, so these numbers match `npm run lighthouse:ci`.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(readFileSync(join(root, 'lighthouserc.json'), 'utf8')).ci;
const urls = cfg.collect.url;
const runs = Number(process.env.LH_RUNS) || cfg.collect.numberOfRuns || 3;
const outDir = join(root, '.lighthouseci');

const slugOf = (u) =>
  u.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'root';
const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// Fresh output dir each run so stale LHRs never pollute the medians.
if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// Invoke the lighthouse CLI script directly with the current node binary — no
// npx, no shell — so it is cross-platform and free of the shell-arg warning.
const lhCli = join(root, 'node_modules', 'lighthouse', 'cli', 'index.js');
for (const url of urls) {
  const slug = slugOf(url);
  for (let n = 1; n <= runs; n++) {
    const out = join(outDir, `lhr-${slug}-${n}.json`);
    process.stdout.write(`running ${slug} #${n}/${runs} ... `);
    spawnSync(
      process.execPath,
      [lhCli, url, '--only-categories=performance', '--output=json',
        `--output-path=${out}`, '--chrome-flags=--headless=new', '--quiet'],
      { stdio: ['ignore', 'ignore', 'ignore'] },
    );
    console.log(existsSync(out) ? 'ok' : 'NO OUTPUT');
  }
}

const groups = {};
for (const f of readdirSync(outDir).filter((f) => /^lhr-.*\.json$/.test(f))) {
  const j = JSON.parse(readFileSync(join(outDir, f), 'utf8'));
  const slug = f.replace(/^lhr-/, '').replace(/-\d+\.json$/, '');
  const a = j.audits;
  const g = (groups[slug] ??= { score: [], lcp: [], tbt: [], cls: [], bytes: [], dom: [], lcpEl: null });
  g.score.push(Math.round(j.categories.performance.score * 100));
  g.lcp.push(a['largest-contentful-paint'].numericValue);
  g.tbt.push(a['total-blocking-time'].numericValue);
  g.cls.push(a['cumulative-layout-shift'].numericValue);
  g.bytes.push(a['total-byte-weight'].numericValue);
  g.dom.push(a['dom-size']?.numericValue ?? 0);
  if (!g.lcpEl) {
    const el = a['largest-contentful-paint-element'];
    g.lcpEl = el?.details?.items?.[0]?.items?.[0]?.node?.snippet || '(n/a)';
  }
}

console.log('\n=== Median metrics (mobile lab, simulated throttling) ===');
for (const [slug, g] of Object.entries(groups)) {
  console.log(
    `${slug}: score ${median(g.score)} | LCP ${Math.round(median(g.lcp))}ms | ` +
      `TBT ${Math.round(median(g.tbt))}ms | CLS ${median(g.cls).toFixed(3)} | ` +
      `${Math.round(median(g.bytes) / 1024)}KiB | DOM ${Math.round(median(g.dom))} | ` +
      `LCP el: ${g.lcpEl.slice(0, 60)}`,
  );
}
