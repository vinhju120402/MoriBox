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
import { useLanguage } from '../../hooks/use-language';
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
  const { t } = useLanguage();


  const bestSellers = products.filter(p => p.isBestSeller);

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
            <Link href="/" className="link-fade">{t('common.home')}</Link>
            <ChevronRight size={12} strokeWidth={2} />
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t('nav.bestSellers')}</span>
          </nav>

          {/* Header banner */}
          <div className="mb-8">
            <PromoBanner
              eyebrow={t('home.best.eyebrow')}
              title={t('home.best.title')}
              subtitle={t('home.best.subtitle')}
              gradient="linear-gradient(120deg, #7c2d12 0%, #ea580c 55%, #f59e0b 100%)"
              glowColor="rgba(253,224,71,0.6)"
              images={[
                { src: '/images/unicorn.png', alt: 'Unicorn Gundam' },
                { src: '/images/rx782.png', alt: 'RX-78-2 Gundam' },
                { src: '/images/exia.png', alt: 'Gundam Exia' },
              ]}
              ctaLabel={t('banner.seeCatalog')}
              ctaHref="/#catalog"
            />
          </div>

          <ProductListing
            products={bestSellers}
            likedProducts={likedProducts}
            onToggleLike={toggleLike}
            onQuickAdd={handleQuickAdd}
            onAddToCart={handleAddToCart}
            defaultSort="featured"
            emptyTitle={t('best.emptyTitle')}
            emptyHint={t('catalog.emptyHint')}
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
