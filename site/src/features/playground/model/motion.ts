import { useMediaQuery } from '../../../shared/lib/useMediaQuery';
import type { Settings } from './settings';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** Whether the scene is standing still, and whether that is the visitor's reduced-motion setting at work. */
export function useStillness(settings: Settings) {
  const isMotionReduced = useMediaQuery(REDUCED_MOTION);
  const isHeldByMotion = isMotionReduced && !settings.isMotionForced && !settings.isPaused;
  return { isStill: settings.isPaused || isHeldByMotion, isHeldByMotion, isMotionReduced };
}
