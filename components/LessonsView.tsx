'use client';

import { useEffect, useRef } from 'react';
import type { Lesson, Stats } from '@/lib/types';
import { dayKey, streak } from '@/lib/utils';
import { bookmarkletHref } from '@/lib/bookmarklet';
import { BoltIcon, FireIcon, PlayIcon, SpeakerIcon, VideoIcon } from './Icons';

interface LessonsViewProps {
  active: boolean;
  lessons: Lesson[];
  currentId: string;
  stats: Stats;
  onOpen: (l: Lesson) => void;
  onDelete: (l: Lesson) => void;
  onNew: () => void;
  toast: (msg: string) => void;
}

export default function LessonsView({ active, lessons, currentId, stats, onOpen, onDelete, onNew, toast }: LessonsViewProps) {
  const bmRef = useRef<HTMLAnchorElement>(null);

  // React blocks `javascript:` URLs in the href prop, so set the attribute directly.
  useEffect(() => {
    const base = location.href.split(/[?#]/)[0];
    bmRef.current?.setAttribute('href', bookmarkletHref(base));
  }, []);

  const days = stats.days;
  const today = days[dayKey()] ?? {};
  const all = Object.values(days);
  const tests = all.reduce((a, d) => a + (d.tests || 0), 0);
  const sum = all.reduce((a, d) => a + (d.scoreSum || 0), 0);

  return (
    <section className={'view' + (active ? ' active' : '')} id="view-lessons">
      <header className="nav">
        <div className="nav-row">
          <span />
          <button className="nav-btn" onClick={onNew}>
            ＋ New
          </button>
        </div>
        <h1 className="large-title">Lessons</h1>
      </header>

      <div className="stats">
        <div className="stat">
          <b>{Math.round((today.sec || 0) / 60)}m</b>
          <span>Practice today</span>
        </div>
        <div className="stat">
          <b>{today.lines || 0}</b>
          <span>Lines today</span>
        </div>
        <div className="stat">
          <b>
            <FireIcon />
            {streak(days)}
          </b>
          <span>Day streak</span>
        </div>
        <div className="stat">
          <b>{tests ? Math.round(sum / tests) + '%' : '—'}</b>
          <span>Avg score</span>
        </div>
      </div>

      <div className="card bm">
        <b>
          <BoltIcon />
          One click from YouTube
        </b>
        <p className="hint">
          Drag this button to your bookmarks bar. On any YouTube video, click it: the captions are read in your browser
          and the video opens here, ready to shadow. Works even when YouTube blocks the server. (Already have the old
          bookmark? Delete it and drag this one again.)
        </p>
        <a
          className="file-btn"
          ref={bmRef}
          onClick={(e) => {
            e.preventDefault();
            toast('Drag this button to your bookmarks bar');
          }}
        >
          <PlayIcon />
          Shadow this video
        </a>
      </div>

      <button className="btn" onClick={onNew}>
        ＋ New lesson from transcript
      </button>

      <div className="group-title">Your lessons</div>
      <div className="list">
        {lessons.length ? (
          lessons.map((L) => {
            const n = L.segments.length;
            const done = Object.values(L.prog).filter((p) => p.done).length;
            return (
              <div key={L.id} className={'line' + (L.id === currentId ? ' active' : '')} onClick={() => onOpen(L)}>
                <div className="line-num" aria-label={L.videoId ? 'Video lesson' : 'Voice lesson'}>
                  {L.videoId ? <VideoIcon /> : <SpeakerIcon />}
                </div>
                <div className="line-body">
                  <div className="cell-title">{L.title}</div>
                  <div className="cell-sub">
                    {n} lines · {done} done · {new Date(L.created).toLocaleDateString()}
                  </div>
                  <div className="mini-bar">
                    <div style={{ width: (n ? (done / n) * 100 : 0) + '%' }} />
                  </div>
                </div>
                <button
                  className="del"
                  aria-label={`Delete “${L.title}”`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(L);
                  }}
                >
                  Delete
                </button>
              </div>
            );
          })
        ) : (
          <div className="empty">No lessons yet.</div>
        )}
      </div>
    </section>
  );
}
