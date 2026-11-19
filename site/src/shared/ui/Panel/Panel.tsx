import type { ReactNode } from 'react';
import styles from './Panel.module.css';

type PanelProps = {
  title: string;
  children: ReactNode;
};

/** A titled card for a block of explanation. */
export function Panel({ title, children }: PanelProps) {
  return (
    <section className={styles.root}>
      <h2 className={styles.title}>{title}</h2>
      {children}
    </section>
  );
}
