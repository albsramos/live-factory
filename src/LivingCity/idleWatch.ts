// Noticing when nobody has touched the page for a while, so the scene can hold still: a landing page left open on a
// screen for days shouldn't keep a CPU core busy for nobody. Any input brings it back at once.
//
// It costs almost nothing: input only stamps the time, and a single timer checks back when the wait could be over.

const INPUT = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll', 'focus'] as const;

export interface IdleWatch {
  /** The wait changed: check again now. */
  refresh(): void;
  stop(): void;
}

/** Calls `onIdle(true)` after `waitMs()` ms without input on the page (0 = never), and `onIdle(false)` on the next input. */
export function watchIdle(waitMs: () => number, onIdle: (isIdle: boolean) => void): IdleWatch {
  let last = performance.now();
  let isIdle = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const check = () => {
    timer = undefined;
    const wait = waitMs();
    if (!(wait > 0)) return;
    const left = last + wait - performance.now();
    if (left > 0) timer = setTimeout(check, left);
    else {
      isIdle = true;
      onIdle(true);
    }
  };
  const wake = () => {
    if (!isIdle) return;
    isIdle = false;
    onIdle(false);
  };
  const onInput = () => {
    last = performance.now();
    wake();
    if (!timer) check();
  };
  // capturing on window also catches scrolling inside any element, which doesn't bubble
  for (const e of INPUT) window.addEventListener(e, onInput, { capture: true, passive: true });
  check();
  return {
    refresh() {
      if (timer) clearTimeout(timer);
      timer = undefined;
      if (!(waitMs() > 0)) wake();
      else if (!isIdle) check();
    },
    stop() {
      if (timer) clearTimeout(timer);
      for (const e of INPUT) window.removeEventListener(e, onInput, { capture: true });
    },
  };
}
