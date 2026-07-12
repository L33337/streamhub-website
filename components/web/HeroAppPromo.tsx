import QRCode from 'react-qr-code';
import { uiLexFor } from '@/lib/i18n-ui';
import { QR_TARGET } from './AppQrCode';

/**
 * Compact app promo for the streamer hero. Desktop gets a small QR code (the
 * phone is the target device, so a scan beats a store link); mobile gets a
 * "Get the app" pill linking to /get (UA-based store redirect) instead — a QR
 * code is useless on the device it points to. Both share the same value-prop
 * bullets. Pure static markup (react-qr-code renders SVG), so it stays a
 * Server Component. Copy is localized to the streamer's language (null → en).
 */
export function HeroAppPromo({ language = null }: { language?: string | null }) {
  const L = uiLexFor(language).promo;
  return (
    <div className="mt-5 flex flex-col items-center gap-4 md:flex-row md:justify-start">
      <div className="hidden shrink-0 md:block">
        <div
          role="img"
          aria-label={L.qrAria}
          className="rounded-xl border border-border-default bg-background-elevated p-2 shadow-[0_0_15px_rgba(0,240,255,0.15)]"
        >
          <div className="rounded-md bg-white p-1.5">
            <QRCode
              value={QR_TARGET}
              size={80}
              level="M"
              bgColor="#FFFFFF"
              fgColor="#0A0A0F"
              aria-hidden
              style={{ height: '80px', width: '80px' }}
            />
          </div>
        </div>
      </div>

      <ul className="space-y-1 text-left text-sm text-text-secondary">
        {L.valueProps.map((prop) => (
          <li key={prop} className="flex items-center gap-2">
            <span aria-hidden="true" className="text-accent-cyan">
              •
            </span>
            {prop}
          </li>
        ))}
      </ul>

      {/* Plain <a>: /get is a route handler that 302s to the matching app
          store based on the device UA — exactly right on a phone. */}
      <a
        href="/get"
        className="inline-flex items-center rounded-lg border border-accent-cyan/60 bg-accent-cyan/10 px-4 py-2 text-sm font-semibold text-accent-cyan transition-colors hover:bg-accent-cyan/20 md:hidden"
      >
        {L.getApp}
      </a>
    </div>
  );
}
