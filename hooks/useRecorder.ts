'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Accent } from '@/lib/types';
import { useLatest } from './useLatest';

/* ---------- minimal Web Speech API types (not in lib.dom) ---------- */
interface SpeechAlternativeLike {
  transcript: string;
}
interface SpeechResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechAlternativeLike;
}
interface SpeechResultListLike {
  readonly length: number;
  [index: number]: SpeechResultLike;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechResultListLike;
}
interface SpeechRecognitionErrorLike {
  error: string;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

/** SpeechRecognition constructor, or null (Firefox / Safari without support). */
export function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface RecSession {
  active: boolean;
  auto: boolean;
  idx: number;
  chunks: Blob[];
  heard: string;
  interim: string;
  mr: MediaRecorder | null;
  sr: SpeechRecognitionLike | null;
  stream: MediaStream | null;
  silence: number;
}

export interface RecorderOptions {
  accent: Accent;
  /** A new attempt started (clear old result, show "Listening…"). */
  onStart: () => void;
  /** Live transcript while speaking. */
  onListening: (text: string) => void;
  /** Neither MediaRecorder nor SpeechRecognition is available. */
  onUnavailable: () => void;
  /** A recording blob URL for line `idx` is ready (for "My voice" / "Compare"). */
  onRecording: (idx: number, url: string) => void;
  /** Recording stopped; `said` is what SpeechRecognition heard (may be empty). */
  onFinished: (idx: number, said: string) => void;
  toast: (msg: string) => void;
}

const stopTracks = (s: MediaStream | null): void => {
  if (s) s.getTracks().forEach((t) => t.stop());
};

/**
 * Microphone recording (MediaRecorder, for playback) + speech recognition (for scoring).
 * Manual recordings stop automatically after 1.8 s of silence.
 */
export function useRecorder(options: RecorderOptions) {
  const opts = useLatest(options);
  const [recording, setRecording] = useState(false);
  const store = useRef<{ session: RecSession | null; timers: Set<number> }>({ session: null, timers: new Set() });

  const api = useMemo(() => {
    const s = store.current;

    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        s.timers.delete(id);
        fn();
      }, ms);
      s.timers.add(id);
    };

    const stop = (): void => {
      const r = s.session;
      if (!r || !r.active) return;
      r.active = false;
      window.clearTimeout(r.silence);
      if (r.sr) {
        try {
          r.sr.stop();
        } catch {
          /* already stopped */
        }
      }
      const mr = r.mr;
      if (mr && mr.state !== 'inactive') {
        mr.onstop = () => {
          const blob = new Blob(r.chunks, { type: mr.mimeType || 'audio/webm' });
          opts.current.onRecording(r.idx, URL.createObjectURL(blob));
          stopTracks(r.stream);
        };
        mr.stop();
      } else {
        stopTracks(r.stream);
      }
      setRecording(false);
      later(() => opts.current.onFinished(r.idx, (r.heard + ' ' + (r.interim || '')).trim()), 450);
    };

    const start = async (idx: number, auto: boolean): Promise<void> => {
      if (s.session?.active) return;
      const r: RecSession = {
        active: true,
        auto,
        idx,
        chunks: [],
        heard: '',
        interim: '',
        mr: null,
        sr: null,
        stream: null,
        silence: 0,
      };
      s.session = r;
      setRecording(true);
      opts.current.onStart();

      if (navigator.mediaDevices && typeof MediaRecorder !== 'undefined') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (!r.active) {
            stopTracks(stream);
            return;
          }
          r.stream = stream;
          const mr = new MediaRecorder(stream);
          r.mr = mr;
          mr.ondataavailable = (e: BlobEvent) => {
            if (e.data.size) r.chunks.push(e.data);
          };
          mr.start();
        } catch {
          opts.current.toast('Microphone blocked. Allow mic access (open via localhost or https).');
        }
      }

      const SR = getSpeechRecognition();
      if (SR) {
        const sr = new SR();
        sr.lang = opts.current.accent;
        sr.continuous = true;
        sr.interimResults = true;
        sr.maxAlternatives = 1;
        r.sr = sr;
        sr.onresult = (e) => {
          let interim = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const res = e.results[i];
            if (res.isFinal) r.heard += res[0].transcript + ' ';
            else interim += res[0].transcript;
          }
          r.interim = interim;
          if (r.active) opts.current.onListening(r.heard + interim);
          if (!r.auto) {
            window.clearTimeout(r.silence);
            r.silence = window.setTimeout(() => {
              if (r.active) stop();
            }, 1800);
          }
        };
        sr.onerror = (e) => {
          if (e.error === 'not-allowed') opts.current.toast('Speech recognition blocked by browser.');
        };
        sr.onend = () => {
          if (r.active && !r.auto) stop();
        };
        try {
          sr.start();
        } catch {
          /* already started */
        }
      } else if (!auto) {
        opts.current.toast('Scoring needs Chrome or Edge. Recording still works.');
      }

      if (!r.mr && !SR) {
        r.active = false;
        setRecording(false);
        opts.current.onUnavailable();
      }
    };

    /** Release the mic and timers (unmount). */
    const dispose = (): void => {
      const r = s.session;
      if (r) {
        r.active = false;
        window.clearTimeout(r.silence);
        if (r.sr) {
          r.sr.onend = null;
          r.sr.onresult = null;
          try {
            r.sr.abort();
          } catch {
            /* ignore */
          }
        }
        if (r.mr && r.mr.state !== 'inactive') {
          r.mr.onstop = null;
          try {
            r.mr.stop();
          } catch {
            /* ignore */
          }
        }
        stopTracks(r.stream);
      }
      s.timers.forEach((t) => window.clearTimeout(t));
      s.timers.clear();
    };

    return {
      start,
      stop,
      dispose,
      isActive: (): boolean => !!s.session?.active,
      isAuto: (): boolean => !!s.session?.auto,
    };
  }, [opts]);

  useEffect(() => () => api.dispose(), [api]);

  return {
    recording,
    start: api.start,
    stop: api.stop,
    isActive: api.isActive,
    isAuto: api.isAuto,
  };
}
