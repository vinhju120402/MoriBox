'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from './use-auth';
import { refreshCatalog } from './use-product-catalog';
import { PaymentMethodId, PaymentStatus } from '../lib/payments';

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
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  paymentMethod: PaymentMethodId;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  /** Customer asked to cancel an order they had already paid for. */
  cancelRequested: boolean;
}

interface OrderRow {
  id: string;
  user_id: string | null;
  status: OrderStatus;
  cancel_requested_at: string | null;
  code: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  payment_method: PaymentMethodId;
  payment_status: PaymentStatus;
  order_items: { product_id: string | null; name: string; grade: string; price: number; quantity: number }[];
}

const fromRow = (r: OrderRow): Order => ({
  id: r.id,
  userId: r.user_id,
  status: r.status,
  cancelRequested: !!r.cancel_requested_at,
  code: r.code,
  date: r.created_at,
  customerName: r.customer_name,
  customerEmail: r.customer_email,
  subtotal: r.subtotal,
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

// Orders visible to the signed-in user: an admin sees every order (feeds the
// "Doanh thu" dashboard), a customer only their own — enforced by RLS.
export function useOrders() {
  const { user } = useAuth();
  const userId = user?.id;
  const [orders, setOrders] = useState<Order[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getSupabase()
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!cancelled && data) setOrders((data as OrderRow[]).map(fromRow));
      });
    return () => { cancelled = true; };
  }, [userId, version]);

  // Admin/accountant only (enforced by set_order_payment in the database).
  const setPaymentStatus = async (orderId: string, status: PaymentStatus): Promise<boolean> => {
    const { error } = await getSupabase().rpc('set_order_payment', { p_order_id: orderId, p_status: status });
    if (error) return false;
    setVersion(v => v + 1);
    return true;
  };

  // 'cancelled' = cancelled now; 'requested' = already paid, staff must refund.
  const cancel = async (orderId: string): Promise<CancelResult> => {
    const result = await cancelOrder(orderId);
    if (result.ok) setVersion(v => v + 1);
    return result;
  };

  return { orders: userId ? orders : [], setPaymentStatus, cancel };
}

export interface ShippingInfo {
  name: string;
  phone: string;
  address: string;
  sector: string;
}

export type PlaceOrderResult = { ok: true; orderId: string; code: string; total: number } | { ok: false; error: string };
export type CancelResult = { ok: true; outcome: 'cancelled' | 'requested' } | { ok: false; error: string };

// Creates the order server-side (prices + stock are checked in the database),
// then refreshes the catalog so every page shows the new stock.
export async function placeOrder(
  items: { productId: string; quantity: number }[],
  shipping: ShippingInfo,
  paymentMethod: PaymentMethodId = 'cod',
): Promise<PlaceOrderResult> {
  const { data, error } = await getSupabase().rpc('place_order', {
    p_items: items.map(i => ({ product_id: i.productId, quantity: i.quantity })),
    p_shipping: shipping,
    p_payment_method: paymentMethod,
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
