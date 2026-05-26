export function formatUtcTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm} UTC`;
}

export function groupSlotsByUtcDate<T extends { start_time: string }>(
  slots: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const slot of slots) {
    const dateKey = slot.start_time.slice(0, 10);
    const arr = map.get(dateKey);
    if (arr) arr.push(slot);
    else map.set(dateKey, [slot]);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => a.start_time.localeCompare(b.start_time));
  }
  return map;
}

export function utcDateLabel(yyyyMmDd: string, todayUtc: string): string {
  if (yyyyMmDd === todayUtc) return 'Today';
  const today = new Date(todayUtc + 'T00:00:00Z');
  const target = new Date(yyyyMmDd + 'T00:00:00Z');
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 1) return 'Tomorrow';
  return target.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function utcDateShortLabel(yyyyMmDd: string, todayUtc: string): string {
  if (yyyyMmDd === todayUtc) return 'Today';
  const today = new Date(todayUtc + 'T00:00:00Z');
  const target = new Date(yyyyMmDd + 'T00:00:00Z');
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 1) return 'Tomorrow';
  return target.toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  });
}
