import { useSyncExternalStore } from 'react';

// Safari before 16.4 only has the prefixed names
type Doc = Document & { webkitFullscreenElement?: Element | null };

const subscribe = (onChange: () => void) => {
  document.addEventListener('fullscreenchange', onChange);
  document.addEventListener('webkitfullscreenchange', onChange);
  return () => {
    document.removeEventListener('fullscreenchange', onChange);
    document.removeEventListener('webkitfullscreenchange', onChange);
  };
};

const read = () => document.fullscreenElement ?? (document as Doc).webkitFullscreenElement ?? null;

/** The element the browser is showing full screen, if any. */
export function useFullscreenElement(): Element | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
