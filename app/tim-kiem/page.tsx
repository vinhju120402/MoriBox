'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, Search } from 'lucide-react';
import Navbar from '../../components/navbar';
import CartDrawer from '../../components/cart-drawer';
import SiteFooter from '../../components/site-footer';
import ProductListing from '../../components/product-listing';
import { useGatedCart } from '../../hooks/use-gated-cart';
import { useProductCatalog } from '../../hooks/use-product-catalog';
import { matchesQuery, searchRank } from '../../lib/search';
import { GRADE_CATEGORIES } from '../data/products';

function SearchContent() {
  const router = useRouter();
  const params = useSearchParams();
  const q = (params.get('q') ?? '').trim();
  const [text, setText] = useState(q);

  const {
    cartItems, isCartOpen, setIsCartOpen, likedProducts, handleAddToCart, handleQuickAdd, handleUpdateQuantity,
    handleRemoveItem, handleClearCart, toggleLike, isLoggedIn, isStaff, user, logout,
  } = useGatedCart();
  const { products } = useProductCatalog();

  const results = q
    ? products.filter(p => matchesQuery(p, q)).sort((a, b) => searchRank(a, q) - searchRank(b, q))
    : [];
  // With no query yet, offer the best sellers instead of an empty page.
  const suggestions = products.filter(p => p.isBestSeller);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = text.trim();
    router.push(next ? `/tim-kiem?q=${encodeURIComponent(next)}` : '/tim-kiem');
  };

  const listing = (list: typeof products, empty: string, hint: string, label?: (shown: number, total: number) => string) => (
    <ProductListing
      key={q}
      products={list}
      likedProducts={likedProducts}
      onToggleLike={toggleLike}
      onQuickAdd={handleQuickAdd}
      onAddToCart={handleAddToCart}
      countLabel={label}
      emptyTitle={empty}
      emptyHint={hint}
    />
  );

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
          <nav className="flex items-center gap-1.5 text-xs mb-6" style={{ color: 'var(--text-secondary)' }} aria-label="Breadcrumb">
            <Link href="/" className="link-fade">Trang chủ</Link>
            <ChevronRight size={12} strokeWidth={2} />
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Tìm kiếm</span>
          </nav>

          <h1 className="text-3xl font-black font-display mb-5" style={{ color: 'var(--text-primary)' }}>
            {q ? <>Kết quả cho “{q}”</> : 'Tìm kiếm'}
          </h1>

          <form role="search" onSubmit={submit} className="relative max-w-xl mb-8">
            <Search size={16} strokeWidth={2} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            <input
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Tên mô hình, series, cấp độ… (không cần gõ dấu)"
              aria-label="Tìm sản phẩm"
              autoFocus={!q}
              className="input-field w-full pl-11 pr-24 py-3 text-sm rounded-full"
            />
            <button type="submit" className="btn-primary absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-2 text-xs font-semibold cursor-pointer">Tìm</button>
          </form>

          {q ? (
            listing(
              results,
              `Không tìm thấy mô hình nào cho “${q}”`,
              'Thử từ khóa ngắn hơn, đổi cách viết, hoặc xem các danh mục ở thanh bên.',
              (shown, total) => (shown === total ? `${total} kết quả` : `${shown} / ${total} kết quả`),
            )
          ) : (
            <>
              <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Gợi ý cho bạn: sản phẩm bán chạy</h2>
              {listing(suggestions, 'Chưa có gợi ý nào', 'Hãy thử gõ tên một mô hình ở ô tìm kiếm.')}
            </>
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

export default function SearchPage() {
  // useSearchParams needs a Suspense boundary so the page can still be pre-rendered.
  return (
    <Suspense fallback={null}>
      <SearchContent />
    </Suspense>
  );
}
