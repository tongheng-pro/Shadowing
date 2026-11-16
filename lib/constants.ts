import type { Accent, Settings, TextMode, ThemeMode } from './types';

/** localStorage keys — identical to the original app so old data still loads. */
export const STORAGE_KEYS = {
  lessons: 'sh_lessons',
  current: 'sh_current',
  words: 'sh_words',
  stats: 'sh_stats',
  settings: 'sh_settings',
  /** New in the Next.js version: first-run welcome card dismissed */
  welcome: 'sh_welcome',
} as const;

export const SAMPLE_TITLE = 'Daily Conversation: Morning Coffee';

export const SAMPLE = `Good morning! You look a little tired today.
Yeah, I stayed up late finishing a project for work.
Oh no. Did you get it done in the end?
I did, but I only slept about four hours.
Let me buy you a coffee. What would you like?
That's so kind of you. A large latte, please.
No problem. Do you want anything to eat with it?
Maybe a croissant. I skipped breakfast this morning.
You should take it easy tonight and go to bed early.
You're right. I'm going to turn off my phone at nine.
Good idea. Sleep is more important than anything else.
Thanks for looking out for me. I really appreciate it.`;

export const DEFAULT_SETTINGS: Settings = {
  speed: 1,
  repeats: 1,
  gap: 1,
  autoNext: true,
  autoRec: false,
  autoScroll: true,
  textMode: 'show',
  theme: 'auto',
  voice: '',
  accent: 'en-US',
  autoDone: true,
  filter: 'all',
  mascot: true,
  turnIcon: true,
};

export type Opt<V> = readonly [V, string];

export const OPTS: {
  speed: ReadonlyArray<Opt<number>>;
  repeats: ReadonlyArray<Opt<number>>;
  gap: ReadonlyArray<Opt<number>>;
  textMode: ReadonlyArray<Opt<TextMode>>;
  theme: ReadonlyArray<Opt<ThemeMode>>;
  accent: ReadonlyArray<Opt<Accent>>;
} = {
  speed: [
    [0.5, '0.5×'],
    [0.75, '0.75×'],
    [0.9, '0.9×'],
    [1, '1×'],
    [1.25, '1.25×'],
  ],
  repeats: [
    [1, '1×'],
    [2, '2×'],
    [3, '3×'],
    [5, '5×'],
    [0, '∞'],
  ],
  gap: [
    [0, 'Off'],
    [1, '1×'],
    [1.5, '1.5×'],
    [2, '2×'],
  ],
  textMode: [
    ['show', 'Show'],
    ['blur', 'Blur'],
    ['hide', 'Hide'],
  ],
  theme: [
    ['auto', 'Auto'],
    ['light', 'Light'],
    ['dark', 'Dark'],
  ],
  accent: [
    ['en-US', 'US'],
    ['en-GB', 'UK'],
    ['en-AU', 'AU'],
  ],
};

/** Settings that the player-bar chips / shortcuts cycle through. */
export type CycleKey = 'speed' | 'repeats' | 'gap' | 'textMode';

export const CYCLE_LABEL: Record<CycleKey, string> = {
  speed: 'Speed ',
  repeats: 'Repeat ',
  gap: 'Your-turn pause ',
  textMode: 'Text: ',
};

export const KEYS: ReadonlyArray<readonly [string, string]> = [
  ['Space', 'Play / pause shadowing'],
  ['← / →', 'Previous / next line'],
  ['L', 'Listen to this line once'],
  ['R', 'Record & score (again to stop)'],
  ['M', 'Play my voice'],
  ['C', 'Compare: original → mine'],
  ['V', 'Reveal hidden text'],
  ['H', 'Text mode: show / blur / hide'],
  ['S', 'Star line'],
  ['D', 'Mark done'],
  ['- / =', 'Slower / faster'],
  ['P', 'Change your-turn pause'],
  ['?', 'Show keyboard shortcuts'],
  ['Esc', 'Close sheet'],
];
