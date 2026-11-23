import { LivingCity } from 'live-factory';
import { patchSearch } from '../../../../../shared/lib/searchParams';
import { useMediaQuery } from '../../../../../shared/lib/useMediaQuery';
import styles from './Hero.module.css';

interface HeroProps {
  isDark: boolean;
}

/**
 * The header: the navigation on a solid band of its own, then the live scene, seen through a soft oval that melts into the page at the sides and bottom,
 * a little darker behind the title on the left. The scene ends where the stat cards begin and, on a wide screen, shows its whole height, so what
 * happens at the bottom of the frame (the robotaxi stop, the crossing) stays in view. The shade behind the title is drawn on the title
 * block itself, so it stays behind it at any width.
 */
export function Hero({ isDark }: HeroProps) {
  // wider than the scene's own shape (from about 900px), show its whole height, outskirts filling the sides; on a
  // narrower, taller screen that would leave empty ground above and below, so fill the box instead. Either way the
  // camera sits well back from the fit (two thirds of it), for most of the town; the world goes on past the frame.
  const isWide = useMediaQuery('(min-width: 900px)');
  const handleTheme = () => patchSearch({ theme: isDark ? 'light' : 'dark' });
  return (
    <header className={styles.root}>
      {/* the navigation sits on a solid band of its own; the scene starts below it */}
      <div className={styles.nav}>
        <nav className={styles.bar} aria-label="Site">
          <a className={styles.brand} href="./">Live Factory</a>
          <div className={styles.actions}>
            <button type="button" className={styles.chip} onClick={handleTheme}>
              {isDark ? 'Light' : 'Dark'}
            </button>
            <a className={styles.chip} href="./">Back to the playground</a>
          </div>
        </nav>
      </div>

      <div className={styles.hero}>
        {/* the scene stops where the stat cards begin, so its lower edge (the robotaxi stop, the crossing) stays in view */}
        <div className={styles.stage}>
          <LivingCity className={styles.scene} theme={isDark ? 'dark' : 'light'} fit={isWide ? 'contain' : 'cover'} zoom={0.67} isBranded />
        </div>
        <div className={styles.fadeSide} />

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
      </div>
    </header>
  );
}
