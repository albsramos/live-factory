import { useStillness } from '../../../model/motion';
import { useSettings } from '../../../model/settings';
import styles from './MotionNote.module.css';

/** Explains a still scene when it's the visitor's reduced-motion setting holding it. */
export function MotionNote() {
  const { isHeldByMotion } = useStillness(useSettings());
  if (!isHeldByMotion) return null;
  return <p className={styles.root}>Your device asks for reduced motion, so the scene starts still. Press Play to run it.</p>;
}
