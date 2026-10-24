'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from './use-auth';
import { refreshCatalog } from './use-product-catalog';
import { PaymentMethodId, PaymentStatus } from '../lib/payments';
import type { DictionaryKey } from '../app/i18n/dictionary';

export interface OrderItem {
  productId: string;
  name: string;
  grade: string;
  price: number;
  quantity: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  userId: string | null;
  code: string;
  date: string; // ISO timestamp
  customerName: string;
  customerEmail: string;
  phone: string;
  address: string;
  sector: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  shippingFee: number;
  total: number;
  paymentMethod: PaymentMethodId;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  statusUpdatedAt: string | null;
  /** Customer asked to cancel an order they had already paid for. */
  cancelRequested: boolean;
  /** Written by staff when the refund was paid back (transaction code, account…). */
  refundNote: string | null;
}

interface OrderRow {
  id: string;
  user_id: string | null;
  status: OrderStatus;
  status_updated_at: string | null;
  cancel_requested_at: string | null;
  refund_note: string | null;
  code: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  phone: string;
  address: string;
  sector: string;
  subtotal: number;
  discount: number;
  coupon_code: string | null;
  shipping_fee: number;
  total: number;
  payment_method: PaymentMethodId;
  payment_status: PaymentStatus;
  order_items: { product_id: string | null; name: string; grade: string; price: number; quantity: number }[];
}

// Explicit columns: `order_items.cost` is hidden from API clients, so `*` would be rejected.
const ORDER_SELECT =
  'id, user_id, code, status, status_updated_at, cancel_requested_at, refund_note, created_at, customer_name, customer_email, ' +
  'phone, address, sector, subtotal, discount, coupon_code, shipping_fee, total, payment_method, payment_status, ' +
  'order_items(id, product_id, name, grade, price, quantity)';

const fromRow = (r: OrderRow): Order => ({
  id: r.id,
  userId: r.user_id,
  status: r.status,
  statusUpdatedAt: r.status_updated_at,
  cancelRequested: !!r.cancel_requested_at,
  refundNote: r.refund_note,
  code: r.code,
  date: r.created_at,
  customerName: r.customer_name,
  customerEmail: r.customer_email,
  phone: r.phone,
  address: r.address,
  sector: r.sector,
  subtotal: r.subtotal,
  discount: r.discount ?? 0,
  couponCode: r.coupon_code,
  shippingFee: r.shipping_fee,
  total: r.total,
  paymentMethod: r.payment_method,
  paymentStatus: r.payment_status,
  items: r.order_items.map(i => ({
    productId: i.product_id ?? '',
    name: i.name,
    grade: i.grade,
    price: i.price,
    quantity: i.quantity,
  })),
});

// Lets the realtime subscription in the admin shell tell every open table to reload.
const refreshListeners = new Set<() => void>();
export function notifyOrdersChanged() {
  refreshListeners.forEach(l => l());
}
export function subscribeOrdersChanged(cb: () => void): () => void {
  refreshListeners.add(cb);
  return () => { refreshListeners.delete(cb); };
}

// Orders visible to the signed-in user: an admin or accountant sees every order,
// a customer only their own — enforced by RLS.
export function useOrders() {
  const { user } = useAuth();
  const userId = user?.id;
  const [orders, setOrders] = useState<Order[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion(v => v + 1);
    refreshListeners.add(bump);
    return () => { refreshListeners.delete(bump); };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getSupabase()
      .from('orders')
      .select(ORDER_SELECT)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        setLoadError(!!error);
        if (data) setOrders((data as unknown as OrderRow[]).map(fromRow));
        setHasLoaded(true);
      });
    return () => { cancelled = true; };
  }, [userId, version]);

  const reload = () => setVersion(v => v + 1);

  // Admin/accountant only (enforced by set_order_payment in the database).
  const setPaymentStatus = async (orderId: string, status: PaymentStatus, note?: string): Promise<boolean> => {
    const { error } = await getSupabase().rpc('set_order_payment', { p_order_id: orderId, p_status: status, p_note: note ?? null });
    if (error) return false;
    reload();
    return true;
  };

  // 'cancelled' = cancelled now; 'requested' = already paid, staff must refund.
  const cancel = async (orderId: string): Promise<CancelResult> => {
    const result = await cancelOrder(orderId);
    if (result.ok) reload();
    return result;
  };

  // Fulfilment step (pending → confirmed → shipping → delivered); the database
  // checks who may do which step.
  const setStatus = async (orderId: string, status: OrderStatus): Promise<StatusResult> => {
    const { error } = await getSupabase().rpc('set_order_status', { p_order_id: orderId, p_status: status });
    if (error) return { ok: false, error: error.message };
    reload();
    return { ok: true };
  };

  return { orders: userId ? orders : [], hasLoaded, loadError, setPaymentStatus, cancel, setStatus, reload };
}

export interface ShippingInfo {
  name: string;
  phone: string;
  address: string;
  sector: string;
}

export type PlaceOrderResult = { ok: true; orderId: string; code: string; total: number } | { ok: false; error: string };
export type CancelResult = { ok: true; outcome: 'cancelled' | 'requested' } | { ok: false; error: string };
export type StatusResult = { ok: true } | { ok: false; error: string };

// Creates the order server-side (prices, coupon and stock are checked in the
// database), then refreshes the catalog so every page shows the new stock.
export async function placeOrder(
  items: { productId: string; quantity: number }[],
  shipping: ShippingInfo,
  paymentMethod: PaymentMethodId = 'cod',
  coupon?: string,
): Promise<PlaceOrderResult> {
  const { data, error } = await getSupabase().rpc('place_order', {
    p_items: items.map(i => ({ product_id: i.productId, quantity: i.quantity })),
    p_shipping: shipping,
    p_payment_method: paymentMethod,
    p_coupon: coupon?.trim() ? coupon.trim() : null,
  });
  if (error) return { ok: false, error: error.message };
  await refreshCatalog();
  const row = Array.isArray(data) ? data[0] : data;
  return { ok: true, orderId: row.order_id, code: row.order_code, total: row.total };
}

// Cancels (unpaid) or requests cancellation (paid) — see cancel_order() in schema.sql.
// Stock is restored server-side, so refresh the catalog afterwards.
export async function cancelOrder(orderId: string): Promise<CancelResult> {
  const { data, error } = await getSupabase().rpc('cancel_order', { p_order_id: orderId });
  if (error) return { ok: false, error: error.message };
  await refreshCatalog();
  return { ok: true, outcome: data === 'requested' ? 'requested' : 'cancelled' };
}

export type CouponPreview = { ok: true; subtotal: number; discount: number } | { ok: false; error: string };

// Asks the database what a code is worth on this cart (prices recomputed server-side).
export async function previewCoupon(code: string, items: { productId: string; quantity: number }[]): Promise<CouponPreview> {
  const { data, error } = await getSupabase().rpc('preview_coupon', {
    p_code: code.trim(),
    p_items: items.map(i => ({ product_id: i.productId, quantity: i.quantity })),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, subtotal: data.subtotal, discount: data.discount };
}

// Turns a database error from the order/coupon functions into a dictionary key (+ params) for t().
export function describeOrderError(raw: string): { key: DictionaryKey; params?: Record<string, string | number> } {
  if (raw.startsWith('insufficient_stock')) return { key: 'cart.err.stock', params: { name: raw.split(': ')[1] ?? '' } };
  if (raw.startsWith('product_not_found')) return { key: 'cart.err.notFound' };
  if (raw.includes('not_authenticated')) return { key: 'cart.err.auth' };
  if (raw.includes('account_disabled')) return { key: 'cart.err.disabled' };
  if (raw.includes('invalid_payment_method')) return { key: 'cart.err.payment' };
  if (raw.includes('missing_shipping_info')) return { key: 'cart.err.shipping' };
  if (raw.includes('coupon_invalid')) return { key: 'cart.err.couponInvalid' };
  if (raw.includes('coupon_not_started')) return { key: 'cart.err.couponNotStarted' };
  if (raw.includes('coupon_expired')) return { key: 'cart.err.couponExpired' };
  if (raw.includes('coupon_exhausted')) return { key: 'cart.err.couponExhausted' };
  if (raw.startsWith('coupon_min_order')) {
    const min = Number(raw.split(': ')[1]);
    if (!Number.isFinite(min)) return { key: 'cart.err.couponMinAny' };
    return { key: 'cart.err.couponMin', params: { min: min.toLocaleString('vi-VN') + 'đ' } };
  }
  return { key: 'cart.err.generic' };
}
