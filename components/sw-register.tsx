'use client';

import { useEffect } from 'react';

// A previous version of this component registered a caching service worker
// for PWA installability. In Next.js dev mode that worker's cache-first
// strategy served stale JS chunks after edits, causing hydration mismatches
// that reloading couldn't fix on its own (the stale JS had no way to know
// to clean itself up). To recover any browser that already installed it —
// and to avoid re-introducing the same class of bug — this component now
// only ever unregisters service workers and clears their caches, in every
// environment. /sw.js itself is a self-destructing script for the same
// reason: browsers detect its content changed independently of page JS.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.unregister());
    });
    if ('caches' in window) {
      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
    }
  }, []);

  return null;
}
