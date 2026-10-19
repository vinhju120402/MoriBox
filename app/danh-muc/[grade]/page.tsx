'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { ChevronRight, Star, Shield, Cpu, Zap, Rocket, Sparkles, Wrench } from 'lucide-react';
import Navbar from '../../../components/navbar';
import CartDrawer from '../../../components/cart-drawer';
import ProductCard from '../../../components/product-card';
import GradeBanner from '../../../components/grade-banner';
import SiteFooter from '../../../components/site-footer';
import { useGatedCart } from '../../../hooks/use-gated-cart';
import { useProductCatalog } from '../../../hooks/use-product-catalog';
import { GRADE_CATEGORIES, GRADE_INFO, GradeCode } from '../../data/products';

const GRADE_ICONS: Record<GradeCode, React.ReactNode> = {
  PG: <Star size={13} strokeWidth={2} />,
  MG: <Shield size={13} strokeWidth={2} />,
  RG: <Cpu size={13} strokeWidth={2} />,
  HG: <Zap size={13} strokeWidth={2} />,
  EG: <Rocket size={13} strokeWidth={2} />,
  SD: <Sparkles size={13} strokeWidth={2} />,
  ACC: <Wrench size={13} strokeWidth={2} />,
};

export default function GradeCategoryPage() {
  const params = useParams<{ grade: string }>();
  const code = params.grade?.toUpperCase() as GradeCode;
  const gradeInfo = GRADE_INFO.find(g => g.code === code);

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

  if (!gradeInfo) {
    notFound();
  }

  const gradeProducts = products.filter(p => p.grade === code);
  const sortedProducts = [...gradeProducts].sort((a, b) => {
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
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Danh mục</span>
            <ChevronRight size={12} strokeWidth={2} />
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{gradeInfo.label} ({code})</span>
          </nav>

          {/* Header banner — distinct gradient, glow title, and product portholes per grade */}
          <GradeBanner code={code} icon={GRADE_ICONS[code]} gradeInfo={gradeInfo} products={gradeProducts} />

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
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Chưa có mô hình nào ở cấp độ này</p>
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
