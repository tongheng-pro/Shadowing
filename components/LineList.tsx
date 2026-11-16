'use client';

import { memo, type RefObject } from 'react';
import type { LineFilter, LineProgress, Progress, Segment } from '@/lib/types';
import { fmt, scoreCls } from '@/lib/utils';
import Words from './Words';
import Mascot, { type MascotMood } from './Mascot';
import { CheckIcon, PlayIcon, StarIcon } from './Icons';

const NO_PROG: LineProgress = {};

interface LineRowProps {
  i: number;
  seg: Segment;
  p: LineProgress;
  active: boolean;
  onSelect: (i: number) => void;
  onPlay: (i: number) => void;
}

/** One row. Memoized: long auto-caption lessons can have hundreds of lines. */
const LineRow = memo(function LineRow({ i, seg, p, active, onSelect, onPlay }: LineRowProps) {
  return (
    <div className={'line' + (active ? ' active' : '') + (p.done ? ' done' : '')} data-i={i} onClick={() => onSelect(i)}>
      <div className="line-num">{p.done ? <CheckIcon /> : i + 1}</div>
      <div className="line-body">
        <div className="line-text">
          <Words text={seg.text} />
        </div>
        <div className="line-meta">
          {seg.start != null && <span>{fmt(seg.start)}</span>}
          {p.score != null && <span className={'badge ' + scoreCls(p.score)}>{p.score}%</span>}
          {p.star && (
            <span className="star-on" aria-label="Starred">
              <StarIcon />
            </span>
          )}
        </div>
      </div>
      <button
        className="line-play"
        title="Listen"
        aria-label={`Listen to line ${i + 1}`}
        onClick={(e) => {
          e.stopPropagation();
          onPlay(i);
        }}
      >
        <PlayIcon />
      </button>
    </div>
  );
});

interface LineListProps {
  segments: Segment[];
  prog: Progress;
  idx: number;
  filter: LineFilter;
  listRef: RefObject<HTMLDivElement | null>;
  onSelect: (i: number) => void;
  onPlay: (i: number) => void;
}

/** Helpful message per filter instead of a bare "Nothing here". */
function EmptyFilter({ filter, anyScored }: { filter: LineFilter; anyScored: boolean }) {
  const [mood, text]: [MascotMood, string] =
    filter === 'star'
      ? ['sleep', 'No starred lines yet. Tap the star on a hard line to save it for later.']
      : filter === 'todo'
        ? ['cheer', 'Every line is done. Amazing work!']
        : filter === 'weak'
          ? anyScored
            ? ['good', 'No weak lines — every scored line is 70% or more.']
            : ['think', 'Record yourself on a few lines and the weak ones will show up here.']
          : ['sleep', 'This lesson has no lines.'];
  return (
    <div className="empty">
      <Mascot mood={mood} size={72} />
      <div>{text}</div>
    </div>
  );
}

function LineList({ segments, prog, idx, filter, listRef, onSelect, onPlay }: LineListProps) {
  const rows = segments.map((s, i) => {
    const p = prog[i] ?? NO_PROG;
    if (filter === 'star' && !p.star) return null;
    if (filter === 'todo' && p.done) return null;
    if (filter === 'weak' && !(p.score != null && p.score < 70)) return null;
    return <LineRow key={i} i={i} seg={s} p={p} active={i === idx} onSelect={onSelect} onPlay={onPlay} />;
  });
  const visible = rows.some(Boolean);
  return (
    <div className="list" ref={listRef}>
      {visible ? rows : <EmptyFilter filter={filter} anyScored={Object.values(prog).some((p) => p.score != null)} />}
    </div>
  );
}

export default memo(LineList);
