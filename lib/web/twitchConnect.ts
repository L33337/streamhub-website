// Client-side "Connect Twitch" for the follows import (onboarding wizard +
// Settings re-auth). Starts a Twitch OAuth round-trip that returns to
// `nextPath`; /auth/callback captures the provider token into localStorage
// (lib/web/twitchToken.ts) on the way back.
//
// Two cases, decided by the signed-in user's identities:
//   - account already has a Twitch identity (Twitch-first signup, or linked
//     earlier): re-authenticate via signInWithOAuth — lands on the SAME user
//     and refreshes the provider token.
//   - no Twitch identity (Google/email account): linkIdentity attaches the
//     Twitch identity (Supabase manual linking is enabled project-wide).
//     Fails when that Twitch account is already linked to a DIFFERENT
//     Streamer Times account — surfaced as a friendly error.

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { resolveSiteUrl } from '@/lib/auth-email';
import { TWITCH_IMPORT_SCOPES } from '@/lib/twitch-scopes';

/** On success the browser navigates away to Twitch — callers only ever see
 * the error case resolve. */
export async function connectTwitchForImport(
  nextPath: string,
): Promise<{ error: string | null }> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Not signed in. Please reload and try again.' };
  }

  const options = {
    redirectTo: `${resolveSiteUrl()}/auth/callback?next=${encodeURIComponent(nextPath)}`,
    scopes: TWITCH_IMPORT_SCOPES,
  };
  const hasTwitchIdentity = (user.identities ?? []).some(
    (identity) => identity.provider === 'twitch',
  );

  const { error } = hasTwitchIdentity
    ? await supabase.auth.signInWithOAuth({ provider: 'twitch', options })
    : await supabase.auth.linkIdentity({ provider: 'twitch', options });

  if (!error) return { error: null };
  if (/already linked/i.test(error.message)) {
    return {
      error:
        'This Twitch account is already connected to another Streamer Times account. Sign in with Twitch instead, or pick your favorites manually.',
    };
  }
  return { error: error.message };
}
