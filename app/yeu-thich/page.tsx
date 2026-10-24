'use client';

import Link from 'next/link';
import { ChevronRight, Heart } from 'lucide-react';
import Navbar from '../../components/navbar';
import CartDrawer from '../../components/cart-drawer';
import SiteFooter from '../../components/site-footer';
import ProductListing from '../../components/product-listing';
import { useGatedCart } from '../../hooks/use-gated-cart';
import { useProductCatalog } from '../../hooks/use-product-catalog';
import { GRADE_CATEGORIES } from '../data/products';

export default function WishlistPage() {
  const {
    cartItems, isCartOpen, setIsCartOpen, likedProducts, likesLoaded, handleAddToCart, handleQuickAdd, handleUpdateQuantity,
    handleRemoveItem, handleClearCart, toggleLike, isLoggedIn, isStaff, user, logout,
  } = useGatedCart();
  const { products, hasLoaded } = useProductCatalog();

  const liked = products.filter(p => likedProducts.includes(p.id));
  const ready = likesLoaded && hasLoaded;

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
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Yêu thích</span>
          </nav>

          <h1 className="text-3xl font-black font-display" style={{ color: 'var(--text-primary)' }}>Yêu thích</h1>
          <p className="text-sm mt-1.5 mb-8" style={{ color: 'var(--text-secondary)' }}>
            Những mô hình bạn đã bấm tim. Danh sách được lưu trên trình duyệt này.
          </p>

          {!ready ? null : liked.length === 0 ? (
            <div className="card-surface text-center py-16 px-4">
              <Heart size={28} strokeWidth={1.8} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Bạn chưa thích sản phẩm nào</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Bấm biểu tượng trái tim trên mỗi sản phẩm để lưu lại xem sau.</p>
              <Link href="/" className="btn-primary inline-block mt-5 px-5 py-2.5 text-xs font-semibold">Khám phá sản phẩm</Link>
            </div>
          ) : (
            <ProductListing
              products={liked}
              likedProducts={likedProducts}
              onToggleLike={toggleLike}
              onQuickAdd={handleQuickAdd}
              onAddToCart={handleAddToCart}
              countLabel={(shown, total) => (shown === total ? `${total} sản phẩm yêu thích` : `${shown} / ${total} sản phẩm yêu thích`)}
              emptyTitle="Không còn sản phẩm yêu thích"
            />
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
