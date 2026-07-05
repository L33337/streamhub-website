import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the Supabase session cookie on every matched request. Must be
 * called from `middleware.ts` at the project root. Without this, refresh
 * tokens never get exchanged and the user is silently logged out as soon as
 * the access token expires.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // Cookie-less visitors (all anonymous SEO traffic) carry no session to
  // refresh — skip Supabase client construction entirely. Every cookie
  // @supabase/ssr sets starts with "sb-" (the auth token may be chunked
  // into sb-…-auth-token.0/.1, which still matches the prefix), so this
  // check is robust against cookie-name changes between SDK versions.
  const hasAuthCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith('sb-'));
  if (!hasAuthCookie) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Reading the user triggers the refresh-cookie write if needed.
  await supabase.auth.getUser();

  return response;
}
