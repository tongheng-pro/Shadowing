'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

function readStorage(key: string): unknown {
  try {
    const v = localStorage.getItem(key);
    return v == null ? undefined : (JSON.parse(v) as unknown);
  } catch {
    return undefined;
  }
}

function writeStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded / private mode → ignore, like the original app */
  }
}

export interface StoredValue<T> {
  /** Value for rendering. */
  value: T;
  /** Always the newest value (safe to read inside timers / async code). */
  ref: RefObject<T>;
  /** Replace the value (or update it from the newest value) and save it. */
  set: (next: T | ((prev: T) => T)) => void;
  /** True after the value was read from localStorage. */
  loaded: boolean;
}

/**
 * JSON value persisted in localStorage.
 * - Reads only inside useEffect (no hydration mismatch: the server and the first
 *   client render both use `fallback`).
 * - `parse` turns the stored JSON (or `undefined` when missing/broken) into a valid T.
 *   Pass a module-level function so it stays stable.
 */
export function useLocalStorage<T>(key: string, fallback: T, parse: (raw: unknown) => T): StoredValue<T> {
  const [value, setValue] = useState<T>(fallback);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<T>(fallback);
  const parseRef = useRef(parse);

  useEffect(() => {
    const v = parseRef.current(readStorage(key));
    ref.current = v;
    // Reading browser storage after mount is intentional (avoids hydration errors).
    setValue(v);
    setLoaded(true);
  }, [key]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const v = typeof next === 'function' ? (next as (prev: T) => T)(ref.current) : next;
      ref.current = v;
      setValue(v);
      writeStorage(key, v);
    },
    [key],
  );

  return { value, ref, set, loaded };
}
