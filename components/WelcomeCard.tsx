'use client';

import Mascot, { useMascotEnabled } from './Mascot';
import { CloseIcon, MicIcon, PlayIcon, SpeakingIcon } from './Icons';

interface WelcomeCardProps {
  onStart: () => void;
  onDismiss: () => void;
}

/** First-run introduction by Echo. Dismissed once, remembered in localStorage (sh_welcome). */
export default function WelcomeCard({ onStart, onDismiss }: WelcomeCardProps) {
  const echo = useMascotEnabled();
  return (
    <div className="card welcome">
      <button className="welcome-close" aria-label="Close welcome" onClick={onDismiss}>
        <CloseIcon />
      </button>
      <div className="welcome-head">
        <Mascot mood="idle" size={76} animate />
        <div>
          <b>{echo ? 'Hi, I’m Echo!' : 'Welcome to Shadowing Studio'}</b>
          <p>
            Shadowing = hear a sentence, then say it the same way.
            {echo ? ' Parrots are great at it — let’s practice together.' : ''}
          </p>
        </div>
      </div>
      <ol className="welcome-steps">
        <li>
          <span className="step-ic">
            <PlayIcon />
          </span>
          <span>
            Press <b>Play</b> to hear a line
          </span>
        </li>
        <li>
          <span className="step-ic">
            <SpeakingIcon />
          </span>
          <span>
            Repeat it during <b>your turn</b>
          </span>
        </li>
        <li>
          <span className="step-ic">
            <MicIcon />
          </span>
          <span>
            Tap <b>Record</b> to get a score
          </span>
        </li>
      </ol>
      <p className="hint">
        Paste a YouTube link above to practice with any video.
        <span className="desktop-only"> Press ? for keyboard shortcuts.</span>
      </p>
      <div className="welcome-actions">
        <button className="btn sm" onClick={onStart}>
          <PlayIcon />
          Start with this lesson
        </button>
        <button className="btn secondary sm" onClick={onDismiss}>
          Got it
        </button>
      </div>
    </div>
  );
}
