'use client';

/* =========================================================
   Shadowing Studio — listen, repeat, record, score
   Main state + tab switching.

   State model:
   - Persisted data (lessons, current id, words, stats, settings)
     lives in useLocalStorage. Each store has `.value` for render
     and `.ref` (always newest) for timers / async code.
   - idx lives in state for render and in idxRef for the engine.
   ========================================================= */
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { CYCLE_LABEL, DEFAULT_SETTINGS, OPTS, SAMPLE, SAMPLE_TITLE, STORAGE_KEYS, type CycleKey, type Opt } from '@/lib/constants';
import { cleanText, finishTimes, hasTimes, makeLesson, mergeSentences, ytId } from '@/lib/parser';
import { compareWords, norm } from '@/lib/scoring';
import { parseCaptions } from '@/lib/captions';
import { decodeCaptionPayload } from '@/lib/bookmarklet';
import type {
  DialogOptions,
  DialogResult,
  DictMeaning,
  HeardState,
  LastResult,
  Lesson,
  LineFilter,
  LineProgress,
  NewLessonDraft,
  SavedWord,
  Settings,
  SheetName,
  StatKey,
  Stats,
  ToastAction,
  TranscriptResponse,
  TranscriptSegment,
  View,
  WordEntry,
  WordLookup,
  WordStatus,
} from '@/lib/types';
import { clamp, dayKey, haptic, uid } from '@/lib/utils';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { usePlaybackEngine } from '@/hooks/usePlaybackEngine';
import { getSpeechRecognition, useRecorder } from '@/hooks/useRecorder';
import { useSpeech } from '@/hooks/useSpeech';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useLatest } from '@/hooks/useLatest';
import PracticeView from './PracticeView';
import LessonsView from './LessonsView';
import WordsView from './WordsView';
import TabBar from './TabBar';
import Toast from './Toast';
import Dialog from './Dialog';
import { MascotContext } from './Mascot';
import { SpeakerIcon, VideoIcon } from './Icons';
import WelcomeCard from './WelcomeCard';
import CompleteSheet from './sheets/CompleteSheet';
import SettingsSheet from './sheets/SettingsSheet';
import NewLessonSheet from './sheets/NewLessonSheet';
import WordSheet from './sheets/WordSheet';
import ShortcutsSheet from './sheets/ShortcutsSheet';
import type { YouTubeHandle } from './YouTubePlayer';

/* ---------- constants & localStorage parsers (module level = stable) ---------- */
const HEARD_HIDDEN: HeardState = { kind: 'hidden' };
const EMPTY_DRAFT: NewLessonDraft = { title: '', url: '', text: '', merge: true };
const NO_STATUS: Record<number, WordStatus> = {};
const NO_PROG: LineProgress = {};
const LOOKUP_LOADING: WordLookup = { status: 'loading', meanings: [] };
/** Placeholder before localStorage is read (never shown: the loading screen is). */
const EMPTY_LESSON: Lesson = { id: '', title: 'Lesson', videoId: '', created: 0, segments: [], prog: {}, lastIdx: 0 };
const NO_API = 'NO_API';

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function parseLessons(raw: unknown): Lesson[] {
  const list: Lesson[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw as unknown[]) {
      if (!isObj(item) || typeof item.id !== 'string' || !Array.isArray(item.segments)) continue;
      const l = item as unknown as Lesson;
      list.push({
        ...l,
        title: typeof l.title === 'string' ? l.title : 'Untitled lesson',
        videoId: typeof l.videoId === 'string' ? l.videoId : '',
        created: typeof l.created === 'number' ? l.created : Date.now(),
        prog: isObj(l.prog) ? l.prog : {},
        lastIdx: typeof l.lastIdx === 'number' ? l.lastIdx : 0,
      });
    }
  }
  return list.length ? list : [makeLesson(SAMPLE_TITLE, SAMPLE)];
}
const parseCurrent = (raw: unknown): string | null => (typeof raw === 'string' ? raw : null);
const parseWords = (raw: unknown): SavedWord[] =>
  Array.isArray(raw) ? (raw as unknown[]).filter((w): w is SavedWord => isObj(w) && typeof w.w === 'string') : [];
const parseStats = (raw: unknown): Stats => (isObj(raw) && isObj(raw.days) ? (raw as unknown as Stats) : { days: {} });
const parseWelcome = (raw: unknown): boolean => raw === true;
const parseSettings = (raw: unknown): Settings => ({ ...DEFAULT_SETTINGS, ...(isObj(raw) ? (raw as Partial<Settings>) : {}) });

/** Next option in a cycle list (unknown value → first). */
function nextOpt<V>(opts: ReadonlyArray<Opt<V>>, cur: V): Opt<V> {
  const i = opts.findIndex((o) => o[0] === cur);
  return opts[(i + 1) % opts.length];
}

/* ---------- dictionary API (api.dictionaryapi.dev) ---------- */
interface DictApiEntry {
  phonetic?: string;
  phonetics?: { text?: string }[];
  meanings?: { partOfSpeech?: string; definitions?: { definition?: string; example?: string }[] }[];
}

export default function ShadowingApp() {
  /* ===== persisted data ===== */
  const lessons = useLocalStorage<Lesson[]>(STORAGE_KEYS.lessons, [EMPTY_LESSON], parseLessons);
  const currentId = useLocalStorage<string | null>(STORAGE_KEYS.current, null, parseCurrent);
  const words = useLocalStorage<SavedWord[]>(STORAGE_KEYS.words, [], parseWords);
  const stats = useLocalStorage<Stats>(STORAGE_KEYS.stats, { days: {} }, parseStats);
  const settings = useLocalStorage<Settings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS, parseSettings);
  const welcomeDone = useLocalStorage<boolean>(STORAGE_KEYS.welcome, false, parseWelcome);
  const allLoaded =
    lessons.loaded && currentId.loaded && words.loaded && stats.loaded && settings.loaded && welcomeDone.loaded;
  const S = settings.value;

  /* ===== UI state ===== */
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>('practice');
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [idx, setIdxState] = useState(0);
  const idxRef = useRef(0);
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  const [heard, setHeard] = useState<HeardState>(HEARD_HIDDEN);
  const [revealed, setRevealed] = useState(false);
  const [ytReady, setYtReady] = useState(false);
  const [quickLoading, setQuickLoading] = useState(false);
  const [draft, setDraft] = useState<NewLessonDraft>(EMPTY_DRAFT);
  const [wordOpen, setWordOpen] = useState<WordEntry | null>(null);
  const [lookup, setLookup] = useState<WordLookup>(LOOKUP_LOADING);
  const [toastState, setToastState] = useState<{ message: string; show: boolean; action?: ToastAction }>({
    message: '',
    show: false,
  });
  const [dialog, setDialog] = useState<{
    id: number;
    options: DialogOptions;
    resolve: (r: DialogResult) => void;
  } | null>(null);
  const [recordings, setRecordings] = useState<Record<number, string>>({});

  /* ===== refs for imperative code ===== */
  const playerRef = useRef<YouTubeHandle>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const holder = useRef({
    recordings: {} as Record<number, string>,
    audio: null as HTMLAudioElement | null,
    toastTimer: 0,
    timers: new Set<number>(),
    lookupAbort: null as AbortController | null,
    initDone: false,
  });

  /* ===== small helpers ===== */
  const later = useCallback((fn: () => void, ms: number) => {
    const h = holder.current;
    const id = window.setTimeout(() => {
      h.timers.delete(id);
      fn();
    }, ms);
    h.timers.add(id);
  }, []);

  const toast = useCallback((message: string, action?: ToastAction) => {
    const h = holder.current;
    setToastState({ message, show: true, action });
    window.clearTimeout(h.toastTimer);
    h.toastTimer = window.setTimeout(() => setToastState((t) => ({ ...t, show: false })), action ? 4500 : 2400);
  }, []);
  const dismissToast = useCallback(() => {
    window.clearTimeout(holder.current.toastTimer);
    setToastState((t) => ({ ...t, show: false }));
  }, []);

  /** iOS-style alert; resolves when the user taps a button. */
  const ask = (options: DialogOptions) =>
    new Promise<DialogResult>((resolve) => setDialog({ id: Date.now(), options, resolve }));
  const resolveDialog = (r: DialogResult) => {
    dialog?.resolve(r);
    setDialog(null);
  };

  const getLesson = (): Lesson =>
    lessons.ref.current.find((l) => l.id === currentId.ref.current) ?? lessons.ref.current[0] ?? EMPTY_LESSON;

  const updateLesson = (id: string, fn: (l: Lesson) => Lesson) =>
    lessons.set((prev) => prev.map((l) => (l.id === id ? fn(l) : l)));

  const addStat = (k: StatKey, v: number) =>
    stats.set((prev) => {
      const key = dayKey();
      const d = prev.days[key] ?? {};
      return { days: { ...prev.days, [key]: { ...d, [k]: (d[k] || 0) + v } } };
    });

  const setSetting = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    settings.set((prev) => ({ ...prev, [k]: v }));
    if (k === 'speed') playerRef.current?.setRate(v as number);
  };

  /* ===== speech + recordings ===== */
  const speech = useSpeech(S.voice, () => toast('Text-to-speech not supported'));

  const stopAudio = () => {
    const h = holder.current;
    if (h.audio) {
      h.audio.pause();
      h.audio = null;
    }
  };

  const revokeAllRecordings = () => {
    const h = holder.current;
    Object.values(h.recordings).forEach((u) => URL.revokeObjectURL(u));
    h.recordings = {};
    setRecordings({});
  };

  /* ===== setIdx (select a line) ===== */
  const setIdx = (i: number) => {
    const L = getLesson();
    const ni = clamp(i, 0, Math.max(0, L.segments.length - 1));
    idxRef.current = ni;
    setIdxState(ni);
    updateLesson(L.id, (l) => ({ ...l, lastIdx: ni }));
    setLastResult(null);
    setRevealed(false);
    setHeard(HEARD_HIDDEN);
    if (settings.ref.current.autoScroll) {
      window.requestAnimationFrame(() => {
        listRef.current
          ?.querySelector<HTMLElement>(`.line[data-i="${ni}"]`)
          ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    }
  };

  /* ===== scoring after a recording ===== */
  const scoreAttempt = (rIdx: number, said: string) => {
    if (!getSpeechRecognition()) {
      setHeard(HEARD_HIDDEN);
      return;
    }
    if (rIdx !== idxRef.current) return;
    if (!said) {
      setHeard({ kind: 'message', text: "I didn't hear anything. Speak a bit louder and closer to the mic." });
      return;
    }
    const L = getLesson();
    const seg = L.segments[rIdx];
    if (!seg) return;
    const res = compareWords(seg.text, said);
    setLastResult({ idx: rIdx, ...res, said });
    const autoDone = settings.ref.current.autoDone;
    updateLesson(L.id, (l) => {
      const p: LineProgress = { ...(l.prog[rIdx] ?? {}) };
      p.score = Math.max(p.score || 0, res.score);
      p.last = res.score;
      if (autoDone && res.score >= 80) p.done = true;
      return { ...l, prog: { ...l.prog, [rIdx]: p } };
    });
    addStat('tests', 1);
    addStat('scoreSum', res.score);
    setHeard({ kind: 'result', score: res.score, missed: res.missed, said });
    haptic(res.score >= 85 ? [12, 60, 12] : 12);
  };

  const recorder = useRecorder({
    accent: S.accent,
    onStart: () => {
      setLastResult(null);
      setHeard({ kind: 'listening', text: '' });
    },
    onListening: (text) => setHeard({ kind: 'listening', text }),
    onUnavailable: () => setHeard(HEARD_HIDDEN),
    onRecording: (i, url) => {
      const h = holder.current;
      const old = h.recordings[i];
      if (old) URL.revokeObjectURL(old);
      h.recordings = { ...h.recordings, [i]: url };
      setRecordings(h.recordings);
    },
    onFinished: scoreAttempt,
    toast,
  });

  /* ===== playback engine ===== */
  const engine = usePlaybackEngine({
    getLesson,
    getIdx: () => idxRef.current,
    getSettings: () => settings.ref.current,
    setIdx,
    getPlayer: () => playerRef.current,
    canUseVideo: () => {
      const L = getLesson();
      const p = playerRef.current;
      return !!(L.videoId && p && p.isReady() && hasTimes(L) && p.getVideoId() === L.videoId);
    },
    speak: speech.speak,
    cancelSpeech: speech.cancel,
    stopAudio,
    recorder: {
      startAuto: () => void recorder.start(idxRef.current, true),
      stop: recorder.stop,
      isActive: recorder.isActive,
      isAuto: recorder.isAuto,
    },
    onLinePlayed: () => addStat('lines', 1),
    onLessonFinished: () => {
      haptic([12, 60, 12, 60, 12]);
      setSheet('complete');
    },
    toast,
  });

  /* ===== actions ===== */
  const playMine = (after?: () => void) => {
    const url = holder.current.recordings[idxRef.current];
    if (!url) return;
    stopAudio();
    const a = new Audio(url);
    holder.current.audio = a;
    a.onended = () => {
      if (holder.current.audio === a) holder.current.audio = null;
      after?.();
    };
    a.play().catch(() => toast('Could not play recording'));
  };

  const listenOnce = (after?: () => void) => engine.listenOnce(after);
  const compare = () => listenOnce(() => later(() => playMine(), 300));

  const toggleRecord = () => {
    haptic(10);
    if (recorder.isActive()) recorder.stop();
    else {
      engine.stopAll();
      void recorder.start(idxRef.current, false);
    }
  };

  const togglePlay = () => (engine.isPlaying() ? engine.stopAll() : engine.playFrom(idxRef.current));

  const go = (d: number) => {
    const i = idxRef.current + d;
    const n = getLesson().segments.length;
    if (i < 0 || i >= n) return;
    if (engine.isPlaying()) engine.playFrom(i);
    else {
      engine.stopAll();
      setIdx(i);
    }
  };

  const cycleKey = <K extends CycleKey>(k: K, opts: ReadonlyArray<Opt<Settings[K]>>) => {
    const [v, label] = nextOpt(opts, settings.ref.current[k]);
    setSetting(k, v);
    toast(CYCLE_LABEL[k] + label);
  };
  const cycle = (k: CycleKey) => {
    if (k === 'speed') cycleKey('speed', OPTS.speed);
    else if (k === 'repeats') cycleKey('repeats', OPTS.repeats);
    else if (k === 'gap') cycleKey('gap', OPTS.gap);
    else cycleKey('textMode', OPTS.textMode);
  };

  const stepSpeed = (dir: -1 | 1) => {
    const sp = OPTS.speed.map((o) => o[0]);
    const i = sp.indexOf(settings.ref.current.speed);
    const ni = i + dir;
    if (i < 0 || ni < 0 || ni >= sp.length) return;
    setSetting('speed', sp[ni]);
    toast('Speed ' + sp[ni] + '×');
  };

  const toggleProg = (key: 'star' | 'done') => {
    haptic(8);
    const L = getLesson();
    const i = idxRef.current;
    updateLesson(L.id, (l) => {
      const p = { ...(l.prog[i] ?? {}) };
      p[key] = !p[key];
      return { ...l, prog: { ...l.prog, [i]: p } };
    });
  };

  const openSheet = (name: SheetName) => setSheet(name);
  const closeSheets = () => setSheet(null);

  const showView = (v: View) => {
    setView(v);
    if (v !== 'practice') {
      engine.stopAll();
      if (recorder.isActive()) recorder.stop();
    }
    window.scrollTo({ top: 0 });
  };

  const openLesson = (L: Lesson) => {
    engine.stopAll();
    revokeAllRecordings();
    setLastResult(null);
    currentId.set(L.id);
    const i = Math.min(L.lastIdx || 0, Math.max(0, L.segments.length - 1));
    idxRef.current = i;
    setIdxState(i);
    setHeard(HEARD_HIDDEN);
    setRevealed(false);
  };

  const deleteLesson = (id: string) => {
    let next = lessons.ref.current.filter((l) => l.id !== id);
    if (!next.length) next = [makeLesson(SAMPLE_TITLE, SAMPLE)];
    lessons.set(next);
    if (currentId.ref.current === id) openLesson(next[0]);
  };

  const confirmDeleteLesson = async (L: Lesson) => {
    const r = await ask({
      title: 'Delete lesson?',
      message: `“${L.title}” and its progress will be removed. This can't be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!r.ok) return;
    closeSheets();
    deleteLesson(L.id);
    toast('Lesson deleted');
  };

  const renameLesson = async () => {
    const L = getLesson();
    const r = await ask({
      title: 'Rename lesson',
      confirmLabel: 'Save',
      input: { value: L.title, placeholder: 'Lesson name' },
    });
    const t = r.value.trim();
    if (r.ok && t) updateLesson(L.id, (l) => ({ ...l, title: t }));
  };

  const resetProgress = async () => {
    const L = getLesson();
    const r = await ask({
      title: 'Reset progress?',
      message: 'Scores, stars and done marks for this lesson will be cleared.',
      confirmLabel: 'Reset',
      destructive: true,
    });
    if (!r.ok) return;
    updateLesson(L.id, (l) => ({ ...l, prog: {} }));
    setLastResult(null);
    setHeard(HEARD_HIDDEN);
    toast('Progress reset');
  };

  const removeWord = (w: string) => {
    const list = words.ref.current;
    const i = list.findIndex((x) => x.w === w);
    if (i < 0) return;
    const removed = list[i];
    words.set((prev) => prev.filter((x) => x.w !== w));
    toast(`Removed “${w}”`, {
      label: 'Undo',
      onClick: () =>
        words.set((prev) => {
          if (prev.some((x) => x.w === removed.w)) return prev;
          const next = prev.slice();
          next.splice(Math.min(i, next.length), 0, removed);
          return next;
        }),
    });
  };

  /* ---------- lesson complete ---------- */
  const practiceWeak = () => {
    const L = getLesson();
    const first = L.segments.findIndex((_, i) => {
      const sc = L.prog[i]?.score;
      return sc != null && sc < 70;
    });
    closeSheets();
    setSetting('filter', 'weak');
    if (first >= 0) {
      engine.stopAll();
      setIdx(first);
    }
  };
  const restartLesson = () => {
    closeSheets();
    setSetting('filter', 'all');
    engine.playFrom(0);
  };

  /* ---------- word sheet ---------- */
  const openWord = async (w: string, ctx: string) => {
    if (!w) return;
    setWordOpen({ w, ctx, ph: '', def: '' });
    setLookup(LOOKUP_LOADING);
    openSheet('word');
    void speech.speak(w, 0.85);
    const h = holder.current;
    h.lookupAbort?.abort();
    const ac = new AbortController();
    h.lookupAbort = ac;
    try {
      const r = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(w), {
        signal: ac.signal,
      });
      if (!r.ok) throw new Error('not found');
      const data: unknown = await r.json();
      const e = Array.isArray(data) ? (data[0] as DictApiEntry | undefined) : undefined;
      if (!e) throw new Error('not found');
      if (ac.signal.aborted) return;
      const ph = e.phonetic || (e.phonetics || []).find((p) => p.text)?.text || '';
      const meanings: DictMeaning[] = (e.meanings || []).slice(0, 3).map((m) => {
        const d = m.definitions?.[0] ?? {};
        return { partOfSpeech: m.partOfSpeech ?? '', definition: d.definition ?? '', example: d.example ?? '' };
      });
      const def = e.meanings?.[0]?.definitions?.[0]?.definition || '';
      setWordOpen((prev) => (prev && prev.w === w ? { ...prev, ph, def } : prev));
      setLookup({ status: 'found', meanings });
    } catch {
      if (!ac.signal.aborted) setLookup({ status: 'none', meanings: [] });
    }
  };

  const toggleSaveWord = () => {
    const o = wordOpen;
    if (!o) return;
    const exists = words.ref.current.some((x) => x.w === o.w);
    words.set((prev) =>
      exists ? prev.filter((x) => x.w !== o.w) : [...prev, { w: o.w, ph: o.ph, def: o.def, ctx: o.ctx, t: Date.now() }],
    );
    toast(exists ? 'Removed from Words' : 'Saved to Words');
  };

  const copyWords = async () => {
    const list = words.ref.current;
    if (!list.length) {
      toast('No words yet');
      return;
    }
    const txt = list.map((w) => `${w.w} ${w.ph || ''}\n  ${w.def || ''}\n  “${w.ctx || ''}”`).join('\n\n');
    try {
      await navigator.clipboard.writeText(txt);
      toast('Copied ' + list.length + ' words');
    } catch {
      toast('Copy failed');
    }
  };

  /* ---------- new lesson ---------- */
  const createLesson = () => {
    const vid = ytId(draft.url);
    if (draft.url.trim() && !vid) {
      toast('That YouTube link looks wrong');
      return;
    }
    const L = makeLesson(draft.title.trim() || (vid ? 'YouTube lesson' : 'New lesson'), draft.text, vid, draft.merge);
    if (!L.segments.length) {
      toast('Paste a transcript first');
      return;
    }
    lessons.set((prev) => [L, ...prev]);
    closeSheets();
    setDraft(EMPTY_DRAFT);
    openLesson(L);
    showView('practice');
    toast(`Created ${L.segments.length} lines`);
    if (vid && L.segments[0].start == null) {
      later(() => toast('No timestamps — the voice will read lines instead of the video'), 2600);
    }
  };

  /** Build + open a lesson from caption segments (server API or bookmarklet). */
  const createYouTubeLesson = (
    vid: string,
    d: { title: string; kind: 'manual' | 'auto'; segments: TranscriptSegment[] },
  ): void => {
    const segs = d.segments
      .map((s) => ({ start: s.start, end: s.end, text: cleanText(s.text) }))
      .filter((s) => s.text);
    const punct = segs.filter((s) => /[.!?]/.test(s.text)).length;
    // auto captions often have no punctuation → shorter chunks
    const merged = mergeSentences(segs, punct < segs.length * 0.15 ? 14 : 30);
    const L: Lesson = {
      id: uid(),
      title: d.title || 'YouTube lesson',
      videoId: vid,
      created: Date.now(),
      segments: finishTimes(merged),
      prog: {},
      lastIdx: 0,
    };
    lessons.set((prev) => [L, ...prev]);
    openLesson(L);
    showView('practice');
    toast(`${L.segments.length} lines ready${d.kind === 'auto' ? ' (auto captions)' : ''} — press Play`);
  };

  /** Open a lesson that was already made from this video. */
  const openExistingVideo = (vid: string): boolean => {
    const exist = lessons.ref.current.find((l) => l.videoId === vid);
    if (!exist) return false;
    openLesson(exist);
    showView('practice');
    toast('Opened your saved lesson — press Play');
    return true;
  };

  /**
   * Bookmarklet import: captions were fetched on youtube.com in the user's browser
   * and passed in the URL hash (#cap=…). No server request → not affected by YouTube
   * blocking cloud servers. Falls back to the server API if the payload is unusable.
   */
  const importFromBookmarklet = async (url: string, cap: string): Promise<void> => {
    const vid = ytId(url);
    if (!vid) {
      toast('Paste a valid YouTube link');
      return;
    }
    if (openExistingVideo(vid)) return;
    setQuickLoading(true);
    const data = await decodeCaptionPayload(cap);
    const segments = data ? parseCaptions(data.xml) : [];
    setQuickLoading(false);
    if (data && segments.length) createYouTubeLesson(vid, { title: data.title, kind: data.kind, segments });
    else void quickStart(url);
  };

  /* ---------- quick start: YouTube link → transcript → shadow ---------- */
  const quickStart = async (url: string): Promise<boolean> => {
    const vid = ytId(url);
    if (!vid) {
      toast('Paste a valid YouTube link');
      return false;
    }
    if (openExistingVideo(vid)) return true;
    setQuickLoading(true);
    try {
      const r = await fetch('/api/transcript?v=' + vid);
      if (!(r.headers.get('content-type') || '').includes('json')) throw new Error(NO_API);
      const d = (await r.json()) as TranscriptResponse;
      if (!r.ok || 'error' in d) throw new Error(('error' in d && d.error) || 'Could not get the transcript');
      createYouTubeLesson(vid, d);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === NO_API || e instanceof TypeError) {
        toast('Could not reach the transcript server. Is the app running?');
      } else {
        // Offer the bookmarklet (works when YouTube blocks the server).
        toast(msg, {
          label: 'Use bookmark',
          onClick: () => {
            closeSheets();
            showView('lessons');
          },
        });
        // fallback: open the manual sheet with the link filled in
        setDraft((dr) => ({ ...dr, url: 'https://www.youtube.com/watch?v=' + vid }));
        later(() => openSheet('new'), 1200);
      }
      return false;
    } finally {
      setQuickLoading(false);
    }
  };

  /* ===== effects ===== */

  // Init once localStorage is read: open the current lesson, handle ?v= / ?url=.
  const init = useEffectEvent(() => {
    const h = holder.current;
    if (h.initDone) return;
    h.initDone = true;
    openLesson(getLesson());
    setReady(true);
    const qs = new URLSearchParams(location.search);
    const qv = qs.get('v') || qs.get('url');
    const cap = new URLSearchParams(location.hash.slice(1)).get('cap');
    if (qv) {
      history.replaceState(null, '', location.pathname); // also drops the (large) #cap= hash
      if (cap) void importFromBookmarklet(qv, cap);
      else void quickStart(qv);
    }
  });
  useEffect(() => {
    // Opening the saved lesson needs localStorage, which is only readable after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (allLoaded) init();
  }, [allLoaded]);

  // Theme (the inline script in layout.tsx already set it before first paint).
  useEffect(() => {
    if (!ready) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = S.theme === 'dark' || (S.theme === 'auto' && mq.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#f2f2f7');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [ready, S.theme]);

  // Practice time: +5 s every 5 s while playing / recording / in "your turn".
  const tickStats = useEffectEvent(() => {
    if (engine.isPlaying() || recorder.isActive() || engine.isTurnActive()) addStat('sec', 5);
  });
  useEffect(() => {
    const t = window.setInterval(() => tickStats(), 5000);
    return () => window.clearInterval(t);
  }, []);

  // Cleanup on unmount: timers, audio, object URLs, pending dictionary request.
  useEffect(() => {
    const h = holder.current;
    return () => {
      h.timers.forEach((t) => window.clearTimeout(t));
      h.timers.clear();
      window.clearTimeout(h.toastTimer);
      if (h.audio) h.audio.pause();
      h.audio = null;
      Object.values(h.recordings).forEach((u) => URL.revokeObjectURL(u));
      h.recordings = {};
      h.lookupAbort?.abort();
    };
  }, []);

  // Keyboard shortcuts.
  useKeyboardShortcuts({
    onEscape: () => (dialog ? resolveDialog({ ok: false, value: '' }) : closeSheets()),
    isActive: () => view === 'practice' && sheet === null && dialog === null,
    handlers: {
      '?': () => openSheet('keys'),
      ' ': togglePlay,
      arrowright: () => go(1),
      arrowleft: () => go(-1),
      l: () => listenOnce(),
      r: toggleRecord,
      m: () => playMine(),
      c: () => {
        if (holder.current.recordings[idxRef.current]) compare();
      },
      v: () => setRevealed((x) => !x),
      h: () => cycle('textMode'),
      s: () => toggleProg('star'),
      d: () => toggleProg('done'),
      p: () => cycle('gap'),
      '-': () => stepSpeed(-1),
      '=': () => stepSpeed(1),
    },
  });

  /* ===== stable callbacks for the memoized line list ===== */
  const lineActions = useLatest({
    select: (i: number) => {
      if (engine.isPlaying()) engine.playFrom(i);
      else {
        engine.stopAll();
        setIdx(i);
      }
    },
    play: (i: number) => {
      engine.stopAll();
      setIdx(i);
      listenOnce();
    },
  });
  const [{ onSelectLine, onPlayLine }] = useState(() => ({
    onSelectLine: (i: number) => lineActions.current.select(i),
    onPlayLine: (i: number) => lineActions.current.play(i),
  }));

  /* ===== derived values for render ===== */
  const lesson = lessons.value.find((l) => l.id === currentId.value) ?? lessons.value[0] ?? EMPTY_LESSON;
  // Normalized so "Never" (as tapped) also underlines "never," in the sentence.
  const savedSet = useMemo(() => new Set(words.value.map((w) => norm(w.w))), [words.value]);

  if (!ready) {
    return (
      <div className="app">
        <div className="loading-screen" role="status">
          <span className="spinner" />
          Loading…
        </div>
      </div>
    );
  }

  const n = lesson.segments.length;
  const progList = Object.values(lesson.prog);
  const doneCount = progList.filter((p) => p.done).length;
  const scored = progList.filter((p) => p.score != null);
  const avg = scored.length ? Math.round(scored.reduce((a, p) => a + (p.score ?? 0), 0) / scored.length) : null;
  const video = !!lesson.videoId && hasTimes(lesson);
  let src = 'Voice reading';
  if (video) src = ytReady ? 'Video synced' : 'Loading video…';
  else if (lesson.videoId) src = 'Voice (no timestamps)';
  const meta = (
    <>
      {n} lines · {doneCount} done{avg != null ? ` · avg ${avg}%` : ''} ·{' '}
      <span className="meta-src">
        {video ? <VideoIcon /> : <SpeakerIcon />}
        {src}
      </span>
    </>
  );

  const weakCount = progList.filter((p) => p.score != null && p.score < 70).length;
  const repLabel = S.repeats !== 1 && engine.playing ? `↻ ${engine.repShown + 1}/${S.repeats || '∞'}` : null;
  const curSeg = lesson.segments[idx];

  return (
    <MascotContext value={S.mascot}>
      <div className="app">
        <PracticeView
          active={view === 'practice'}
          welcome={
            welcomeDone.value ? null : (
              <WelcomeCard
                onDismiss={() => welcomeDone.set(true)}
                onStart={() => {
                  welcomeDone.set(true);
                  engine.playFrom(idxRef.current);
                }}
              />
            )
          }
          lesson={lesson}
          meta={meta}
          progressPct={n ? (doneCount / n) * 100 : 0}
          idx={idx}
          settings={S}
          playing={engine.playing}
          quickLoading={quickLoading}
          playerRef={playerRef}
          listRef={listRef}
          turnFillRef={engine.turnFillRef}
          onPlayerReady={setYtReady}
          onPlayerError={toast}
          onQuickStart={quickStart}
          onLessons={() => showView('lessons')}
          onSettings={() => openSheet('settings')}
          onShortcuts={() => openSheet('keys')}
          onFilter={(f: LineFilter) => setSetting('filter', f)}
          onSelectLine={onSelectLine}
          onPlayLine={onPlayLine}
          onCycle={cycle}
          onPrev={() => go(-1)}
          onNext={() => go(1)}
          onToggle={togglePlay}
          card={{
            status: lastResult && lastResult.idx === idx ? lastResult.status : NO_STATUS,
            savedWords: savedSet,
            prog: lesson.prog[idx] ?? NO_PROG,
            revealed,
            repLabel,
            turn: engine.turn,
            turnIcon: S.turnIcon,
            heard,
            recording: recorder.recording,
            hasRecording: !!recordings[idx],
            onWord: (w) => void openWord(w, curSeg?.text ?? ''),
            onSay: (w) => void speech.speak(w, 0.8),
            onSkipTurn: engine.skipTurn,
            onListen: () => listenOnce(),
            onRecord: toggleRecord,
            onMine: () => playMine(),
            onCompare: compare,
            onReveal: () => setRevealed((x) => !x),
            onStar: () => toggleProg('star'),
            onDone: () => toggleProg('done'),
          }}
        />

        <LessonsView
          active={view === 'lessons'}
          lessons={lessons.value}
          currentId={lesson.id}
          stats={stats.value}
          toast={toast}
          onNew={() => openSheet('new')}
          onOpen={(L) => {
            openLesson(L);
            showView('practice');
          }}
          onDelete={(L) => void confirmDeleteLesson(L)}
        />

        <WordsView
          active={view === 'words'}
          words={words.value}
          onSay={(w) => void speech.speak(w, 0.9)}
          onRemove={removeWord}
          onCopyAll={() => void copyWords()}
        />
      </div>

      <TabBar view={view} onChange={showView} />

      <div className={'backdrop' + (sheet ? ' show' : '')} onClick={closeSheets} />

      <SettingsSheet
        open={sheet === 'settings'}
        settings={S}
        voices={speech.voices}
        onSet={setSetting}
        onClose={closeSheets}
        onRename={() => void renameLesson()}
        onReset={() => void resetProgress()}
        onDelete={() => void confirmDeleteLesson(getLesson())}
      />

      <NewLessonSheet
        open={sheet === 'new'}
        draft={draft}
        onDraft={(patch) => setDraft((d) => ({ ...d, ...patch }))}
        onCreate={createLesson}
        onClose={closeSheets}
      />

      <WordSheet
        open={sheet === 'word'}
        word={wordOpen}
        lookup={lookup}
        saved={!!wordOpen && words.value.some((x) => x.w === wordOpen.w)}
        onSpeak={(rate) => wordOpen && void speech.speak(wordOpen.w, rate)}
        onToggleSave={toggleSaveWord}
        onClose={closeSheets}
      />

      <ShortcutsSheet open={sheet === 'keys'} onClose={closeSheets} />

      <CompleteSheet
        open={sheet === 'complete'}
        stats={{ title: lesson.title, total: n, done: doneCount, avg, weak: weakCount }}
        onPracticeWeak={practiceWeak}
        onRestart={restartLesson}
        onLessons={() => {
          closeSheets();
          showView('lessons');
        }}
        onClose={closeSheets}
      />

      {dialog && <Dialog key={dialog.id} options={dialog.options} onResolve={resolveDialog} />}

      <Toast message={toastState.message} show={toastState.show} action={toastState.action} onDismiss={dismissToast} />
    </MascotContext>
  );
}
