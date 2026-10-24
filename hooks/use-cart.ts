'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CartItem } from '../components/cart-drawer';
import { Product } from '../app/data/products';
import { getSupabase } from '../lib/supabase';
import { useAuth } from './use-auth';
import { useProductCatalog } from './use-product-catalog';

const CART_KEY = 'moribox_cart';
const LIKES_KEY = 'moribox_likes';
const MAX_QTY = 99;

const quote = (id: string) => `"${id.replace(/"/g, '\\"')}"`;
const signature = (items: CartItem[], likes: string[]) =>
  JSON.stringify([items.map(i => `${i.product.id}:${i.quantity}`).sort(), [...likes].sort()]);

// Shared cart + liked-products state. It always lives in localStorage (so guests
// and reloads work). While signed in it is also mirrored to the account (tables
// cart_items / wishlist_items), so it follows the customer to another device:
//   • on sign-in the device's cart and the account's cart are merged,
//   • every change is pushed after a short pause,
//   • returning to the tab pulls changes made elsewhere (unless this device has unsent edits),
//   • on sign-out this device's copy is cleared (it stays safe in the account).
export function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [likedProducts, setLikedProducts] = useState<string[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  const { user } = useAuth();
  const { products, hasLoaded: catalogLoaded } = useProductCatalog();
  const userId = user?.id;

  const cartRef = useRef(cartItems);
  const likesRef = useRef(likedProducts);
  const productsRef = useRef(products);
  const dirty = useRef(false);            // unsent local edits
  const applying = useRef(false);         // next state change comes from the server
  const syncedFor = useRef<string | null>(null);
  const syncOff = useRef(false);          // tables missing / offline: stay local-only
  const flushTimer = useRef<number | undefined>(undefined);
  const flushToken = useRef(0);            // lets a push know whether a newer edit arrived meanwhile

  useEffect(() => {
    cartRef.current = cartItems;
    likesRef.current = likedProducts;
    productsRef.current = products;
  });

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (savedCart) setCartItems(JSON.parse(savedCart));
    } catch {
      setCartItems([]);
    }
    try {
      const savedLikes = localStorage.getItem(LIKES_KEY);
      if (savedLikes) setLikedProducts(JSON.parse(savedLikes));
    } catch {
      setLikedProducts([]);
    }
    setHasLoaded(true);
  }, []);

  const push = useCallback(async (uid: string, cart: CartItem[], likes: string[]) => {
    const supabase = getSupabase();
    const now = new Date().toISOString();
    const cartIds = cart.map(i => i.product.id);

    if (cart.length > 0) {
      const { error } = await supabase.from('cart_items').upsert(
        cart.map(i => ({ user_id: uid, product_id: i.product.id, quantity: Math.min(i.quantity, MAX_QTY), updated_at: now })),
        { onConflict: 'user_id,product_id' },
      );
      if (error) { syncOff.current = true; return; }
    }
    const delCart = supabase.from('cart_items').delete().eq('user_id', uid);
    await (cartIds.length ? delCart.not('product_id', 'in', `(${cartIds.map(quote).join(',')})`) : delCart);

    if (likes.length > 0) {
      await supabase.from('wishlist_items').upsert(likes.map(id => ({ user_id: uid, product_id: id })), { onConflict: 'user_id,product_id' });
    }
    const delLikes = supabase.from('wishlist_items').delete().eq('user_id', uid);
    await (likes.length ? delLikes.not('product_id', 'in', `(${likes.map(quote).join(',')})`) : delLikes);
  }, []);

  // Local persistence + (when signed in) a debounced push to the account.
  useEffect(() => {
    if (!hasLoaded) return;
    localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
    localStorage.setItem(LIKES_KEY, JSON.stringify(likedProducts));
    if (applying.current) { applying.current = false; return; }
    if (!userId || syncedFor.current !== userId || syncOff.current) return;
    dirty.current = true;
    window.clearTimeout(flushTimer.current);
    const token = ++flushToken.current;
    flushTimer.current = window.setTimeout(async () => {
      await push(userId, cartRef.current, likesRef.current);
      if (flushToken.current === token) dirty.current = false;
    }, 700);
  }, [cartItems, likedProducts, hasLoaded, userId, push]);

  // Read the account's copy (null if the tables don't exist yet or we are offline).
  const fetchRemote = useCallback(async () => {
    const supabase = getSupabase();
    const [cartRes, likeRes] = await Promise.all([
      supabase.from('cart_items').select('product_id, quantity'),
      supabase.from('wishlist_items').select('product_id'),
    ]);
    if (cartRes.error || likeRes.error) return null;
    return {
      cart: (cartRes.data ?? []) as { product_id: string; quantity: number }[],
      likes: (likeRes.data ?? []).map(r => r.product_id as string),
    };
  }, []);

  // Sign-in: merge this device with the account, then show / push the result.
  // Sign-out: clear this device's copy.
  useEffect(() => {
    if (!userId) {
      if (syncedFor.current) {
        syncedFor.current = null;
        dirty.current = false;
        applying.current = true;
        setCartItems([]);
        setLikedProducts([]);
      }
      return;
    }
    if (!hasLoaded || !catalogLoaded || syncedFor.current === userId) return;
    syncedFor.current = userId;
    syncOff.current = false;

    (async () => {
      const remote = await fetchRemote();
      if (!remote) { syncOff.current = true; return; }
      const byId = new Map(productsRef.current.map(p => [p.id, p]));

      const qty = new Map<string, number>();
      for (const i of cartRef.current) qty.set(i.product.id, i.quantity);
      for (const r of remote.cart) qty.set(r.product_id, Math.max(qty.get(r.product_id) ?? 0, r.quantity));

      const merged: CartItem[] = [];
      for (const [id, q] of qty) {
        const product = byId.get(id);
        if (product && product.stock > 0) merged.push({ product, quantity: Math.min(q, product.stock) });
      }
      const likes = [...new Set([...likesRef.current, ...remote.likes])].filter(id => byId.has(id));

      applying.current = true;
      setCartItems(merged);
      setLikedProducts(likes);
      await push(userId, merged, likes);
    })();
  }, [userId, hasLoaded, catalogLoaded, fetchRemote, push]);

  // Coming back to the tab: pick up changes made on another device.
  useEffect(() => {
    if (!userId) return;
    const pull = async () => {
      if (document.visibilityState === 'hidden' || dirty.current || syncOff.current || syncedFor.current !== userId) return;
      const remote = await fetchRemote();
      if (!remote || dirty.current) return;
      const byId = new Map(productsRef.current.map(p => [p.id, p]));
      const items: CartItem[] = [];
      for (const r of remote.cart) {
        const product = byId.get(r.product_id);
        if (product && product.stock > 0) items.push({ product, quantity: Math.min(r.quantity, product.stock) });
      }
      const likes = remote.likes.filter(id => byId.has(id));
      if (signature(items, likes) === signature(cartRef.current, likesRef.current)) return;
      applying.current = true;
      setCartItems(items);
      setLikedProducts(likes);
    };
    window.addEventListener('focus', pull);
    document.addEventListener('visibilitychange', pull);
    return () => {
      window.removeEventListener('focus', pull);
      document.removeEventListener('visibilitychange', pull);
    };
  }, [userId, fetchRemote]);

  const addProductToCart = (product: Product, quantity: number = 1) => {
    setCartItems(prev => {
      const existingIndex = prev.findIndex(item => item.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity = Math.min(
          updated[existingIndex].quantity + quantity,
          product.stock
        );
        return updated;
      }
      return [...prev, { product, quantity: Math.min(quantity, product.stock) }];
    });
  };

  // "Mua ngay" — adds and opens the cart drawer for fast checkout.
  const handleAddToCart = (product: Product, quantity: number = 1) => {
    addProductToCart(product, quantity);
    setIsCartOpen(true);
  };

  // "Thêm vào giỏ hàng" — adds quietly so the user can keep browsing.
  const handleQuickAdd = (product: Product, quantity: number = 1) => {
    addProductToCart(product, quantity);
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) { handleRemoveItem(index); return; }
    setCartItems(prev => {
      const item = prev[index];
      if (!item) return prev;
      const cappedQuantity = Math.min(quantity, item.product.stock);
      const updated = [...prev];
      updated[index] = { ...item, quantity: cappedQuantity };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearCart = () => setCartItems([]);

  const toggleLike = (productId: string) => {
    setLikedProducts(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  return {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    likedProducts,
    likesLoaded: hasLoaded,
    handleAddToCart,
    handleQuickAdd,
    handleUpdateQuantity,
    handleRemoveItem,
    handleClearCart,
    toggleLike,
  };
}
