import QRCode from 'react-qr-code';
import { QR_TARGET } from './AppQrCode';

const VALUE_PROPS = [
  'Save your favorite streamers',
  'Get notified the moment they go live',
  'Add any new streamer in seconds',
];

/**
 * Compact app promo for the streamer hero. Desktop gets a small QR code (the
 * phone is the target device, so a scan beats a store link); mobile gets a
 * "Get the app" pill linking to /get (UA-based store redirect) instead — a QR
 * code is useless on the device it points to. Both share the same value-prop
 * bullets. Pure static markup (react-qr-code renders SVG), so it stays a
 * Server Component.
 */
export function HeroAppPromo() {
  return (
    <div className="mt-5 flex flex-col items-center gap-4 md:flex-row md:justify-start">
      <div className="hidden shrink-0 md:block">
        <div
          role="img"
          aria-label="QR code — scan with your phone to get the Streamer Times app"
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
        {VALUE_PROPS.map((prop) => (
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
        Get the app
      </a>
    </div>
  );
}
