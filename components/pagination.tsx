'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../hooks/use-language';

export const PAGE_SIZE = 20;

// Client-side paging: slice an already-loaded list. (Fine into the low thousands of
// rows; beyond that the queries themselves should be paged on the server.)
export function paginate<T>(items: T[], page: number, size: number = PAGE_SIZE): T[] {
  return items.slice((page - 1) * size, page * size);
}

export default function Pagination({
  page,
  total,
  size = PAGE_SIZE,
  onChange,
}: {
  page: number;
  total: number;
  size?: number;
  onChange: (page: number) => void;
}) {
  const { t } = useLanguage();
  const pages = Math.max(1, Math.ceil(total / size));
  if (total <= size) return null;
  const from = (page - 1) * size + 1;
  const to = Math.min(page * size, total);

  return (
    <nav className="flex items-center justify-between gap-3 px-4 py-3 print:hidden" aria-label={t('pager.label')} style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
        {from}–{to} / {total}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label={t('pager.prev')}
          className="btn-outline p-1.5 cursor-pointer"
        >
          <ChevronLeft size={14} strokeWidth={2} />
        </button>
        <span className="text-xs font-semibold px-2" style={{ color: 'var(--text-primary)' }}>
          {page} / {pages}
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
          aria-label={t('pager.next')}
          className="btn-outline p-1.5 cursor-pointer"
        >
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>
    </nav>
  );
}
