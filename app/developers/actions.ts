'use server';

// Server Actions for /developers:
// - submitAccessRequest: legacy full Partner-API access form (kept as dead
//   code for easy re-activation when the public API launches)
// - joinWaitlist: current Coming-Soon waitlist form — inserts into the
//   partner_api_waitlist table and fires a notification email to admin

import { sendEmail } from '@/lib/server/email/resend';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const DEFAULT_RECIPIENT = 'streamertimes@icloud.com';
const FROM_ADDRESS =
  process.env.RESEND_FROM_ADDRESS ?? 'Streamer Times <no-reply@streamertimes.tv>';

const NAME_MIN = 2;
const NAME_MAX = 100;
const COMPANY_MIN = 2;
const COMPANY_MAX = 200;
const USE_CASE_MIN = 20;
const USE_CASE_MAX = 1000;
const ALLOWED_TIERS = new Set(['bronze', 'silver', 'gold', 'unsure']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface AccessRequestPayload {
  name: string;
  company: string;
  email: string;
  use_case: string;
  tier_interest: string;
  /** Honeypot — must be empty. Hidden from real users via CSS. */
  website?: string;
}

export type AccessRequestState =
  | { status: 'idle' }
  | { status: 'success' }
  | {
      status: 'error';
      message: string;
      fieldErrors?: Partial<Record<keyof AccessRequestPayload, string>>;
    };

function readField(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === 'string' ? v.trim() : '';
}

export async function submitAccessRequest(
  _prevState: AccessRequestState,
  formData: FormData
): Promise<AccessRequestState> {
  // 1. Honeypot — silently succeed without sending email (so bots don't retry)
  const honeypot = readField(formData, 'website');
  if (honeypot.length > 0) {
    return { status: 'success' };
  }

  // 2. Read + validate
  const name = readField(formData, 'name');
  const company = readField(formData, 'company');
  const email = readField(formData, 'email');
  const useCase = readField(formData, 'use_case');
  const tierInterest = readField(formData, 'tier_interest');

  const fieldErrors: Record<string, string> = {};
  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    fieldErrors.name = `Name must be ${NAME_MIN}–${NAME_MAX} characters`;
  }
  if (company.length < COMPANY_MIN || company.length > COMPANY_MAX) {
    fieldErrors.company = `Company must be ${COMPANY_MIN}–${COMPANY_MAX} characters`;
  }
  if (!EMAIL_RE.test(email)) {
    fieldErrors.email = 'Please enter a valid email address';
  }
  if (useCase.length < USE_CASE_MIN || useCase.length > USE_CASE_MAX) {
    fieldErrors.use_case = `Use case must be ${USE_CASE_MIN}–${USE_CASE_MAX} characters`;
  }
  if (!ALLOWED_TIERS.has(tierInterest)) {
    fieldErrors.tier_interest = 'Select one of: Bronze, Silver, Gold, Unsure';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: 'error',
      message: 'Please fix the highlighted fields and try again.',
      fieldErrors,
    };
  }

  // 3. Compose email
  const recipient = process.env.PARTNER_APPLICATIONS_TO_EMAIL || DEFAULT_RECIPIENT;
  const subject = `[Partner API] New access request from ${company}`;
  const body = [
    'New Partner API access request',
    '─'.repeat(40),
    `Name:           ${name}`,
    `Company:        ${company}`,
    `Email:          ${email}`,
    `Tier interest:  ${tierInterest}`,
    '',
    'Use case:',
    useCase,
    '',
    '─'.repeat(40),
    `Submitted:      ${new Date().toISOString()}`,
    `Reply to:       ${email}`,
  ].join('\n');

  const result = await sendEmail({
    to: recipient,
    from: FROM_ADDRESS,
    subject,
    text: body,
    replyTo: email,
  });

  if (!result.ok) {
    const reason =
      result.reason === 'not_configured'
        ? 'Email service is not configured. Please email us directly at ' + recipient
        : `Could not send your request automatically (${result.message}). Please email us directly at ${recipient}`;
    return { status: 'error', message: reason };
  }

  return { status: 'success' };
}

// ─── joinWaitlist ────────────────────────────────────────────────────────────
// Lean waitlist form for the Coming-Soon /developers page. Persists the signup
// in public.partner_api_waitlist (via anon role + INSERT-only RLS policy) and
// fires a fire-and-forget Resend notification to admin. Duplicate signups are
// treated as success so we don't leak whether an email is already on the list.

const WAITLIST_NAME_MAX = 100;
const WAITLIST_EMAIL_MAX = 254; // RFC 5321

export interface WaitlistPayload {
  email: string;
  name?: string;
  /** Honeypot — must remain empty. Hidden from real users via CSS. */
  website?: string;
}

export type WaitlistState =
  | { status: 'idle' }
  | { status: 'success' }
  | {
      status: 'error';
      message: string;
      fieldErrors?: Partial<Record<keyof WaitlistPayload, string>>;
    };

export async function joinWaitlist(
  _prevState: WaitlistState,
  formData: FormData
): Promise<WaitlistState> {
  const recipient =
    process.env.PARTNER_APPLICATIONS_TO_EMAIL || DEFAULT_RECIPIENT;

  // 1. Honeypot — silent success, no DB write, no email
  if (readField(formData, 'website').length > 0) {
    return { status: 'success' };
  }

  // 2. Read + normalize
  const emailRaw = readField(formData, 'email');
  const email = emailRaw.toLowerCase(); // must match DB CHECK constraint
  const nameRaw = readField(formData, 'name');
  const name = nameRaw.length > 0 ? nameRaw : null;

  // 3. Validate
  const fieldErrors: Partial<Record<keyof WaitlistPayload, string>> = {};
  if (!EMAIL_RE.test(email) || email.length > WAITLIST_EMAIL_MAX) {
    fieldErrors.email = 'Please enter a valid email address';
  }
  if (name !== null && name.length > WAITLIST_NAME_MAX) {
    fieldErrors.name = `Name must be ${WAITLIST_NAME_MAX} characters or fewer`;
  }
  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: 'error',
      message: 'Please fix the highlighted fields and try again.',
      fieldErrors,
    };
  }

  // 4. Insert via anon Supabase client (RLS INSERT policy permits it)
  const supabase = await createSupabaseServerClient();
  const { error: insertError } = await supabase
    .from('partner_api_waitlist')
    .insert({ email, name, source: 'developers_page' });

  // 5. Unique-violation (23505) = idempotent re-signup → treat as success
  const isDuplicate = insertError?.code === '23505';
  if (insertError && !isDuplicate) {
    console.error(
      '[joinWaitlist] DB insert failed:',
      insertError.code,
      insertError.message
    );
    return {
      status: 'error',
      message: `Could not save your request automatically. Please email us at ${recipient}.`,
    };
  }

  // 6. Fire-and-forget Resend notification (skip on duplicate — admin already knows)
  if (!isDuplicate) {
    const result = await sendEmail({
      to: recipient,
      from: FROM_ADDRESS,
      subject: `[Partner API Waitlist] New signup: ${email}`,
      text: [
        'New Partner API waitlist signup',
        '─'.repeat(40),
        `Email:    ${email}`,
        `Name:     ${name ?? '(not provided)'}`,
        `Source:   developers_page`,
        `Time:     ${new Date().toISOString()}`,
      ].join('\n'),
      replyTo: email,
    });
    if (!result.ok) {
      // User is on the list — don't surface the email-send error to them.
      console.warn(
        '[joinWaitlist] Notification email failed:',
        result.reason,
        result.message
      );
    }
  }

  return { status: 'success' };
}
