import QRCode from 'react-qr-code';

export const QR_TARGET = 'https://streamertimes.tv/get';

/**
 * Desktop-only QR code that, when scanned, sends the phone to /get — which
 * redirects to the App Store / Google Play based on the device OS.
 *
 * Renders pure static SVG (no browser APIs), so it stays a Server Component.
 * High-contrast (dark modules on white) for reliable scanning.
 *
 * Layout/visibility is left to the caller via `className` (the card + label are
 * laid out by whatever display the caller sets, e.g. `flex items-center gap-4`).
 */
export function AppQrCode({
  className = '',
  // M22 S4.1: pre-localized by the caller (HubLex.home.qr*); the English
  // defaults keep the en-only /app page byte-identical.
  title = 'Scan to download Streamer Times',
  heading = 'Scan to download',
  hint = 'Point your phone camera here',
}: {
  className?: string;
  title?: string;
  heading?: string;
  hint?: string;
}) {
  return (
    <div className={className}>
      <div className="w-fit rounded-xl border border-border-default bg-background-elevated p-3 shadow-[0_0_15px_rgba(0,240,255,0.15)]">
        <div className="rounded-md bg-white p-2">
          <QRCode
            value={QR_TARGET}
            size={104}
            level="M"
            bgColor="#FFFFFF"
            fgColor="#0A0A0F"
            title={title}
            style={{ height: '104px', width: '104px' }}
          />
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-text-primary">{heading}</span>
        <span className="text-xs text-text-secondary">{hint}</span>
      </div>
    </div>
  );
}
