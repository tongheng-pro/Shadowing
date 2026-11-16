'use client';

import type { SavedWord } from '@/lib/types';
import { PlayIcon } from './Icons';
import Mascot from './Mascot';

interface WordsViewProps {
  active: boolean;
  words: SavedWord[];
  onSay: (w: string) => void;
  onRemove: (w: string) => void;
  onCopyAll: () => void;
}

export default function WordsView({ active, words, onSay, onRemove, onCopyAll }: WordsViewProps) {
  return (
    <section className={'view' + (active ? ' active' : '')} id="view-words">
      <header className="nav">
        <div className="nav-row">
          <span />
          <button className="nav-btn" onClick={onCopyAll}>
            Copy all
          </button>
        </div>
        <h1 className="large-title">Words</h1>
        <div className="subtitle">Tap any word in the current sentence to save it here.</div>
      </header>
      <div className="list">
        {words.length ? (
          words
            .slice()
            .reverse()
            .map((w) => (
              <div key={w.w} className="line">
                <div className="line-body">
                  <div className="cell-title">
                    {w.w}{' '}
                    <span className="cell-sub" style={{ display: 'inline' }}>
                      {w.ph || ''}
                    </span>
                  </div>
                  {w.def && <div className="cell-sub">{w.def}</div>}
                  {w.ctx && (
                    <div className="cell-sub" style={{ fontStyle: 'italic' }}>
                      “{w.ctx}”
                    </div>
                  )}
                </div>
                <button className="line-play" aria-label={`Hear “${w.w}”`} onClick={() => onSay(w.w)}>
                  <PlayIcon />
                </button>
                <button className="del" aria-label={`Remove “${w.w}”`} onClick={() => onRemove(w.w)}>
                  Remove
                </button>
              </div>
            ))
        ) : (
          <div className="empty">
            <Mascot mood="sleep" size={80} />
            <div>
              <b>No saved words yet</b>
              <br />
              Tap any word in the current sentence, then Save.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
