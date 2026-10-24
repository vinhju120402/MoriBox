'use client';

import Link from 'next/link';
import { Heart, Plus, ShoppingBag } from 'lucide-react';
import ProductImage from './product-image';
import { Stars } from './star-rating';
import { useProductRatings } from '../hooks/use-product-ratings';
import { useLanguage } from '../hooks/use-language';
import { Product } from '../app/data/products';

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

interface ProductCardProps {
  product: Product;
  isLiked: boolean;
  onToggleLike: (productId: string) => void;
  onQuickAdd: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export default function ProductCard({ product, isLiked, onToggleLike, onQuickAdd, onAddToCart }: ProductCardProps) {
  // `product` already comes from the live catalog (base + admin edits merged),
  // so its `.stock` is the current figure — no separate lookup needed.
  const stock = product.stock;
  const rating = useProductRatings()[product.id];
  const { t } = useLanguage();
  const outOfStock = stock === 0;

  return (
    <div className="card-surface is-interactive flex flex-col" style={{ minHeight: '460px' }}>
      <div className="p-4 flex flex-col flex-1">
        {/* Top row */}
        <div className="flex justify-between items-center mb-3">
          <span className={`badge-grade ${getGradeCls(product.grade)} px-2 py-0.5 text-[10px]`}>
            {product.grade} · {product.scale}
          </span>
          <button
            onClick={() => onToggleLike(product.id)}
            className={`like-btn cursor-pointer p-1 rounded-full${isLiked ? ' is-liked' : ''}`}
            aria-label={isLiked ? t('card.unlike') : t('card.like')}
            title={isLiked ? t('card.unlike') : t('card.like')}
          >
            <Heart size={15} strokeWidth={2} fill={isLiked ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Clickable area — image, meta, title, description, specs */}
        <Link href={`/san-pham/${product.id}`} className="contents cursor-pointer">
          {/* Image */}
          <div className="media-well relative w-full h-44 rounded-2xl overflow-hidden mb-4 flex items-center justify-center p-4">
            {outOfStock && (
              <span
                className="absolute top-2 right-2 z-10 px-2.5 py-1 rounded-full text-[10px] font-bold"
                style={{ background: 'var(--danger)', color: '#fff' }}
              >
                {t('card.outOfStock')}
              </span>
            )}
            {product.salePrice != null && !outOfStock && (
              <span
                className="absolute top-2 left-2 z-10 px-2.5 py-1 rounded-full text-[10px] font-bold"
                style={{ background: '#dc2626', color: '#fff' }}
              >
                -{Math.round((1 - product.salePrice / product.price) * 100)}%
              </span>
            )}
            {product.salePrice == null && product.isNew && !outOfStock && (
              <span
                className="absolute top-2 left-2 z-10 px-2.5 py-1 rounded-full text-[10px] font-bold"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {t('card.new')}
              </span>
            )}
            {product.salePrice == null && product.isBestSeller && !outOfStock && !product.isNew && (
              <span
                className="absolute top-2 left-2 z-10 px-2.5 py-1 rounded-full text-[10px] font-bold"
                style={{ background: 'var(--text-primary)', color: 'var(--bg-base)' }}
              >
                {t('card.bestSeller')}
              </span>
            )}
            <ProductImage
              src={product.image}
              alt={product.name}
              imgClassName="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
              iconSize={26}
            />
          </div>

          {/* Meta */}
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            {product.series}
          </p>
          <h4 className="text-sm font-semibold mt-1 line-clamp-1" style={{ color: 'var(--text-primary)' }}>
            {product.name}
          </h4>
          {rating && rating.count > 0 && (
            <p className="flex items-center gap-1.5 mt-1">
              <Stars value={rating.avg} size={11} />
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{rating.avg.toFixed(1)} ({rating.count})</span>
            </p>
          )}
          <p className="text-xs mt-1.5 line-clamp-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {product.description}
          </p>

          {/* Spec chips */}
          <div className="mt-3 flex flex-wrap gap-1">
            {[
              `${product.specs.height}`,
              t('card.parts', { n: product.specs.partsCount }),
              product.specs.difficulty,
            ].map(chip => (
              <span
                key={chip}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                {chip}
              </span>
            ))}
          </div>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Price + Actions */}
        <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t('card.price')}</span>
            {product.salePrice != null ? (
              <span className="flex items-baseline gap-1.5">
                <span className="text-[11px] font-medium line-through" style={{ color: 'var(--text-muted)' }}>
                  {product.price.toLocaleString('vi-VN')}đ
                </span>
                <span className="text-base font-bold font-display" style={{ color: '#dc2626' }}>
                  {product.salePrice.toLocaleString('vi-VN')}đ
                </span>
              </span>
            ) : (
              <span className="text-base font-bold font-display" style={{ color: 'var(--accent)' }}>
                {product.price.toLocaleString('vi-VN')}đ
              </span>
            )}
          </div>

          <p
            className="text-[10px] font-medium mb-3"
            style={{ color: outOfStock || stock <= 5 ? 'var(--danger)' : 'var(--text-muted)' }}
          >
            {outOfStock ? t('card.outOfStock') : t('card.inStock', { n: stock })}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onQuickAdd(product)}
              disabled={outOfStock}
              className="btn-outline py-2 px-2 text-[11px] font-semibold cursor-pointer flex items-center justify-center gap-1"
              title={outOfStock ? t('card.soldOutTitle') : t('card.addToCartTitle')}
            >
              <Plus size={12} strokeWidth={2} /> {t('card.addToCart')}
            </button>
            <button
              onClick={() => onAddToCart(product)}
              disabled={outOfStock}
              className="btn-primary py-2 px-2 text-[11px] font-semibold cursor-pointer flex items-center justify-center gap-1"
              title={outOfStock ? t('card.soldOutTitle') : undefined}
            >
              <ShoppingBag size={12} strokeWidth={2} /> {t('card.buyNow')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
