'use client';

import { useAuth } from '@/context/AuthProvider';
import { clearTwitchToken } from '@/lib/web/twitchToken';
import { SettingsSection } from './SettingsSection';

export function SignOutSection() {
  const { signOut, loading } = useAuth();

  function handleClick() {
    clearTwitchToken();
    void signOut();
  }

  return (
    <SettingsSection
      title="Sign out"
      description="End this session on this device. Your favorites stay synced for the next time you sign in."
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex h-10 items-center rounded-lg border border-border-default bg-background-highlight px-4 text-sm font-semibold text-text-primary hover:border-accent-cyan/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Signing out…' : 'Sign out'}
      </button>
    </SettingsSection>
  );
}
