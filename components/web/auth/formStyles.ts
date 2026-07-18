// Shared Tailwind class strings for the email-auth forms (login, sign-up,
// forgot-password, reset-password) so all four stay visually identical.

export const AUTH_LABEL_CLASS = 'block text-sm font-medium text-text-secondary';

export const AUTH_INPUT_CLASS =
  'mt-1 block w-full h-11 rounded-lg border border-border-default bg-background-elevated px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-cyan/60 focus:outline-none transition-colors';

export const AUTH_SUBMIT_CLASS =
  'flex w-full h-12 items-center justify-center rounded-lg border border-accent-cyan/40 bg-accent-cyan/10 px-4 text-sm font-bold tracking-wide text-accent-cyan hover:bg-accent-cyan/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

export const AUTH_ERROR_CLASS =
  'rounded-lg border border-accent-pink/40 bg-accent-pink/10 px-3 py-2 text-sm text-accent-pink';

export const AUTH_SUCCESS_CLASS =
  'rounded-lg border border-accent-cyan/40 bg-accent-cyan/10 px-3 py-2 text-sm text-accent-cyan';

export const AUTH_LINK_CLASS =
  'underline underline-offset-4 hover:text-text-primary transition-colors';
