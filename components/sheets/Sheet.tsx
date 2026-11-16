'use client';

import { useRef, type PointerEvent, type ReactNode } from 'react';

interface SheetProps {
  open: boolean;
  /** Called on swipe-down. */
  onClose: () => void;
  /** Accessible name for the dialog. */
  label: string;
  children: ReactNode;
}

const CLOSE_DISTANCE = 90; // px
const CLOSE_VELOCITY = 0.6; // px per ms

/**
 * iOS bottom sheet. The shared backdrop lives in ShadowingApp.
 * - Drag the grabber or the header down to close.
 * - Closed sheets are `inert`, so Tab never lands on hidden buttons.
 */
export default function Sheet({ open, onClose, label, children }: SheetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; y0: number; t0: number; dy: number } | null>(null);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (!t.closest('.grabber, .sheet-head') || t.closest('button, input, select, textarea, a')) return;
    drag.current = { id: e.pointerId, y0: e.clientY, t0: performance.now(), dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    ref.current?.classList.add('dragging');
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !ref.current) return;
    d.dy = Math.max(0, e.clientY - d.y0);
    ref.current.style.transform = `translate(-50%, ${d.dy}px)`;
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const el = ref.current;
    if (el) {
      el.classList.remove('dragging');
      el.style.transform = ''; // back to the CSS class position (animated)
    }
    const velocity = d.dy / Math.max(1, performance.now() - d.t0);
    if (d.dy > CLOSE_DISTANCE || (d.dy > 30 && velocity > CLOSE_VELOCITY)) onClose();
  };

  return (
    <div
      ref={ref}
      className={'sheet' + (open ? ' show' : '')}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      aria-hidden={!open}
      inert={!open}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="grabber" />
      {children}
    </div>
  );
}
