import { KEYS } from '@/lib/constants';
import Sheet from './Sheet';

export default function ShortcutsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} label="Keyboard shortcuts">
      <div className="sheet-head">
        <h2>Keyboard Shortcuts</h2>
        <button className="done-btn" onClick={onClose}>
          Done
        </button>
      </div>
      <div className="group">
        {KEYS.map(([k, d]) => (
          <div className="row" key={k}>
            <span>{d}</span>
            <kbd>{k}</kbd>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
