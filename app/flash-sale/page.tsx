'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import Navbar from '../../components/navbar';
import CartDrawer from '../../components/cart-drawer';
import ProductListing from '../../components/product-listing';
import SiteFooter from '../../components/site-footer';
import PromoBanner from '../../components/promo-banner';
import { useGatedCart } from '../../hooks/use-gated-cart';
import { useProductCatalog } from '../../hooks/use-product-catalog';
import { GRADE_CATEGORIES } from '../data/products';

export default function FlashSalePage() {
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


  const flashSaleProducts = products.filter(p => p.salePrice != null);

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
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Flash Sale</span>
          </nav>

          {/* Header banner */}
          <div className="mb-8">
            <PromoBanner
              eyebrow="Ưu đãi có hạn"
              title="Flash Sale"
              subtitle="Giá sốc trong thời gian giới hạn, số lượng có hạn — nhanh tay kẻo lỡ."
              gradient="linear-gradient(120deg, #7f1d1d 0%, #dc2626 55%, #f97316 100%)"
              glowColor="rgba(254,202,202,0.65)"
              images={[
                { src: '/images/exia.png', alt: 'Gundam Exia' },
                { src: '/images/rx782.png', alt: 'RX-78-2 Gundam' },
                { src: '/images/unicorn.png', alt: 'Unicorn Gundam' },
              ]}
              ctaLabel="Xem catalog"
              ctaHref="/#catalog"
            />
          </div>

          <ProductListing
            products={flashSaleProducts}
            likedProducts={likedProducts}
            onToggleLike={toggleLike}
            onQuickAdd={handleQuickAdd}
            onAddToCart={handleAddToCart}
            defaultSort="discount"
            countLabel={(shown, total) => (shown === total ? `${total} mô hình đang giảm giá` : `${shown} / ${total} mô hình đang giảm giá`)}
            emptyTitle="Hiện chưa có chương trình giảm giá"
            emptyHint="Hãy quay lại sớm, các ưu đãi mới luôn được cập nhật."
          />
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
