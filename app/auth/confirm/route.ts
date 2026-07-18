import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { confirmResultRedirect, parseConfirmableOtpType } from '@/lib/auth-email';

// Verifies token_hash links from the Supabase email templates (website branch
// of the conditional "Confirm signup" / "Reset password" templates — see
// lib/auth-email.ts). Unlike the ?code= exchange in /auth/callback, verifyOtp
// needs no PKCE code-verifier cookie, so links work on whatever device the
// email is opened on (sign up on desktop, confirm on phone).
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const tokenHash = url.searchParams.get('token_hash');
  const type = parseConfirmableOtpType(url.searchParams.get('type'));
  const next = url.searchParams.get('next');

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      new URL(confirmResultRedirect(type, next, false), url.origin),
    );
  }

  // Route handlers have a writable cookie store, so verifyOtp establishes the
  // session directly (same sb-* cookies the OAuth callback path writes).
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    console.error(`[auth/confirm] verifyOtp (${type}) failed:`, error.message);
  }

  return NextResponse.redirect(
    new URL(confirmResultRedirect(type, next, !error), url.origin),
  );
}
