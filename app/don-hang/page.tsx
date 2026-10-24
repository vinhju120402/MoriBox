'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, PackageOpen, Check, RotateCcw } from 'lucide-react';
import Navbar from '../../components/navbar';
import CartDrawer from '../../components/cart-drawer';
import SiteFooter from '../../components/site-footer';
import { useGatedCart } from '../../hooks/use-gated-cart';
import { useProductCatalog } from '../../hooks/use-product-catalog';
import { useOrders, Order } from '../../hooks/use-orders';
import { useReturns } from '../../hooks/use-returns';
import OrderReturns from '../../components/order-returns';
import { useLanguage } from '../../hooks/use-language';
import { useShopSettings } from '../../hooks/use-shop-settings';
import { paymentLabelKey, isBankConfigured, vietQrUrl } from '../../lib/payments';
import { GRADE_CATEGORIES } from '../data/products';
import type { DictionaryKey } from '../i18n/dictionary';

const STATUS_KEY: Record<Order['status'], DictionaryKey> = {
  pending: 'ord.status.pending',
  confirmed: 'ord.status.confirmed',
  shipping: 'ord.status.shipping',
  delivered: 'ord.status.delivered',
  cancelled: 'ord.status.cancelled',
};

type TabKey = 'all' | 'waitingPay' | 'shipping' | 'toShip' | 'done' | 'cancelled' | 'refund';

const isOpen = (o: Order) => o.status === 'pending' || o.status === 'confirmed';
// Bank-transfer order still waiting for the customer's money.
const isAwaitingPayment = (o: Order) =>
  isOpen(o) && o.paymentMethod === 'bank_transfer' && o.paymentStatus === 'unpaid';

// Mirrors the Shopee-style tabs using the data we actually have:
//  - Chờ thanh toán : transfer chosen but not paid yet
//  - Chờ giao hàng  : shop is preparing it (COD, or transfer already paid)
//  - Trả hàng/Hoàn tiền : cancellation requested, or money refunded / waiting to be refunded
const TABS: { key: TabKey; labelKey: DictionaryKey; match: (o: Order) => boolean; badge?: boolean; emptyKey: DictionaryKey }[] = [
  { key: 'all', labelKey: 'ord.tab.all', match: () => true, emptyKey: 'ord.empty.all' },
  { key: 'waitingPay', labelKey: 'ord.tab.waitingPay', match: isAwaitingPayment, badge: true, emptyKey: 'ord.empty.waitingPay' },
  { key: 'shipping', labelKey: 'ord.tab.shipping', match: o => o.status === 'shipping', emptyKey: 'ord.empty.shipping' },
  { key: 'toShip', labelKey: 'ord.tab.toShip', match: o => isOpen(o) && !isAwaitingPayment(o), badge: true, emptyKey: 'ord.empty.toShip' },
  { key: 'done', labelKey: 'ord.tab.done', match: o => o.status === 'delivered', emptyKey: 'ord.empty.done' },
  { key: 'cancelled', labelKey: 'ord.tab.cancelled', match: o => o.status === 'cancelled', emptyKey: 'ord.empty.cancelled' },
  {
    key: 'refund',
    labelKey: 'ord.tab.refund',
    match: o => (o.cancelRequested && o.status !== 'cancelled') || o.paymentStatus === 'refunded' || (o.status === 'cancelled' && o.paymentStatus === 'paid'),
    emptyKey: 'ord.empty.refund',
  },
];

const TIMELINE_STEPS: { key: Order['status']; labelKey: DictionaryKey }[] = [
  { key: 'pending', labelKey: 'ord.step.pending' },
  { key: 'confirmed', labelKey: 'ord.step.confirmed' },
  { key: 'shipping', labelKey: 'ord.step.shipping' },
  { key: 'delivered', labelKey: 'ord.step.delivered' },
];

const shortTime = (iso: string, locale: string) =>
  new Date(iso).toLocaleString(locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// Where the order is on its way: placed → packed → shipping → delivered.
// (Only the placing time and the latest change are known, so only those carry a time.)
function OrderTimeline({ order }: { order: Order }) {
  const { t, language } = useLanguage();
  const locale = language === 'en' ? 'en-US' : 'vi-VN';
  if (order.status === 'cancelled') return null;
  const current = TIMELINE_STEPS.findIndex(st => st.key === order.status);
  return (
    <ol className="flex items-start mt-5 mb-1" aria-label={t('ord.timelineLabel')}>
      {TIMELINE_STEPS.map((step, i) => {
        const done = i <= current;
        const when = i === 0 ? order.date : i === current ? order.statusUpdatedAt : null;
        return (
          <li key={step.key} className="relative flex-1 flex flex-col items-center text-center" aria-current={i === current ? 'step' : undefined}>
            {i > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-3 right-1/2 w-full h-0.5"
                style={{ background: i <= current ? 'var(--accent)' : 'var(--border-subtle)' }}
              />
            )}
            <span
              className="relative z-10 w-6 h-6 rounded-full flex items-center justify-center"
              style={{
                background: done ? 'var(--accent)' : 'var(--bg-surface)',
                border: `2px solid ${done ? 'var(--accent)' : 'var(--border-strong)'}`,
                color: '#fff',
              }}
            >
              {done && <Check size={13} strokeWidth={3} />}
            </span>
            <span className="mt-2 text-[10px] sm:text-[11px] font-semibold leading-tight" style={{ color: done ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {t(step.labelKey)}
            </span>
            {when && <span className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{shortTime(when, locale)}</span>}
          </li>
        );
      })}
    </ol>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'neutral' | 'good' | 'warn' | 'bad' }) {
  const colors = {
    neutral: { bg: 'var(--bg-base)', fg: 'var(--text-secondary)' },
    good: { bg: 'rgba(34,197,94,0.15)', fg: '#16a34a' },
    warn: { bg: 'var(--accent-dim)', fg: 'var(--accent)' },
    bad: { bg: 'rgba(220,38,38,0.12)', fg: '#dc2626' },
  }[tone];
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap" style={{ background: colors.bg, color: colors.fg }}>
      {children}
    </span>
  );
}

export default function MyOrdersPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const locale = language === 'en' ? 'en-US' : 'vi-VN';
  const {
    cartItems, isCartOpen, setIsCartOpen, handleQuickAdd, handleUpdateQuantity, handleRemoveItem, handleClearCart,
    isLoggedIn, isStaff, hasLoaded, user, logout,
  } = useGatedCart();
  const { orders, cancel, loadError } = useOrders();
  const returnsApi = useReturns();
  const { products } = useProductCatalog();
  const { settings } = useShopSettings();
  const bankReady = isBankConfigured(settings);
  const [openQr, setOpenQr] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<TabKey>('all');

  useEffect(() => {
    if (hasLoaded && !isLoggedIn) router.replace('/dang-nhap?redirect=/don-hang');
  }, [hasLoaded, isLoggedIn, router]);

  // Staff can read every order; this page is only about the viewer's own.
  const mine = orders.filter(o => o.userId === user?.id);
  const activeTab = TABS.find(x => x.key === tab) ?? TABS[0];
  const hasReturn = (o: Order) => returnsApi.returns.some(r => r.orderId === o.id);
  const visible = mine.filter(o => activeTab.match(o) || (tab === 'refund' && hasReturn(o)));

  // Put the items of an old order back into the cart (current prices, current stock).
  const reorder = (o: Order) => {
    let added = 0;
    const skipped: string[] = [];
    for (const item of o.items) {
      const product = products.find(p => p.id === item.productId);
      if (!product || product.stock <= 0) { skipped.push(item.name); continue; }
      handleQuickAdd(product, Math.min(item.quantity, product.stock));
      added++;
    }
    if (added > 0) setIsCartOpen(true);
    setMessage(
      added === 0
        ? t('ord.reorderNone')
        : skipped.length > 0
          ? t('ord.reorderSkipped', { n: added, list: skipped.join(', ') })
          : t('ord.reorderAdded', { n: added }),
    );
  };

  const handleCancel = async (o: Order) => {
    const paid = o.paymentStatus === 'paid';
    const question = paid
      ? t('ord.confirmCancelPaid', { code: o.code })
      : t('ord.confirmCancel', { code: o.code });
    if (!window.confirm(question)) return;
    const r = await cancel(o.id);
    if (!r.ok) {
      setMessage(t('ord.cancelFail'));
      return;
    }
    setMessage(r.outcome === 'requested' ? t('ord.cancelRequestedMsg') : t('ord.cancelledMsg'));
  };

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
        <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 w-full">
          <nav className="flex items-center gap-1.5 text-xs mb-6" style={{ color: 'var(--text-secondary)' }} aria-label="Breadcrumb">
            <Link href="/" className="link-fade">{t('common.home')}</Link>
            <ChevronRight size={12} strokeWidth={2} />
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t('nav.orders')}</span>
          </nav>

          <h1 className="text-3xl font-black font-display" style={{ color: 'var(--text-primary)' }}>{t('nav.orders')}</h1>

          {message && (
            <p role="status" className="mt-4 p-3 rounded-xl text-xs font-medium" style={{ background: 'var(--accent-dim)', color: 'var(--text-primary)' }}>
              {message}
            </p>
          )}

          <div
            role="tablist"
            aria-label={t('ord.filterLabel')}
            className="mt-6 -mx-4 sm:mx-0 flex overflow-x-auto no-scrollbar sm:rounded-xl"
            style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}
          >
            {TABS.map(x => {
              const active = x.key === tab;
              const count = x.badge ? mine.filter(x.match).length : 0;
              return (
                <button
                  key={x.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(x.key)}
                  className="shrink-0 px-4 py-3.5 text-xs font-semibold cursor-pointer whitespace-nowrap"
                  style={{
                    color: active ? 'var(--accent)' : 'var(--text-primary)',
                    borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                    marginBottom: -1,
                    transition: 'color 0.2s ease, border-color 0.2s ease',
                  }}
                >
                  {t(x.labelKey)}
                  {count > 0 && <span style={{ color: 'var(--accent)' }}> ({count})</span>}
                </button>
              );
            })}
          </div>

          {loadError && (
            <p role="alert" className="mt-4 p-3 rounded-xl text-xs font-medium" style={{ background: 'var(--accent-dim)', color: 'var(--danger)' }}>
              {t('ord.loadError')}
            </p>
          )}

          <div role="tabpanel" className="mt-4 space-y-4">
            {hasLoaded && isLoggedIn && mine.length > 0 && visible.length === 0 && (
              <div className="card-surface text-center py-14 px-4">
                <PackageOpen size={28} strokeWidth={1.8} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t(activeTab.emptyKey)}</p>
              </div>
            )}

            {hasLoaded && isLoggedIn && mine.length === 0 && (
              <div className="card-surface text-center py-16 px-4">
                <PackageOpen size={28} strokeWidth={1.8} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('ord.empty.all')}</p>
                <p className="text-xs mt-2 max-w-sm mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {t('ord.signedInAs')} <strong style={{ color: 'var(--text-primary)' }}>{user?.email}</strong>. {t('ord.otherAccount')}
                  {isStaff ? t('ord.staffNote') : ''}.
                </p>
                <Link href="/" className="btn-primary inline-block mt-4 px-5 py-2.5 text-xs font-semibold">{t('ord.shopNow')}</Link>
              </div>
            )}

            {visible.map(o => {
              const cancelled = o.status === 'cancelled';
              const canCancel = o.status === 'pending' && !cancelled && !o.cancelRequested;
              const needsPayment = !cancelled && o.paymentStatus === 'unpaid' && o.paymentMethod === 'bank_transfer' && bankReady;
              return (
                <article key={o.id} className="card-surface p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>#{o.code}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{new Date(o.date).toLocaleString(locale)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <Badge tone={cancelled ? 'bad' : o.status === 'delivered' ? 'good' : 'warn'}>{t(STATUS_KEY[o.status])}</Badge>
                      <Badge tone="neutral">{t(paymentLabelKey(o.paymentMethod))}</Badge>
                      {cancelled ? (
                        o.paymentStatus === 'paid' ? <Badge tone="warn">{t('ord.refundPending')}</Badge>
                          : o.paymentStatus === 'refunded' ? <Badge tone="good">{t('ord.refunded')}</Badge> : null
                      ) : (
                        <Badge tone={o.paymentStatus === 'paid' ? 'good' : 'warn'}>
                          {o.paymentStatus === 'paid' ? t('ord.paid') : t('ord.unpaid')}
                        </Badge>
                      )}
                      {o.cancelRequested && !cancelled && <Badge tone="bad">{t('ord.cancelRequested')}</Badge>}
                    </div>
                  </div>

                  <OrderTimeline order={o} />

                  <ul className="mt-4 space-y-1.5">
                    {o.items.map((i, idx) => (
                      <li key={`${i.productId}-${idx}`} className="flex justify-between gap-3 text-xs">
                        <span style={{ color: 'var(--text-secondary)' }}>{i.name} × {i.quantity}</span>
                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{(i.price * i.quantity).toLocaleString('vi-VN')}đ</span>
                      </li>
                    ))}
                    {o.discount > 0 && (
                      <li className="flex justify-between gap-3 text-xs">
                        <span style={{ color: 'var(--text-secondary)' }}>{t('ord.discount')}{o.couponCode ? ` (${o.couponCode})` : ''}</span>
                        <span style={{ color: '#16a34a' }}>-{o.discount.toLocaleString('vi-VN')}đ</span>
                      </li>
                    )}
                    <li className="flex justify-between gap-3 text-xs">
                      <span style={{ color: 'var(--text-secondary)' }}>{t('ord.shippingFee')}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{o.shippingFee.toLocaleString('vi-VN')}đ</span>
                    </li>
                    <li className="flex justify-between gap-3 text-sm font-bold pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-primary)' }}>{t('ord.total')}</span>
                      <span style={{ color: 'var(--accent)' }}>{o.total.toLocaleString('vi-VN')}đ</span>
                    </li>
                  </ul>

                  {needsPayment && (
                    <div className="mt-4">
                      <button onClick={() => setOpenQr(openQr === o.id ? null : o.id)} className="btn-tinted px-4 py-2 text-xs font-semibold cursor-pointer">
                        {openQr === o.id ? t('ord.hideQr') : t('ord.showQr')}
                      </button>
                      {openQr === o.id && (
                        <div className="mt-3 p-4 rounded-2xl space-y-2" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={vietQrUrl(settings, o.total, o.code)} alt={t('ord.qrAlt', { amount: `${o.total.toLocaleString('vi-VN')}đ`, code: o.code })} width={200} height={200} className="mx-auto rounded-xl bg-white" />
                          <p className="text-[11px] text-center" style={{ color: 'var(--text-secondary)' }}>
                            {settings.bankName || settings.bankBin} · {settings.bankAccount} · {settings.bankAccountName}
                          </p>
                          <p className="text-[11px] text-center font-semibold" style={{ color: 'var(--danger)' }}>{t('ord.transferNote', { code: o.code })}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {o.paymentStatus === 'refunded' && (
                    <p className="mt-4 p-3 rounded-xl text-xs leading-relaxed" style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--text-primary)' }}>
                      {t('ord.refundedMsg', { amount: `${o.total.toLocaleString('vi-VN')}đ` })}{o.refundNote ? t('ord.refundedNote', { note: o.refundNote }) : ''}
                    </p>
                  )}

                  {(canCancel || o.cancelRequested) && !cancelled && (
                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      {o.cancelRequested ? (
                        <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                          {t('ord.cancelSent')}
                        </p>
                      ) : (
                        <button
                          onClick={() => handleCancel(o)}
                          className="px-4 py-2 text-xs font-semibold rounded-full cursor-pointer"
                          style={{ border: '1px solid var(--danger)', color: 'var(--danger)' }}
                        >
                          {o.paymentStatus === 'paid' ? t('ord.cancelPaid') : t('ord.cancel')}
                        </button>
                      )}
                    </div>
                  )}
                  <OrderReturns order={o} returns={returnsApi.returns} actions={returnsApi} />
                  <div className="mt-4 pt-4 flex justify-end" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <button onClick={() => reorder(o)} className="btn-outline px-4 py-2 text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                      <RotateCcw size={13} strokeWidth={2} /> {t('ord.reorder')}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
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
