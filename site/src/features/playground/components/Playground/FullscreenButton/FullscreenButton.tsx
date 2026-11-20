import styles from './FullscreenButton.module.css';

interface FullscreenButtonProps {
  isFull: boolean;
  onClick: () => void;
  /** only for placing it */
  className?: string;
}

/** A round icon button over the scene's corner: four corners pointing out to fill the screen, in to come back. */
export function FullscreenButton({ isFull, onClick, className }: FullscreenButtonProps) {
  return (
    <button
      type="button"
      className={className ? `${styles.root} ${className}` : styles.root}
      aria-label={isFull ? 'Exit full screen' : 'Full screen'}
      title={isFull ? 'Exit full screen' : 'Full screen'}
      onClick={onClick}
    >
      <svg className={styles.icon} viewBox="0 0 20 20" aria-hidden="true">
        <path d={isFull ? 'M7.5 3v4.5H3M12.5 3v4.5H17M7.5 17v-4.5H3M12.5 17v-4.5H17' : 'M3 7.5V3h4.5M17 7.5V3h-4.5M3 12.5V17h4.5M17 12.5V17h-4.5'} />
      </svg>
    </button>
  );
}
