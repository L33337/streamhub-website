'use client';

import { X } from 'lucide-react';

/**
 * Bottom-center toast for the feed (feed UX round 2026-07-22): dismiss-undo
 * and favorite-added confirmations. The CALLER owns the auto-close timer —
 * this component only renders.
 */
export function FeedSnackbar({
  message,
  actionLabel,
  onAction,
  onClose,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
}) {
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-[80] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-full border border-border-default bg-background-highlight px-4 py-2.5 shadow-lg shadow-black/40"
    >
      <span className="truncate text-sm text-text-primary">{message}</span>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 text-sm font-bold text-accent-cyan hover:underline"
        >
          {actionLabel}
        </button>
      )}
      <button
        type="button"
        aria-label="Close notification"
        onClick={onClose}
        className="shrink-0 text-text-muted transition-colors hover:text-white"
      >
        <X size={14} />
      </button>
    </div>
  );
}
