/* =========================================================
   Shared types for Shadowing Studio.
   Shapes match the data the original app.js stored in
   localStorage, so old data keeps working.
   ========================================================= */

/** One practice line. `start`/`end` are seconds, or null when the transcript had no timestamps. */
export interface Segment {
  start: number | null;
  end: number | null;
  text: string;
}

/** A line while it is being parsed (end may not be known yet). */
export interface RawSegment {
  start: number | null;
  end?: number | null;
  text: string;
}

/** Progress for one line (stored in Lesson.prog under the line index). */
export interface LineProgress {
  score?: number;
  last?: number;
  done?: boolean;
  star?: boolean;
}

export type Progress = Record<number, LineProgress>;

export interface Lesson {
  id: string;
  title: string;
  videoId: string;
  created: number;
  segments: Segment[];
  prog: Progress;
  lastIdx: number;
}

export type TextMode = 'show' | 'blur' | 'hide';
export type ThemeMode = 'auto' | 'light' | 'dark';
export type Accent = 'en-US' | 'en-GB' | 'en-AU';
export type LineFilter = 'all' | 'star' | 'todo' | 'weak';

export interface Settings {
  speed: number;
  /** 0 = repeat forever */
  repeats: number;
  /** "Your turn" pause multiplier, 0 = off */
  gap: number;
  autoNext: boolean;
  autoRec: boolean;
  autoScroll: boolean;
  textMode: TextMode;
  theme: ThemeMode;
  voice: string;
  accent: Accent;
  autoDone: boolean;
  filter: LineFilter;
  /** Show Echo the mascot (new in the Next.js version). */
  mascot: boolean;
  /** Show the icon (Echo or speaking icon) in the "your turn" bar. */
  turnIcon: boolean;
}

export interface SavedWord {
  w: string;
  ph: string;
  def: string;
  ctx: string;
  t: number;
}

export interface DayStats {
  sec?: number;
  lines?: number;
  tests?: number;
  scoreSum?: number;
}

export type StatKey = keyof DayStats;

export interface Stats {
  days: Record<string, DayStats>;
}

export type WordStatus = 'ok' | 'miss';

export interface CompareResult {
  score: number;
  /** token index → ok / miss */
  status: Record<number, WordStatus>;
  missed: string[];
}

export interface LastResult extends CompareResult {
  idx: number;
  said: string;
}

/** What the "heard" box under the sentence shows. */
export type HeardState =
  | { kind: 'hidden' }
  | { kind: 'listening'; text: string }
  | { kind: 'message'; text: string }
  | { kind: 'result'; score: number; missed: string[]; said: string };

export type View = 'practice' | 'lessons' | 'words';
export type SheetName = 'settings' | 'new' | 'word' | 'keys' | 'complete';

/** The word currently open in the word sheet. */
export interface WordEntry {
  w: string;
  ctx: string;
  ph: string;
  def: string;
}

export interface DictMeaning {
  partOfSpeech: string;
  definition: string;
  example: string;
}

export interface WordLookup {
  status: 'loading' | 'found' | 'none';
  meanings: DictMeaning[];
}

export interface NewLessonDraft {
  title: string;
  url: string;
  text: string;
  merge: boolean;
}

/* ---------- /api/transcript ---------- */
export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptData {
  videoId: string;
  title: string;
  lang: string;
  kind: 'manual' | 'auto';
  segments: TranscriptSegment[];
}

export interface TranscriptError {
  error: string;
}

export type TranscriptResponse = TranscriptData | TranscriptError;

/* ---------- iOS-style alert dialog ---------- */
export interface DialogOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button (delete, reset). */
  destructive?: boolean;
  /** Show a text field (rename). */
  input?: { value: string; placeholder?: string };
}

export interface DialogResult {
  ok: boolean;
  value: string;
}

export interface ToastAction {
  label: string;
  onClick: () => void;
}
