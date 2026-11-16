'use client';

import type { CSSProperties, RefObject } from 'react';
import type { HeardState, LineProgress, Segment, WordStatus } from '@/lib/types';
import type { TurnState } from '@/hooks/usePlaybackEngine';
import { fmt, khmerUrl } from '@/lib/utils';
import Words from './Words';
import Mascot, { moodForScore } from './Mascot';
import {
  CheckIcon,
  CompareIcon,
  EyeIcon,
  MicIcon,
  PersonIcon,
  SpeakerIcon,
  SpeakingIcon,
  StarIcon,
  StarOutlineIcon,
  TranslateIcon,
} from './Icons';

interface CurrentCardProps {
  segment: Segment | undefined;
  idx: number;
  total: number;
  status: Record<number, WordStatus>;
  savedWords: Set<string>;
  prog: LineProgress;
  revealed: boolean;
  repLabel: string | null;
  turn: TurnState;
  /** Show the icon in the "your turn" bar (Settings → Playback). */
  turnIcon: boolean;
  turnFillRef: RefObject<HTMLDivElement | null>;
  heard: HeardState;
  recording: boolean;
  hasRecording: boolean;
  onWord: (word: string) => void;
  onSay: (word: string) => void;
  onSkipTurn: () => void;
  onListen: () => void;
  onRecord: () => void;
  onMine: () => void;
  onCompare: () => void;
  onReveal: () => void;
  onStar: () => void;
  onDone: () => void;
}

function Heard({ heard, onSay }: { heard: HeardState; onSay: (w: string) => void }) {
  if (heard.kind === 'hidden') return null;
  if (heard.kind === 'listening') {
    return (
      <div className="heard listening">
        <Mascot mood="listen" size={48} animate />
        <div className="heard-txt">
          <b>
            <span className="dot" />
            Listening… speak now
          </b>
          <div className="said">{heard.text || '…'}</div>
        </div>
      </div>
    );
  }
  if (heard.kind === 'message') {
    return (
      <div className="heard">
        <Mascot mood="think" size={48} />
        <div className="heard-txt">{heard.text}</div>
      </div>
    );
  }
  const { score, missed, said } = heard;
  const color = score >= 85 ? 'var(--green)' : score >= 60 ? 'var(--orange)' : 'var(--red)';
  const title =
    score >= 95 ? 'Perfect!' : score >= 85 ? 'Excellent!' : score >= 60 ? 'Good — try once more' : 'Keep practicing';
  const ring: CSSProperties & Record<'--p' | '--c', string | number> = { '--p': score, '--c': color };
  return (
    <div className="heard">
      <div className="score-ring" style={ring}>
        <span>{score}%</span>
      </div>
      <div className="heard-txt">
        <b>{title}</b>
        <div className="said">You said: “{said}”</div>
        {missed.length > 0 && (
          <div className="chips">
            {missed.slice(0, 10).map((w, i) => (
              <button key={i} className="mchip" aria-label={`Hear “${w}”`} onClick={() => onSay(w)}>
                <SpeakerIcon />
                {w}
              </button>
            ))}
          </div>
        )}
      </div>
      <Mascot mood={moodForScore(score)} size={52} className="heard-mascot" key={score} />
    </div>
  );
}

/** The big "current sentence" card. */
export default function CurrentCard({ turnFillRef, ...p }: CurrentCardProps) {
  const seg = p.segment;
  return (
    <div className={'card current' + (p.revealed ? ' revealed' : '')}>
      <div className="current-top">
        <span className="pill">
          {p.idx + 1} / {p.total}
        </span>
        <span className="pill" hidden={!seg || seg.start == null}>
          {seg && seg.start != null ? fmt(seg.start) : ''}
        </span>
        <span className="pill rep" hidden={!p.repLabel}>
          {p.repLabel}
        </span>
        <span className="spacer" />
        <button
          className={'icon-btn sm star' + (p.prog.star ? ' on' : '')}
          title="Star (S)"
          aria-label="Star this line"
          aria-pressed={!!p.prog.star}
          onClick={p.onStar}
        >
          {p.prog.star ? <StarIcon /> : <StarOutlineIcon />}
        </button>
        <button
          className={'icon-btn sm done' + (p.prog.done ? ' on' : '')}
          title="Mark done (D)"
          aria-label="Mark line done"
          aria-pressed={!!p.prog.done}
          onClick={p.onDone}
        >
          <CheckIcon />
        </button>
      </div>

      <p className="current-text">
        {seg ? <Words text={seg.text} status={p.status} saved={p.savedWords} onWord={p.onWord} /> : 'No lines in this lesson.'}
      </p>

      <div
        className={'turn' + (p.turn.rec ? ' rec' : '')}
        hidden={!p.turn.visible}
        role="button"
        tabIndex={p.turn.visible ? 0 : -1}
        aria-label="Your turn. Activate to skip."
        onClick={p.onSkipTurn}
        onKeyDown={(e) => {
          if (e.key === 'Enter') p.onSkipTurn();
        }}
      >
        <div className="turn-label">
          <span className="turn-who">
            {p.turnIcon && (
              <Mascot
                mood="speak"
                size={26}
                fallback={<span className="turn-icon">{p.turn.rec ? <MicIcon /> : <SpeakingIcon />}</span>}
              />
            )}
            {p.turn.rec ? 'Your turn — recording…' : 'Your turn — say it now'}
          </span>
          <span className="turn-skip">Skip ›</span>
        </div>
        <div className="turn-bar">
          <div id="turnFill" ref={turnFillRef} />
        </div>
      </div>

      <Heard heard={p.heard} onSay={p.onSay} />

      <div className="action-grid">
        <button className="act" title="Listen once (L)" onClick={p.onListen}>
          <SpeakerIcon />
          Listen
        </button>
        <button
          className={'act rec' + (p.recording ? ' on' : '')}
          title="Record & score (R)"
          aria-pressed={p.recording}
          onClick={p.onRecord}
        >
          <MicIcon />
          <span>{p.recording ? 'Stop' : 'Record'}</span>
        </button>
        <button className="act" disabled={!p.hasRecording} title="Play my voice (M)" onClick={p.onMine}>
          <PersonIcon />
          My voice
        </button>
        <button className="act" disabled={!p.hasRecording} title="Original then mine (C)" onClick={p.onCompare}>
          <CompareIcon />
          Compare
        </button>
        <button className="act" title="Reveal text (V)" onClick={p.onReveal}>
          <EyeIcon />
          Reveal
        </button>
        <a className="act" href={seg ? khmerUrl(seg.text) : undefined} target="_blank" rel="noopener" title="Translate to Khmer">
          <TranslateIcon />
          Khmer
        </a>
      </div>
    </div>
  );
}
