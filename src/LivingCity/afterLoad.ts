// Waiting for the page to load and the browser to have a quiet moment before starting the scene: building the world
// and baking its bitmaps is a few hundred milliseconds of work, which shouldn't hold up the page's own content.

/** Runs `fn` once the page has loaded and the browser is idle (or after a second at most). Returns a cancel. */
export function afterLoad(fn: () => void): () => void {
  let isCancelled = false;
  let cancelIdle = () => {};
  const whenIdle = () => {
    if (isCancelled) return;
    const run = () => {
      if (!isCancelled) fn();
    };
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(run, { timeout: 1000 });
      cancelIdle = () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(run, 50);
      cancelIdle = () => clearTimeout(id);
    }
  };
  const isLoaded = typeof document === 'undefined' || document.readyState === 'complete';
  if (isLoaded) whenIdle();
  else window.addEventListener('load', whenIdle, { once: true });
  return () => {
    isCancelled = true;
    cancelIdle();
    if (!isLoaded) window.removeEventListener('load', whenIdle);
  };
}
