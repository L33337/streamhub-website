#!/usr/bin/env node
// Renders the social card fixtures (or a JSON file of specs) through a
// running dev server and writes PNGs for review (M27 Phase 0).
//
//   SOCIAL_RENDER_SECRET=dev npx next dev -p 3111
//   node scripts/social-render-local.mjs [--base http://localhost:3111] [--secret dev] [--specs path.json] [--out tmp/social-cards] [--format png|jpeg]
//
// --specs: a JSON object whose values are specs (default: the fixture) or
// the JSON answer of generate-social-posts (cards[].spec / proposals[].spec).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const base = arg('base', 'http://localhost:3111');
const secret = arg('secret', process.env.SOCIAL_RENDER_SECRET ?? 'dev');
const specsPath = arg('specs', 'lib/og/social/__fixtures__/social-card-spec.fixture.json');
const out = arg('out', 'tmp/social-cards');
const format = arg('format', 'png');

const raw = JSON.parse(readFileSync(specsPath, 'utf8'));
const specs = [];
if (Array.isArray(raw.cards)) raw.cards.forEach((c, i) => specs.push([`${raw.kind ?? 'recap'}-${i + 1}-${c.spec.card}`, c.spec]));
if (Array.isArray(raw.proposals)) raw.proposals.forEach((p) => specs.push([`moment-${p.index}-${p.type}-${p.streamer_id}`, p.spec]));
if (specs.length === 0) for (const [k, v] of Object.entries(raw)) if (v && typeof v === 'object' && v.layout) specs.push([k, v]);

mkdirSync(out, { recursive: true });
for (const [key, spec] of specs) {
  const started = Date.now();
  const res = await fetch(`${base}/api/social/card?format=${format}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-social-secret': secret },
    body: JSON.stringify(spec),
  });
  if (!res.ok) {
    console.error(`${key}: HTTP ${res.status} ${await res.text()}`);
    continue;
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  const file = join(out, `${key}.${format === 'png' ? 'png' : 'jpg'}`);
  writeFileSync(file, bytes);
  console.log(`${key}: ${Math.round(bytes.length / 1024)} KB, ${Date.now() - started} ms, fallbacks=${res.headers.get('x-social-avatar-fallbacks') || '-'} → ${file}`);
}
