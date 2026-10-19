'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from './product-card';
import { Product } from '../app/data/products';

interface ProductCarouselProps {
  products: Product[];
  likedProducts: string[];
  onToggleLike: (productId: string) => void;
  onQuickAdd: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export default function ProductCarousel({
  products,
  likedProducts,
  onToggleLike,
  onQuickAdd,
  onAddToCart,
}: ProductCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = trackRef.current;
    if (!el) return;
    const onResize = () => updateArrows();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updateArrows, products]);

  const scrollByCards = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-carousel-item]');
    const step = card ? card.offsetWidth + 20 : el.clientWidth * 0.8;
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <button
        onClick={() => scrollByCards(-1)}
        disabled={!canScrollLeft}
        aria-label="Xem sản phẩm trước"
        className="hidden sm:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center rounded-full cursor-pointer disabled:opacity-0 disabled:pointer-events-none"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', boxShadow: '0 4px 14px -4px rgba(20,22,26,0.2)', color: 'var(--text-primary)' }}
      >
        <ChevronLeft size={18} strokeWidth={2} />
      </button>

      <div
        ref={trackRef}
        onScroll={updateArrows}
        className="no-scrollbar flex gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1"
      >
        {products.map((product) => (
          <div key={product.id} data-carousel-item className="shrink-0 snap-start w-[78%] sm:w-64 lg:w-72">
            <ProductCard
              product={product}
              isLiked={likedProducts.includes(product.id)}
              onToggleLike={onToggleLike}
              onQuickAdd={onQuickAdd}
              onAddToCart={onAddToCart}
            />
          </div>
        ))}
      </div>

      <button
        onClick={() => scrollByCards(1)}
        disabled={!canScrollRight}
        aria-label="Xem thêm sản phẩm"
        className="hidden sm:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center rounded-full cursor-pointer disabled:opacity-0 disabled:pointer-events-none"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', boxShadow: '0 4px 14px -4px rgba(20,22,26,0.2)', color: 'var(--text-primary)' }}
      >
        <ChevronRight size={18} strokeWidth={2} />
      </button>
    </div>
  );
}
