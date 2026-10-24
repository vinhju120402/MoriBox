'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import Navbar from '../../components/navbar';
import CartDrawer from '../../components/cart-drawer';
import SiteFooter from '../../components/site-footer';
import ProductListing from '../../components/product-listing';
import SearchBox from '../../components/search-box';
import { useGatedCart } from '../../hooks/use-gated-cart';
import { useProductCatalog } from '../../hooks/use-product-catalog';
import { useLanguage } from '../../hooks/use-language';
import { matchesQuery, searchRank } from '../../lib/search';
import { GRADE_CATEGORIES } from '../data/products';

function SearchContent() {
  const params = useSearchParams();
  const q = (params.get('q') ?? '').trim();

  const {
    cartItems, isCartOpen, setIsCartOpen, likedProducts, handleAddToCart, handleQuickAdd, handleUpdateQuantity,
    handleRemoveItem, handleClearCart, toggleLike, isLoggedIn, isStaff, user, logout,
  } = useGatedCart();
  const { products } = useProductCatalog();
  const { t } = useLanguage();

  const results = q
    ? products.filter(p => matchesQuery(p, q)).sort((a, b) => searchRank(a, q) - searchRank(b, q))
    : [];
  // With no query yet, offer the best sellers instead of an empty page.
  const suggestions = products.filter(p => p.isBestSeller);


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
            <Link href="/" className="link-fade">{t('common.home')}</Link>
            <ChevronRight size={12} strokeWidth={2} />
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t('nav.search')}</span>
          </nav>

          <h1 className="text-3xl font-black font-display mb-5" style={{ color: 'var(--text-primary)' }}>
            {q ? t('search.resultsFor', { q }) : t('nav.search')}
          </h1>

          <div className="max-w-xl mb-8">
            <SearchBox key={q} variant="page" initialValue={q} autoFocus={!q} />
          </div>

          {q ? (
            listing(
              results,
              t('search.noResults', { q }),
              t('search.noResultsHint'),
              (shown, total) => (shown === total ? t('search.count', { n: total }) : t('search.countFiltered', { shown, total })),
            )
          ) : (
            <>
              <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('search.suggestHeading')}</h2>
              {listing(suggestions, t('search.noSuggest'), t('search.tryTyping'))}
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
