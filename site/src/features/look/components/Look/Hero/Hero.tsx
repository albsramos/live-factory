import { LivingCity } from 'live-factory';
import { patchSearch } from '../../../../../shared/lib/searchParams';
import styles from './Hero.module.css';

interface HeroProps {
  isDark: boolean;
}

/**
 * The header: the live scene behind everything, faded towards the left (where the title sits) and into the page at
 * the bottom; the title's warm glow is drawn on the title block itself, so it stays behind it at any width.
 */
export function Hero({ isDark }: HeroProps) {
  const handleTheme = () => patchSearch({ theme: isDark ? 'light' : 'dark' });
  return (
    <header className={styles.root}>
      <LivingCity className={styles.scene} theme={isDark ? 'dark' : 'light'} fit="cover" isBranded />
      <div className={styles.fadeSide} />
      <div className={styles.fadeEnds} />

      <nav className={styles.bar} aria-label="Site">
        <a className={styles.brand} href="./">Live Factory</a>
        <div className={styles.actions}>
          <button type="button" className={styles.chip} onClick={handleTheme}>
            {isDark ? 'Light' : 'Dark'}
          </button>
          <a className={styles.chip} href="./">Back to the playground</a>
        </div>
      </nav>

      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>
            <span className={styles.live} aria-hidden="true" />
            Live · [City, Country]
          </p>
          <h1 className={styles.title}>[Factory name]</h1>
          <p className={styles.lede}>Every car, robot and truck on the site, running right now. The day so far, in numbers, just below.</p>
          <div className={styles.ctas}>
            <a className={styles.primary} href="#numbers">See today’s numbers</a>
            <a className={styles.ghost} href="./">Open the playground</a>
          </div>
        </div>
      </div>
    </header>
  );
}
