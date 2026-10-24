'use client';

import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import ProductCard from './product-card';
import Pagination, { paginate } from './pagination';
import { useProductRatings } from '../hooks/use-product-ratings';
import { Product } from '../app/data/products';

export type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'discount' | 'rating' | 'difficulty';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'featured', label: 'Nổi bật' },
  { value: 'price-asc', label: 'Giá tăng dần' },
  { value: 'price-desc', label: 'Giá giảm dần' },
  { value: 'discount', label: 'Giảm giá nhiều nhất' },
  { value: 'rating', label: 'Đánh giá cao nhất' },
  { value: 'difficulty', label: 'Độ khó cao nhất' },
];

const PRICE_BANDS: { value: string; label: string; min: number; max: number }[] = [
  { value: 'all', label: 'Mọi mức giá', min: 0, max: Infinity },
  { value: 'lt500', label: 'Dưới 500.000đ', min: 0, max: 500_000 },
  { value: '500-1m', label: '500.000đ – 1 triệu', min: 500_000, max: 1_000_000 },
  { value: '1m-2m', label: '1 – 2 triệu', min: 1_000_000, max: 2_000_000 },
  { value: 'gt2m', label: 'Trên 2 triệu', min: 2_000_000, max: Infinity },
];

const PAGE_SIZE = 24;
const DIFFICULTY_WEIGHT: Record<string, number> = { Beginner: 1, Intermediate: 2, Advanced: 3, Expert: 4 };
const effectivePrice = (p: Product) => p.salePrice ?? p.price;

interface ProductListingProps {
  products: Product[];
  likedProducts: string[];
  onToggleLike: (productId: string) => void;
  onQuickAdd: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  defaultSort?: SortKey;
  /** Text shown before the sort box, e.g. "12 mô hình đang giảm giá". */
  countLabel?: (shown: number, total: number) => string;
  emptyTitle: string;
  emptyHint?: string;
}

// Shared grid for every product list on the storefront: filters (price, series,
// in stock, on sale), sorting, and paging — so all list pages behave the same.
export default function ProductListing({
  products, likedProducts, onToggleLike, onQuickAdd, onAddToCart,
  defaultSort = 'featured',
  countLabel = (shown, total) => (shown === total ? `${total} mô hình` : `${shown} / ${total} mô hình`),
  emptyTitle, emptyHint,
}: ProductListingProps) {
  const ratings = useProductRatings();
  const [sort, setSort] = useState<SortKey>(defaultSort);
  const [band, setBand] = useState('all');
  const [series, setSeries] = useState('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [page, setPage] = useState(1);

  const seriesOptions = [...new Set(products.map(p => p.series).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
  const priceBand = PRICE_BANDS.find(b => b.value === band) ?? PRICE_BANDS[0];
  const filtersActive = band !== 'all' || series !== 'all' || inStockOnly || onSaleOnly;

  const filtered = products
    .filter(p => {
      const price = effectivePrice(p);
      return price >= priceBand.min && price < priceBand.max &&
        (series === 'all' || p.series === series) &&
        (!inStockOnly || p.stock > 0) &&
        (!onSaleOnly || p.salePrice != null);
    })
    .sort((a, b) => {
      switch (sort) {
        case 'price-asc': return effectivePrice(a) - effectivePrice(b);
        case 'price-desc': return effectivePrice(b) - effectivePrice(a);
        case 'discount': return (1 - effectivePrice(b) / b.price) - (1 - effectivePrice(a) / a.price);
        case 'rating': return (ratings[b.id]?.avg ?? 0) - (ratings[a.id]?.avg ?? 0) || (ratings[b.id]?.count ?? 0) - (ratings[a.id]?.count ?? 0);
        case 'difficulty': return (DIFFICULTY_WEIGHT[b.specs.difficulty] || 0) - (DIFFICULTY_WEIGHT[a.specs.difficulty] || 0);
        default: return 0;
      }
    });

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const reset = () => { setBand('all'); setSeries('all'); setInStockOnly(false); setOnSaleOnly(false); setPage(1); };
  const change = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1); };

  return (
    <section aria-label="Danh sách sản phẩm">
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }} role="status">
            {countLabel(filtered.length, products.length)}
          </p>
          <label className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Sắp xếp
            <select value={sort} onChange={(e) => change(setSort)(e.target.value as SortKey)} className="input-field text-xs font-medium px-3 py-2 cursor-pointer">
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Bộ lọc sản phẩm">
          <span className="flex items-center gap-1.5 text-xs font-semibold mr-1" style={{ color: 'var(--text-secondary)' }}>
            <SlidersHorizontal size={13} strokeWidth={2} aria-hidden="true" /> Lọc
          </span>
          <select aria-label="Khoảng giá" value={band} onChange={(e) => change(setBand)(e.target.value)} className="input-field text-xs font-medium px-3 py-2 cursor-pointer">
            {PRICE_BANDS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
          {seriesOptions.length > 1 && (
            <select aria-label="Series" value={series} onChange={(e) => change(setSeries)(e.target.value)} className="input-field text-xs font-medium px-3 py-2 cursor-pointer max-w-[14rem]">
              <option value="all">Mọi series</option>
              {seriesOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <button
            onClick={() => change(setInStockOnly)(!inStockOnly)}
            aria-pressed={inStockOnly}
            className={`filter-pill px-3.5 py-2 text-xs font-semibold cursor-pointer${inStockOnly ? ' active' : ''}`}
          >
            Còn hàng
          </button>
          <button
            onClick={() => change(setOnSaleOnly)(!onSaleOnly)}
            aria-pressed={onSaleOnly}
            className={`filter-pill px-3.5 py-2 text-xs font-semibold cursor-pointer${onSaleOnly ? ' active' : ''}`}
          >
            Đang giảm giá
          </button>
          {filtersActive && (
            <button onClick={reset} className="flex items-center gap-1 text-xs font-semibold cursor-pointer" style={{ color: 'var(--accent)' }}>
              <X size={13} strokeWidth={2} /> Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card-surface text-center py-20 px-4">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {filtersActive && products.length > 0 ? 'Không có mô hình nào khớp bộ lọc' : emptyTitle}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {filtersActive && products.length > 0 ? 'Thử nới lỏng hoặc xóa bớt bộ lọc.' : emptyHint}
          </p>
          {filtersActive && products.length > 0 && (
            <button onClick={reset} className="btn-primary mt-4 px-5 py-2.5 text-xs font-semibold cursor-pointer">Xóa bộ lọc</button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {paginate(filtered, safePage, PAGE_SIZE).map(product => (
              <ProductCard
                key={product.id}
                product={product}
                isLiked={likedProducts.includes(product.id)}
                onToggleLike={onToggleLike}
                onQuickAdd={onQuickAdd}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
          <div className="mt-6 card-surface overflow-hidden empty:hidden">
            <Pagination page={safePage} total={filtered.length} size={PAGE_SIZE} onChange={setPage} />
          </div>
        </>
      )}
    </section>
  );
}
