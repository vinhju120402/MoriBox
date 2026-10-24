'use client';

import { useSyncExternalStore } from 'react';
import { getSupabase } from '../lib/supabase';

export interface Rating {
  avg: number;
  count: number;
}

// Average rating per product from the public `product_ratings` view, shared by
// every card on the page (one request, then cached until a review changes).
type RatingMap = Record<string, Rating>;
const EMPTY: RatingMap = {};

let state: RatingMap = EMPTY;
let started = false;
const listeners = new Set<() => void>();

export async function refreshProductRatings() {
  const { data, error } = await getSupabase().from('product_ratings').select('product_id, avg_rating, review_count');
  if (error || !data) return; // table not created yet, or offline: just show no stars
  state = Object.fromEntries(
    (data as { product_id: string; avg_rating: number; review_count: number }[]).map(r => [
      r.product_id,
      { avg: Number(r.avg_rating), count: r.review_count },
    ]),
  );
  listeners.forEach(l => l());
}

function subscribe(cb: () => void) {
  if (!started && typeof window !== 'undefined') {
    started = true;
    void refreshProductRatings();
  }
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function useProductRatings(): RatingMap {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}
