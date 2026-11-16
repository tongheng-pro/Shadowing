'use client';

import type { Settings } from '@/lib/types';
import type { CycleKey } from '@/lib/constants';
import { NextIcon, PauseIcon, PlayIcon, PrevIcon, RepeatIcon } from './Icons';

interface PlayerBarProps {
  settings: Settings;
  playing: boolean;
  onCycle: (k: CycleKey) => void;
  onPrev: () => void;
  onNext: () => void;
  onToggle: () => void;
}

const MODE_LABEL = { show: 'Show', blur: 'Blur', hide: 'Hide' } as const;

/** Floating player bar: speed / repeat / prev / play / next / gap / mode. */
export default function PlayerBar({ settings: S, playing, onCycle, onPrev, onNext, onToggle }: PlayerBarProps) {
  return (
    <div className="player-bar">
      <button className={'chip' + (S.speed !== 1 ? ' active' : '')} title="Speed" aria-label={`Speed ${S.speed}×`} onClick={() => onCycle('speed')}>
        {S.speed}×
      </button>
      <button
        className={'chip' + (S.repeats !== 1 ? ' active' : '')}
        title="Repeat each line"
        aria-label={`Repeat each line: ${S.repeats || 'forever'}`}
        onClick={() => onCycle('repeats')}
      >
        <RepeatIcon />
        {S.repeats || '∞'}
      </button>
      <button className="ctrl" title="Previous (←)" aria-label="Previous line" onClick={onPrev}>
        <PrevIcon />
      </button>
      <button className="ctrl play" title="Play / Pause (Space)" aria-label={playing ? 'Pause' : 'Play'} onClick={onToggle}>
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button className="ctrl" title="Next (→)" aria-label="Next line" onClick={onNext}>
        <NextIcon />
      </button>
      <button className={'chip' + (S.gap > 0 ? ' active' : '')} title="Pause for your turn" aria-label={`Your-turn pause: ${S.gap ? S.gap + '×' : 'off'}`} onClick={() => onCycle('gap')}>
        <PauseIcon />
        {S.gap ? S.gap + '×' : 'Off'}
      </button>
      <button
        className={'chip' + (S.textMode !== 'show' ? ' active' : '')}
        title="Text mode (H)"
        aria-label={`Text mode: ${MODE_LABEL[S.textMode]}`}
        onClick={() => onCycle('textMode')}
      >
        {MODE_LABEL[S.textMode]}
      </button>
    </div>
  );
}
