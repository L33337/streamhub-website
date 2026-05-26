const APP_STORE_URL = 'https://apps.apple.com/app/id6760627630';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.streamhub.tv.app';

export function InstallAppCta({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-3 sm:justify-start ${compact ? '' : 'mt-4'}`}>
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-[44px] items-center gap-2 rounded-xl border border-border-default bg-background-elevated px-4 transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
          <path d="M17.05 12.04c-.03-3.18 2.6-4.71 2.72-4.78-1.49-2.17-3.8-2.47-4.62-2.5-1.96-.2-3.83 1.16-4.83 1.16-1 0-2.54-1.13-4.18-1.1-2.15.03-4.13 1.25-5.24 3.17-2.24 3.88-.57 9.6 1.6 12.74 1.07 1.54 2.33 3.27 3.97 3.2 1.6-.07 2.21-1.03 4.14-1.03 1.93 0 2.49 1.03 4.17.99 1.72-.03 2.81-1.56 3.86-3.11 1.22-1.79 1.72-3.52 1.74-3.61-.04-.02-3.34-1.28-3.37-5.07zm-3.18-9.32c.87-1.06 1.46-2.53 1.3-4-1.26.05-2.78.84-3.69 1.9-.81.94-1.52 2.44-1.33 3.88 1.4.11 2.85-.72 3.72-1.78z" />
        </svg>
        <span className="flex flex-col leading-tight text-text-primary">
          <span className="text-[10px] uppercase">Download on the</span>
          <span className="text-sm font-semibold">App Store</span>
        </span>
      </a>
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-[44px] items-center gap-2 rounded-xl border border-border-default bg-background-elevated px-4 transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
          <path d="M3.04 1.36C2.65 1.77 2.43 2.42 2.43 3.25v17.5c0 .83.22 1.48.61 1.89l.06.06L12.84 12.7v-.21L3.1 1.3l-.06.06zM16.18 16.04l-3.34-3.34v-.21L16.18 9.15l.07.04 3.96 2.25c1.13.64 1.13 1.69 0 2.34l-3.96 2.22-.07.04zM13.13 12.49l3.05-3.05L4.6 2.6c-.37-.21-.72-.23-.96.04l9.5 9.85zM4.6 21.4L16.18 14.84 13.13 11.79 3.65 21.36c.24.27.59.25.95.04z" />
        </svg>
        <span className="flex flex-col leading-tight text-text-primary">
          <span className="text-[10px] uppercase">Get it on</span>
          <span className="text-sm font-semibold">Google Play</span>
        </span>
      </a>
    </div>
  );
}
