'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from './use-auth';
import { refreshProductRatings } from './use-product-ratings';

export interface Review {
  id: string;
  userId: string | null;
  authorName: string;
  rating: number;
  body: string;
  createdAt: string;
}

interface ReviewRow {
  id: string;
  user_id: string | null;
  author_name: string;
  rating: number;
  body: string;
  created_at: string;
}

export type ReviewResult = { ok: true } | { ok: false; error: string };

// Reviews of one product, whether the signed-in customer may write one (a delivered
// order for it), and the write/delete actions. The database enforces all of it.
export function useReviews(productId: string) {
  const { user } = useAuth();
  const userId = user?.id;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getSupabase()
      .from('reviews')
      .select('id, user_id, author_name, rating, body, created_at')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (cancelled) return;
        setReviews(((data ?? []) as ReviewRow[]).map(r => ({
          id: r.id, userId: r.user_id, authorName: r.author_name, rating: r.rating, body: r.body, createdAt: r.created_at,
        })));
        setLoaded(true);
      });
    return () => { cancelled = true; };
  }, [productId, version]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getSupabase().rpc('can_review_product', { p_product_id: productId }).then(({ data }) => {
      if (!cancelled) setCanReview(data === true);
    });
    return () => { cancelled = true; };
  }, [productId, userId]);

  const submit = useCallback(async (rating: number, body: string): Promise<ReviewResult> => {
    const { error } = await getSupabase().rpc('submit_review', { p_product_id: productId, p_rating: rating, p_body: body });
    if (error) return { ok: false, error: error.message };
    setVersion(v => v + 1);
    void refreshProductRatings();
    return { ok: true };
  }, [productId]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await getSupabase().from('reviews').delete().eq('id', id);
    if (error) return false;
    setVersion(v => v + 1);
    void refreshProductRatings();
    return true;
  }, []);

  return { reviews, loaded, canReview: userId ? canReview : false, submit, remove };
}
