// Thin Resend wrapper used by the developer-portal access form (Story 11).
//
// Reads RESEND_API_KEY from the runtime env. Returns a structured result so
// callers can render success / fallback-mailto UIs without try/catch noise.
// When the API key isn't configured we return a `not_configured` error so
// the form can show a graceful fallback (mailto link) rather than 500.

import 'server-only';
import { Resend } from 'resend';

export interface SendEmailOptions {
  to: string | string[];
  from: string;
  subject: string;
  text: string;
  replyTo?: string;
}

export type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; reason: 'not_configured' | 'send_failed'; message: string };

let cachedClient: Resend | null = null;

function getClient(): Resend | null {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  cachedClient = new Resend(apiKey);
  return cachedClient;
}

export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const client = getClient();
  if (!client) {
    return {
      ok: false,
      reason: 'not_configured',
      message: 'RESEND_API_KEY is not set in the runtime environment',
    };
  }

  try {
    const { data, error } = await client.emails.send({
      to: opts.to,
      from: opts.from,
      subject: opts.subject,
      text: opts.text,
      replyTo: opts.replyTo,
    });
    if (error) {
      return { ok: false, reason: 'send_failed', message: error.message };
    }
    return { ok: true, id: data?.id ?? null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { ok: false, reason: 'send_failed', message };
  }
}
