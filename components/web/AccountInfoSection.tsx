import Image from 'next/image';
import { SettingsSection } from './SettingsSection';
import { InitialsAvatar } from './InitialsAvatar';

interface Props {
  email: string | null;
  provider: string;
  avatarUrl: string | null;
  displayName: string | null;
}

function providerLabel(provider: string): string {
  switch (provider) {
    case 'twitch':
      return 'Signed in with Twitch';
    case 'google':
      return 'Signed in with Google';
    case 'apple':
      return 'Signed in with Apple';
    default:
      return 'Signed in';
  }
}

export function AccountInfoSection({
  email,
  provider,
  avatarUrl,
  displayName,
}: Props) {
  const name = displayName ?? email ?? 'Account';
  return (
    <SettingsSection title="Account">
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={64}
            height={64}
            unoptimized
            className="rounded-full border border-border-default"
          />
        ) : (
          <InitialsAvatar name={name} size={64} />
        )}
        <div className="min-w-0 flex-1">
          {displayName ? (
            <p className="truncate text-base font-semibold text-text-primary">
              {displayName}
            </p>
          ) : null}
          {email ? (
            <p className="truncate text-sm text-text-secondary" title={email}>
              {email}
            </p>
          ) : null}
          <p className="mt-1 text-xs uppercase tracking-wide text-text-muted">
            {providerLabel(provider)}
          </p>
        </div>
      </div>
    </SettingsSection>
  );
}
