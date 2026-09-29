// Confirm / result page for a click in the social approval mail (Epic M27
// §6, StreamHub repo). Pure HTML builder: the route relays to the
// social-approve edge function, which owns every decision and every text;
// this module only lays out what it answered.
//
// Why a page and not a direct link to the edge function: Supabase rewrites
// text/html answers of Edge Functions to text/plain, and a GET that changes
// state would be triggered by mail scanners that open links ahead of the
// reader. So a mail button opens THIS page (GET, read-only), and only the
// confirm button (POST) changes anything.

export interface ApproveLink {
  label: string;
  url: string;
  tone?: 'primary' | 'danger' | 'neutral';
}

export interface ApprovePost {
  kind: string;
  period_label: string;
  slot: number;
  streamer: string | null;
  moment: string | null;
  status: string;
  publish_label: string;
  image_urls: string[];
  card_text: string | null;
  instagram: string | null;
  x: string | null;
  /** kind video_weekly (M27 Phase 3): the caption to paste in TikTok and the MP4. */
  tiktok?: string | null;
  video_url?: string | null;
}

/** What the social-approve edge function answers (preview and apply). */
export interface ApproveAnswer {
  ok: boolean;
  code: string;
  title?: string;
  description?: string;
  message?: string;
  post?: ApprovePost;
  group?: Array<{ slot: number; streamer: string | null; status: string }>;
  links?: ApproveLink[];
}

export interface ApproveFields {
  post: string;
  action: string;
  variant: string | null;
  exp: string;
  sig: string;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const STATUS_LABELS: Record<string, string> = {
  proposed: 'proposed',
  scheduled: 'scheduled',
  publishing: 'being posted',
  published: 'posted',
  vetoed: 'vetoed',
  discarded: 'discarded',
  expired: 'expired',
  failed: 'failed',
  skipped_disabled: 'not posted (publishing is off)',
};

/** The weekly video is never posted by us: it is delivered as a draft into the TikTok inbox. */
const VIDEO_STATUS_LABELS: Record<string, string> = {
  publishing: 'being delivered',
  published: 'in the TikTok inbox',
  failed: 'not delivered',
  skipped_disabled: 'not delivered (publishing is off)',
};

export function statusLabel(s: string, kind?: string): string {
  if (kind === 'video_weekly' && VIDEO_STATUS_LABELS[s]) return VIDEO_STATUS_LABELS[s];
  return STATUS_LABELS[s] ?? s;
}

/** Only a plain https URL becomes a link; anything else is dropped. */
export function safeHttpsUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && !u.username && !u.password ? u.toString() : null;
  } catch {
    return null;
  }
}

const STYLE = `
:root{--bg:#F4F3F7;--card:#fff;--ink:#1B1A22;--muted:#66647C;--line:#DCDAE4;--accent:#007A88;--danger:#B3261E;--soft:#F7F6FA}
@media (prefers-color-scheme:dark){:root{--bg:#101016;--card:#181822;--ink:#F1F0F6;--muted:#9A98B0;--line:#2A2A36;--accent:#00C8D6;--danger:#FF6B61;--soft:#1F1F2B}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;padding:24px 16px 48px}
main{max-width:640px;margin:0 auto}
.eyebrow{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);font-weight:600}
h1{font-size:24px;line-height:1.25;margin:8px 0 8px}
p{margin:0 0 12px}
.muted{color:var(--muted)}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin:16px 0}
.card img{display:block;width:100%;height:auto;border-radius:8px;margin:0 0 12px}
.label{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:600;margin-top:12px}
.text{background:var(--soft);border-radius:8px;padding:10px 12px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px}
.btn{display:inline-block;border:0;border-radius:8px;padding:12px 18px;font:600 15px/1.2 inherit;font-family:inherit;text-decoration:none;cursor:pointer;margin:4px 8px 4px 0;background:var(--accent);color:#fff;min-height:44px}
.btn.danger{background:var(--danger)}
.btn.neutral{background:transparent;color:var(--accent);border:1px solid var(--accent)}
ul.group{padding-left:18px;margin:8px 0 0}
.ok{color:var(--accent);font-weight:600}
.no{color:var(--danger);font-weight:600}
`;

function page(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>${escapeHtml(title)} · Streamer Times</title><style>${STYLE}</style></head><body><main><div class="eyebrow">Streamer Times · Social</div>${body}</main></body></html>`;
}

/** A page with one headline and one line: the TikTok connect callback, and anything else without a post. */
export function renderNoticePage(title: string, message: string, ok: boolean): string {
  return page(title, `<h1>${escapeHtml(title)}</h1><p class="${ok ? 'ok' : 'no'}">${escapeHtml(message)}</p>`);
}

function videoCard(post: ApprovePost): string {
  const video = safeHttpsUrl(post.video_url);
  const poster = post.image_urls[0] ? `<img src="${escapeHtml(post.image_urls[0])}" alt="First frame of the video" loading="lazy">` : '';
  const watch = video ? `<p><a class="btn neutral" href="${escapeHtml(video)}" rel="noopener noreferrer">Watch the video</a></p>` : '';
  const caption = post.tiktok ? `<div class="label">Caption to paste in TikTok</div><div class="text">${escapeHtml(post.tiktok)}</div>` : '';
  return `<section class="card"><p><strong>Weekly video for TikTok</strong> · ${escapeHtml(post.period_label)}</p><p class="muted">Status: ${escapeHtml(statusLabel(post.status, post.kind))} · draft arrives ${escapeHtml(post.publish_label)}</p>${poster}${watch}${caption}</section>`;
}

function postCard(post: ApprovePost): string {
  // The video row carries the streamer of its opening scene; it is still not a proposal.
  if (post.kind === 'video_weekly') return videoCard(post);
  const who = post.streamer ? `#${post.slot + 1} ${post.streamer}` : post.kind === 'monthly' ? 'Monthly recap' : 'Weekly recap';
  const images = post.image_urls.map((u, i) => `<img src="${escapeHtml(u)}" alt="Card ${i + 1}" loading="lazy">`).join('');
  const texts = [
    post.card_text ? `<div class="label">Card text</div><div class="text">${escapeHtml(post.card_text)}</div>` : '',
    post.instagram ? `<div class="label">Instagram caption</div><div class="text">${escapeHtml(post.instagram)}</div>` : '',
    post.x ? `<div class="label">X post</div><div class="text">${escapeHtml(post.x)}</div>` : '',
  ].join('');
  return `<section class="card"><p><strong>${escapeHtml(who)}</strong> · ${escapeHtml(post.period_label)}${post.moment ? `<br><span class="muted">${escapeHtml(post.moment)}</span>` : ''}</p><p class="muted">Status: ${escapeHtml(statusLabel(post.status))} · post time ${escapeHtml(post.publish_label)}</p>${images}${texts}</section>`;
}

function groupList(group: ApproveAnswer['group']): string {
  if (!group || group.length < 2) return '';
  const items = group.map((g) => `<li>#${g.slot + 1} ${escapeHtml(g.streamer ?? 'proposal')}: ${escapeHtml(statusLabel(g.status))}</li>`).join('');
  return `<section class="card"><div class="label">This week's proposals</div><ul class="group">${items}</ul></section>`;
}

function linkButtons(links: ApproveLink[] | undefined): string {
  if (!links || links.length === 0) return '';
  const btns = links
    .map((l) => `<a class="btn${l.tone === 'danger' ? ' danger' : l.tone === 'neutral' ? ' neutral' : ''}" href="${escapeHtml(l.url)}">${escapeHtml(l.label)}</a>`)
    .join('');
  return `<section class="card"><div class="label">Change it</div><p class="muted">Each button opens a confirmation first.</p>${btns}</section>`;
}

/** GET: what the link will do, with the one button that does it. */
export function renderConfirmPage(answer: ApproveAnswer, fields: ApproveFields, formAction: string): string {
  if (!answer.ok) return renderMessagePage(answer);
  const hidden = (['post', 'action', 'variant', 'exp', 'sig'] as const)
    .filter((k) => fields[k] !== null && fields[k] !== '')
    .map((k) => `<input type="hidden" name="${k}" value="${escapeHtml(String(fields[k]))}">`)
    .join('');
  const danger = fields.action === 'veto';
  const form = `<form method="post" action="${escapeHtml(formAction)}">${hidden}<button class="btn${danger ? ' danger' : ''}" type="submit">Confirm</button></form>`;
  const body = `<h1>${escapeHtml(answer.title ?? 'Confirm')}</h1><p>${escapeHtml(answer.description ?? '')}</p>${form}${answer.post ? postCard(answer.post) : ''}${groupList(answer.group)}`;
  return page(answer.title ?? 'Confirm', body);
}

/** POST result, or any refusal (bad link, expired, not found, …). */
export function renderMessagePage(answer: ApproveAnswer): string {
  const title = answer.title ?? (answer.ok ? 'Done' : 'Not applied');
  const cls = answer.ok ? 'ok' : 'no';
  const body = `<h1>${escapeHtml(title)}</h1><p class="${cls}">${escapeHtml(answer.message ?? answer.description ?? answer.code)}</p>${answer.post ? postCard(answer.post) : ''}${groupList(answer.group)}${linkButtons(answer.links)}`;
  return page(title, body);
}

/** Reads the five link fields from a query string or a submitted form. */
export function readFields(get: (k: string) => string | null): ApproveFields | null {
  const post = get('post');
  const action = get('action');
  const exp = get('exp');
  const sig = get('sig');
  if (!post || !action || !exp || !sig) return null;
  const fields = { post, action, variant: get('variant'), exp, sig };
  // Cheap shape check before anything leaves the server; the edge function verifies the signature.
  if (!/^[0-9a-f-]{36}$/i.test(post) || !/^[a-z]{3,10}$/.test(action) || !/^\d{1,12}$/.test(exp) || !/^[0-9a-f]{64}$/i.test(sig)) return null;
  if (fields.variant !== null && !/^\d$/.test(fields.variant)) return null;
  return fields;
}
