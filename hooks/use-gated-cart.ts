'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useCart } from './use-cart';
import { useAuth } from './use-auth';
import { Product } from '../app/data/products';

// Wraps useCart so that adding to cart / buying requires a logged-in
// session — redirects to the login page (with a return path) otherwise.
// Browsing, liking, and viewing the cart itself stay ungated.
export function useGatedCart() {
  const cart = useCart();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const requireAuth = <T extends (product: Product, quantity?: number) => void>(fn: T) =>
    (product: Product, quantity: number = 1) => {
      if (!auth.isLoggedIn) {
        router.push(`/dang-nhap?redirect=${encodeURIComponent(pathname)}`);
        return;
      }
      fn(product, quantity);
    };

  return {
    ...cart,
    ...auth,
    handleAddToCart: requireAuth(cart.handleAddToCart),
    handleQuickAdd: requireAuth(cart.handleQuickAdd),
  };
}
