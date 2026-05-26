'use client';

import { useEffect, useState } from 'react';
import type { APIProps } from '@stoplight/elements';

/**
 * Stoplight Elements embed for /developers#endpoints.
 *
 * Loaded as a client component because @stoplight/elements ships its own
 * React tree + CSS bundle. We dynamic-import on mount so the heavy bundle
 * doesn't ship with the initial page payload — visitors who never scroll
 * to the Endpoints section pay nothing.
 *
 * The OpenAPI spec is fetched from `NEXT_PUBLIC_PARTNER_API_BASE_URL/v1/openapi.json`
 * which is the public, cache-controlled endpoint served by the Partner API.
 * Falls back to a polite "loading the reference…" placeholder if Stoplight
 * fails to render.
 */
type APIComponent = React.ComponentType<APIProps>;

export function ApiReference() {
  // Wrapped in an object so `setComponent(() => fn)` isn't ambiguous with
  // the React `setState(updater)` overload.
  const [holder, setHolder] = useState<{ API: APIComponent } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const specUrl =
    (process.env.NEXT_PUBLIC_PARTNER_API_BASE_URL ??
      'https://ypebfgtxythamjwgvoci.supabase.co/functions/v1/partner-api-v1') +
    '/v1/openapi.json';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ API }] = await Promise.all([
          import('@stoplight/elements'),
          import('@stoplight/elements/styles.min.css'),
        ]);
        if (!cancelled) setHolder({ API });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to load API reference';
        if (!cancelled) setError(message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-border-default bg-background-elevated p-6">
        <p className="text-sm text-text-secondary">
          The interactive reference couldn&apos;t load right now. The raw spec is always
          available at{' '}
          <a
            href={specUrl}
            className="text-accent-cyan underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {specUrl}
          </a>
          .
        </p>
        <p className="text-xs text-text-muted mt-2 font-mono">{error}</p>
      </div>
    );
  }

  if (!holder) {
    return (
      <div className="rounded-lg border border-border-default bg-background-elevated p-6">
        <p className="text-sm text-text-secondary">Loading the API reference…</p>
      </div>
    );
  }

  const { API } = holder;
  return (
    <div className="api-reference rounded-lg border border-border-default bg-white text-black overflow-hidden">
      <API apiDescriptionUrl={specUrl} layout="stacked" router="hash" />
    </div>
  );
}
