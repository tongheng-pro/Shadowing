'use client';

import { useEffect, useRef, useState } from 'react';
import type { Lesson, Settings } from '@/lib/types';
import { clamp } from '@/lib/utils';
import type { YouTubeHandle } from '@/components/YouTubePlayer';
import { useLatest } from './useLatest';

/* =========================================================
   PLAYBACK ENGINE  (play line → "your turn" → repeat / next)
   Every run gets a token. stopAll() bumps the token, so any
   pending timer / poll / speech callback from an older run
   sees a different token and quits.
   ========================================================= */

export interface EngineDeps {
  getLesson: () => Lesson;
  getIdx: () => number;
  getSettings: () => Settings;
  setIdx: (i: number) => void;
  getPlayer: () => YouTubeHandle | null;
  /** True when the current lesson can play from the synced YouTube video. */
  canUseVideo: () => boolean;
  speak: (text: string, rate: number) => Promise<number>;
  cancelSpeech: () => void;
  /** Stop "My voice" playback. */
  stopAudio: () => void;
  recorder: {
    startAuto: () => void;
    stop: () => void;
    isActive: () => boolean;
    isAuto: () => boolean;
  };
  /** A line finished playing once (stats). */
  onLinePlayed: () => void;
  /** The last line of the lesson finished (celebration). */
  onLessonFinished: () => void;
  toast: (msg: string) => void;
}

export interface TurnState {
  visible: boolean;
  rec: boolean;
}

interface PlayOptions {
  once?: boolean;
  after?: () => void;
}

const TURN_HIDDEN: TurnState = { visible: false, rec: false };

interface EngineStore {
  token: number;
  playing: boolean;
  repeatDone: number;
  poll: number;
  raf: number;
  turnFinish: (() => void) | null;
  timers: Set<number>;
}

interface EngineContext {
  getStore: () => EngineStore;
  getDeps: () => EngineDeps;
  getTurnFill: () => HTMLDivElement | null;
  setPlaying: (v: boolean) => void;
  setRepShown: (v: number) => void;
  setTurn: (v: TurnState | ((prev: TurnState) => TurnState)) => void;
}

type Engine = ReturnType<typeof createEngine>;

/** Plain (non-hook) factory: all engine logic, created once per component. */
function createEngine(ctx: EngineContext) {
  const s = ctx.getStore();
  const d = ctx.getDeps;
  const { setPlaying, setRepShown, setTurn } = ctx;
  const setFill = (pct: number) => {
    const el = ctx.getTurnFill();
    if (el) el.style.width = pct + '%';
  };

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      s.timers.delete(id);
      fn();
    }, ms);
    s.timers.add(id);
  };
  const setPlay = (v: boolean) => {
    s.playing = v;
    setPlaying(v);
  };
  const clearPoll = () => {
    window.clearInterval(s.poll);
    s.poll = 0;
  };
  const hideTurn = () => {
    s.turnFinish = null;
    window.cancelAnimationFrame(s.raf);
    setTurn((t) => (t.visible ? TURN_HIDDEN : t));
  };

  const stopAll = (): void => {
    s.token++;
    setPlay(false);
    clearPoll();
    const dep = d();
    dep.cancelSpeech();
    const p = dep.getPlayer();
    if (p && p.isReady()) p.pause();
    dep.stopAudio();
    hideTurn();
    // An auto-recording belongs to the "your turn" pause: end it with the run.
    if (dep.recorder.isActive() && dep.recorder.isAuto()) dep.recorder.stop();
  };

  /** "Your turn" countdown with progress bar. */
  const showTurn = (sec: number, tok: number, cb: () => void): void => {
    const S = d().getSettings();
    setTurn({ visible: true, rec: S.autoRec });
    setFill(0);
    if (S.autoRec) d().recorder.startAuto();
    const t0 = performance.now();
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      s.turnFinish = null;
      window.cancelAnimationFrame(s.raf);
      setTurn(TURN_HIDDEN);
      if (tok !== s.token) return;
      const dep = d();
      if (dep.getSettings().autoRec && dep.recorder.isActive()) {
        dep.recorder.stop();
        later(cb, 1600);
      } else cb();
    };
    s.turnFinish = finish;

    const step = () => {
      if (finished) return;
      if (tok !== s.token) {
        finished = true;
        setTurn(TURN_HIDDEN);
        return;
      }
      const p = Math.min(1, (performance.now() - t0) / (sec * 1000));
      setFill(p * 100);
      if (p >= 1) finish();
      else s.raf = window.requestAnimationFrame(step);
    };
    s.raf = window.requestAnimationFrame(step);
  };

  const onLineEnd = (dur: number, tok: number): void => {
    d().onLinePlayed();
    s.repeatDone++;
    const proceed = () => {
      if (tok !== s.token) return;
      const dep = d();
      const S = dep.getSettings();
      const L = dep.getLesson();
      const idx = dep.getIdx();
      if (S.repeats === 0 || s.repeatDone < S.repeats) {
        playLine(idx);
        return;
      }
      s.repeatDone = 0;
      if (S.autoNext && idx < L.segments.length - 1) playLine(idx + 1);
      else {
        setPlay(false);
        setRepShown(0);
        if (idx >= L.segments.length - 1) dep.onLessonFinished();
      }
    };
    const S = d().getSettings();
    if (S.gap > 0 || S.autoRec) {
      showTurn(Math.max(1.6, dur * (S.gap || 1.2) + (S.autoRec ? 0.6 : 0)), tok, proceed);
    } else proceed();
  };

  const playLine = (index: number, opts: PlayOptions = {}): void => {
    const dep = d();
    const L = dep.getLesson();
    if (!L.segments.length) return;
    const i = clamp(index, 0, L.segments.length - 1);
    if (i !== dep.getIdx()) dep.setIdx(i);
    const tok = ++s.token;
    const seg = L.segments[i];
    setRepShown(s.repeatDone);

    const done = (dur: number) => {
      if (tok !== s.token) return;
      if (opts.once) {
        setPlay(false);
        opts.after?.();
        return;
      }
      onLineEnd(dur, tok);
    };

    const S = dep.getSettings();
    const player = dep.getPlayer();
    if (dep.canUseVideo() && player && seg.start != null && seg.end != null) {
      const start = seg.start;
      const end = seg.end;
      player.setRate(S.speed);
      player.seekTo(start);
      player.play();
      const t0 = performance.now();
      let started = false;
      clearPoll();
      s.poll = window.setInterval(() => {
        if (tok !== s.token) {
          clearPoll();
          return;
        }
        const t = player.getCurrentTime();
        if (t >= start - 0.3 && t < end) started = true;
        const st = player.getState();
        if ((started && t >= end - 0.05) || st === 0 || performance.now() - t0 > 60000) {
          clearPoll();
          player.pause();
          done((performance.now() - t0) / 1000);
        }
      }, 50);
    } else {
      void dep.speak(seg.text, S.speed).then(done);
    }
  };

  const playFrom = (i: number): void => {
    stopAll();
    s.repeatDone = 0;
    setPlay(true);
    playLine(i);
  };

  const listenOnce = (after?: () => void): void => {
    stopAll();
    setPlay(true);
    playLine(d().getIdx(), { once: true, after });
  };

  const dispose = (): void => {
    s.token++;
    clearPoll();
    window.cancelAnimationFrame(s.raf);
    s.turnFinish = null;
    s.timers.forEach((t) => window.clearTimeout(t));
    s.timers.clear();
  };

  return {
    stopAll,
    playFrom,
    listenOnce,
    dispose,
    skipTurn: (): void => s.turnFinish?.(),
    isPlaying: (): boolean => s.playing,
    isTurnActive: (): boolean => s.turnFinish !== null,
  };
}

export function usePlaybackEngine(deps: EngineDeps) {
  const depsRef = useLatest(deps);
  const [playing, setPlaying] = useState(false);
  /** repeat counter shown in the pill (updated when a repetition starts) */
  const [repShown, setRepShown] = useState(0);
  const [turn, setTurn] = useState<TurnState>(TURN_HIDDEN);
  const turnFillRef = useRef<HTMLDivElement>(null);

  const store = useRef<EngineStore>({
    token: 0,
    playing: false,
    repeatDone: 0,
    poll: 0,
    raf: 0,
    turnFinish: null,
    timers: new Set<number>(),
  });

  // The engine is created lazily on first use (from an event handler), never during render.
  const engineRef = useRef<Engine | null>(null);
  const [api] = useState(() => {
    const get = (): Engine =>
      (engineRef.current ??= createEngine({
        getStore: () => store.current,
        getDeps: () => depsRef.current,
        getTurnFill: () => turnFillRef.current,
        setPlaying,
        setRepShown,
        setTurn,
      }));
    return {
      stopAll: () => get().stopAll(),
      playFrom: (i: number) => get().playFrom(i),
      listenOnce: (after?: () => void) => get().listenOnce(after),
      skipTurn: () => get().skipTurn(),
      isPlaying: () => get().isPlaying(),
      isTurnActive: () => get().isTurnActive(),
      dispose: () => engineRef.current?.dispose(),
    };
  });

  useEffect(() => () => api.dispose(), [api]);

  return {
    playing,
    repShown,
    turn,
    turnFillRef,
    stopAll: api.stopAll,
    playFrom: api.playFrom,
    listenOnce: api.listenOnce,
    skipTurn: api.skipTurn,
    isPlaying: api.isPlaying,
    isTurnActive: api.isTurnActive,
  };
}
