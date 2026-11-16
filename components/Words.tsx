import { Fragment } from 'react';
import { norm } from '@/lib/scoring';
import type { WordStatus } from '@/lib/types';

interface WordsProps {
  text: string;
  status?: Record<number, WordStatus>;
  saved?: Set<string>;
  onWord?: (word: string) => void;
}

/** A sentence split into <span class="w"> tokens (same markup as the original wordsHTML). */
export default function Words({ text, status, saved, onWord }: WordsProps) {
  const tokens = text.split(/\s+/).filter(Boolean);
  return (
    <>
      {tokens.map((tok, k) => {
        const n = norm(tok);
        const cls = ['w', status?.[k] ?? '', saved && saved.has(n) ? 'saved' : ''].join(' ').trim();
        return (
          <Fragment key={k}>
            {k > 0 && ' '}
            <span
              className={cls}
              data-w={n}
              onClick={onWord ? () => onWord(tok.replace(/^[^\w']+|[^\w']+$/g, '')) : undefined}
            >
              {tok}
            </span>
          </Fragment>
        );
      })}
    </>
  );
}
