'use client';

import Navbar from '../components/navbar';
import CartDrawer from '../components/cart-drawer';
import PromoCarousel from '../components/promo-carousel';
import PromoBanner from '../components/promo-banner';
import ProductCarousel from '../components/product-carousel';
import SiteFooter from '../components/site-footer';
import Onboarding from '../components/onboarding';
import { useGatedCart } from '../hooks/use-gated-cart';
import { useOnboarding } from '../hooks/use-onboarding';
import { useProductCatalog } from '../hooks/use-product-catalog';
import { useLanguage } from '../hooks/use-language';
import { GRADE_CATEGORIES } from './data/products';
import { ShieldCheck, Truck, RotateCcw, Headphones } from 'lucide-react';

export default function Home() {
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
    isAdmin,
    user,
    logout,
  } = useGatedCart();
  const { showOnboarding, completeOnboarding, restartOnboarding } = useOnboarding();
  const { products } = useProductCatalog();
  const { t } = useLanguage();

  const newArrivals = products.filter(p => p.isNew);
  const bestSellers = products.filter(p => p.isBestSeller);

  if (showOnboarding) {
    return <Onboarding onComplete={completeOnboarding} />;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Navbar
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
        onCartClick={() => setIsCartOpen(true)}
        gradeCategories={GRADE_CATEGORIES}
        isLoggedIn={isLoggedIn}
        isAdmin={isAdmin}
        userName={user?.name}
        onLogout={logout}
        onShowIntro={restartOnboarding}
      />

      <div className="lg:pl-72 flex flex-col min-h-screen">

      {/* ── Promo carousel ────────────────────────────────────
          Auto-rotating campaign banner (real features only, no
          fabricated discounts). Pauses on hover and under
          prefers-reduced-motion. */}
      <div className="pt-6 md:pt-8">
        <PromoCarousel />
      </div>

      {/* ── Trust strip ──────────────────────────────────────
          HUD-style status readout — reads like a system check
          rather than a marketing badge row. Only real claims. */}
      <section className="py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-center sm:justify-between gap-y-3">
            {[
              { icon: <ShieldCheck size={16} strokeWidth={2} />, label: t('home.trust.genuine') },
              { icon: <Truck size={16} strokeWidth={2} />, label: t('home.trust.shipping') },
              { icon: <RotateCcw size={16} strokeWidth={2} />, label: t('home.trust.returns') },
              { icon: <Headphones size={16} strokeWidth={2} />, label: t('home.trust.support') },
            ].map(item => (
              <div
                key={item.label}
                className="trust-item flex items-center gap-2 px-4 first:pl-0 last:pr-0 flex-1 justify-center sm:justify-start min-w-[10rem]"
              >
                <span className="status-dot" aria-hidden="true" />
                <span className="text-[10px] font-hud font-bold" style={{ color: '#22c55e' }}>[OK]</span>
                <span style={{ color: 'var(--accent)' }}>{item.icon}</span>
                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Catalog ─────────────────────────────────────────── */}
      <main id="catalog" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12 w-full">
        <div className="space-y-10">
          {/* Mô hình mới về */}
          <div className="reveal">
            <PromoBanner
              eyebrow={t('home.new.eyebrow')}
              title={t('home.new.title')}
              subtitle={t('home.new.subtitle')}
              gradient="linear-gradient(120deg, #4c1d95 0%, #7c3aed 55%, #c026d3 100%)"
              glowColor="rgba(216,180,254,0.6)"
              images={[
                { src: '/images/exia.png', alt: 'Gundam Exia' },
                { src: '/images/unicorn.png', alt: 'Unicorn Gundam' },
                { src: '/images/rx782.png', alt: 'RX-78-2 Gundam' },
              ]}
              ctaLabel={t('home.seeMore')}
              ctaHref="/hang-moi-ve"
            />
            <h3 className="sr-only">{t('home.new.eyebrow')}</h3>
            {newArrivals.length === 0 ? (
              <p className="text-sm mt-6" style={{ color: 'var(--text-secondary)' }}>{t('home.new.empty')}</p>
            ) : (
              <div className="mt-6">
                <ProductCarousel
                  products={newArrivals}
                  likedProducts={likedProducts}
                  onToggleLike={toggleLike}
                  onQuickAdd={handleQuickAdd}
                  onAddToCart={handleAddToCart}
                />
              </div>
            )}
          </div>

          {/* Mô hình bán chạy */}
          <div className="reveal">
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
              ctaLabel={t('home.seeMore')}
              ctaHref="/hang-ban-chay"
            />
            <h3 className="sr-only">{t('home.best.eyebrow')}</h3>
            {bestSellers.length === 0 ? (
              <p className="text-sm mt-6" style={{ color: 'var(--text-secondary)' }}>{t('home.best.empty')}</p>
            ) : (
              <div className="mt-6">
                <ProductCarousel
                  products={bestSellers}
                  likedProducts={likedProducts}
                  onToggleLike={toggleLike}
                  onQuickAdd={handleQuickAdd}
                  onAddToCart={handleAddToCart}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        customerEmail={user?.email}
      />

      <SiteFooter />

      </div>
    </div>
  );
}
