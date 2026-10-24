'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Product } from '@/app/data/products';
import { X, Trash2, ShieldAlert, ArrowRight, CheckCircle2, ChevronRight, ShoppingBag, TicketPercent } from 'lucide-react';
import ProductImage from './product-image';
import { placeOrder, cancelOrder, previewCoupon, describeOrderError } from '../hooks/use-orders';
import { useShopSettings } from '../hooks/use-shop-settings';
import { useAddresses, Address } from '../hooks/use-addresses';
import { useLanguage } from '../hooks/use-language';
import { getPaymentMethods, paymentFullKey, PaymentMethodId, vietQrUrl } from '../lib/payments';
import type { DictionaryKey } from '../app/i18n/dictionary';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
}

/* ── Style helpers ─────────────────────────────────── */
const inputCls = 'w-full px-3 py-2.5 text-xs font-medium transition-all input-field';

const SECTOR_KEY: Record<string, DictionaryKey> = {
  'Hà Nội': 'cart.sector.hanoi',
  'Hồ Chí Minh': 'cart.sector.hcm',
  'Đà Nẵng': 'cart.sector.danang',
  'Khu vực khác': 'cart.sector.other',
};

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}: CartDrawerProps) {
  const { t } = useLanguage();
  const errText = (raw: string) => {
    const { key, params } = describeOrderError(raw);
    return t(key, params);
  };
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'shipping' | 'success'>('cart');
  const [orderCode, setOrderCode] = useState('');
  const [placedTotal, setPlacedTotal] = useState<number | null>(null);
  const [placedOrderId, setPlacedOrderId] = useState('');
  const [cancelled, setCancelled] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [placedMethod, setPlacedMethod] = useState<PaymentMethodId>('cod');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>('cod');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const { settings } = useShopSettings();
  const { addresses, save: saveAddress } = useAddresses();
  const [saveForLater, setSaveForLater] = useState(true);
  const methods = getPaymentMethods(settings);
  // Coupon: `appliedCoupon` is the code that was accepted; `couponDiscount` is
  // what the database says it is worth on the current cart.
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    phone: '',
    address: '',
    sector: 'Hà Nội',
  });

  // Keep the discount in step with the cart (quantities change, items get removed).
  const cartSignature = cartItems.map(i => `${i.product.id}:${i.quantity}`).join('|');
  useEffect(() => {
    if (!appliedCoupon) return;
    let cancelled = false;
    previewCoupon(appliedCoupon, cartItems.map(i => ({ productId: i.product.id, quantity: i.quantity }))).then(r => {
      if (cancelled) return;
      if (r.ok) {
        setCouponDiscount(r.discount);
      } else {
        setAppliedCoupon('');
        setCouponDiscount(0);
        setCouponError(errText(r.error));
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedCoupon, cartSignature]);

  if (!isOpen) return null;

  /* ── Price calculations ─────────────────────────── */
  const getSubtotal = () =>
    cartItems.reduce((acc, item) => {
      const itemPrice = item.product.salePrice ?? item.product.price;
      return acc + itemPrice * item.quantity;
    }, 0);

  const getShippingFee = () => (cartItems.length > 0 ? settings.shippingFee : 0);
  const getTotal = () => getSubtotal() - couponDiscount + getShippingFee();

  /* ── Handlers ───────────────────────────────────── */
  const fillFrom = (a: Address) =>
    setShippingInfo({ name: a.name, phone: a.phone, address: a.address, sector: a.sector });

  // Entering the delivery step: pre-fill the default saved address if the form is still empty.
  const goToShipping = () => {
    const def = addresses.find(a => a.isDefault) ?? addresses[0];
    if (def && !shippingInfo.name && !shippingInfo.phone && !shippingInfo.address) fillFrom(def);
    setCheckoutStep('shipping');
  };

  const isSavedAddress = addresses.some(a => a.name === shippingInfo.name && a.phone === shippingInfo.phone && a.address === shippingInfo.address);

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponError('');
    setCouponBusy(true);
    const r = await previewCoupon(code, cartItems.map(i => ({ productId: i.product.id, quantity: i.quantity })));
    setCouponBusy(false);
    if (!r.ok) {
      setCouponError(r.error.includes('not_authenticated') ? t('cart.err.couponLogin') : errText(r.error));
      return;
    }
    setAppliedCoupon(code);
    setCouponDiscount(r.discount);
    setCouponInput('');
  };

  const removeCoupon = () => {
    setAppliedCoupon('');
    setCouponDiscount(0);
    setCouponError('');
  };

  // Prices and stock are verified in the database (place_order), not trusted from here.
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!shippingInfo.name.trim() || !shippingInfo.phone.trim() || !shippingInfo.address.trim()) {
      setSubmitError(t('cart.err.shipping'));
      return;
    }
    setSubmitting(true);
    const result = await placeOrder(
      cartItems.map(item => ({ productId: item.product.id, quantity: item.quantity })),
      shippingInfo,
      paymentMethod,
      appliedCoupon,
    );
    setSubmitting(false);
    if (!result.ok) {
      setSubmitError(errText(result.error));
      return;
    }
    setOrderCode(result.code);
    setPlacedTotal(result.total);
    setPlacedOrderId(result.orderId);
    setCancelled(false);
    setCancelError('');
    setPlacedMethod(paymentMethod);
    // Remember a new address for next time (silently; the order itself already succeeded).
    if (saveForLater && !isSavedAddress) {
      void saveAddress({ label: '', name: shippingInfo.name, phone: shippingInfo.phone, address: shippingInfo.address, sector: shippingInfo.sector, isDefault: false });
    }
    setCheckoutStep('success');
  };

  // Customer changed their mind right after ordering (e.g. QR shown, not paid yet).
  const handleCancelOrder = async () => {
    if (!window.confirm(t('cart.confirmCancel'))) return;
    setCancelError('');
    setCancelling(true);
    const result = await cancelOrder(placedOrderId);
    setCancelling(false);
    if (!result.ok) {
      setCancelError(t('cart.err.cancel'));
      return;
    }
    setCancelled(true);
  };

  const handleFinish = () => {
    onClearCart();
    removeCoupon();
    setCancelled(false);
    setPlacedTotal(null);
    setCheckoutStep('cart');
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 overflow-hidden"
        style={{ background: 'rgba(20,22,26,0.5)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      >
        {/* Drawer panel */}
        <div className="absolute inset-y-0 right-0 max-w-full flex">
          <div
            className="card-surface w-screen max-w-md flex flex-col"
            style={{ borderRadius: 0 }}
          >
            {/* ── Header ──────────────────────────────── */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-center gap-2.5">
                <ShoppingBag size={16} strokeWidth={2} style={{ color: 'var(--accent)' }} />
                <h2 className="text-sm font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                  {checkoutStep === 'cart' && t('cart.title')}
                  {checkoutStep === 'shipping' && t('cart.shippingTitle')}
                  {checkoutStep === 'success' && t('cart.successTitle')}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="btn-ghost p-1.5 cursor-pointer"
                aria-label={t('cart.close')}
                title={t('cart.close')}
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            {/* ── Step Indicator ───────────────────────── */}
            <div
              className="flex text-[11px] font-semibold"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              {(['cart', 'shipping', 'success'] as const).map((step, i) => {
                const labels = [t('cart.step1'), t('cart.step2'), t('cart.step3')];
                const isActive = checkoutStep === step;
                return (
                  <div
                    key={step}
                    className={`step-tab flex-1 py-3 text-center${isActive ? ' active' : ''}`}
                  >
                    {labels[i]}
                  </div>
                );
              })}
            </div>

            {/* ── Scrollable content ───────────────────── */}
            <div className="flex-1 overflow-y-auto p-5">

              {/* ===== STEP 1: CART ===== */}
              {checkoutStep === 'cart' && (
                <>
                  {cartItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}
                      >
                        <ShoppingBag size={28} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {t('cart.empty')}
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        {t('cart.emptyHint')}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {cartItems.map((item, index) => {
                        return (
                          <div
                            key={index}
                            className="flex gap-3 py-4"
                            style={{ borderBottom: '1px solid var(--border-subtle)' }}
                          >
                            {/* Product image */}
                            <div
                              className="w-16 h-16 rounded-2xl flex-shrink-0 relative overflow-hidden p-2"
                              style={{ background: 'var(--bg-base)' }}
                            >
                              <ProductImage
                                src={item.product.image}
                                alt={item.product.name}
                                imgClassName="object-contain"
                                iconSize={16}
                                compact
                                sizes="64px"
                              />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              {/* Name & grade */}
                              <div className="flex items-start justify-between gap-1">
                                <div>
                                  <h3
                                    className="text-xs font-semibold line-clamp-1"
                                    style={{ color: 'var(--text-primary)' }}
                                  >
                                    {item.product.name}
                                  </h3>
                                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                    {item.product.grade} · {item.product.scale}
                                  </p>
                                </div>
                                <button
                                  onClick={() => onRemoveItem(index)}
                                  className="trash-btn p-1 cursor-pointer flex-shrink-0"
                                  title={t('cart.removeItem')}
                                  aria-label={t('cart.removeItem')}
                                >
                                  <Trash2 size={13} strokeWidth={2} />
                                </button>
                              </div>

                              {/* Qty & price */}
                              <div className="flex items-center justify-between mt-2.5">
                                {/* Qty controls */}
                                <div
                                  className="flex items-center rounded-full overflow-hidden"
                                  style={{ border: '1px solid var(--border-subtle)' }}
                                >
                                  <button
                                    onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                                    className="qty-btn px-2.5 py-1 text-xs font-bold cursor-pointer"
                                    aria-label={t('cart.decrease')}
                                  >
                                    −
                                  </button>
                                  <span
                                    className="w-7 text-center text-xs font-bold"
                                    style={{ color: 'var(--text-primary)' }}
                                  >
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                                    disabled={item.quantity >= item.product.stock}
                                    className="qty-btn px-2.5 py-1 text-xs font-bold cursor-pointer"
                                    aria-label={t('cart.increase')}
                                  >
                                    +
                                  </button>
                                </div>
                                {/* Line price */}
                                <span className="text-xs font-bold font-display" style={{ color: 'var(--accent)' }}>
                                  {((item.product.salePrice ?? item.product.price) * item.quantity).toLocaleString('vi-VN')}đ
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* ===== STEP 2: SHIPPING ===== */}
              {checkoutStep === 'shipping' && (
                <form onSubmit={handleCheckoutSubmit} className="flex flex-col gap-4">
                  {/* Info notice */}
                  <div
                    className="flex items-start gap-2.5 p-3 rounded-2xl text-xs"
                    style={{
                      background: 'var(--accent-dim)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <ShieldAlert size={15} strokeWidth={2} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
                    <span>{t('cart.notice')}</span>
                  </div>

                  {addresses.length > 0 && (
                    <fieldset className="flex flex-col gap-2">
                      <legend className="flex w-full items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{t('cart.pickAddress')}</span>
                        <Link href="/cai-dat#addresses" onClick={onClose} className="text-[11px] font-semibold" style={{ color: 'var(--accent)' }}>
                          {t('cart.manageAddresses')}
                        </Link>
                      </legend>
                      <div className="max-h-64 overflow-y-auto flex flex-col gap-2 pr-1">
                        {addresses.map(a => {
                          const selected = a.name === shippingInfo.name && a.phone === shippingInfo.phone && a.address === shippingInfo.address;
                          return (
                            <label
                              key={a.id}
                              className="flex items-start gap-3 p-3 rounded-2xl cursor-pointer"
                              style={{
                                border: `1px solid ${selected ? 'var(--accent)' : 'var(--border-subtle)'}`,
                                background: selected ? 'var(--accent-dim)' : 'transparent',
                              }}
                            >
                              <input
                                type="radio"
                                name="saved-address"
                                checked={selected}
                                onChange={() => fillFrom(a)}
                                className="mt-0.5 accent-[var(--accent)]"
                              />
                              <span className="flex-1 min-w-0">
                                <span className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                                  {a.label || a.name}
                                  {a.isDefault && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>{t('cart.default')}</span>
                                  )}
                                </span>
                                <span className="block text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{a.name} · {a.phone}</span>
                                <span className="block text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{a.address}, {a.sector}</span>
                              </span>
                            </label>
                          );
                        })}
                        <label
                          className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer"
                          style={{
                            border: `1px dashed ${isSavedAddress ? 'var(--border-strong)' : 'var(--accent)'}`,
                            background: isSavedAddress ? 'transparent' : 'var(--accent-dim)',
                          }}
                        >
                          <input
                            type="radio"
                            name="saved-address"
                            checked={!isSavedAddress}
                            onChange={() => setShippingInfo({ name: '', phone: '', address: '', sector: 'Hà Nội' })}
                            className="accent-[var(--accent)]"
                          />
                          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{t('cart.newAddress')}</span>
                        </label>
                      </div>
                    </fieldset>
                  )}

                  {/* Fields */}
                  <div className="flex flex-col gap-3">
                    {[
                      { label: t('cart.fieldName'), type: 'text', key: 'name', placeholder: t('cart.fieldNamePh') },
                      { label: t('cart.fieldPhone'), type: 'tel', key: 'phone', placeholder: '0901234567' },
                    ].map(({ label, type, key, placeholder }) => (
                      <div key={key}>
                        <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                          {label}
                        </label>
                        <input
                          type={type}
                          required
                          placeholder={placeholder}
                          value={shippingInfo[key as keyof typeof shippingInfo]}
                          onChange={(e) => setShippingInfo({ ...shippingInfo, [key]: e.target.value })}
                          className={inputCls}
                        />
                      </div>
                    ))}

                    <div>
                      <label htmlFor="sector-select" className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        {t('cart.sector')}
                      </label>
                      <select
                        id="sector-select"
                        title={t('cart.sectorTitle')}
                        value={shippingInfo.sector}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, sector: e.target.value })}
                        className={inputCls + ' cursor-pointer'}
                      >
                        <option value="Hà Nội">{t('cart.sector.hanoi')}</option>
                        <option value="Hồ Chí Minh">{t('cart.sector.hcm')}</option>
                        <option value="Đà Nẵng">{t('cart.sector.danang')}</option>
                        <option value="Khu vực khác">{t('cart.sector.other')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        {t('cart.fieldAddress')}
                      </label>
                      <textarea
                        required
                        rows={3}
                        placeholder={t('cart.fieldAddressPh')}
                        value={shippingInfo.address}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                        className={inputCls + ' resize-none'}
                      />
                    </div>
                  </div>

                  {!isSavedAddress && shippingInfo.address.trim() && (
                    <label className="flex items-center gap-2 text-[11px] font-semibold cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                      <input type="checkbox" checked={saveForLater} onChange={(e) => setSaveForLater(e.target.checked)} className="cursor-pointer" />
                      {t('cart.saveAddress')}
                    </label>
                  )}

                  {/* Payment method */}
                  <fieldset className="flex flex-col gap-2">
                    <legend className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      {t('cart.payment')}
                    </legend>
                    {methods.map(m => {
                      const selected = paymentMethod === m.id;
                      return (
                        <label
                          key={m.id}
                          className={`flex items-start gap-3 p-3 rounded-2xl ${m.available ? 'cursor-pointer' : 'cursor-not-allowed opacity-55'}`}
                          style={{
                            border: `1px solid ${selected ? 'var(--accent)' : 'var(--border-subtle)'}`,
                            background: selected ? 'var(--accent-dim)' : 'transparent',
                          }}
                        >
                          <input
                            type="radio"
                            name="payment-method"
                            value={m.id}
                            checked={selected}
                            disabled={!m.available}
                            onChange={() => setPaymentMethod(m.id)}
                            className="mt-0.5 accent-[var(--accent)]"
                          />
                          <span className="flex-1">
                            <span className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                              {t(m.labelKey)}
                              {!m.available && (
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: 'var(--bg-base)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                                  {t('cart.comingSoon')}
                                </span>
                              )}
                            </span>
                            <span className="block text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t(m.descriptionKey)}</span>
                          </span>
                        </label>
                      );
                    })}
                  </fieldset>

                  {submitError && (
                    <p role="alert" className="text-xs font-medium" style={{ color: 'var(--danger)' }}>{submitError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary mt-2 w-full py-3 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitting ? t('cart.processing') : <>{t('cart.placeOrder')} <ArrowRight size={14} strokeWidth={2} /></>}
                  </button>
                </form>
              )}

              {/* ===== STEP 3: SUCCESS ===== */}
              {checkoutStep === 'success' && (
                <div className="flex flex-col items-center text-center gap-5 py-6 fade-up">
                  {/* Check icon */}
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center animate-check-pop"
                    style={{ background: 'var(--accent-dim)' }}
                  >
                    <CheckCircle2 size={40} strokeWidth={2} style={{ color: 'var(--accent)' }} />
                  </div>

                  <div>
                    <h3 className="text-base font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                      {cancelled ? t('cart.cancelledTitle') : t('cart.successTitle')}
                    </h3>
                    <p className="text-[11px] mt-1 font-semibold" style={{ color: 'var(--accent)' }}>
                      {t('cart.orderCode', { code: orderCode })}
                    </p>
                  </div>

                  {/* Order summary card */}
                  <div
                    className="w-full text-left p-4 rounded-2xl space-y-2"
                    style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}
                  >
                    <p className="text-[10px] font-bold pb-1.5" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                      {t('cart.details')}
                    </p>
                    {[
                      { k: t('cart.recipient'), v: shippingInfo.name },
                      { k: t('cart.phoneShort'), v: shippingInfo.phone },
                      { k: t('cart.area'), v: SECTOR_KEY[shippingInfo.sector] ? t(SECTOR_KEY[shippingInfo.sector]) : shippingInfo.sector },
                      { k: t('cart.addr'), v: shippingInfo.address },
                      { k: t('cart.paymentShort'), v: t(paymentFullKey(placedMethod)) },
                    ].map(({ k, v }) => (
                      <div key={k} className="flex justify-between text-[11px] gap-2">
                        <span style={{ color: 'var(--text-secondary)' }}>{k}:</span>
                        <span className="font-semibold text-right line-clamp-1" style={{ color: 'var(--text-primary)' }}>{v}</span>
                      </div>
                    ))}
                    <div
                      className="flex justify-between text-xs font-bold pt-2"
                      style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--accent)' }}
                    >
                      <span style={{ color: 'var(--text-secondary)' }}>{t('cart.total')}:</span>
                      <span>{(placedTotal ?? getTotal()).toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>

                  {!cancelled && placedMethod === 'cod' && (
                    <p className="w-full text-left text-[11px] leading-relaxed p-3 rounded-2xl" style={{ background: 'var(--accent-dim)', color: 'var(--text-primary)' }}>
                      {t('cart.codNoteBefore')}<strong>{(placedTotal ?? getTotal()).toLocaleString('vi-VN')}đ</strong>{t('cart.codNoteAfter')}
                    </p>
                  )}

                  {!cancelled && placedMethod === 'bank_transfer' && (
                    <div className="w-full text-left p-4 rounded-2xl space-y-3" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}>
                      <p className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>{t('cart.transferTitle')}</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={vietQrUrl(settings, placedTotal ?? getTotal(), orderCode)}
                        alt={t('cart.qrAlt', { amount: `${(placedTotal ?? getTotal()).toLocaleString('vi-VN')}đ`, code: orderCode })}
                        width={220}
                        height={220}
                        className="mx-auto rounded-xl bg-white"
                      />
                      {[
                        { k: t('cart.bank'), v: settings.bankName || settings.bankBin },
                        { k: t('cart.account'), v: settings.bankAccount },
                        { k: t('cart.accountName'), v: settings.bankAccountName },
                        { k: t('cart.amount'), v: `${(placedTotal ?? getTotal()).toLocaleString('vi-VN')}đ` },
                        { k: t('cart.note'), v: orderCode },
                      ].map(({ k, v }) => (
                        <div key={k} className="flex justify-between text-[11px] gap-2">
                          <span style={{ color: 'var(--text-secondary)' }}>{k}:</span>
                          <span className="font-semibold text-right" style={{ color: 'var(--text-primary)' }}>{v}</span>
                        </div>
                      ))}
                      <p className="text-[10px] leading-relaxed" style={{ color: 'var(--danger)' }}>
                        {t('cart.transferWarn')}
                      </p>
                    </div>
                  )}

                  <p className="text-[11px] leading-relaxed max-w-xs" style={{ color: 'var(--text-secondary)' }}>
                    {cancelled
                      ? t('cart.cancelledMsg')
                      : t('cart.thanks')}
                  </p>

                  {!cancelled && (
                    <div className="w-full">
                      {cancelError && (
                        <p role="alert" className="text-[11px] font-medium mb-2" style={{ color: 'var(--danger)' }}>{cancelError}</p>
                      )}
                      <button
                        onClick={handleCancelOrder}
                        disabled={cancelling}
                        className="w-full py-2.5 text-xs font-semibold rounded-full cursor-pointer disabled:opacity-50"
                        style={{ border: '1px solid var(--danger)', color: 'var(--danger)' }}
                      >
                        {cancelling ? t('cart.cancelling') : t('cart.cancelOrder')}
                      </button>
                    </div>
                  )}

                  <button
                    onClick={handleFinish}
                    className="btn-tinted w-full py-3 font-bold text-xs cursor-pointer"
                  >
                    {t('cart.backToShop')}
                  </button>
                </div>
              )}
            </div>

            {/* ── Footer: price summary + CTA (only on cart step with items) ── */}
            {checkoutStep === 'cart' && cartItems.length > 0 && (
              <div
                className="px-5 py-4"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                {/* Coupon */}
                <div className="mb-4">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--accent-dim)' }}>
                      <span className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                        <TicketPercent size={14} strokeWidth={2} /> {appliedCoupon}
                      </span>
                      <button onClick={removeCoupon} className="text-[11px] font-semibold cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                        {t('cart.removeCoupon')}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={(e) => { e.preventDefault(); void applyCoupon(); }} className="flex gap-2">
                      <input
                        value={couponInput}
                        onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                        placeholder={t('cart.couponPh')}
                        aria-label={t('cart.couponPh')}
                        maxLength={30}
                        className={inputCls + ' flex-1 uppercase'}
                      />
                      <button
                        type="submit"
                        disabled={couponBusy || !couponInput.trim()}
                        className="btn-outline px-4 text-xs font-semibold cursor-pointer"
                      >
                        {couponBusy ? '…' : t('cart.apply')}
                      </button>
                    </form>
                  )}
                  {couponError && <p role="alert" className="text-[11px] font-medium mt-1.5" style={{ color: 'var(--danger)' }}>{couponError}</p>}
                </div>

                <div className="space-y-1.5 mb-4">
                  {[
                    { label: t('cart.subtotal'), value: getSubtotal() },
                    ...(couponDiscount > 0 ? [{ label: t('cart.discount', { code: appliedCoupon }), value: -couponDiscount }] : []),
                    { label: t('cart.shippingFee'), value: getShippingFee() },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-[11px] font-medium">
                      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                      <span style={{ color: value < 0 ? '#16a34a' : 'var(--text-secondary)' }}>{value.toLocaleString('vi-VN')}đ</span>
                    </div>
                  ))}
                  <div
                    className="flex justify-between text-sm font-bold pt-2"
                    style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--accent)' }}
                  >
                    <span style={{ color: 'var(--text-primary)' }}>{t('cart.total')}</span>
                    <span>{getTotal().toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>

                <button
                  onClick={goToShipping}
                  className="btn-primary w-full py-3 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {t('cart.checkout')} <ChevronRight size={14} strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
