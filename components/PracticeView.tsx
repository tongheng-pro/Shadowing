'use client';

import type { ComponentProps, ReactNode, Ref, RefObject } from 'react';
import type { Lesson, LineFilter, Settings } from '@/lib/types';
import type { CycleKey } from '@/lib/constants';
import CurrentCard from './CurrentCard';
import LineList from './LineList';
import PlayerBar from './PlayerBar';
import QuickStartBar from './QuickStartBar';
import YouTubePlayer, { type YouTubeHandle } from './YouTubePlayer';
import { GearIcon, KeyboardIcon } from './Icons';

const FILTERS: ReadonlyArray<readonly [LineFilter, string]> = [
  ['all', 'All'],
  ['star', 'Starred'],
  ['todo', 'To do'],
  ['weak', 'Weak <70%'],
];

interface PracticeViewProps {
  active: boolean;
  /** First-run welcome card (or null). */
  welcome: ReactNode;
  lesson: Lesson;
  meta: ReactNode;
  progressPct: number;
  idx: number;
  settings: Settings;
  playing: boolean;
  quickLoading: boolean;
  card: Omit<ComponentProps<typeof CurrentCard>, 'segment' | 'idx' | 'total' | 'turnFillRef'>;
  turnFillRef: RefObject<HTMLDivElement | null>;
  playerRef: Ref<YouTubeHandle>;
  listRef: RefObject<HTMLDivElement | null>;
  onPlayerReady: (ready: boolean) => void;
  onPlayerError: (msg: string) => void;
  onQuickStart: (url: string) => Promise<boolean>;
  onLessons: () => void;
  onSettings: () => void;
  onShortcuts: () => void;
  onFilter: (f: LineFilter) => void;
  onSelectLine: (i: number) => void;
  onPlayLine: (i: number) => void;
  onCycle: (k: CycleKey) => void;
  onPrev: () => void;
  onNext: () => void;
  onToggle: () => void;
}

export default function PracticeView({ playerRef, listRef, turnFillRef, ...p }: PracticeViewProps) {
  const L = p.lesson;
  return (
    <section className={'view' + (p.active ? ' active' : '')} id="view-practice">
      <header className="nav">
        <div className="nav-row">
          <button className="nav-btn" onClick={p.onLessons}>
            ‹ Lessons
          </button>
          <div className="nav-actions">
            <button className="icon-btn" title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts" onClick={p.onShortcuts}>
              <KeyboardIcon />
            </button>
            <button className="icon-btn" title="Settings" aria-label="Settings" onClick={p.onSettings}>
              <GearIcon />
            </button>
          </div>
        </div>
        <QuickStartBar loading={p.quickLoading} onStart={p.onQuickStart} />
        <h1 className="large-title">{L.title}</h1>
        <div className="subtitle">{p.meta}</div>
        <div
          className="progress"
          role="progressbar"
          aria-label="Lines done"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(p.progressPct)}
        >
          <div style={{ width: p.progressPct + '%' }} />
        </div>
      </header>

      {p.welcome}

      <div className={'practice-grid mode-' + p.settings.textMode}>
        <div className="col-left">
          <YouTubePlayer
            ref={playerRef}
            videoId={L.videoId}
            speed={p.settings.speed}
            onReadyChange={p.onPlayerReady}
            onError={p.onPlayerError}
          />
          <CurrentCard {...p.card} turnFillRef={turnFillRef} segment={L.segments[p.idx]} idx={p.idx} total={L.segments.length} />
        </div>

        <div className="col-right">
          <div className="seg">
            {FILTERS.map(([v, label]) => (
              <button
                key={v}
                className={p.settings.filter === v ? 'on' : ''}
                aria-pressed={p.settings.filter === v}
                onClick={() => p.onFilter(v)}
              >
                {label}
              </button>
            ))}
          </div>
          <LineList
            segments={L.segments}
            prog={L.prog}
            idx={p.idx}
            filter={p.settings.filter}
            listRef={listRef}
            onSelect={p.onSelectLine}
            onPlay={p.onPlayLine}
          />
        </div>
      </div>

      <PlayerBar
        settings={p.settings}
        playing={p.playing}
        onCycle={p.onCycle}
        onPrev={p.onPrev}
        onNext={p.onNext}
        onToggle={p.onToggle}
      />
    </section>
  );
}
