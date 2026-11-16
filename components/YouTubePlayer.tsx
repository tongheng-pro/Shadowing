'use client';

import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { useLatest } from '@/hooks/useLatest';

/* ---------- minimal YouTube IFrame API types ---------- */
interface YTPlayer {
  cueVideoById(videoId: string): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  setPlaybackRate(rate: number): void;
  destroy(): void;
}

interface YTPlayerOptions {
  videoId: string;
  playerVars: Record<string, string | number>;
  events: {
    onReady?: () => void;
    onError?: (e: { data: number }) => void;
  };
}

interface YTNamespace {
  Player: new (element: HTMLElement, options: YTPlayerOptions) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** What the playback engine uses to control the video. */
export interface YouTubeHandle {
  seekTo: (seconds: number) => void;
  play: () => void;
  pause: () => void;
  getCurrentTime: () => number;
  /** YT player state (0 = ended), -1 when not ready */
  getState: () => number;
  setRate: (rate: number) => void;
  /** Video id currently loaded in the player */
  getVideoId: () => string;
  isReady: () => boolean;
}

/* ---------- load https://www.youtube.com/iframe_api only once ---------- */
let apiPromise: Promise<YTNamespace> | null = null;

function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT && typeof window.YT.Player === 'function') return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
      else reject(new Error('YT missing'));
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = () => {
      apiPromise = null; // allow a retry later
      s.remove();
      reject(new Error('load failed'));
    };
    document.head.appendChild(s);
  });
  return apiPromise;
}

interface YouTubePlayerProps {
  videoId: string;
  speed: number;
  ref: Ref<YouTubeHandle>;
  onReadyChange: (ready: boolean) => void;
  onError: (message: string) => void;
}

/**
 * The player is created once and reused: switching lessons cues the new video.
 * YT replaces the element it is given with an iframe, so we give it a child element
 * that we create ourselves (React never renders inside the host div).
 */
export default function YouTubePlayer({ videoId, speed, ref, onReadyChange, onError }: YouTubePlayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const loadedVidRef = useRef('');
  const wantedVidRef = useRef(videoId);
  const speedRef = useRef(speed);
  const cb = useLatest({ onReadyChange, onError });

  useImperativeHandle(
    ref,
    () => ({
      seekTo: (s) => playerRef.current?.seekTo(s, true),
      play: () => playerRef.current?.playVideo(),
      pause: () => {
        try {
          playerRef.current?.pauseVideo();
        } catch {
          /* not ready */
        }
      },
      getCurrentTime: () => playerRef.current?.getCurrentTime() ?? 0,
      getState: () => (readyRef.current && playerRef.current ? playerRef.current.getPlayerState() : -1),
      setRate: (r) => {
        try {
          playerRef.current?.setPlaybackRate(r);
        } catch {
          /* not ready */
        }
      },
      getVideoId: () => loadedVidRef.current,
      isReady: () => readyRef.current,
    }),
    [],
  );

  // Create the player on first video, cue a new one on lesson change.
  useEffect(() => {
    wantedVidRef.current = videoId;
    const player = playerRef.current;
    if (!videoId) {
      if (player && readyRef.current) {
        try {
          player.pauseVideo();
        } catch {
          /* ignore */
        }
      }
      return;
    }
    if (player) {
      if (readyRef.current && loadedVidRef.current !== videoId) {
        player.cueVideoById(videoId);
        loadedVidRef.current = videoId;
      }
      return; // still creating → onReady cues the wanted video
    }

    let cancelled = false;
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || playerRef.current || !hostRef.current) return;
        const el = document.createElement('div');
        el.id = 'ytPlayer';
        hostRef.current.appendChild(el);
        const vars: Record<string, string | number> = { playsinline: 1, rel: 0, modestbranding: 1, cc_load_policy: 0 };
        if (location.protocol.startsWith('http')) vars.origin = location.origin;
        const first = wantedVidRef.current;
        const p = new YT.Player(el, {
          videoId: first,
          playerVars: vars,
          events: {
            onReady: () => {
              readyRef.current = true;
              loadedVidRef.current = first;
              const want = wantedVidRef.current;
              if (want && want !== first) {
                p.cueVideoById(want);
                loadedVidRef.current = want;
              }
              try {
                p.setPlaybackRate(speedRef.current);
              } catch {
                /* ignore */
              }
              cb.current.onReadyChange(true);
            },
            onError: (e) => cb.current.onError('Video error ' + e.data + '. This video may not allow embedding.'),
          },
        });
        playerRef.current = p;
      })
      .catch(() => {
        if (!cancelled) cb.current.onError('Could not load YouTube. Check internet.');
      });
    return () => {
      cancelled = true;
    };
  }, [videoId, cb]);

  useEffect(() => {
    speedRef.current = speed;
    if (readyRef.current) {
      try {
        playerRef.current?.setPlaybackRate(speed);
      } catch {
        /* ignore */
      }
    }
  }, [speed]);

  // Destroy on unmount.
  useEffect(() => {
    const host = hostRef.current;
    return () => {
      try {
        playerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
      readyRef.current = false;
      loadedVidRef.current = '';
      if (host) host.replaceChildren();
    };
  }, []);

  return (
    <div className="video-wrap" hidden={!videoId}>
      <div ref={hostRef} />
    </div>
  );
}
