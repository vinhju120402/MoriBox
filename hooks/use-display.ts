'use client';

import { useCallback, useSyncExternalStore } from 'react';

export type TextSize = 'sm' | 'md' | 'lg';

const SIZE_KEY = 'moribox-text-size';
const MOTION_KEY = 'moribox-reduce-motion';
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function readSize(): TextSize {
  try {
    const v = localStorage.getItem(SIZE_KEY);
    if (v === 'sm' || v === 'lg') return v;
  } catch { /* storage blocked */ }
  return 'md';
}

function readMotion(): boolean {
  try { return localStorage.getItem(MOTION_KEY) === '1'; } catch { return false; }
}

// Text size + reduce-motion, stamped on <html> as data attributes (the
// pre-hydration script in layout applies the stored values before first paint).
export function useDisplay() {
  const textSize = useSyncExternalStore<TextSize>(subscribe, readSize, () => 'md');
  const reduceMotion = useSyncExternalStore<boolean>(subscribe, readMotion, () => false);

  const setTextSize = useCallback((next: TextSize) => {
    try {
      if (next === 'md') localStorage.removeItem(SIZE_KEY);
      else localStorage.setItem(SIZE_KEY, next);
    } catch { /* storage blocked */ }
    if (next === 'md') delete document.documentElement.dataset.text;
    else document.documentElement.dataset.text = next;
    listeners.forEach(l => l());
  }, []);

  const setReduceMotion = useCallback((next: boolean) => {
    try {
      if (next) localStorage.setItem(MOTION_KEY, '1');
      else localStorage.removeItem(MOTION_KEY);
    } catch { /* storage blocked */ }
    if (next) document.documentElement.dataset.motion = 'reduce';
    else delete document.documentElement.dataset.motion;
    listeners.forEach(l => l());
  }, []);

  return { textSize, setTextSize, reduceMotion, setReduceMotion };
}
