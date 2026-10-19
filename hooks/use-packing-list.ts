'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from './use-auth';
import { can } from '../lib/permissions';
import type { PaymentMethodId, PaymentStatus } from '../lib/payments';

export interface PackingOrder {
  id: string;
  code: string;
  status: 'pending' | 'confirmed' | 'shipping';
  createdAt: string;
  customerName: string;
  phone: string;
  address: string;
  sector: string;
  paymentMethod: PaymentMethodId;
  paymentStatus: PaymentStatus;
  items: { productId: string | null; name: string; quantity: number }[];
}

interface PackingRow {
  id: string;
  code: string;
  status: PackingOrder['status'];
  created_at: string;
  customer_name: string;
  phone: string;
  address: string;
  sector: string;
  payment_method: PaymentMethodId;
  payment_status: PaymentStatus;
  items: { product_id: string | null; name: string; quantity: number }[];
}

const fromRow = (r: PackingRow): PackingOrder => ({
  id: r.id,
  code: r.code,
  status: r.status,
  createdAt: r.created_at,
  customerName: r.customer_name,
  phone: r.phone,
  address: r.address,
  sector: r.sector,
  paymentMethod: r.payment_method,
  paymentStatus: r.payment_status,
  items: r.items.map(i => ({ productId: i.product_id, name: i.name, quantity: i.quantity })),
});

// What the warehouse needs to pick and pack — items and where they go, never prices.
// The database function checks the role; the list refreshes every minute.
export function usePackingList() {
  const { role } = useAuth();
  const allowed = can(role, 'packing');
  const [orders, setOrders] = useState<PackingOrder[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    const load = () =>
      getSupabase().rpc('get_packing_list').then(({ data }) => {
        if (cancelled) return;
        if (Array.isArray(data)) setOrders((data as PackingRow[]).map(fromRow));
        setHasLoaded(true);
      });
    void load();
    const timer = window.setInterval(() => { void load(); }, 60_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [allowed, version]);

  const reload = useCallback(() => setVersion(v => v + 1), []);

  const setStatus = useCallback(async (orderId: string, status: 'confirmed' | 'shipping'): Promise<{ ok: true } | { ok: false; error: string }> => {
    const { error } = await getSupabase().rpc('set_order_status', { p_order_id: orderId, p_status: status });
    if (error) return { ok: false, error: error.message };
    reload();
    return { ok: true };
  }, [reload]);

  return { orders: allowed ? orders : [], hasLoaded, reload, setStatus };
}
