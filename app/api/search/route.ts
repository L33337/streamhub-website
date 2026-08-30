import type { NextRequest } from 'next/server';
import {
  getPartnerApi,
  PartnerApiError,
  type Platform,
} from '@/lib/server/partner-api';
import { getLiveStreamerIdSet } from '@/lib/server/live-streamers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_LIMIT = 20;
const DEFAULT_LIMIT = 5;
const MAX_QUERY_LENGTH = 100;
const VALID_PLATFORMS: ReadonlySet<string> = new Set(['twitch', 'youtube']);

function emptyResponse(): Response {
  return Response.json({ data: [], pagination: { has_more: false, next_cursor: null } });
}

export async function GET(req: NextRequest): Promise<Response> {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get('q') ?? '').trim();
  const platformRaw = sp.get('platform');
  const limitRaw = parseInt(sp.get('limit') ?? `${DEFAULT_LIMIT}`, 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(MAX_LIMIT, limitRaw))
    : DEFAULT_LIMIT;

  if (q.length < 2) return emptyResponse();
  if (q.length > MAX_QUERY_LENGTH) {
    return Response.json({ error: 'query too long' }, { status: 400 });
  }

  const platformParam: Platform[] | undefined =
    platformRaw && VALID_PLATFORMS.has(platformRaw)
      ? [platformRaw as Platform]
      : undefined;

  try {
    const [streamersResp, liveSet] = await Promise.all([
      getPartnerApi().listStreamers({
        search: q,
        platform: platformParam,
        limit,
        revalidate: 60,
      }),
      getLiveStreamerIdSet().catch(() => new Set<string>()),
    ]);
    const enriched = streamersResp.data.map((s) => ({
      ...s,
      is_live: liveSet.has(s.id),
    }));
    return Response.json(
      {
        data: enriched,
        pagination: streamersResp.pagination,
      },
      {
        // Nothing here is personal (no auth, no cookies read), and the live
        // flag is only ever 60 s fresh anyway — let the CDN absorb repeated
        // queries instead of one function invocation per keystroke pause
        // (same policy as /api/rankings/filter). Errors below stay uncached.
        headers: {
          'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
        },
      },
    );
  } catch (err) {
    const status = err instanceof PartnerApiError ? 502 : 500;
    const message = err instanceof Error ? err.message : 'search failed';
    return Response.json({ error: message }, { status });
  }
}
