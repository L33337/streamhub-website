import { getPartnerApi, PartnerApiError } from '@/lib/server/partner-api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  const startMs = Date.now();
  try {
    const api = getPartnerApi();
    const result = await api.listStreamers({ limit: 1, revalidate: false });
    return Response.json({
      status: 'ok',
      partner_api: 'reachable',
      latency_ms: Date.now() - startMs,
      sample_size: result.data.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const partner_api =
      err instanceof PartnerApiError
        ? err.code
        : err instanceof Error && err.message.includes('is not set')
          ? 'misconfigured'
          : 'unreachable';
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json(
      {
        status: 'degraded',
        partner_api,
        latency_ms: Date.now() - startMs,
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
