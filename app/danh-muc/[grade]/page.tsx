'use client';

import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { ChevronRight, Star, Shield, Cpu, Zap, Rocket, Sparkles, Wrench } from 'lucide-react';
import Navbar from '../../../components/navbar';
import CartDrawer from '../../../components/cart-drawer';
import ProductListing from '../../../components/product-listing';
import GradeBanner from '../../../components/grade-banner';
import SiteFooter from '../../../components/site-footer';
import { useGatedCart } from '../../../hooks/use-gated-cart';
import { useProductCatalog } from '../../../hooks/use-product-catalog';
import { useLanguage } from '../../../hooks/use-language';
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
  const { t } = useLanguage();


  if (!gradeInfo) {
    notFound();
  }

  const gradeProducts = products.filter(p => p.grade === code);

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
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t('nav.categories')}</span>
            <ChevronRight size={12} strokeWidth={2} />
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{gradeInfo.label} ({code})</span>
          </nav>

          {/* Header banner — distinct gradient, glow title, and product portholes per grade */}
          <GradeBanner code={code} icon={GRADE_ICONS[code]} gradeInfo={gradeInfo} products={gradeProducts} />

          <ProductListing
            products={gradeProducts}
            likedProducts={likedProducts}
            onToggleLike={toggleLike}
            onQuickAdd={handleQuickAdd}
            onAddToCart={handleAddToCart}
            defaultSort="featured"
            emptyTitle={t('catalog.emptyGrade')}
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
