import { useLayoutEffect, useRef, type RefObject } from 'react';

/**
 * Keep a ref pointing at the latest value of something (usually a callbacks object).
 * Async code (timers, media events) reads `ref.current` so it never uses stale props.
 */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
