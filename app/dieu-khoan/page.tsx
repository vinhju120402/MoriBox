'use client';

import Link from 'next/link';
import { ArrowLeft, Boxes } from 'lucide-react';
import SiteFooter from '../../components/site-footer';
import { useLanguage } from '../../hooks/use-language';
import { DictionaryKey } from '../i18n/dictionary';

const SECTIONS: { h: DictionaryKey; p: DictionaryKey }[] = [
  { h: 'terms.s1.h', p: 'terms.s1.p' },
  { h: 'terms.s2.h', p: 'terms.s2.p' },
  { h: 'terms.s3.h', p: 'terms.s3.p' },
  { h: 'terms.s4.h', p: 'terms.s4.p' },
  { h: 'terms.s5.h', p: 'terms.s5.p' },
  { h: 'terms.s6.h', p: 'terms.s6.p' },
];

export default function TermsPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-10 md:py-14 w-full">
        <Link href="/cai-dat#terms" className="link-fade inline-flex items-center gap-1.5 text-xs font-semibold">
          <ArrowLeft size={13} strokeWidth={2} /> {t('terms.back')}
        </Link>

        <div className="flex items-center gap-2.5 mt-6">
          <span className="w-9 h-9 flex items-center justify-center rounded-full" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
            <Boxes size={17} strokeWidth={2} />
          </span>
          <h1 className="text-3xl font-black font-display" style={{ color: 'var(--text-primary)' }}>{t('terms.title')}</h1>
        </div>
        <p className="hud-tag mt-3">{t('terms.updated')}</p>

        <p
          className="text-xs mt-5 p-3.5 rounded-xl leading-relaxed"
          style={{ background: 'var(--accent-dim)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
        >
          {t('terms.draftNote')}
        </p>

        <div className="mt-8 space-y-7">
          {SECTIONS.map(s => (
            <section key={s.h}>
              <h2 className="text-base font-bold font-display" style={{ color: 'var(--text-primary)' }}>{t(s.h)}</h2>
              <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t(s.p)}</p>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
