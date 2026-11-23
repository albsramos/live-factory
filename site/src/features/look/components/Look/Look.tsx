import type { ThemeChoice } from 'live-factory';
import { useMediaQuery } from '../../../../shared/lib/useMediaQuery';
import { Hero } from './Hero/Hero';
import { Kpis } from './Kpis/Kpis';
import { Today } from './Today/Today';
import styles from './Look.module.css';

interface LookProps {
  /** `auto` follows the computer's light or dark appearance */
  theme: ThemeChoice;
}

/**
 * A possible landing page built round the scene (`?look` in the URL): the live scene as the header, a title on a
 * gradient on its left, and dashboard widgets below that overlap its faded lower edge. The figures are samples.
 */
export function Look({ theme }: LookProps) {
  const isPageDark = useMediaQuery('(prefers-color-scheme: dark)');
  const isDark = theme === 'auto' ? isPageDark : theme === 'dark';
  return (
    <div className={styles.root} data-theme={isDark ? 'dark' : 'light'}>
      <Hero isDark={isDark} />
      <main id="numbers" className={styles.body}>
        <div className={styles.overlap}>
          <Kpis />
          <p className={styles.note}>Sample data</p>
        </div>
        <Today />
      </main>
    </div>
  );
}
