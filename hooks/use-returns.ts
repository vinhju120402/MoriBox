'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { refreshCatalog } from './use-product-catalog';
import { useAuth } from './use-auth';
import type { DictionaryKey } from '../app/i18n/dictionary';

export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'shipped' | 'received' | 'refunded' | 'closed';
export type ReturnReason = 'defective' | 'wrong_item' | 'not_as_described' | 'changed_mind' | 'other';

export const RETURN_REASONS: ReturnReason[] = ['defective', 'wrong_item', 'not_as_described', 'changed_mind', 'other'];

export interface ReturnLine {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface ReturnRequest {
  id: string;
  code: string;
  orderId: string;
  orderCode: string;
  customerName: string;
  userId: string | null;
  reason: ReturnReason;
  details: string;
  items: ReturnLine[];
  refundAmount: number;
  status: ReturnStatus;
  trackingCode: string | null;
  staffNote: string | null;
  restocked: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ReturnRow {
  id: string;
  code: string;
  order_id: string;
  order_code: string;
  customer_name: string;
  user_id: string | null;
  reason: ReturnReason;
  details: string;
  items: { product_id: string; name: string; price: number; quantity: number }[];
  refund_amount: number;
  status: ReturnStatus;
  tracking_code: string | null;
  staff_note: string | null;
  restocked: boolean;
  created_at: string;
  updated_at: string;
}

const fromRow = (r: ReturnRow): ReturnRequest => ({
  id: r.id,
  code: r.code,
  orderId: r.order_id,
  orderCode: r.order_code,
  customerName: r.customer_name,
  userId: r.user_id,
  reason: r.reason,
  details: r.details,
  items: r.items.map(i => ({ productId: i.product_id, name: i.name, price: i.price, quantity: i.quantity })),
  refundAmount: r.refund_amount,
  status: r.status,
  trackingCode: r.tracking_code,
  staffNote: r.staff_note,
  restocked: r.restocked,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export type ReturnResult = { ok: true } | { ok: false; error: DictionaryKey };

// Database error → dictionary key for the message shown to the user.
function errorKey(raw: string): DictionaryKey {
  if (raw.includes('return_window_closed')) return 'ret.err.window';
  if (raw.includes('return_already_exists')) return 'ret.err.exists';
  if (raw.includes('order_not_delivered')) return 'ret.err.notDelivered';
  if (raw.includes('invalid_items') || raw.includes('no_items')) return 'ret.err.items';
  if (raw.includes('tracking_required')) return 'ret.err.tracking';
  if (raw.includes('invalid_transition')) return 'ret.err.transition';
  if (raw.includes('forbidden')) return 'ret.err.forbidden';
  return 'ret.err.generic';
}

// Returns visible to the signed-in user: a customer sees their own, staff (admin,
// warehouse, accountant) see every request — enforced by RLS.
export function useReturns() {
  const { user } = useAuth();
  const userId = user?.id;
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getSupabase()
      .from('return_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        if (data) setReturns((data as ReturnRow[]).map(fromRow));
        setHasLoaded(true);
      });
    return () => { cancelled = true; };
  }, [userId, version]);

  const reload = useCallback(() => setVersion(v => v + 1), []);

  // Runs one of the return RPCs, then refreshes the list.
  const run = useCallback(async (fn: string, args: Record<string, unknown>, restocks = false): Promise<ReturnResult> => {
    const { error } = await getSupabase().rpc(fn, args);
    if (error) return { ok: false, error: errorKey(error.message) };
    if (restocks) void refreshCatalog();
    reload();
    return { ok: true };
  }, [reload]);

  const request = (orderId: string, reason: ReturnReason, details: string, items: { productId: string; quantity: number }[]) =>
    run('request_return', {
      p_order_id: orderId,
      p_reason: reason,
      p_details: details,
      p_items: items.map(i => ({ product_id: i.productId, quantity: i.quantity })),
    });
  const ship = (id: string, tracking: string) => run('ship_return', { p_id: id, p_tracking: tracking });
  const close = (id: string) => run('close_return', { p_id: id });
  const review = (id: string, approve: boolean, note: string) => run('review_return', { p_id: id, p_approve: approve, p_note: note || null });
  const receive = (id: string, restock: boolean, note: string) => run('receive_return', { p_id: id, p_restock: restock, p_note: note || null }, restock);
  const refund = (id: string, note: string) => run('refund_return', { p_id: id, p_note: note || null });

  return { returns: userId ? returns : [], hasLoaded, reload, request, ship, close, review, receive, refund };
}
