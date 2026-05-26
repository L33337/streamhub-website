import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AccountInfoSection } from '@/components/web/AccountInfoSection';
import { SignOutSection } from '@/components/web/SignOutSection';
import { DeleteAccountButton } from '@/components/web/DeleteAccountButton';
import { TwitchImportButton } from '@/components/web/TwitchImportButton';
import { LegalLinksSection } from '@/components/web/LegalLinksSection';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Settings | StreamerTimes',
  description: 'Manage your Streamer Times account and preferences.',
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/app');
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const provider =
    (user.app_metadata?.provider as string | undefined) ?? 'unknown';
  const avatarUrl =
    (meta.avatar_url as string | undefined) ??
    (meta.picture as string | undefined) ??
    null;
  const displayName =
    (meta.full_name as string | undefined) ??
    (meta.name as string | undefined) ??
    (meta.user_name as string | undefined) ??
    null;

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <header>
        <h1 className="text-3xl font-bold gradient-text">Settings</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Manage your account, sign-in, and notifications.
        </p>
      </header>

      <AccountInfoSection
        email={user.email ?? null}
        provider={provider}
        avatarUrl={avatarUrl}
        displayName={displayName}
      />

      {provider === 'twitch' ? <TwitchImportButton /> : null}

      <SignOutSection />

      <DeleteAccountButton />

      <LegalLinksSection />
    </main>
  );
}
