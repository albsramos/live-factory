import { LivingCity } from 'live-factory';
import { useSettings } from '../../../model/settings';
import styles from './Stage.module.css';

const LABEL =
  'An animated isometric factory town: traffic and semis, robotaxis, charging cars, a crane, a compute platform and humanoid robots among people';

/** The scene itself, as a card in its own shape or as a wide banner showing the whole height. */
export function Stage() {
  const s = useSettings();
  const isBanner = s.shape === 'banner';
  return (
    <div className={styles.root} data-shape={s.shape}>
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
    </div>
  );
}
