'use client';

import type { WordEntry, WordLookup } from '@/lib/types';
import { escapeRegExp, khmerUrl } from '@/lib/utils';
import Mascot from '../Mascot';
import { ExternalIcon, SlowIcon, SpeakerIcon, StarIcon, StarOutlineIcon } from '../Icons';
import Sheet from './Sheet';

interface WordSheetProps {
  open: boolean;
  word: WordEntry | null;
  lookup: WordLookup;
  saved: boolean;
  onSpeak: (rate: number) => void;
  onToggleSave: () => void;
  onClose: () => void;
}

/** Context sentence with the first whole-word match in bold. */
function Context({ ctx, w }: { ctx: string; w: string }) {
  const m = new RegExp('\\b(' + escapeRegExp(w) + ')\\b', 'i').exec(ctx);
  if (!m) return <>{ctx}</>;
  return (
    <>
      {ctx.slice(0, m.index)}
      <b>{m[1]}</b>
      {ctx.slice(m.index + m[1].length)}
    </>
  );
}

export default function WordSheet({ open, word, lookup, saved, onSpeak, onToggleSave, onClose }: WordSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} label="Word details">
      <div className="sheet-head">
        <h2>{word?.w ?? 'word'}</h2>
        <button className="done-btn" onClick={onClose}>
          Done
        </button>
      </div>
      <div className="word-ph">{word?.ph}</div>
      <div className="word-actions">
        <button className="btn secondary sm" onClick={() => onSpeak(0.95)}>
          <SpeakerIcon />
          Normal
        </button>
        <button className="btn secondary sm" onClick={() => onSpeak(0.5)}>
          <SlowIcon />
          Slow
        </button>
        <button className="btn sm" onClick={onToggleSave}>
          {saved ? <StarIcon /> : <StarOutlineIcon />}
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>
      <div className="card word-ctx">{word && <Context ctx={word.ctx} w={word.w} />}</div>
      <div>
        {lookup.status === 'loading' && <p className="hint">Looking up meaning…</p>}
        {lookup.status === 'none' && (
          <div className="inline-empty">
            <Mascot mood="think" size={44} />
            <p className="hint">No dictionary result (names, numbers, or no internet). Use the Khmer translate button below.</p>
          </div>
        )}
        {lookup.status === 'found' &&
          lookup.meanings.map((m, i) => (
            <div className="def" key={i}>
              <i>{m.partOfSpeech}</i>
              {m.definition}
              {m.example && <div className="ex">“{m.example}”</div>}
            </div>
          ))}
      </div>
      <a className="btn secondary" href={word ? khmerUrl(word.w) : undefined} target="_blank" rel="noopener">
        Translate to Khmer
        <ExternalIcon />
      </a>
    </Sheet>
  );
}
