'use client';

import { useEffect, useState } from 'react';

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

const ORDERS_KEY = 'moribox_orders';

// Real order history, written once at checkout — backs the admin "Doanh thu"
// dashboard so revenue numbers reflect actual completed orders instead of
// fabricated stats.
export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ORDERS_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setOrders(JSON.parse(saved));
    } catch {
      setOrders([]);
    }
    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }, [orders, hasLoaded]);

  const addOrder = (order: Order) => {
    setOrders(prev => [...prev, order]);
  };

  return { orders, addOrder };
}
