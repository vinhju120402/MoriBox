'use client';

import { useEffect, useState } from 'react';
import { CartItem } from '../components/cart-drawer';
import { Product } from '../app/data/products';

// Shared cart + liked-products state, backed by localStorage so it stays in
// sync across routes (each page hydrates from the same keys on mount).
export function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [likedProducts, setLikedProducts] = useState<string[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('moribox_cart');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (savedCart) setCartItems(JSON.parse(savedCart));
    } catch {
      setCartItems([]);
    }
    try {
      const savedLikes = localStorage.getItem('moribox_likes');
      if (savedLikes) setLikedProducts(JSON.parse(savedLikes));
    } catch {
      setLikedProducts([]);
    }
    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    localStorage.setItem('moribox_cart', JSON.stringify(cartItems));
  }, [cartItems, hasLoaded]);

  useEffect(() => {
    if (!hasLoaded) return;
    localStorage.setItem('moribox_likes', JSON.stringify(likedProducts));
  }, [likedProducts, hasLoaded]);

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
    handleAddToCart,
    handleQuickAdd,
    handleUpdateQuantity,
    handleRemoveItem,
    handleClearCart,
    toggleLike,
  };
}
