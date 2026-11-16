/** Small helpers shared by components and hooks. */

/** Unique id (same format as the original app). */
export const uid = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/** Local date key, e.g. "2026-11-16". Used for daily stats. */
export const dayKey = (d: Date = new Date()): string =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

/** Seconds → "m:ss" or "h:mm:ss". */
export const fmt = (s: number | null | undefined): string => {
  if (s == null || isNaN(s)) return '';
  const t = Math.max(0, Math.floor(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const x = t % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(x).padStart(2, '0');
};

/** Badge color class for a score. */
export const scoreCls = (s: number): string => (s >= 85 ? 'b-g' : s >= 60 ? 'b-o' : 'b-r');

export const clamp = (n: number, min: number, max: number): number => Math.max(min, Math.min(max, n));

export const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Google Translate English → Khmer link. */
export const khmerUrl = (text: string): string =>
  'https://translate.google.com/?sl=en&tl=km&op=translate&text=' + encodeURIComponent(text);

/** Read the day-streak (consecutive days with any activity). */
export function streak(days: Record<string, unknown>, now: Date = new Date()): number {
  let n = 0;
  const d = new Date(now);
  if (!days[dayKey(d)]) d.setDate(d.getDate() - 1);
  while (days[dayKey(d)]) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/** Light haptic tap on phones that support it (Android). No-op elsewhere. */
export function haptic(pattern: number | number[] = 10): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    /* not allowed (e.g. no user gesture yet) */
  }
}
