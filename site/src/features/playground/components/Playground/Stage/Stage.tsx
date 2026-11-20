import { LivingCity } from 'live-factory';
import { setFull, useSettings } from '../../../model/settings';
import { FullscreenButton } from '../FullscreenButton/FullscreenButton';
import styles from './Stage.module.css';

const LABEL =
  'An animated isometric factory town: traffic and semis, robotaxis, charging cars, a crane, a compute platform and humanoid robots among people';

// Safari before 16.4 only has the prefixed names
type Fullscreenable = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type Doc = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

/** Ask the browser for full screen where a page may have it; where it can't (an iPhone keeps it for video), or says no, filling the window is enough. */
function requestFullscreen(el: Fullscreenable) {
  const doc = document as Doc;
  const request = el.requestFullscreen ?? el.webkitRequestFullscreen;
  if (!request || !(document.fullscreenEnabled || doc.webkitFullscreenEnabled)) return;
  Promise.resolve(request.call(el)).catch(() => undefined);
}

function exitFullscreen() {
  const doc = document as Doc;
  const exit = document.exitFullscreen ?? doc.webkitExitFullscreen;
  if ((document.fullscreenElement ?? doc.webkitFullscreenElement) && exit) Promise.resolve(exit.call(document)).catch(() => undefined);
}

/**
 * The scene itself: a 1630 × 520 banner showing the whole height, or the scene in its own 1.86 : 1 shape. On the whole
 * screen (`full=1` in the URL, so a link can open straight into it) it fills the window; pressing the button also
 * asks the browser for its full screen, which a page may only do on a click.
 */
export function Stage() {
  const s = useSettings();
  const isBanner = s.shape === 'banner' && !s.isFull;

  const handleToggle = (el: HTMLElement | null) => {
    if (s.isFull) {
      exitFullscreen();
      setFull(false);
      return;
    }
    setFull(true);
    if (el) requestFullscreen(el);
  };

  return (
    <div className={styles.root} data-shape={s.isFull ? undefined : s.shape} data-state={s.isFull ? 'full' : 'inline'}>
      <LivingCity
        className={styles.scene}
        theme={s.theme}
        speed={s.speed}
        density={s.crowd}
        fit={isBanner ? 'contain' : 'cover'}
        isPaused={s.isPaused}
        isReducedMotionIgnored={s.isMotionForced}
        label={LABEL}
      />
      <FullscreenButton className={styles.button} isFull={s.isFull} onClick={(e) => handleToggle(e.currentTarget.parentElement)} />
    </div>
  );
}
