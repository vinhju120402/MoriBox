'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from './use-auth';
import { refreshCatalog } from './use-product-catalog';

export interface OrderItem {
  productId: string;
  name: string;
  grade: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  code: string;
  date: string; // ISO timestamp
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
}

interface OrderRow {
  id: string;
  code: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  order_items: { product_id: string | null; name: string; grade: string; price: number; quantity: number }[];
}

const fromRow = (r: OrderRow): Order => ({
  id: r.id,
  code: r.code,
  date: r.created_at,
  customerName: r.customer_name,
  customerEmail: r.customer_email,
  subtotal: r.subtotal,
  shippingFee: r.shipping_fee,
  total: r.total,
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
  }, [userId]);

  return { orders: userId ? orders : [] };
}

export interface ShippingInfo {
  name: string;
  phone: string;
  address: string;
  sector: string;
}

export type PlaceOrderResult = { ok: true; code: string; total: number } | { ok: false; error: string };

// Creates the order server-side (prices + stock are checked in the database),
// then refreshes the catalog so every page shows the new stock.
export async function placeOrder(items: { productId: string; quantity: number }[], shipping: ShippingInfo): Promise<PlaceOrderResult> {
  const { data, error } = await getSupabase().rpc('place_order', {
    p_items: items.map(i => ({ product_id: i.productId, quantity: i.quantity })),
    p_shipping: shipping,
  });
  if (error) return { ok: false, error: error.message };
  await refreshCatalog();
  const row = Array.isArray(data) ? data[0] : data;
  return { ok: true, code: row.order_code, total: row.total };
}
