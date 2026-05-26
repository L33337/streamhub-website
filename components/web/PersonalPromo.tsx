import Link from 'next/link';

/**
 * PersonalPromo
 *
 * "Sign in with Twitch" promo block, shown to signed-out visitors on the home
 * page. Hides itself if the visitor is already signed in — pass `signedIn`
 * from the server (e.g. via the AuthProvider's server snapshot).
 */
interface Props {
  signedIn?: boolean;
}

const PREVIEW_ROWS: Array<{
  id: string;
  who: string;
  when: string;
  plat: Array<'twitch' | 'youtube'>;
  status: 'live' | 'upcoming' | 'always';
}> = [
  { id: 'hasanabi', who: 'HasanAbi', when: 'LIVE', plat: ['twitch'], status: 'live' },
  { id: 'kaicenat', who: 'Kai Cenat', when: '7:30 PM', plat: ['twitch'], status: 'upcoming' },
  { id: 'pokimane', who: 'Pokimane', when: '9:00 PM', plat: ['twitch', 'youtube'], status: 'upcoming' },
  { id: 'lofigirl', who: 'Lofi Girl', when: 'Always', plat: ['youtube'], status: 'always' },
];

export function PersonalPromo({ signedIn }: Props) {
  if (signedIn) return null;

  return (
    <>
      <div className="section-transition" aria-hidden="true">
        <span className="st-rule" />
      </div>

      <section
        className="personal-promo"
        aria-labelledby="personal-promo-heading"
      >
        <div className="pp-grid">
          <div className="pp-copy">
            <span className="pp-eyebrow">
              <span className="pp-eyebrow-dot" />
              Personalized · Sign-in required
            </span>
            <h2 id="personal-promo-heading" className="pp-h2">
              Your guide, <span className="pp-key">your streamers.</span>
            </h2>
            <p className="pp-sub">
              Sign in with Twitch and we&rsquo;ll pull in everyone you follow.
              We add YouTube channels next to them, sort by your watch time, and
              surface only the streams that match your schedule.
            </p>
            <div className="pp-bullets">
              <div className="pp-bullet">
                <span className="pb-num">1</span>
                Import your follows from Twitch in one click
              </div>
              <div className="pp-bullet">
                <span className="pb-num">2</span>
                Link any YouTube channels next to them
              </div>
              <div className="pp-bullet">
                <span className="pb-num">3</span>
                Get a personal lineup, sorted by what you watch
              </div>
            </div>
            <div className="pp-actions">
              <Link href="/auth/sign-in" className="pp-cta-primary">
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M4 2v18h6v2h2l2-2h4l4-4V2H4zm16 12l-3 3h-4l-2 2v-2H7V4h13v10zm-3-7h-2v5h2V7zm-5 0h-2v5h2V7z" />
                </svg>
                Sign in with Twitch
              </Link>
              <span className="pp-meta">It&rsquo;s free · no email required</span>
            </div>
          </div>

          <div className="pp-preview" aria-hidden="true">
            <div className="pp-preview-chrome">
              <span className="pp-pc-dot" />
              <span className="pp-pc-dot" />
              <span className="pp-pc-dot" />
              <span className="pp-pc-title">Your guide</span>
              <span className="pp-pc-imported">
                <svg
                  viewBox="0 0 24 24"
                  width="11"
                  height="11"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M4 2v18h6v2h2l2-2h4l4-4V2H4zm16 12l-3 3h-4l-2 2v-2H7V4h13v10zm-3-7h-2v5h2V7zm-5 0h-2v5h2V7z" />
                </svg>
                Imported from Twitch
              </span>
            </div>
            <ul className="pp-list">
              {PREVIEW_ROWS.map((row) => (
                <li key={row.id} className="pp-row">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent-cyan/40 bg-background-highlight text-xs font-bold text-text-primary"
                  >
                    {row.who
                      .split(' ')
                      .map((p) => p[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <span className="pp-row-name">{row.who}</span>
                  <span className="pp-row-plats">
                    {row.plat.map((p) => (
                      <span key={p} className={`pp-row-plat pp-row-plat-${p}`}>
                        {p === 'twitch' ? 'T' : 'Y'}
                      </span>
                    ))}
                  </span>
                  <span className={`pp-row-when pp-row-when-${row.status}`}>
                    {row.status === 'live' && <span className="pp-live-dot" />}
                    {row.when}
                  </span>
                </li>
              ))}
              <li className="pp-row pp-row-add">
                <span className="pp-row-plus">+</span>
                <span className="pp-row-name">Link a YouTube channel</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
