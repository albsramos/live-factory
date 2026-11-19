import type { ReactNode } from 'react';
import styles from './Code.module.css';

/** Inline code in running text. */
export function Code({ children }: { children: ReactNode }) {
  return <code className={styles.root}>{children}</code>;
}
