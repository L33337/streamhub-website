'use client';

import { useState } from 'react';
import { touchTargetExpander } from '@/lib/ui/positioning';
import { Icon } from '@/components/web/icons/IconSprite';
import { HomeUpsellSheet, type UpsellSheetStrings } from './HomeUpsellSheet';

/**
 * Reminder bell on an upcoming slot card (implicit hook I2): "tell me when
 * this starts" → the push-notification upsell sheet. Rendered as a SIBLING of
 * the SlotCard link, never inside it (SlotIcsButton convention — no nested
 * interactive elements).
 */
export function SlotBellButton({
  ariaLabel,
  strings,
  className = '',
}: {
  ariaLabel: string;
  strings: UpsellSheetStrings;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        title={ariaLabel}
        onClick={() => setOpen(true)}
        // The visible circle stays 28px so it does not dominate the card; the
        // invisible ::before grows the touch target to 44px. `className` comes
        // last and carries the caller's `absolute right-3 top-3`.
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border-default bg-background-elevated/90 text-text-muted transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan ${touchTargetExpander(className, 'lg')} ${className}`}
      >
        {/* Sprite reference: one bell per lineup card. */}
        <Icon name="bell" size={13} />
      </button>
      {open && <HomeUpsellSheet strings={strings} onClose={() => setOpen(false)} />}
    </>
  );
}
