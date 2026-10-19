'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { ChevronRight, ShoppingBag, Plus, Minus, Heart, ShieldCheck, Truck, RotateCcw } from 'lucide-react';
import Navbar from '../../../components/navbar';
import CartDrawer from '../../../components/cart-drawer';
import ProductCard from '../../../components/product-card';
import ProductImage from '../../../components/product-image';
import SiteFooter from '../../../components/site-footer';
import { useGatedCart } from '../../../hooks/use-gated-cart';
import { useProductCatalog } from '../../../hooks/use-product-catalog';
import { GRADE_CATEGORIES } from '../../data/products';

const getGradeCls = (grade: string) => {
  switch (grade) {
    case 'PG': return 'badge-grade-pg';
    case 'MG': return 'badge-grade-mg';
    case 'RG': return 'badge-grade-rg';
    case 'HG': return 'badge-grade-hg';
    case 'EG': return 'badge-grade-eg';
    case 'SD': return 'badge-grade-sd';
    case 'ACC': return 'badge-grade-acc';
    default: return '';
  }
};

const gradeFullName: Record<string, string> = {
  PG: 'Perfect Grade', MG: 'Master Grade', RG: 'Real Grade',
  HG: 'High Grade', EG: 'Entry Grade', SD: 'Super Deformed', ACC: 'Phụ kiện',
};

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const { products, hasLoaded } = useProductCatalog();
  const product = products.find(p => p.id === params.id);

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

  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string | undefined>(product?.image);
  const [activeProductId, setActiveProductId] = useState(product?.id);

  // Reset the selected gallery photo when the route's product changes,
  // adjusted during render per React's guidance instead of in an effect.
  if (product && activeProductId !== product.id) {
    setActiveProductId(product.id);
    setActiveImage(product.image);
  }

  // Wait for the catalog hook to finish reading localStorage before
  // deciding a product doesn't exist — otherwise an admin-added custom
  // product 404s on first render, before it's had a chance to load.
  if (!product) {
    if (hasLoaded) notFound();
    return null;
  }

  const gallery = [product.image, ...(product.images ?? [])].filter(Boolean);
  const stock = product.stock;
  const outOfStock = stock === 0;
  const isLiked = likedProducts.includes(product.id);
  const relatedProducts = products.filter(p => p.id !== product.id && p.series === product.series).slice(0, 4);
  // "Sản phẩm tương tự" — same grade as the current product, not series.
  const similarProducts = products.filter(p => p.id !== product.id && p.grade === product.grade).slice(0, 4);

  const specRows = [
    { k: 'Grade', v: `${gradeFullName[product.grade] ?? product.grade} (${product.grade})` },
    { k: 'Tỷ lệ', v: product.scale },
    { k: 'Series', v: product.series },
    { k: 'Chiều cao', v: product.specs.height },
    { k: 'Số mảnh', v: `${product.specs.partsCount} pcs` },
    { k: 'Độ khó', v: product.specs.difficulty },
  ];

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
      />

      <div className="lg:pl-72 flex flex-col min-h-screen">
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 w-full">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs mb-6" style={{ color: 'var(--text-secondary)' }} aria-label="Breadcrumb">
            <Link href="/" className="link-fade">Trang chủ</Link>
            <ChevronRight size={12} strokeWidth={2} />
            <Link href={`/danh-muc/${product.grade.toLowerCase()}`} className="link-fade">{product.grade} · {product.series}</Link>
            <ChevronRight size={12} strokeWidth={2} />
            <span className="font-semibold line-clamp-1" style={{ color: 'var(--text-primary)' }}>{product.name}</span>
          </nav>

          {/* Product main */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* Image */}
            <div className="lg:col-span-6">
              <div className="media-well relative w-full aspect-square rounded-2xl overflow-hidden flex items-center justify-center p-8" style={{ border: '1px solid var(--border-subtle)' }}>
                {outOfStock && (
                  <span
                    className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-full text-xs font-bold"
                    style={{ background: 'var(--danger)', color: '#fff' }}
                  >
                    Hết hàng
                  </span>
                )}
                {product.isNew && !outOfStock && (
                  <span
                    className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full text-xs font-bold"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    Mới
                  </span>
                )}
                {product.isBestSeller && !outOfStock && !product.isNew && (
                  <span
                    className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full text-xs font-bold"
                    style={{ background: 'var(--text-primary)', color: '#fff' }}
                  >
                    Bán chạy
                  </span>
                )}
                <ProductImage
                  src={activeImage ?? product.image}
                  alt={product.name}
                  imgClassName="object-contain p-8"
                  iconSize={48}
                  sizes="(min-width: 1024px) 600px, 100vw"
                  priority
                />
              </div>

              {gallery.length > 1 && (
                <div className="flex gap-2.5 mt-3">
                  {gallery.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(src)}
                      aria-label={`Xem ảnh ${i + 1}`}
                      className="media-well relative w-16 h-16 shrink-0 rounded-xl overflow-hidden p-1.5 cursor-pointer"
                      style={{ border: (activeImage ?? product.image) === src ? '2px solid var(--accent)' : '1px solid var(--border-subtle)' }}
                    >
                      <ProductImage src={src} alt={`${product.name} - ảnh ${i + 1}`} imgClassName="object-contain" iconSize={14} compact sizes="64px" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info panel */}
            <div className="lg:col-span-6 flex flex-col">
              <div className="flex items-center justify-between gap-3">
                <span className={`badge-grade ${getGradeCls(product.grade)} px-3 py-1 text-xs`}>
                  {product.grade} · {product.scale}
                </span>
                <button
                  onClick={() => toggleLike(product.id)}
                  className={`like-btn cursor-pointer p-1.5 rounded-full${isLiked ? ' is-liked' : ''}`}
                  aria-label={isLiked ? 'Bỏ yêu thích' : 'Yêu thích sản phẩm'}
                  title={isLiked ? 'Bỏ yêu thích' : 'Yêu thích sản phẩm'}
                >
                  <Heart size={18} strokeWidth={2} fill={isLiked ? 'currentColor' : 'none'} />
                </button>
              </div>

              <p className="text-xs font-semibold uppercase tracking-wide mt-4" style={{ color: 'var(--text-muted)' }}>
                {product.series}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-display mt-1" style={{ color: 'var(--text-primary)' }}>
                {product.name}
              </h1>

              <p className="text-sm leading-relaxed mt-4" style={{ color: 'var(--text-secondary)' }}>
                {product.description}
              </p>

              <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Giá bán</span>
                {product.salePrice != null ? (
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className="text-3xl font-bold font-display" style={{ color: '#dc2626' }}>
                      {product.salePrice.toLocaleString('vi-VN')}đ
                    </span>
                    <span className="text-base font-medium line-through" style={{ color: 'var(--text-muted)' }}>
                      {product.price.toLocaleString('vi-VN')}đ
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                      style={{ background: '#dc2626', color: '#fff' }}
                    >
                      -{Math.round((1 - product.salePrice / product.price) * 100)}%
                    </span>
                  </div>
                ) : (
                  <div className="text-3xl font-bold font-display mt-1" style={{ color: 'var(--accent)' }}>
                    {product.price.toLocaleString('vi-VN')}đ
                  </div>
                )}
                <p className="text-xs mt-1" style={{ color: outOfStock ? 'var(--danger)' : 'var(--text-secondary)' }}>
                  {outOfStock ? 'Tạm hết hàng' : `Còn ${stock} sản phẩm`}
                </p>
              </div>

              {/* Quantity + actions */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <div
                  className="flex items-center rounded-full overflow-hidden shrink-0"
                  style={{ border: '1px solid var(--border-strong)' }}
                >
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    disabled={outOfStock || quantity <= 1}
                    className="qty-btn cursor-pointer p-3"
                    aria-label="Giảm số lượng"
                  >
                    <Minus size={14} strokeWidth={2} />
                  </button>
                  <span className="w-10 text-center text-sm font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(q => Math.min(stock, q + 1))}
                    disabled={outOfStock || quantity >= stock}
                    className="qty-btn cursor-pointer p-3"
                    aria-label="Tăng số lượng"
                  >
                    <Plus size={14} strokeWidth={2} />
                  </button>
                </div>

                <button
                  onClick={() => handleQuickAdd(product, quantity)}
                  disabled={outOfStock}
                  className="btn-outline flex-1 py-3 px-4 text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
                >
                  <Plus size={16} strokeWidth={2} /> Thêm vào giỏ
                </button>
                <button
                  onClick={() => handleAddToCart(product, quantity)}
                  disabled={outOfStock}
                  className="btn-primary flex-1 py-3 px-4 text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShoppingBag size={16} strokeWidth={2} /> Mua ngay
                </button>
              </div>

              {/* Trust mini strip */}
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
                {[
                  { icon: <ShieldCheck size={14} strokeWidth={2} />, label: 'Chính hãng Bandai' },
                  { icon: <Truck size={14} strokeWidth={2} />, label: 'Giao hàng toàn quốc' },
                  { icon: <RotateCcw size={14} strokeWidth={2} />, label: 'Đổi trả 7 ngày' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <span style={{ color: 'var(--accent)' }}>{item.icon}</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Specs */}
          <div className="mt-10 md:mt-12">
            <h2 className="text-lg font-bold tracking-tight font-display mb-6" style={{ color: 'var(--text-primary)' }}>
              Thông số kỹ thuật
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {specRows.map(row => (
                <div
                  key={row.k}
                  className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
                >
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{row.k}</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{row.v}</span>
                </div>
              ))}
            </div>

            {product.specs.weaponList.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Phụ kiện đi kèm</p>
                <div className="flex flex-wrap gap-2">
                  {product.specs.weaponList.map(w => (
                    <span
                      key={w}
                      className="px-3 py-1.5 rounded-full text-xs font-medium"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
                    >
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Related products */}
          {relatedProducts.length > 0 && (
            <div className="mt-10 md:mt-12">
              <h2 className="text-lg font-bold tracking-tight font-display mb-6" style={{ color: 'var(--text-primary)' }}>
                Sản phẩm cùng series
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {relatedProducts.map(p => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    isLiked={likedProducts.includes(p.id)}
                    onToggleLike={toggleLike}
                    onQuickAdd={handleQuickAdd}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Similar products (Shopee-style "Có thể bạn cũng thích") */}
          {similarProducts.length > 0 && (
            <div className="mt-10 md:mt-12">
              <h2 className="text-lg font-bold tracking-tight font-display mb-6" style={{ color: 'var(--text-primary)' }}>
                Sản phẩm tương tự
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {similarProducts.map(p => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    isLiked={likedProducts.includes(p.id)}
                    onToggleLike={toggleLike}
                    onQuickAdd={handleQuickAdd}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
            </div>
          )}
        </main>

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
