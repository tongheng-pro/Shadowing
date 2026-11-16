'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { useLatest } from './useLatest';

/* ---------- English voice list as an external store ---------- */
const NO_VOICES: SpeechSynthesisVoice[] = [];
let voiceCache: SpeechSynthesisVoice[] = NO_VOICES;

const supported = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window;

function readVoices(): SpeechSynthesisVoice[] {
  if (!supported()) return NO_VOICES;
  const list = (window.speechSynthesis.getVoices() || []).filter((v) => /^en/i.test(v.lang));
  const changed =
    list.length !== voiceCache.length ||
    list.some((v, i) => v.name !== voiceCache[i].name || v.lang !== voiceCache[i].lang);
  if (changed) voiceCache = list.length ? list : NO_VOICES;
  return voiceCache;
}

function subscribe(onChange: () => void): () => void {
  if (!supported()) return () => {};
  const synth = window.speechSynthesis;
  synth.addEventListener('voiceschanged', onChange);
  return () => synth.removeEventListener('voiceschanged', onChange);
}

/**
 * Text-to-speech with the chosen English voice.
 * `speak` resolves with the spoken duration in seconds (used to size the "your turn" pause).
 */
export function useSpeech(voiceName: string, onUnsupported: () => void) {
  const voices = useSyncExternalStore(subscribe, readVoices, () => NO_VOICES);
  const opts = useLatest({ voiceName, onUnsupported });
  const timers = useRef<Set<number>>(new Set());

  useEffect(() => {
    const set = timers.current;
    return () => {
      set.forEach((t) => window.clearTimeout(t));
      set.clear();
      if (supported()) window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback(
    (text: string, rate = 1): Promise<number> =>
      new Promise<number>((resolve) => {
        if (!supported()) {
          opts.current.onUnsupported();
          resolve(1);
          return;
        }
        const synth = window.speechSynthesis;
        synth.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        u.rate = rate;
        const v = readVoices().find((x) => x.name === opts.current.voiceName);
        if (v) u.voice = v;
        const t0 = performance.now();
        u.onend = u.onerror = () => resolve((performance.now() - t0) / 1000);
        const id = window.setTimeout(() => {
          timers.current.delete(id);
          synth.speak(u);
        }, 30);
        timers.current.add(id);
      }),
    [opts],
  );

  const cancel = useCallback(() => {
    if (supported()) window.speechSynthesis.cancel();
  }, []);

  return { voices, speak, cancel };
}
