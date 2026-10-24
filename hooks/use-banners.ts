'use client';

import { useSyncExternalStore } from 'react';
import { getSupabase } from '../lib/supabase';

// A homepage carousel slide managed from Admin → Chương trình.
export interface Banner {
  id: string;
  eyebrow: string;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
  gradient: string;
}

export interface BannerRow {
  id: string;
  eyebrow: string;
  headline: string;
  body: string;
  cta_label: string;
  cta_href: string;
  image: string;
  gradient: string;
  sort_order: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

const fromRow = (r: BannerRow): Banner => ({
  id: r.id,
  eyebrow: r.eyebrow,
  headline: r.headline,
  body: r.body,
  ctaLabel: r.cta_label,
  ctaHref: r.cta_href || '#catalog',
  image: r.image,
  gradient: r.gradient,
});

// The database only returns banners that are live right now (RLS), so an empty
// list simply means "use the built-in slides".
interface State {
  banners: Banner[];
  hasLoaded: boolean;
}

const SERVER_STATE: State = { banners: [], hasLoaded: false };
let state: State = SERVER_STATE;
let started = false;
const listeners = new Set<() => void>();

function setState(next: State) {
  state = next;
  listeners.forEach(l => l());
}

export async function refreshBanners() {
  const { data, error } = await getSupabase()
    .from('banners')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  // Staff see every banner through RLS; the storefront wants only the live ones.
  const now = Date.now();
  const live = ((data as BannerRow[] | null) ?? []).filter(r =>
    r.active && (!r.starts_at || new Date(r.starts_at).getTime() <= now) && (!r.ends_at || now < new Date(r.ends_at).getTime()));
  setState({ banners: error ? state.banners : live.map(fromRow), hasLoaded: true });
}

function subscribe(cb: () => void) {
  if (!started && typeof window !== 'undefined') {
    started = true;
    void refreshBanners();
  }
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function useBanners() {
  return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
}
