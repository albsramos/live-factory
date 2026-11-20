import type { MouseEvent } from 'react';
import styles from './StageButton.module.css';

/** Line icons drawn on a 20 × 20 grid. */
export const ICONS = {
  /** four corners pointing out: fill the screen */
  expand: 'M3 7.5V3h4.5M17 7.5V3h-4.5M3 12.5V17h4.5M17 12.5V17h-4.5',
  /** four corners pointing in: come back */
  collapse: 'M7.5 3v4.5H3M12.5 3v4.5H17M7.5 17v-4.5H3M12.5 17v-4.5H17',
  sun: 'M10 6.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7M10 2v1.5M10 16.5V18M2 10h1.5M16.5 10H18M4.3 4.3l1.1 1.1M14.6 14.6l1.1 1.1M4.3 15.7l1.1-1.1M14.6 5.4l1.1-1.1',
  moon: 'M16.5 12.2A7 7 0 0 1 7.8 3.5a7 7 0 1 0 8.7 8.7z',
} as const;

interface StageButtonProps {
  icon: keyof typeof ICONS;
  /** what pressing it does, for screen readers and the tooltip */
  label: string;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
}

/** A round icon button floating over the scene. */
export function StageButton({ icon, label, onClick }: StageButtonProps) {
  return (
    <button type="button" className={styles.root} aria-label={label} title={label} onClick={onClick}>
      <svg className={styles.icon} viewBox="0 0 20 20" aria-hidden="true">
        <path d={ICONS[icon]} />
      </svg>
    </button>
  );
}
