// Maps Supabase auth errors to user-facing copy for the email-auth forms.
// Pure module (unit-tested); keep free of client/server imports.

export interface AuthErrorLike {
  message: string;
  code?: string;
  status?: number;
}

/**
 * True when sign-in failed only because the email address is not confirmed
 * yet — the login form swaps to a "resend confirmation email" state instead
 * of showing an error.
 */
export function isEmailNotConfirmedError(error: AuthErrorLike): boolean {
  return (
    error.code === 'email_not_confirmed' ||
    /email not confirmed/i.test(error.message)
  );
}

export function friendlyAuthError(error: AuthErrorLike): string {
  if (error.code === 'invalid_credentials' || /invalid login credentials/i.test(error.message)) {
    // OAuth-only accounts have no password, so a password attempt against
    // them surfaces this same generic error — hence the provider hint.
    return 'Invalid email or password. If you originally signed up with Twitch or Google, use those buttons instead.';
  }
  if (/captcha/i.test(error.message)) {
    return 'Captcha verification failed — please try again.';
  }
  if (error.status === 429 || /rate limit|too many/i.test(error.message)) {
    return 'Too many attempts — please wait a moment and try again.';
  }
  if (error.code === 'weak_password') {
    return 'That password is too weak — use at least 6 characters.';
  }
  if (error.code === 'user_already_exists' || /already registered/i.test(error.message)) {
    return 'An account with this email already exists — sign in instead, or use "Forgot password".';
  }
  if (error.code === 'same_password') {
    return 'The new password must be different from your current one.';
  }
  return error.message;
}
