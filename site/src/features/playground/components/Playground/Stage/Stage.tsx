import { LivingCity } from 'live-factory';
import { useRef } from 'react';
import { useMediaQuery } from '../../../../../shared/lib/useMediaQuery';
import { setFull, setTheme, useSettings } from '../../../model/settings';
import { StageButton } from '../StageButton/StageButton';
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
 * asks the browser for its full screen, which a page may only do on a click. On the whole screen the theme tabs are out
 * of reach, so a sun / moon button beside it switches day and night.
 */
export function Stage() {
  const s = useSettings();
  const isBanner = s.shape === 'banner' && !s.isFull;
  const rootRef = useRef<HTMLDivElement>(null);
  const isPageDark = useMediaQuery('(prefers-color-scheme: dark)');
  // with no theme in the URL the scene follows the page
  const isDark = s.theme === 'auto' ? isPageDark : s.theme === 'dark';

  const handleToggle = () => {
    if (s.isFull) {
      exitFullscreen();
      setFull(false);
      return;
    }
    setFull(true);
    if (rootRef.current) requestFullscreen(rootRef.current);
  };

  return (
    <div ref={rootRef} className={styles.root} data-shape={s.isFull ? undefined : s.shape} data-state={s.isFull ? 'full' : 'inline'}>
      <LivingCity
        className={styles.scene}
        theme={s.theme}
        speed={s.speed}
        density={s.crowd}
        fit={isBanner ? 'contain' : 'cover'}
        isPaused={s.isPaused}
        isReducedMotionIgnored={s.isMotionForced}
        isBranded
        label={LABEL}
      />
      <div className={styles.tools}>
        {s.isFull && (
          <StageButton icon={isDark ? 'sun' : 'moon'} label={isDark ? 'Switch to day' : 'Switch to night'} onClick={() => setTheme(isDark ? 'light' : 'dark')} />
        )}
        <StageButton icon={s.isFull ? 'collapse' : 'expand'} label={s.isFull ? 'Exit full screen' : 'Full screen'} onClick={handleToggle} />
      </div>
    </div>
  );
}
