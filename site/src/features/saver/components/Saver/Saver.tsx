import { LivingCity, type ThemeChoice } from 'live-factory';
import styles from './Saver.module.css';

interface SaverProps {
  /** `auto` follows the computer's light or dark appearance. */
  theme: ThemeChoice;
  speed: number;
  crowd: number;
}

/**
 * The scene alone on the whole window, for a screen saver to show (`?saver` in the URL): no title, no controls, no
 * cursor. It keeps moving even when the computer asks for reduced motion, since a screen saver is chosen for its motion.
 */
export function Saver({ theme, speed, crowd }: SaverProps) {
  return (
    <div className={styles.root}>
      <LivingCity className={styles.scene} theme={theme} speed={speed} density={crowd} fit="cover" isBranded isReducedMotionIgnored />
    </div>
  );
}
