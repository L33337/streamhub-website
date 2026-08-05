import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// LOCAL DEVELOPMENT ONLY (M16): signs in the seeded feed test user against
// the LOCAL Supabase stack and redirects to /feed, so the auth-gated feed can
// be exercised end-to-end while website auth is dormant (no login UI).
//
// Sign-in works via admin.generateLink + verifyOtp instead of
// signInWithPassword because the local auth config has captcha enabled
// (StreamHub supabase/config.toml) — OTP verification is captcha-free.
//
// Triple-guarded — unreachable in production:
//  1. next build compiles with NODE_ENV=production → dead branch on deploys.
//  2. The Supabase URL must point at 127.0.0.1/localhost.
//  3. Requires SUPABASE_SERVICE_ROLE_KEY (only ever set locally, e.g. in
//     .env.development.local with the local stack's secret key).
// Never link this route from any UI.

const DEV_EMAIL = 'feed-tester@local.test';

function isLocalSupabase(url: string): boolean {
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/.test(url);
}

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (process.env.NODE_ENV !== 'development' || !isLocalSupabase(supabaseUrl) || !serviceKey) {
    return new Response(null, { status: 404 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: DEV_EMAIL,
  });
  if (linkError || !linkData.properties?.hashed_token) {
    return NextResponse.json(
      {
        error: linkError?.message ?? 'generateLink returned no token',
        hint: 'Run `node scripts/seed-dev-user.mjs` against the local stack first.',
      },
      { status: 500 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: linkData.properties.hashed_token,
  });
  if (verifyError) {
    return NextResponse.json({ error: verifyError.message }, { status: 500 });
  }

  return NextResponse.redirect(new URL('/feed', request.url));
}
