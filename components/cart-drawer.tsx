'use client';

import React, { useState } from 'react';
import { Product } from '@/app/data/products';
import { X, Trash2, ShieldAlert, ArrowRight, CheckCircle2, ChevronRight, ShoppingBag } from 'lucide-react';
import ProductImage from './product-image';
import { useOrders } from '../hooks/use-orders';
import { useProductCatalog } from '../hooks/use-product-catalog';

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
  /** Attributes the completed order to an account for the admin dashboard. */
  customerEmail?: string;
}

/* ── Style helpers ─────────────────────────────────── */
const inputCls = 'w-full px-3 py-2.5 text-xs font-medium transition-all input-field';

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  customerEmail,
}: CartDrawerProps) {
  const { addOrder } = useOrders();
  const { updateProduct } = useProductCatalog();
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'shipping' | 'success'>('cart');
  const [orderCode] = useState(() => Math.floor(100000 + Math.random() * 900000));
  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    phone: '',
    address: '',
    sector: 'Hà Nội',
  });

  if (!isOpen) return null;

  /* ── Price calculations ─────────────────────────── */
  const getSubtotal = () =>
    cartItems.reduce((acc, item) => {
      const itemPrice = item.product.salePrice ?? item.product.price;
      return acc + itemPrice * item.quantity;
    }, 0);

  const getShippingFee = () => (cartItems.length > 0 ? 30000 : 0);
  const getTotal = () => getSubtotal() + getShippingFee();

  /* ── Handlers ───────────────────────────────────── */
  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address) {
      alert('Vui lòng nhập đầy đủ thông tin giao hàng!');
      return;
    }
    addOrder({
      id: `${Date.now()}-${orderCode}`,
      code: `MS-${orderCode}`,
      date: new Date().toISOString(),
      customerName: shippingInfo.name,
      customerEmail: customerEmail ?? 'khach@vanglai.com',
      items: cartItems.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        grade: item.product.grade,
        price: item.product.salePrice ?? item.product.price,
        quantity: item.quantity,
      })),
      subtotal: getSubtotal(),
      shippingFee: getShippingFee(),
      total: getTotal(),
    });
    cartItems.forEach(item => {
      updateProduct(item.product.id, { stock: Math.max(0, item.product.stock - item.quantity) });
    });
    setCheckoutStep('success');
  };

  const handleFinish = () => {
    onClearCart();
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
                  {checkoutStep === 'cart' && 'Giỏ hàng'}
                  {checkoutStep === 'shipping' && 'Thông tin giao hàng'}
                  {checkoutStep === 'success' && 'Đặt hàng thành công'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="btn-ghost p-1.5 cursor-pointer"
                aria-label="Đóng"
                title="Đóng"
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
                const labels = ['1. Giỏ hàng', '2. Giao hàng', '3. Hoàn tất'];
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
                        Giỏ hàng trống
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        Thêm mô hình vào giỏ để bắt đầu.
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
                                  title="Xóa sản phẩm"
                                  aria-label="Xóa sản phẩm"
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
                                    aria-label="Giảm số lượng"
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
                                    aria-label="Tăng số lượng"
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
                    <span>Xác nhận thông tin giao nhận hàng qua dịch vụ vận chuyển MoriBox Logistics.</span>
                  </div>

                  {/* Fields */}
                  <div className="flex flex-col gap-3">
                    {[
                      { label: 'Họ và tên người nhận *', type: 'text', key: 'name', placeholder: 'Nguyễn Văn A' },
                      { label: 'Số điện thoại *', type: 'tel', key: 'phone', placeholder: '0901234567' },
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
                        Khu vực vận chuyển *
                      </label>
                      <select
                        id="sector-select"
                        title="Khu vực vận chuyển"
                        value={shippingInfo.sector}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, sector: e.target.value })}
                        className={inputCls + ' cursor-pointer'}
                      >
                        <option value="Hà Nội">Hà Nội</option>
                        <option value="Hồ Chí Minh">TP. Hồ Chí Minh</option>
                        <option value="Đà Nẵng">Đà Nẵng</option>
                        <option value="Khu vực khác">Khu vực khác</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        Địa chỉ nhận hàng *
                      </label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Số 12, Đường số 3, Phường 4, Quận 5..."
                        value={shippingInfo.address}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                        className={inputCls + ' resize-none'}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn-primary mt-2 w-full py-3 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Xác nhận đặt hàng <ArrowRight size={14} strokeWidth={2} />
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
                      Đặt hàng thành công
                    </h3>
                    <p className="text-[11px] mt-1 font-semibold" style={{ color: 'var(--accent)' }}>
                      Mã đơn: #MS-{orderCode}
                    </p>
                  </div>

                  {/* Order summary card */}
                  <div
                    className="w-full text-left p-4 rounded-2xl space-y-2"
                    style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}
                  >
                    <p className="text-[10px] font-bold pb-1.5" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                      Chi tiết đơn hàng
                    </p>
                    {[
                      { k: 'Người nhận', v: shippingInfo.name },
                      { k: 'Điện thoại', v: shippingInfo.phone },
                      { k: 'Khu vực', v: shippingInfo.sector },
                      { k: 'Địa chỉ', v: shippingInfo.address },
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
                      <span style={{ color: 'var(--text-secondary)' }}>Tổng cộng:</span>
                      <span>{getTotal().toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>

                  <p className="text-[11px] leading-relaxed max-w-xs" style={{ color: 'var(--text-secondary)' }}>
                    Cảm ơn bạn đã mua sắm tại MoriBox. Đơn hàng đang được xử lý và chuẩn bị linh kiện.
                  </p>

                  <button
                    onClick={handleFinish}
                    className="btn-tinted w-full py-3 font-bold text-xs cursor-pointer"
                  >
                    Quay lại cửa hàng
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
                <div className="space-y-1.5 mb-4">
                  {[
                    { label: 'Tổng tiền hàng', value: getSubtotal() },
                    { label: 'Phí vận chuyển', value: getShippingFee() },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-[11px] font-medium">
                      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{value.toLocaleString('vi-VN')}đ</span>
                    </div>
                  ))}
                  <div
                    className="flex justify-between text-sm font-bold pt-2"
                    style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--accent)' }}
                  >
                    <span style={{ color: 'var(--text-primary)' }}>Tổng cộng</span>
                    <span>{getTotal().toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>

                <button
                  onClick={() => setCheckoutStep('shipping')}
                  className="btn-primary w-full py-3 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  Tiến hành thanh toán <ChevronRight size={14} strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
