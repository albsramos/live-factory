import { useState } from 'react';
import { LivingCity } from 'live-factory';
import { useFullscreenElement } from '../../../../../shared/lib/useFullscreenElement';
import { useSettings } from '../../../model/settings';
import { FullscreenButton } from '../FullscreenButton/FullscreenButton';
import styles from './Stage.module.css';

const LABEL =
  'An animated isometric factory town: traffic and semis, robotaxis, charging cars, a crane, a compute platform and humanoid robots among people';

// Safari before 16.4 only has the prefixed names
type Fullscreenable = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type Doc = Document & { webkitFullscreenEnabled?: boolean; webkitExitFullscreen?: () => Promise<void> | void };

/**
 * The scene itself: a 1630 × 520 banner showing the whole height, or the scene in its own 1.86 : 1 shape. Its button
 * shows it on the whole screen: the browser's full screen where a page may have it, otherwise (an iPhone, which
 * keeps full screen for video) the scene simply fills the window.
 */
export function Stage() {
  const s = useSettings();
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [isFillingWindow, setFillingWindow] = useState(false);
  const fullscreenElement = useFullscreenElement();
  const isFull = isFillingWindow || (root !== null && fullscreenElement === root);
  const isBanner = s.shape === 'banner' && !isFull;

  const handleToggle = () => {
    const doc = document as Doc;
    if (isFull) {
      setFillingWindow(false);
      const exit = document.exitFullscreen ?? doc.webkitExitFullscreen;
      if (fullscreenElement && exit) Promise.resolve(exit.call(document)).catch(() => undefined);
      return;
    }
    const el = root as Fullscreenable | null;
    const request = el?.requestFullscreen ?? el?.webkitRequestFullscreen;
    if (!el || !request || !(document.fullscreenEnabled || doc.webkitFullscreenEnabled)) {
      setFillingWindow(true);
      return;
    }
    Promise.resolve(request.call(el)).catch(() => setFillingWindow(true));
  };

  return (
    <div ref={setRoot} className={styles.root} data-shape={isFull ? undefined : s.shape} data-state={isFull ? 'full' : 'inline'}>
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
      <FullscreenButton className={styles.button} isFull={isFull} onClick={handleToggle} />
    </div>
  );
}
