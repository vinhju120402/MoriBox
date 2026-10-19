'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { DICTIONARY, DictionaryKey, Language } from '../app/i18n/dictionary';

const STORAGE_KEY = 'moribox-lang';
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function readLanguage(): Language {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'vi';
  } catch {
    return 'vi';
  }
}

export function useLanguage() {
  const language = useSyncExternalStore<Language>(subscribe, readLanguage, () => 'vi');

  const setLanguage = useCallback((next: Language) => {
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* storage blocked */ }
    document.documentElement.lang = next;
    listeners.forEach(l => l());
  }, []);

  const t = useCallback((key: DictionaryKey) => DICTIONARY[language][key], [language]);

  return { language, setLanguage, t };
}
