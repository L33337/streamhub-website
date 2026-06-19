'use client';

import { useSyncExternalStore } from 'react';
import {
  detectGetAppTarget,
  FALLBACK_URL,
  type GetAppTarget,
} from './get-app-target';

// SSR / first-hydration value: the crawlable /app landing link. The real,
// device-specific target (App Store / Google Play) is resolved on the client.
const SERVER_TARGET: GetAppTarget = { href: FALLBACK_URL, external: false };

// The device type is fixed for the page session, so cache the first client read.
// useSyncExternalStore compares snapshots by reference — returning a fresh object
// from detectGetAppTarget() on every render would trip its "getSnapshot should be
// cached" guard and loop.
let clientTarget: GetAppTarget | undefined;

const subscribe = (): (() => void) => () => {};
const getClientSnapshot = (): GetAppTarget => {
  clientTarget ??= detectGetAppTarget();
  return clientTarget;
};
const getServerSnapshot = (): GetAppTarget => SERVER_TARGET;

/**
 * Resolves the "Get the App" link target without a hydration mismatch and
 * without calling setState in an effect (the React 19 `set-state-in-effect`
 * anti-pattern). Returns the /app fallback on the server and during hydration,
 * then the App Store / Google Play target on the client. Shared by GetAppLink
 * and FloatingGetAppButton.
 */
export function useGetAppTarget(): GetAppTarget {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
