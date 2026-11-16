'use client';

import Mascot from '../Mascot';
import { CheckIcon, RepeatIcon } from '../Icons';
import Sheet from './Sheet';

export interface CompleteStats {
  title: string;
  total: number;
  done: number;
  avg: number | null;
  weak: number;
}

interface CompleteSheetProps {
  open: boolean;
  stats: CompleteStats;
  onPracticeWeak: () => void;
  onRestart: () => void;
  onLessons: () => void;
  onClose: () => void;
}

/** Celebration when the last line of a lesson finishes (replaces the old "Lesson finished" toast). */
export default function CompleteSheet({ open, stats, onPracticeWeak, onRestart, onLessons, onClose }: CompleteSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} label="Lesson complete">
      <div className="sheet-head">
        <span />
        <button className="done-btn" onClick={onClose}>
          Done
        </button>
      </div>
      <div className="complete">
        {open && (
          <Mascot
            mood="cheer"
            size={120}
            animate
            fallback={
              <span className="complete-badge">
                <CheckIcon />
              </span>
            }
          />
        )}
        <h2>Lesson complete!</h2>
        <p className="subtitle">{stats.title}</p>
      </div>
      <div className="stats three">
        <div className="stat">
          <b>
            {stats.done}/{stats.total}
          </b>
          <span>Lines done</span>
        </div>
        <div className="stat">
          <b>{stats.avg != null ? stats.avg + '%' : '—'}</b>
          <span>Avg score</span>
        </div>
        <div className="stat">
          <b>{stats.weak}</b>
          <span>Weak lines</span>
        </div>
      </div>
      {stats.avg == null && <p className="hint center">Tip: tap Record after a line to get a score and find weak spots.</p>}
      {stats.weak > 0 && (
        <button className="btn" onClick={onPracticeWeak}>
          Practice {stats.weak} weak line{stats.weak > 1 ? 's' : ''}
        </button>
      )}
      <button className={'btn' + (stats.weak > 0 ? ' secondary' : '')} onClick={onRestart}>
        <RepeatIcon />
        Start again from line 1
      </button>
      <button className="btn secondary" onClick={onLessons}>
        Choose another lesson
      </button>
    </Sheet>
  );
}
