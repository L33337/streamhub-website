'use client';

import type { User } from '@supabase/supabase-js';
import { AuthProvider } from '@/context/AuthProvider';
import { FavoritesProvider } from '@/context/FavoritesProvider';

interface Props {
  initialUser: User | null;
  initialFavoriteIds: string[];
  children: React.ReactNode;
}

export function Providers({ initialUser, initialFavoriteIds, children }: Props) {
  return (
    <AuthProvider initialUser={initialUser}>
      <FavoritesProvider initialFavoriteIds={initialFavoriteIds}>
        {children}
      </FavoritesProvider>
    </AuthProvider>
  );
}
