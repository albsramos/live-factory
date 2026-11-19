// The page's query string as a small external store, so settings live in the URL (shareable, survive a reload) and
// components read them with useSyncExternalStore instead of copying them into state.
//
// If the page can't rewrite its own history (some sandboxed frames), the store keeps working in memory.

import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
let memory = typeof window === 'undefined' ? '' : window.location.search;

function notify() {
  for (const l of listeners) l();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onPop = () => {
    memory = window.location.search;
    onChange();
  };
  window.addEventListener('popstate', onPop);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('popstate', onPop);
  };
}

const getSnapshot = () => memory;
const getServerSnapshot = () => '';

/** The current query string, e.g. "?theme=dark&speed=2". */
export function useSearch() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Merge values into the query string; `null` removes a key. Replaces the history entry rather than adding one. */
export function patchSearch(patch: Record<string, string | null>) {
  const params = new URLSearchParams(memory);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) params.delete(k);
    else params.set(k, v);
  }
  const next = params.toString();
  memory = next ? `?${next}` : '';
  try {
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${memory}${window.location.hash}`);
  } catch {
    // history is locked down here; the in-memory copy still drives the page
  }
  notify();
}
