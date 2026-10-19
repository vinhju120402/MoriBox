'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import Navbar from '../../components/navbar';
import CartDrawer from '../../components/cart-drawer';
import ProductCard from '../../components/product-card';
import SiteFooter from '../../components/site-footer';
import PromoBanner from '../../components/promo-banner';
import { useGatedCart } from '../../hooks/use-gated-cart';
import { useProductCatalog } from '../../hooks/use-product-catalog';
import { GRADE_CATEGORIES } from '../data/products';

export default function BestSellersPage() {
  const {
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
    isLoggedIn,
    isStaff,
    user,
    logout,
  } = useGatedCart();
  const { products } = useProductCatalog();

  const [sortBy, setSortBy] = useState('featured');

  const bestSellers = products.filter(p => p.isBestSeller);
  const sortedProducts = [...bestSellers].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'difficulty') {
      const w: { [key: string]: number } = { Beginner: 1, Intermediate: 2, Advanced: 3, Expert: 4 };
      return (w[b.specs.difficulty] || 0) - (w[a.specs.difficulty] || 0);
    }
    return 0;
  });

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Navbar
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
        onCartClick={() => setIsCartOpen(true)}
        gradeCategories={GRADE_CATEGORIES}
        isLoggedIn={isLoggedIn}
        isStaff={isStaff}
        userName={user?.name}
        onLogout={logout}
      />

      <div className="lg:pl-72 flex flex-col min-h-screen">
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 w-full">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs mb-6" style={{ color: 'var(--text-secondary)' }} aria-label="Breadcrumb">
            <Link href="/" className="link-fade">Trang chủ</Link>
            <ChevronRight size={12} strokeWidth={2} />
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Hàng bán chạy</span>
          </nav>

          {/* Header banner */}
          <div className="mb-8">
            <PromoBanner
              eyebrow="Sản phẩm bán chạy"
              title="Bán chạy"
              subtitle="Những mẫu được yêu thích và lựa chọn nhiều nhất tại MoriBox."
              gradient="linear-gradient(120deg, #7c2d12 0%, #ea580c 55%, #f59e0b 100%)"
              glowColor="rgba(253,224,71,0.6)"
              images={[
                { src: '/images/unicorn.png', alt: 'Unicorn Gundam' },
                { src: '/images/rx782.png', alt: 'RX-78-2 Gundam' },
                { src: '/images/exia.png', alt: 'Gundam Exia' },
              ]}
              ctaLabel="Xem catalog"
              ctaHref="/#catalog"
            />
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {sortedProducts.length} mô hình
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="sort-select" className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Sắp xếp
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input-field text-xs font-medium px-3 py-2 cursor-pointer"
                title="Sắp xếp sản phẩm"
              >
                <option value="featured">Nổi bật</option>
                <option value="price-asc">Giá tăng dần</option>
                <option value="price-desc">Giá giảm dần</option>
                <option value="difficulty">Độ khó cao nhất</option>
              </select>
            </div>
          </div>

          {/* Grid */}
          {sortedProducts.length === 0 ? (
            <div className="card-surface text-center py-20">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Chưa có sản phẩm bán chạy</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Quay lại sau, MoriBox cập nhật hàng thường xuyên.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {sortedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isLiked={likedProducts.includes(product.id)}
                  onToggleLike={toggleLike}
                  onQuickAdd={handleQuickAdd}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          )}
        </main>

        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cartItems={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
        />

        <SiteFooter />
      </div>
    </div>
  );
}
