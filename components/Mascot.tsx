'use client';

import { createContext, use, type ReactNode } from 'react';

/* =========================================================
   Echo — the Shadowing Studio mascot.
   A parrot (parrots repeat what they hear = shadowing)
   wearing headphones (listening). Pure inline SVG, no assets.
   Can be switched off in Settings → Display (MascotContext).
   ========================================================= */

/** false when the user turned Echo off in Settings. */
export const MascotContext = createContext(true);
export const useMascotEnabled = (): boolean => use(MascotContext);

export type MascotMood =
  | 'idle' // default
  | 'listen' // listening to you speak
  | 'speak' // your turn
  | 'cheer' // great score / lesson complete
  | 'good' // ok score
  | 'try' // low score — encouraging, not sad
  | 'sleep' // empty states
  | 'think'; // loading / no result

interface MascotProps {
  mood?: MascotMood;
  size?: number;
  /** Gentle idle bobbing animation (disabled for prefers-reduced-motion). */
  animate?: boolean;
  className?: string;
  /** Accessible label; omit for decorative use. */
  label?: string;
  /** Rendered instead of Echo when the mascot is switched off (e.g. an icon). */
  fallback?: ReactNode;
}

const INK = '#1c1c1e';

function Eye({ mood }: { mood: MascotMood }) {
  if (mood === 'cheer') {
    return <path d="M57 57 Q67 45 77 57" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />;
  }
  if (mood === 'sleep') {
    return <path d="M57 55 Q67 62 77 55" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />;
  }
  const lookUp = mood === 'listen' || mood === 'think';
  return (
    <>
      <circle cx="67" cy="55" r="12" fill="#fff" />
      <circle cx={lookUp ? 69 : 70} cy={lookUp ? 51 : 56} r="6.5" fill={INK} />
      <circle cx={lookUp ? 71.5 : 72.5} cy={lookUp ? 48.5 : 53} r="2.2" fill="#fff" />
      {mood === 'try' && <path d="M55 40 L78 45" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />}
    </>
  );
}

function Sparkle({ x, y, s = 1, color = '#ffcc00' }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -7 C1 -2 2 -1 7 0 C2 1 1 2 0 7 C-1 2 -2 1 -7 0 C-2 -1 -1 -2 0 -7 Z"
      fill={color}
    />
  );
}

function Extras({ mood }: { mood: MascotMood }) {
  switch (mood) {
    case 'listen':
      return (
        <g fill="#007aff">
          <path d="M100 18 v14 a4 4 0 1 1 -2.5 -3.7 V18 h9 v4 h-6.5 z" />
          <path d="M108 38 v10 a3.2 3.2 0 1 1 -2 -3 V38 h6 v3 h-4 z" opacity=".7" />
        </g>
      );
    case 'speak':
      return (
        <g fill="none" stroke="#007aff" strokeWidth="3.5" strokeLinecap="round">
          <path d="M107 62 q5 7 0 14" />
          <path d="M113 56 q9 13 0 26" opacity=".6" />
        </g>
      );
    case 'cheer':
      return (
        <>
          <Sparkle x={18} y={30} s={1.2} />
          <Sparkle x={104} y={20} s={1.4} />
          <Sparkle x={110} y={96} s={0.9} color="#ff9500" />
          <Sparkle x={12} y={70} s={0.8} color="#ff6b8a" />
        </>
      );
    case 'good':
      return <Sparkle x={104} y={24} s={1.2} />;
    case 'try':
      return <path d="M88 30 q5 7 0 11 q-5 -4 0 -11 z" fill="#5ac8fa" />;
    case 'sleep':
      return (
        <g fill="#8e8e93" fontFamily="inherit" fontWeight="700">
          <text x="88" y="30" fontSize="14">z</text>
          <text x="98" y="18" fontSize="18">Z</text>
        </g>
      );
    case 'think':
      return (
        <text x="92" y="30" fontSize="24" fontWeight="700" fill="#007aff" fontFamily="inherit">
          ?
        </text>
      );
    default:
      return null;
  }
}

export default function Mascot({ mood = 'idle', size = 64, animate = false, className = '', label, fallback }: MascotProps) {
  const enabled = useMascotEnabled();
  if (!enabled) return fallback ?? null;
  const open = mood === 'speak' || mood === 'cheer';
  const cls = ['mascot', animate ? 'mascot-anim' : '', mood === 'cheer' ? 'mascot-cheer' : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <svg
      className={cls}
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {/* headphone band (behind the head) */}
      <path d="M38 58 C32 20 82 12 80 46" fill="none" stroke="#0a6fe0" strokeWidth="7" strokeLinecap="round" />
      {/* tail */}
      <path d="M34 92 L18 112 L42 104 Z" fill="#1f9e47" />
      {/* body + belly */}
      <ellipse cx="60" cy="72" rx="34" ry="38" fill="#34c759" />
      <ellipse cx="67" cy="91" rx="18" ry="17" fill="#b9f2c6" />
      {/* crest */}
      <path d="M50 38 C44 22 52 14 58 12 C56 22 58 30 60 36 Z" fill="#ff9500" />
      <path d="M56 36 C56 20 66 14 72 14 C66 22 66 30 66 36 Z" fill="#ffcc00" />
      {/* wing */}
      <path d="M30 72 C26 92 40 106 54 104 C50 92 44 82 30 72 Z" fill="#24a148" />
      {/* ear cup */}
      <circle cx="40" cy="60" r="11" fill="#007aff" />
      <circle cx="40" cy="60" r="5.5" fill="#5aa9ff" />
      <Eye mood={mood} />
      {/* cheek */}
      <ellipse cx="76" cy="68" rx="4.5" ry="3" fill="#ff8fab" />
      {/* beak: lower half drops when talking / cheering */}
      <path d="M80 54 C98 50 108 64 101 82 C97 74 90 70 80 70 Z" fill="#ff9500" />
      <path
        d="M81 69 C89 70 94 74 93 80 C87 80 82 76 81 69 Z"
        fill="#d96f00"
        transform={open ? 'rotate(22 81 69) translate(0 3)' : undefined}
      />
      {/* feet */}
      <path d="M52 108 v6 M60 108 v6 M70 108 v6 M78 108 v6" stroke="#ff9500" strokeWidth="4" strokeLinecap="round" />
      <Extras mood={mood} />
    </svg>
  );
}

/** Pick a reaction for a score. */
export const moodForScore = (score: number): MascotMood => (score >= 85 ? 'cheer' : score >= 60 ? 'good' : 'try');
