#!/usr/bin/env node
// Verify every prerendered page's <meta name="description"> against Bing
// Webmaster Tools' 25-160 character window ("Meta Description too long or too
// short"). The unit tests cover the pure builders; this covers the assembled
// output of every page that actually ships, including the templates that only
// exist inside a page's generateMetadata.
//
//   npm run build && node scripts/check-meta-descriptions.mjs
//
// Exits non-zero when any page is outside the window, so it can gate a deploy.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] ?? '.next/server/app';
// Our own budget sits below Bing's ceiling on purpose — keep in sync with
// MAX_META_DESCRIPTION in lib/seo.ts.
const MAX = 160;
const MIN = 25;

// Next's internal error shells are never served as indexable URLs and carry no
// description by design.
const IGNORE = new Set(['_global-error.html', '_not-found.html']);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

const decodeEntities = (s) =>
  s
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&'); // last: an entity must not be double-decoded

let files;
try {
  files = walk(root);
} catch {
  console.error(`No prerendered output at ${root} — run \`npm run build\` first.`);
  process.exit(2);
}

const problems = [];
for (const file of files.sort()) {
  if (IGNORE.has(file.split(/[\\/]/).pop())) continue;
  const html = readFileSync(file, 'utf8');
  const match = html.match(/<meta name="description" content="([^"]*)"/);
  if (!match) {
    problems.push({ file, len: 0, why: 'missing' });
    continue;
  }
  const len = decodeEntities(match[1]).length;
  if (len > MAX) problems.push({ file, len, why: 'too long' });
  else if (len < MIN) problems.push({ file, len, why: 'too short' });
}

for (const p of problems) {
  console.error(`${p.why.padEnd(9)} ${String(p.len).padStart(4)}  ${p.file}`);
}
console.log(
  `\nchecked ${files.length} prerendered pages — ${problems.length} outside ${MIN}-${MAX} chars`,
);
process.exit(problems.length === 0 ? 0 : 1);
