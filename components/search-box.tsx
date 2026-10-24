'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, CornerDownLeft } from 'lucide-react';
import ProductImage from './product-image';
import { useProductCatalog } from '../hooks/use-product-catalog';
import { matchesQuery, searchRank } from '../lib/search';
import { useLanguage } from '../hooks/use-language';

interface SearchBoxProps {
  /** `page` is the big box on the search page; `sidebar` the compact one in the menu. */
  variant?: 'sidebar' | 'page';
  initialValue?: string;
  autoFocus?: boolean;
  /** Called after the user picks a suggestion or submits (e.g. to close a mobile drawer). */
  onNavigate?: () => void;
}

// Search field with live suggestions (accent-insensitive). Up/Down to move, Enter to
// open the highlighted product or the full results, Esc to close.
export default function SearchBox({ variant = 'sidebar', initialValue = '', autoFocus = false, onNavigate }: SearchBoxProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const { products } = useProductCatalog();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const query = text.trim();
  const suggestions = useMemo(
    () => (query.length < 1
      ? []
      : products
          .filter(p => matchesQuery(p, query))
          .sort((a, b) => searchRank(a, query) - searchRank(b, query))
          .slice(0, 6)),
    [products, query],
  );
  const showList = open && query.length > 0;
  // Index suggestions.length is the "see all results" row.
  const rowCount = suggestions.length + 1;

  const goAll = () => {
    router.push(query ? `/tim-kiem?q=${encodeURIComponent(query)}` : '/tim-kiem');
    setOpen(false);
    onNavigate?.();
  };
  const goProduct = (id: string) => {
    router.push(`/san-pham/${id}`);
    setOpen(false);
    onNavigate?.();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(a => (a + 1) % rowCount); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => (a <= 0 ? rowCount - 1 : a - 1)); }
    else if (e.key === 'Escape') { setOpen(false); setActive(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && active < suggestions.length) goProduct(suggestions[active].id);
      else goAll();
    }
  };

  const big = variant === 'page';

  return (
    <div className="relative" role="search">
      <Search size={big ? 16 : 14} strokeWidth={2} className={`absolute top-1/2 -translate-y-1/2 pointer-events-none ${big ? 'left-4' : 'left-3.5'}`} style={{ color: 'var(--text-muted)' }} />
      <input
        ref={inputRef}
        type="search"
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => { setText(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        placeholder={big ? t('search.placeholderLong') : t('nav.searchPlaceholder')}
        aria-label={t('nav.search')}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        className={`input-field w-full rounded-full ${big ? 'pl-11 pr-24 py-3 text-sm' : 'pl-9 pr-3 py-2.5 text-xs'}`}
      />
      {big && (
        <button type="button" onClick={goAll} className="btn-primary absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-2 text-xs font-semibold cursor-pointer">
          {t('search.button')}
        </button>
      )}

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-2 card-surface overflow-hidden"
          style={{ boxShadow: '0 16px 40px -12px rgba(0,0,0,0.35)' }}
        >
          {suggestions.map((p, i) => (
            <li
              key={p.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={active === i}
              onMouseDown={(e) => { e.preventDefault(); goProduct(p.id); }}
              onMouseEnter={() => setActive(i)}
              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
              style={{ background: active === i ? 'var(--accent-dim)' : 'transparent' }}
            >
              <span className="media-well relative w-10 h-10 shrink-0 rounded-lg overflow-hidden">
                <ProductImage src={p.image} alt="" imgClassName="object-contain p-0.5" iconSize={14} compact sizes="40px" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {p.grade} · {(p.salePrice ?? p.price).toLocaleString('vi-VN')}đ
                </span>
              </span>
            </li>
          ))}
          {suggestions.length === 0 && (
            <li className="px-3 py-3 text-xs" style={{ color: 'var(--text-secondary)' }} role="presentation">{t('search.noSuggestions')}</li>
          )}
          <li
            id={`${listId}-${suggestions.length}`}
            role="option"
            aria-selected={active === suggestions.length}
            onMouseDown={(e) => { e.preventDefault(); goAll(); }}
            onMouseEnter={() => setActive(suggestions.length)}
            className="flex items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold cursor-pointer"
            style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--accent)', background: active === suggestions.length ? 'var(--accent-dim)' : 'transparent' }}
          >
            <span className="truncate">{t('search.seeAll')} “{query}”</span>
            <CornerDownLeft size={13} strokeWidth={2} aria-hidden="true" />
          </li>
        </ul>
      )}
    </div>
  );
}
