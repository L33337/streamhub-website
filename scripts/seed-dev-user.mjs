// LOCAL DEVELOPMENT ONLY (M16): creates the feed test user + favorites in
// the LOCAL Supabase stack so /api/dev-login → /feed can be exercised
// end-to-end. Refuses to run against anything but 127.0.0.1/localhost.
//
// Usage (with the StreamHub local stack running — `npx supabase start`):
//   node scripts/seed-dev-user.mjs [SUPABASE_URL] [SERVICE_ROLE_KEY]
// Falls back to env vars SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY, then to
// the standard local-stack defaults printed by `npx supabase status`.

import { createClient } from '@supabase/supabase-js';

const DEFAULT_LOCAL_URL = 'http://127.0.0.1:54321';

const url = process.argv[2] ?? process.env.SUPABASE_URL ?? DEFAULT_LOCAL_URL;
const serviceKey = process.argv[3] ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEV_EMAIL = 'feed-tester@local.test';
const DEV_PASSWORD = 'feed-tester-pw';
const FAVORITE_STREAMER_IDS = ['shroud', 'pokimane'];

if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/.test(url)) {
  console.error(`Refusing to run against non-local Supabase URL: ${url}`);
  process.exit(1);
}
if (!serviceKey) {
  console.error(
    'Missing service role key. Pass it as the 2nd argument or set SUPABASE_SERVICE_ROLE_KEY ' +
      '(local stack: see `npx supabase status` in the StreamHub repo).',
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // Idempotent user creation.
  let userId;
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: DEV_EMAIL,
    password: DEV_PASSWORD,
    email_confirm: true,
  });
  if (createError) {
    if (!/already.*registered|already.*exists/i.test(createError.message)) {
      throw new Error(`createUser failed: ${createError.message}`);
    }
    const { data: list, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw new Error(`listUsers failed: ${listError.message}`);
    const existing = list.users.find((u) => u.email === DEV_EMAIL);
    if (!existing) throw new Error('User exists but was not found via listUsers');
    userId = existing.id;
    console.log(`User already exists: ${DEV_EMAIL} (${userId})`);
  } else {
    userId = created.user.id;
    console.log(`Created user: ${DEV_EMAIL} (${userId})`);
  }

  // Idempotent favorites (23505 = already favorited).
  for (const streamerId of FAVORITE_STREAMER_IDS) {
    const { error } = await supabase
      .from('user_favorites')
      .insert({ user_id: userId, streamer_id: streamerId });
    if (error && error.code !== '23505') {
      throw new Error(`favorite insert failed for ${streamerId}: ${error.message}`);
    }
    console.log(`Favorite: ${streamerId}${error ? ' (already present)' : ''}`);
  }

  console.log('\nDone. Start the dev server and open http://localhost:3000/api/dev-login');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
