'use client';

import { useEffect, useEffectEvent } from 'react';

export interface ShortcutOptions {
  /** Esc always closes sheets, on any tab. */
  onEscape: () => void;
  /** Other shortcuts only run when this returns true (Practice tab, no sheet open). */
  isActive: () => boolean;
  /** Keyed by `event.key.toLowerCase()` (" ", "arrowleft", "l", "-", …). */
  handlers: Record<string, () => void>;
}

export function useKeyboardShortcuts(options: ShortcutOptions): void {
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    const t = e.target;
    if (t instanceof Element && t.matches('input, textarea, select')) return;
    if (e.key === 'Escape') {
      options.onEscape();
      return;
    }
    if (!options.isActive() || e.metaKey || e.ctrlKey || e.altKey) return;
    const fn = options.handlers[e.key.toLowerCase()];
    if (fn) {
      e.preventDefault();
      fn();
    }
  });

  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKeyDown(e);
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, []);
}
