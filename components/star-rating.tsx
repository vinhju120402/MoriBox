'use client';

import { Star } from 'lucide-react';
import { useLanguage } from '../hooks/use-language';

const AMBER = '#f59e0b';

// Read-only stars (rounded to whole stars), with an accessible text label.
export function Stars({ value, size = 13 }: { value: number; size?: number }) {
  const { t } = useLanguage();
  const filled = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={t('stars.label', { v: value.toFixed(1) })}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={size}
          strokeWidth={1.8}
          fill={i <= filled ? AMBER : 'none'}
          style={{ color: i <= filled ? AMBER : 'var(--border-strong)' }}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

// Clickable stars for the review form.
export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { t } = useLanguage();
  return (
    <div role="radiogroup" aria-label={t('stars.choose')} className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={t('stars.n', { n: i })}
          onClick={() => onChange(i)}
          className="p-0.5 cursor-pointer"
        >
          <Star size={26} strokeWidth={1.8} fill={i <= value ? AMBER : 'none'} style={{ color: i <= value ? AMBER : 'var(--border-strong)' }} />
        </button>
      ))}
    </div>
  );
}
