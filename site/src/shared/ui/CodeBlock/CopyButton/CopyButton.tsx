import { useState, type RefObject } from 'react';
import { copyText } from '../../../lib/copyText';
import styles from './CopyButton.module.css';

type CopyButtonProps = {
  text: string;
  /** what to select instead when the clipboard isn't available */
  target: RefObject<HTMLElement | null>;
};

const LABEL = { idle: 'Copy', copied: 'Copied', selected: 'Selected' } as const;

export function CopyButton({ text, target }: CopyButtonProps) {
  const [status, setStatus] = useState<keyof typeof LABEL>('idle');

  const handleClick = async () => {
    setStatus(await copyText(text, target.current));
    setTimeout(() => setStatus('idle'), 1600);
  };

  return (
    <button type="button" className={styles.root} onClick={handleClick} data-state={status}>
      {LABEL[status]}
    </button>
  );
}
