/* =========================================================
   TRANSCRIPT PARSER
   Ported 1:1 from the original app.js.
   Supports: YouTube transcript (0:03 + text), [00:03] text,
   0:03 text, SRT, VTT and plain text.
   ========================================================= */
import type { Lesson, RawSegment, Segment } from './types';
import { uid } from './utils';

/** Rough speaking time of a text in seconds. */
export const estDur = (t: string): number => t.split(/\s+/).length * 0.38 + 0.6;

function toSec(t: string): number {
  const clean = t.replace(/[[\]]/g, '').replace(',', '.').trim();
  return clean
    .split(':')
    .map(Number)
    .reduce((a, b) => a * 60 + b, 0);
}

export function cleanText(t: string): string {
  return t
    .replace(/<[^>]+>/g, '')
    .replace(/\[(music|applause|laughter|laughs|inaudible|__)\]/gi, '')
    .replace(/^>>\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSentences(text: string): string[] {
  const out: string[] = [];
  text.split('\n').forEach((raw) => {
    const line = raw.trim();
    if (!line) return;
    if (line.split(/\s+/).length <= 30) {
      out.push(line); // keep short lines whole
      return;
    }
    const parts = line.match(/[^.!?]+[.!?]+["'”’)\]]*|[^.!?]+$/g) || [line];
    parts.forEach((p) => {
      const s = p.trim();
      if (s) out.push(s);
    });
  });
  return out;
}

export function parseTranscript(raw: string): RawSegment[] {
  const text = raw
    .replace(/\r/g, '')
    .replace(/^﻿/, '')
    .replace(/^WEBVTT.*$/m, '')
    .trim();
  let segs: RawSegment[] = [];
  if (!text) return segs;

  if (/-->/.test(text)) {
    // SRT / VTT
    for (const block of text.split(/\n\s*\n/)) {
      const lines = block.split('\n');
      const i = lines.findIndex((l) => l.includes('-->'));
      if (i < 0) continue;
      const [a, b] = lines[i].split('-->');
      const t = cleanText(lines.slice(i + 1).join(' '));
      if (!t) continue;
      const last = segs[segs.length - 1];
      if (last && last.text === t) {
        last.end = toSec(b.trim().split(' ')[0]); // VTT duplicates
        continue;
      }
      segs.push({ start: toSec(a.trim().split(' ')[0]), end: toSec(b.trim().split(' ')[0]), text: t });
    }
    return segs;
  }

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const tsOnly = /^\[?(\d{1,2}:)?\d{1,2}:\d{2}([.,]\d+)?\]?$/;
  const tsInline = /^\[?((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d+)?)\]?\s*[-–—:]?\s+(.+)$/;
  let pending: number | null = null;
  let hasTs = false;
  for (const l of lines) {
    if (tsOnly.test(l)) {
      pending = toSec(l);
      hasTs = true;
      continue;
    }
    const m = l.match(tsInline);
    if (m) {
      segs.push({ start: toSec(m[1]), text: cleanText(m[2]) });
      hasTs = true;
      pending = null;
      continue;
    }
    if (/^\d+ (seconds?|minutes?)(, \d+ seconds?)?$/i.test(l)) continue; // YouTube screen-reader labels
    if (pending != null) {
      segs.push({ start: pending, text: cleanText(l) });
      pending = null;
      continue;
    }
    if (hasTs && segs.length) {
      segs[segs.length - 1].text += ' ' + cleanText(l);
      continue;
    }
    segs.push({ start: null, text: l });
  }
  if (!hasTs) {
    segs = splitSentences(segs.map((s) => s.text).join('\n')).map((t) => ({ start: null, text: cleanText(t) }));
  }
  return segs.filter((s) => s.text);
}

/** Join short pieces into whole sentences (estimates times inside a piece). */
export function mergeSentences(segs: RawSegment[], maxWords = 30): RawSegment[] {
  if (!segs.length) return segs;
  const timed = segs[0].start != null;
  const out: RawSegment[] = [];
  let cur: RawSegment | null = null;

  segs.forEach((s, i) => {
    const segEnd: number | null =
      s.end ?? segs[i + 1]?.start ?? (timed && s.start != null ? s.start + estDur(s.text) : null);
    const parts = s.text.match(/[^.!?]+[.!?]+["'”’)\]]*\s*|[^.!?]+$/g) || [s.text];
    const total = s.text.length || 1;
    let offset = 0;
    const at = (o: number): number | null =>
      timed && s.start != null && segEnd != null ? s.start + (segEnd - s.start) * (o / total) : null;

    parts.forEach((p) => {
      const pStart = at(offset);
      offset += p.length;
      if (!p.trim()) return;
      if (!cur) cur = { start: pStart, text: '' };
      cur.text = (cur.text + ' ' + p.trim()).trim();
      const ended = /[.!?]["'”’)\]]*$/.test(cur.text);
      if (ended || cur.text.split(/\s+/).length >= maxWords) {
        cur.end = at(offset);
        out.push(cur);
        cur = null;
      }
    });
  });
  if (cur) out.push(cur);
  return out;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Fill in missing / overlapping end times and round to 0.01 s. */
export function finishTimes(segs: RawSegment[]): Segment[] {
  return segs.map((s, i) => {
    if (s.start == null) return { start: null, end: null, text: s.text };
    const next = segs[i + 1];
    let end = s.end ?? null;
    if (end == null || (next && next.start != null && end > next.start + 0.5)) {
      end = next && next.start != null ? next.start : s.start + estDur(s.text);
    }
    if (end < s.start + 0.4) end = s.start + 0.4;
    return { start: round2(s.start), end: round2(end), text: s.text };
  });
}

/** Extract an 11-char YouTube video id from a link (or a bare id). */
export function ytId(url: string | null | undefined): string {
  if (!url) return '';
  const u = url.trim();
  const m = u.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/);
  if (m) return m[1];
  return /^[\w-]{11}$/.test(u) ? u : '';
}

export const hasTimes = (l: Lesson): boolean => l.segments.length > 0 && l.segments[0].start != null;

/** Build a lesson from pasted text. */
export function makeLesson(title: string, raw: string, videoId = '', merge = true): Lesson {
  let segs = parseTranscript(raw);
  if (merge && segs.length && segs[0].start != null) segs = mergeSentences(segs);
  return {
    id: uid(),
    title: title || 'Untitled lesson',
    videoId,
    created: Date.now(),
    segments: finishTimes(segs),
    prog: {},
    lastIdx: 0,
  };
}
