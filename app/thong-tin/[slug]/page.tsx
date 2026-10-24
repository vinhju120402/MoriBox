'use client';

import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { ArrowLeft, Boxes, Clock, Mail, MapPin, Phone, Building2 } from 'lucide-react';
import SiteFooter from '../../../components/site-footer';
import { useLanguage } from '../../../hooks/use-language';
import { useShopSettings, type ShopSettings } from '../../../hooks/use-shop-settings';
import type { DictionaryKey } from '../../i18n/dictionary';

type Kind = 'sections' | 'faq' | 'contact' | 'about';

interface InfoPage {
  kind: Kind;
  title: DictionaryKey;
  intro: DictionaryKey;
  /** Template wording the shop owner should review before opening. */
  draft?: boolean;
  sections?: { h: DictionaryKey; p: DictionaryKey }[];
  faq?: { q: DictionaryKey; a: DictionaryKey }[];
}

const sec = (page: string, n: number) => ({ h: `info.${page}.s${n}.h` as DictionaryKey, p: `info.${page}.s${n}.p` as DictionaryKey });

const PAGES: Record<string, InfoPage> = {
  'gioi-thieu': { kind: 'about', title: 'info.about.title', intro: 'info.about.intro', sections: [sec('about', 1), sec('about', 2)] },
  'lien-he': { kind: 'contact', title: 'info.contact.title', intro: 'info.contact.intro', sections: [sec('contact', 1), sec('contact', 2)] },
  'faq': {
    kind: 'faq', title: 'info.faq.title', intro: 'info.faq.intro',
    faq: [1, 2, 3, 4, 5, 6, 7, 8].map(n => ({ q: `info.faq.q${n}` as DictionaryKey, a: `info.faq.a${n}` as DictionaryKey })),
  },
  'doi-tra': { kind: 'sections', title: 'info.returns.title', intro: 'info.returns.intro', draft: true, sections: [1, 2, 3, 4].map(n => sec('returns', n)) },
  'giao-hang': { kind: 'sections', title: 'info.shipping.title', intro: 'info.shipping.intro', draft: true, sections: [1, 2, 3, 4].map(n => sec('shipping', n)) },
  'quyen-rieng-tu': { kind: 'sections', title: 'info.privacy.title', intro: 'info.privacy.intro', draft: true, sections: [1, 2, 3, 4, 5].map(n => sec('privacy', n)) },
};

function BusinessCard({ settings, showLegal }: { settings: ShopSettings; showLegal: boolean }) {
  const { t } = useLanguage();
  const rows: { icon: React.ReactNode; label: DictionaryKey; value: string; href?: string }[] = [
    ...(showLegal && settings.businessName ? [{ icon: <Building2 size={15} strokeWidth={2} />, label: 'info.contact.business' as DictionaryKey, value: settings.businessName }] : []),
    ...(showLegal && settings.taxCode ? [{ icon: <Building2 size={15} strokeWidth={2} />, label: 'info.contact.tax' as DictionaryKey, value: settings.taxCode }] : []),
    ...(settings.businessAddress ? [{ icon: <MapPin size={15} strokeWidth={2} />, label: 'info.contact.address' as DictionaryKey, value: settings.businessAddress }] : []),
    ...(settings.contactPhone ? [{ icon: <Phone size={15} strokeWidth={2} />, label: 'info.contact.phone' as DictionaryKey, value: settings.contactPhone, href: `tel:${settings.contactPhone.replace(/\s/g, '')}` }] : []),
    ...(settings.contactEmail ? [{ icon: <Mail size={15} strokeWidth={2} />, label: 'info.contact.email' as DictionaryKey, value: settings.contactEmail, href: `mailto:${settings.contactEmail}` }] : []),
    ...(settings.openingHours ? [{ icon: <Clock size={15} strokeWidth={2} />, label: 'info.contact.hours' as DictionaryKey, value: settings.openingHours }] : []),
  ];

  if (rows.length === 0) {
    return <p className="text-sm card-surface p-5" style={{ color: 'var(--text-secondary)' }}>{t('info.contact.notSet')}</p>;
  }
  return (
    <dl className="card-surface p-5 space-y-3.5">
      {rows.map(r => (
        <div key={r.label} className="flex items-start gap-3">
          <span className="mt-0.5" style={{ color: 'var(--accent)' }}>{r.icon}</span>
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>{t(r.label)}</dt>
            <dd className="text-sm" style={{ color: 'var(--text-primary)' }}>
              {r.href ? <a href={r.href} className="link-fade font-semibold">{r.value}</a> : r.value}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

export default function InfoPageRoute() {
  const params = useParams<{ slug: string }>();
  const page = PAGES[params.slug];
  const { t } = useLanguage();
  const { settings } = useShopSettings();
  if (!page) notFound();

  const vars = { days: settings.returnDays, fee: `${settings.shippingFee.toLocaleString('vi-VN')}đ` };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-10 md:py-14 w-full">
        <Link href="/" className="link-fade inline-flex items-center gap-1.5 text-xs font-semibold">
          <ArrowLeft size={13} strokeWidth={2} /> {t('info.back')}
        </Link>

        <div className="flex items-center gap-2.5 mt-6">
          <span className="w-9 h-9 flex items-center justify-center rounded-full" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
            <Boxes size={17} strokeWidth={2} />
          </span>
          <h1 className="text-3xl font-black font-display" style={{ color: 'var(--text-primary)' }}>{t(page.title)}</h1>
        </div>
        <p className="text-sm mt-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t(page.intro, vars)}</p>

        {page.draft && (
          <p className="text-xs mt-5 p-3.5 rounded-xl leading-relaxed" style={{ background: 'var(--accent-dim)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
            {t('info.draftNote')}
          </p>
        )}

        {page.kind === 'contact' && <div className="mt-8"><BusinessCard settings={settings} showLegal /></div>}

        {page.faq && (
          <div className="mt-8 space-y-3">
            {page.faq.map(f => (
              <details key={f.q} className="card-surface group p-4">
                <summary className="cursor-pointer text-sm font-semibold list-none flex items-center justify-between gap-3" style={{ color: 'var(--text-primary)' }}>
                  {t(f.q)}
                  <span aria-hidden="true" className="text-lg leading-none transition-transform group-open:rotate-45" style={{ color: 'var(--accent)' }}>+</span>
                </summary>
                <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t(f.a, vars)}</p>
              </details>
            ))}
          </div>
        )}

        {page.sections && (
          <div className="mt-8 space-y-7">
            {page.sections.map(s => (
              <section key={s.h}>
                <h2 className="text-base font-bold font-display" style={{ color: 'var(--text-primary)' }}>{t(s.h)}</h2>
                <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t(s.p, vars)}</p>
              </section>
            ))}
          </div>
        )}

        {page.kind === 'about' && (
          <section className="mt-8">
            <h2 className="text-base font-bold font-display mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('info.about.s3.h')}</h2>
            <p className="text-sm mb-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t('info.about.s3.p')}</p>
            <BusinessCard settings={settings} showLegal />
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
