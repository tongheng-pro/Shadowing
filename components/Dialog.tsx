'use client';

import { useId, useState } from 'react';
import type { DialogOptions, DialogResult } from '@/lib/types';

interface DialogProps {
  options: DialogOptions;
  onResolve: (result: DialogResult) => void;
}

/**
 * iOS-style alert (replaces window.confirm / window.prompt, which block the page and
 * do not match the design). Mount with a new `key` per dialog so the input resets.
 */
export default function Dialog({ options, onResolve }: DialogProps) {
  const [value, setValue] = useState(options.input?.value ?? '');
  const titleId = useId();
  const confirm = () => onResolve({ ok: true, value });
  const cancel = () => onResolve({ ok: false, value });
  const confirmDisabled = !!options.input && !value.trim();

  return (
    <div className="dialog-layer" onClick={cancel}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-body">
          <h3 id={titleId}>{options.title}</h3>
          {options.message && <p>{options.message}</p>}
          {options.input && (
            <input
              className="dialog-input"
              autoFocus
              value={value}
              placeholder={options.input.placeholder}
              onChange={(e) => setValue(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !confirmDisabled) confirm();
                if (e.key === 'Escape') cancel();
              }}
            />
          )}
        </div>
        <div className="dialog-actions">
          {/* Destructive alerts focus Cancel, so Enter never deletes by accident (iOS behaviour). */}
          <button autoFocus={!!options.destructive && !options.input} onClick={cancel}>
            {options.cancelLabel ?? 'Cancel'}
          </button>
          <button
            className={options.destructive ? 'destructive' : 'primary'}
            autoFocus={!options.destructive && !options.input}
            disabled={confirmDisabled}
            onClick={confirm}
          >
            {options.confirmLabel ?? 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
