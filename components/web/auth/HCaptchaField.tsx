'use client';

import HCaptcha from '@hcaptcha/react-hcaptcha';
import { forwardRef, useImperativeHandle, useRef } from 'react';

// Invisible hCaptcha for the email-auth forms. The Supabase project enforces
// captcha on auth endpoints (same protection the mobile app uses), so
// signUp / signInWithPassword / resetPasswordForEmail need a token.
//
// When NEXT_PUBLIC_HCAPTCHA_SITE_KEY is unset (e.g. a local stack running
// without captcha), the field renders nothing and execute() resolves to null —
// callers then omit options.captchaToken entirely.
const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? '';

export interface HCaptchaFieldHandle {
  /**
   * Runs the invisible challenge and resolves the token (null when no sitekey
   * is configured). Rejects when the user closes the challenge popup or the
   * widget errors — callers surface that as a retryable form error.
   */
  execute(): Promise<string | null>;
  /** Tokens are single-use — reset after EVERY auth call, success or failure. */
  reset(): void;
}

export const HCaptchaField = forwardRef<HCaptchaFieldHandle>(
  function HCaptchaField(_props, ref) {
    const captchaRef = useRef<HCaptcha>(null);

    useImperativeHandle(ref, () => ({
      async execute() {
        if (!HCAPTCHA_SITE_KEY) return null;
        const result = await captchaRef.current?.execute({ async: true });
        return result?.response ?? null;
      },
      reset() {
        captchaRef.current?.resetCaptcha();
      },
    }));

    if (!HCAPTCHA_SITE_KEY) return null;

    return (
      <>
        <HCaptcha
          ref={captchaRef}
          sitekey={HCAPTCHA_SITE_KEY}
          size="invisible"
          theme="dark"
        />
        {/* Required disclosure when hiding the hCaptcha badge via invisible mode */}
        <p className="mt-4 text-[11px] leading-relaxed text-text-muted">
          This site is protected by hCaptcha and its{' '}
          <a
            href="https://www.hcaptcha.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-text-primary"
          >
            Privacy Policy
          </a>{' '}
          and{' '}
          <a
            href="https://www.hcaptcha.com/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-text-primary"
          >
            Terms of Service
          </a>{' '}
          apply.
        </p>
      </>
    );
  },
);
