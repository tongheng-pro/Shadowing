'use client';

import { OPTS, type Opt } from '@/lib/constants';
import type { Settings } from '@/lib/types';
import Sheet from './Sheet';

type BoolKey = 'autoNext' | 'autoRec' | 'autoScroll' | 'autoDone' | 'mascot' | 'turnIcon';

interface SettingsSheetProps {
  open: boolean;
  settings: Settings;
  voices: SpeechSynthesisVoice[];
  onSet: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  onRename: () => void;
  onReset: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function Label({ label, hint }: { label: string; hint?: string }) {
  return (
    <span>
      {label}
      {hint && <small>{hint}</small>}
    </span>
  );
}

function SegRow<V extends string | number>(props: {
  label: string;
  hint?: string;
  options: ReadonlyArray<Opt<V>>;
  value: V;
  onChange: (v: V) => void;
}) {
  return (
    <div className="row wrap">
      <Label label={props.label} hint={props.hint} />
      <div className="seg">
        {props.options.map(([v, t]) => (
          <button key={String(v)} className={props.value === v ? 'on' : ''} onClick={() => props.onChange(v)}>
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleRow(props: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="row">
      <Label label={props.label} hint={props.hint} />
      <label className="switch">
        <input type="checkbox" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />
        <span />
      </label>
    </div>
  );
}

export default function SettingsSheet({
  open,
  settings: S,
  voices,
  onSet,
  onRename,
  onReset,
  onDelete,
  onClose,
}: SettingsSheetProps) {
  const toggle = (label: string, k: BoolKey, hint?: string) => (
    <ToggleRow label={label} hint={hint} checked={S[k]} onChange={(v) => onSet(k, v)} />
  );

  return (
    <Sheet open={open} onClose={onClose} label="Settings">
      <div className="sheet-head">
        <h2>Settings</h2>
        <button className="done-btn" onClick={onClose}>
          Done
        </button>
      </div>

      <div className="group-title">Playback</div>
      <div className="group">
        <SegRow label="Speed" options={OPTS.speed} value={S.speed} onChange={(v) => onSet('speed', v)} />
        <SegRow label="Repeat each line" options={OPTS.repeats} value={S.repeats} onChange={(v) => onSet('repeats', v)} />
        <SegRow
          label="Pause for your turn"
          hint="Pause time = line length × this"
          options={OPTS.gap}
          value={S.gap}
          onChange={(v) => onSet('gap', v)}
        />
        {toggle('Auto next line', 'autoNext')}
        {toggle('Icon in your-turn bar', 'turnIcon', 'Off = text only')}
        {toggle('Auto-record in your turn', 'autoRec', 'Records and scores you after every line')}
      </div>

      <div className="group-title">Display</div>
      <div className="group">
        <SegRow
          label="Text"
          hint="Blur / Hide = listen-first practice"
          options={OPTS.textMode}
          value={S.textMode}
          onChange={(v) => onSet('textMode', v)}
        />
        {toggle('Auto-scroll list', 'autoScroll')}
        {toggle('Show Echo (mascot)', 'mascot', 'Turn off for a cleaner screen — icons are used instead')}
        <SegRow label="Theme" options={OPTS.theme} value={S.theme} onChange={(v) => onSet('theme', v)} />
      </div>

      <div className="group-title">Voice &amp; scoring</div>
      <div className="group">
        <div className="row">
          <Label label="Reading voice" hint="Used when there is no video" />
          <select className="field sel" value={S.voice} onChange={(e) => onSet('voice', e.target.value)}>
            <option value="">Default English</option>
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>
        <SegRow label="Accent check" options={OPTS.accent} value={S.accent} onChange={(v) => onSet('accent', v)} />
        {toggle('Auto mark done at 80%+', 'autoDone')}
      </div>

      <div className="group-title">This lesson</div>
      <button className="btn secondary" onClick={onRename}>
        Rename lesson
      </button>
      <button className="btn secondary" onClick={onReset}>
        Reset progress
      </button>
      <button className="btn danger" onClick={onDelete}>
        Delete lesson
      </button>
    </Sheet>
  );
}
