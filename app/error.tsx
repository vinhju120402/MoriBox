'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import { useLanguage } from '../hooks/use-language';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLanguage();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-base)' }}>
      <div className="card-surface w-full max-w-sm p-8 text-center space-y-4" role="alert">
        <div
          className="w-12 h-12 mx-auto flex items-center justify-center rounded-full"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
        >
          <TriangleAlert size={20} strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-lg font-bold font-display" style={{ color: 'var(--text-primary)' }}>{t('error.title')}</h1>
          <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t('error.body')}</p>
          {error.digest && (
            <p className="font-hud text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>ref: {error.digest}</p>
          )}
        </div>
        <div className="flex items-center justify-center gap-2">
          <button onClick={reset} className="btn-primary px-5 py-2.5 text-xs font-semibold cursor-pointer">
            {t('error.retry')}
          </button>
          <Link href="/" className="btn-outline px-5 py-2.5 text-xs font-semibold">{t('error.home')}</Link>
        </div>
      </div>
    </div>
  );
}
