import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { signInGateRedirect } from '@/lib/auth-flag';
import { fetchCategoryOptions } from '@/lib/feed/service';
import { fetchUserInterests } from '@/lib/feed/interests';
import { InterestsPicker } from '@/components/web/feed/InterestsPicker';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Interests | StreamerTimes',
  description: 'Pick categories to personalize your Streamer Times feed.',
  robots: { index: false, follow: false },
};

export default async function InterestsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(signInGateRedirect('/feed/interests'));
  }

  const [categories, picked] = await Promise.all([
    fetchCategoryOptions(supabase, 30).catch(() => [] as string[]),
    fetchUserInterests(supabase, user.id).catch(() => [] as string[]),
  ]);

  // Picked categories always render, even when they dropped out of the
  // actively-streamed option list (app parity).
  const options = [...categories];
  picked.forEach((category) => {
    if (!options.includes(category)) options.push(category);
  });

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <InterestsPicker userId={user.id} options={options} initialPicked={picked} />
    </main>
  );
}
