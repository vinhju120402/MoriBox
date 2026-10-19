'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from './use-auth';
import { can } from '../lib/permissions';

// Unit cost per product, from the staff-only `product_costs` table (never part of
// the public product data). Readable by admin / warehouse / accountant.
export function useProductCosts() {
  const { role } = useAuth();
  const allowed = can(role, 'inventory') || can(role, 'revenue');
  const [costs, setCosts] = useState<Record<string, number>>({});
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    getSupabase()
      .from('product_costs')
      .select('product_id, cost_price')
      .then(({ data }) => {
        if (cancelled || !data) return;
        setCosts(Object.fromEntries((data as { product_id: string; cost_price: number }[]).map(r => [r.product_id, r.cost_price])));
      });
    return () => { cancelled = true; };
  }, [allowed, version]);

  const setCost = useCallback(async (productId: string, cost: number): Promise<boolean> => {
    const { error } = await getSupabase()
      .from('product_costs')
      .upsert({ product_id: productId, cost_price: Math.max(0, Math.floor(cost)) }, { onConflict: 'product_id' });
    if (error) return false;
    setVersion(v => v + 1);
    return true;
  }, []);

  const setManyCosts = useCallback(async (rows: { productId: string; cost: number }[]): Promise<boolean> => {
    if (rows.length === 0) return true;
    const { error } = await getSupabase()
      .from('product_costs')
      .upsert(rows.map(r => ({ product_id: r.productId, cost_price: Math.max(0, Math.floor(r.cost)) })), { onConflict: 'product_id' });
    if (error) return false;
    setVersion(v => v + 1);
    return true;
  }, []);

  return { costs: allowed ? costs : {}, setCost, setManyCosts };
}
