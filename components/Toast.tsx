import type { ToastAction } from '@/lib/types';

interface ToastProps {
  message: string;
  show: boolean;
  action?: ToastAction;
  onDismiss: () => void;
}

/** Top toast. Tap to dismiss; optional action button (e.g. Undo). */
export default function Toast({ message, show, action, onDismiss }: ToastProps) {
  return (
    <div
      className={'toast' + (show ? ' show' : '') + (action ? ' has-action' : '')}
      role="status"
      aria-live="polite"
      onClick={onDismiss}
    >
      <span>{message}</span>
      {action && show && (
        <button
          className="toast-action"
          onClick={(e) => {
            e.stopPropagation();
            action.onClick();
            onDismiss();
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
