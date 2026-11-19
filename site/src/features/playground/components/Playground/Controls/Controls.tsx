import type { ThemeChoice } from 'live-factory';
import { Button } from '../../../../../shared/ui/Button/Button';
import { Segmented } from '../../../../../shared/ui/Segmented/Segmented';
import { Slider } from '../../../../../shared/ui/Slider/Slider';
import { useMediaQuery } from '../../../../../shared/lib/useMediaQuery';
import { useStillness } from '../../../model/motion';
import { CROWD, SPEED, pause, play, setCrowd, setShape, setSpeed, setTheme, useSettings, type Shape } from '../../../model/settings';
import styles from './Controls.module.css';

const THEMES = [
  { value: 'auto', label: 'Match page' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Night' },
] as const satisfies readonly { value: ThemeChoice; label: string }[];

const SHAPES = [
  { value: 'card', label: 'Card' },
  { value: 'banner', label: 'Banner' },
] as const satisfies readonly { value: Shape; label: string }[];

const formatSpeed = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(2).replace(/0$/, '')}×`;

/** Theme, shape, speed and crowd, and a play / pause button. */
export function Controls() {
  const s = useSettings();
  const { isStill, isMotionReduced } = useStillness(s);
  const isPageDark = useMediaQuery('(prefers-color-scheme: dark)');
  const shownTheme = s.theme === 'auto' ? (isPageDark ? 'night' : 'light') : s.theme === 'dark' ? 'night' : 'light';

  const handlePlay = () => (isStill ? play(isMotionReduced) : pause());

  return (
    <div className={styles.root} role="group" aria-label="Scene controls">
      <div className={styles.group}>
        <span className={styles.label}>Theme</span>
        <Segmented label="Theme" options={THEMES} value={s.theme} onChange={setTheme} />
        <span className={styles.note}>
          {s.theme === 'auto' ? 'Following page: ' : 'Showing '}
          <b className={styles.strong}>{shownTheme}</b>
        </span>
      </div>
      <div className={styles.group}>
        <span className={styles.label}>Shape</span>
        <Segmented label="Shape" options={SHAPES} value={s.shape} onChange={setShape} />
      </div>
      <Slider label="Speed" {...SPEED} value={s.speed} format={formatSpeed} onChange={setSpeed} />
      {/* a new crowd rebuilds the scene, so it applies when the thumb is let go */}
      <Slider label="Crowd" {...CROWD} value={s.crowd} format={(v) => v.toFixed(1)} onChange={setCrowd} commit="release" />
      <Button className={styles.play} variant="primary" onClick={handlePlay}>
        {isStill ? 'Play' : 'Pause'}
      </Button>
    </div>
  );
}
