'use client';

import { useEffect, useMemo, useRef, type ChangeEvent } from 'react';
import { mergeSentences, parseTranscript } from '@/lib/parser';
import type { NewLessonDraft } from '@/lib/types';
import Sheet from './Sheet';
import { FileIcon, TimerIcon } from '../Icons';

interface NewLessonSheetProps {
  open: boolean;
  draft: NewLessonDraft;
  onDraft: (patch: Partial<NewLessonDraft>) => void;
  onCreate: () => void;
  onClose: () => void;
}

const PLACEHOLDER = `Paste here. Works with:
• YouTube transcript (0:03 + text lines)
• [00:03] text  or  0:03 text
• .srt / .vtt subtitles
• Plain text (no times)`;

export default function NewLessonSheet({ open, draft, onDraft, onCreate, onClose }: NewLessonSheetProps) {
  const titleRef = useRef<HTMLInputElement>(null);

  // Focus the title after the sheet slide-in animation.
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => titleRef.current?.focus(), 350);
    return () => window.clearTimeout(t);
  }, [open]);

  // Live preview of the line count.
  const preview = useMemo(() => {
    if (!draft.text.trim()) return null;
    let segs = parseTranscript(draft.text);
    if (draft.merge && segs.length && segs[0].start != null) segs = mergeSentences(segs);
    const timed = segs.length > 0 && segs[0].start != null;
    return { lines: segs.length, timed };
  }, [draft.text, draft.merge]);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const f = input.files?.[0];
    if (!f) return;
    const text = await f.text();
    onDraft(draft.title ? { text } : { text, title: f.name.replace(/\.[^.]+$/, '') });
    input.value = '';
  };

  return (
    <Sheet open={open} onClose={onClose} label="New lesson">
      <div className="sheet-head">
        <button className="done-btn muted" onClick={onClose}>
          Cancel
        </button>
        <h2>New Lesson</h2>
        <button className="done-btn" onClick={onCreate}>
          Create
        </button>
      </div>

      <div className="group-title">Title</div>
      <input
        ref={titleRef}
        className="field"
        placeholder="e.g. From B1 to B2 – Deeper Conversations"
        value={draft.title}
        onChange={(e) => onDraft({ title: e.target.value })}
      />

      <div className="group-title">YouTube link (optional)</div>
      <input
        className="field"
        placeholder="https://www.youtube.com/watch?v=..."
        value={draft.url}
        onChange={(e) => onDraft({ url: e.target.value })}
      />
      <p className="hint">With a link + timestamps, each line plays the real video. Without it, a voice reads the text.</p>

      <div className="group-title">Transcript</div>
      <textarea
        className="field"
        placeholder={PLACEHOLDER}
        value={draft.text}
        onChange={(e) => onDraft({ text: e.target.value })}
      />
      <div className="row-inline">
        <label className="file-btn">
          <FileIcon />
          Import .srt / .vtt / .txt
          <input type="file" accept=".srt,.vtt,.txt,text/plain" hidden onChange={onFile} />
        </label>
        <span className="hint preview">
          {preview && (
            <>
              {preview.lines} lines ·{' '}
              {preview.timed ? (
                <>
                  <TimerIcon /> timestamps found
                </>
              ) : (
                'no timestamps'
              )}
            </>
          )}
        </span>
      </div>

      <div className="group" style={{ marginTop: 12 }}>
        <div className="row">
          <span>
            Merge into full sentences<small>Joins short YouTube pieces into real sentences</small>
          </span>
          <label className="switch">
            <input type="checkbox" checked={draft.merge} onChange={(e) => onDraft({ merge: e.target.checked })} />
            <span />
          </label>
        </div>
      </div>

      <div className="group-title">How to copy a YouTube transcript</div>
      <ol className="hint steps">
        <li>Open the video on YouTube.</li>
        <li>
          Click <b>…more</b> under the video → <b>Show transcript</b>.
        </li>
        <li>Select all the transcript text, copy, and paste above.</li>
      </ol>
    </Sheet>
  );
}
