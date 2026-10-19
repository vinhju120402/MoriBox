'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Boxes, Menu, X, User, LogOut, Zap, ShieldCheck, Sparkles, Settings } from 'lucide-react';
import { CategoryLink } from '../app/data/products';
import { useProductCatalog } from '../hooks/use-product-catalog';
import { useLanguage } from '../hooks/use-language';

interface NavbarProps {
  cartCount: number;
  onCartClick: () => void;
  gradeCategories: CategoryLink[];
  isLoggedIn?: boolean;
  /** Any back-office role (admin, warehouse, accountant) — shows the admin-panel link. */
  isStaff?: boolean;
  userName?: string;
  onLogout?: () => void;
  /** Only the homepage passes this — replays the welcome walkthrough. */
  onShowIntro?: () => void;
}

export default function Navbar({
  cartCount,
  onCartClick,
  gradeCategories,
  isLoggedIn = false,
  isStaff = false,
  userName,
  onLogout,
  onShowIntro,
}: NavbarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const { products } = useProductCatalog();
  const { t } = useLanguage();

  const flashSaleCount = products.filter(p => p.salePrice != null).length;
  const newArrivalsCount = products.filter(p => p.isNew).length;
  const bestSellersCount = products.filter(p => p.isBestSeller).length;

  const closeMobile = () => setIsMobileOpen(false);

  const cartBadge = cartCount > 0 ? (
    <span
      className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
      style={{ background: 'var(--accent)', color: '#fff' }}
    >
      {cartCount}
    </span>
  ) : null;

  return (
    <>
      {/* Mobile top bar (sidebar collapses to this below lg) */}
      <header
        className="lg:hidden sticky top-0 z-40 flex items-center justify-between h-14 px-4"
        style={{
          background: 'color-mix(in srgb, var(--bg-surface) 92%, transparent)',
          borderBottom: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <button
          onClick={() => setIsMobileOpen(true)}
          aria-label={t('nav.openMenu')}
          className="btn-ghost p-2 cursor-pointer"
        >
          <Menu size={20} strokeWidth={2} />
        </button>

        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <div
            className="w-7 h-7 flex items-center justify-center rounded-full"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
          >
            <Boxes size={14} strokeWidth={2} />
          </div>
          <span className="text-sm font-bold tracking-tight font-display" style={{ color: 'var(--text-primary)' }}>
            MoriBox
          </span>
        </Link>

        <button
          onClick={onCartClick}
          aria-label={t('nav.cart')}
          className="nav-pill relative p-2 cursor-pointer"
        >
          <ShoppingCart size={17} strokeWidth={2} />
          {cartBadge}
        </button>
      </header>

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30"
          style={{ background: 'rgba(15,17,19,0.4)' }}
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 w-72 flex flex-col transition-transform duration-300 ease-out',
          'lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)' }}
      >
        <div className="hangar-stripe" aria-hidden="true" />
        {/* Logo row */}
        <div
          className="flex items-center justify-between px-5 h-16 shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <Link href="/" className="flex items-center gap-2.5 cursor-pointer">
            <div
              className="w-8 h-8 flex items-center justify-center rounded-full"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
            >
              <Boxes size={16} strokeWidth={2} />
            </div>
            <h1 className="text-base font-bold tracking-tight font-display" style={{ color: 'var(--text-primary)' }}>
              MoriBox
            </h1>
          </Link>
          <button
            onClick={closeMobile}
            aria-label={t('nav.closeMenu')}
            className="lg:hidden btn-ghost p-1.5 cursor-pointer"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Grade list — always visible, no expand/collapse */}
        <nav className="flex-1 overflow-y-auto px-5 py-5 space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide px-1 mb-2" style={{ color: 'var(--text-muted)' }}>
            {t('nav.categories')}
          </p>

          <Link
            href="/flash-sale"
            onClick={closeMobile}
            className={`filter-pill w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold cursor-pointer text-left${pathname === '/flash-sale' ? ' active' : ''}`}
            style={pathname !== '/flash-sale' ? { color: '#dc2626', borderColor: 'rgba(220,38,38,0.3)' } : undefined}
          >
            <span className="flex items-center gap-1.5">
              <Zap size={13} strokeWidth={2} fill="currentColor" />
              {t('nav.flashSale')}
            </span>
            <span className="opacity-60">({flashSaleCount})</span>
          </Link>

          <Link
            href="/hang-moi-ve"
            onClick={closeMobile}
            className={`filter-pill w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold cursor-pointer text-left${pathname === '/hang-moi-ve' ? ' active' : ''}`}
          >
            <span>{t('nav.newArrivals')}</span>
            <span className="opacity-60">({newArrivalsCount})</span>
          </Link>

          <Link
            href="/hang-ban-chay"
            onClick={closeMobile}
            className={`filter-pill w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold cursor-pointer text-left${pathname === '/hang-ban-chay' ? ' active' : ''}`}
          >
            <span>{t('nav.bestSellers')}</span>
            <span className="opacity-60">({bestSellersCount})</span>
          </Link>

          {gradeCategories.map((c) => {
            const code = c.id.slice(6).toUpperCase();
            const href = `/danh-muc/${code.toLowerCase()}`;
            const isActive = pathname === href;
            const count = products.filter(p => p.grade === code).length;
            return (
              <Link
                key={c.id}
                href={href}
                onClick={closeMobile}
                className={`filter-pill w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold cursor-pointer text-left${isActive ? ' active' : ''}`}
              >
                <span>{c.label}</span>
                <span className="opacity-60">({count})</span>
              </Link>
            );
          })}
        </nav>

        {/* Account + Cart */}
        <div className="px-5 py-5 shrink-0 space-y-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {isLoggedIn ? (
            <>
              <div
                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-full"
                style={{ border: '1px solid var(--border-subtle)' }}
              >
                <span className="flex items-center gap-2 text-sm font-semibold line-clamp-1" style={{ color: 'var(--text-primary)' }}>
                  <User size={15} strokeWidth={2} />
                  {userName || t('nav.account')}
                </span>
                <button
                  onClick={onLogout}
                  aria-label={t('nav.logout')}
                  title={t('nav.logout')}
                  className="btn-ghost cursor-pointer p-1"
                >
                  <LogOut size={14} strokeWidth={2} />
                </button>
              </div>
              {isStaff && (
                <Link
                  href="/admin"
                  className="btn-ghost w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold cursor-pointer"
                  style={{ border: '1px solid var(--border-subtle)' }}
                >
                  <ShieldCheck size={15} strokeWidth={2} />
                  <span>{t('nav.admin')}</span>
                </Link>
              )}
            </>
          ) : (
            <Link
              href="/dang-nhap"
              className="btn-ghost w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold cursor-pointer"
              style={{ border: '1px solid var(--border-subtle)' }}
            >
              <User size={15} strokeWidth={2} />
              <span>{t('nav.login')}</span>
            </Link>
          )}
          <button
            id="navbar-cart-btn"
            onClick={onCartClick}
            aria-label={t('nav.cart')}
            className="btn-outline relative w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold cursor-pointer"
          >
            <ShoppingCart size={15} strokeWidth={2} />
            <span>{t('nav.cart')}</span>
            {cartBadge}
          </button>
          <Link
            href="/cai-dat"
            onClick={closeMobile}
            className="btn-ghost w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold cursor-pointer"
            style={{ border: '1px solid var(--border-subtle)' }}
          >
            <Settings size={15} strokeWidth={2} />
            <span>{t('nav.settings')}</span>
          </Link>
          {onShowIntro && (
            <button
              onClick={() => { onShowIntro(); closeMobile(); }}
              className="btn-ghost w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold cursor-pointer"
              style={{ border: '1px solid var(--border-subtle)' }}
            >
              <Sparkles size={15} strokeWidth={2} />
              <span>{t('nav.intro')}</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
