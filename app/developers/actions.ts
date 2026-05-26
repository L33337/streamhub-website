'use server';

// Server Action backing the Request-API-Access form on /developers (Story 11).
// Validates input, runs a honeypot check, and emails the application to the
// Streamer Times support inbox via Resend. Returns a structured result the
// client form can render — success state, validation errors, or a graceful
// "Resend unreachable, please mailto" fallback.

import { sendEmail } from '@/lib/server/email/resend';

const DEFAULT_RECIPIENT = 'StreamHub.Privacy@icloud.com';
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
