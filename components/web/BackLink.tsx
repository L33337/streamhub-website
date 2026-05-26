'use client';

import { useRouter } from 'next/navigation';

export function BackLink() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="mb-4 inline-flex items-center gap-1 text-sm text-accent-cyan hover:underline"
    >
      <span aria-hidden="true">←</span> Back
    </button>
  );
}
