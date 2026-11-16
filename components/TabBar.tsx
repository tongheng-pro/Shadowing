'use client';

import type { View } from '@/lib/types';
import { BookmarkIcon, LessonsIcon, MicIcon } from './Icons';

interface TabBarProps {
  view: View;
  onChange: (v: View) => void;
}

const TABS: ReadonlyArray<{ view: View; label: string; Icon: () => React.JSX.Element }> = [
  { view: 'practice', label: 'Practice', Icon: MicIcon },
  { view: 'lessons', label: 'Lessons', Icon: LessonsIcon },
  { view: 'words', label: 'Words', Icon: BookmarkIcon },
];

export default function TabBar({ view, onChange }: TabBarProps) {
  return (
    <nav className="tabbar">
      {TABS.map(({ view: v, label, Icon }) => (
        <button
          key={v}
          className={'tab' + (view === v ? ' on' : '')}
          aria-current={view === v ? 'page' : undefined}
          onClick={() => onChange(v)}
        >
          <Icon />
          {label}
        </button>
      ))}
    </nav>
  );
}
