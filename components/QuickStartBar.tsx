'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ytId } from '@/lib/parser';
import { YouTubeIcon } from './Icons';

interface QuickStartBarProps {
  loading: boolean;
  /** Start from a link. Resolves true when the input should be cleared. */
  onStart: (url: string) => Promise<boolean>;
}

/** Paste a YouTube link → transcript loads → practice starts. */
export default function QuickStartBar({ loading, onStart }: QuickStartBarProps) {
  const [url, setUrl] = useState('');
  const pasteTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(pasteTimer.current), []);

  const run = async (value: string) => {
    if (await onStart(value)) setUrl('');
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(url);
  };

  // Auto-start right after a paste (the input value is updated a moment later).
  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    window.clearTimeout(pasteTimer.current);
    pasteTimer.current = window.setTimeout(() => {
      if (ytId(input.value)) void run(input.value);
    }, 50);
  };

  return (
    <form className={'quick' + (loading ? ' loading' : '')} autoComplete="off" onSubmit={submit}>
      <YouTubeIcon />
      <input
        type="url"
        inputMode="url"
        placeholder="Paste YouTube link → start shadowing"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onPaste={onPaste}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Loading' : 'Start'}
      </button>
    </form>
  );
}
