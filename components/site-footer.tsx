'use client';

import Link from 'next/link';
import { useLanguage } from '../hooks/use-language';

export default function SiteFooter() {
  const { t } = useLanguage();

  const links = [
    { href: '/dieu-khoan', label: t('footer.terms') },
    { href: '/cai-dat#security', label: t('footer.security') },
    { href: '/cai-dat', label: t('footer.settings') },
  ];

  return (
    <footer style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 items-center">
          {/* Brand */}
          <div>
            <p className="font-bold text-base font-display" style={{ color: 'var(--text-primary)' }}>MoriBox</p>
            <p className="text-[11px] mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>Gunpla Studio · Premium Models</p>
            <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>{t('footer.tagline')}</p>
          </div>

          {/* Links */}
          <div className="flex justify-center gap-6">
            {links.map(l => (
              <Link key={l.href} href={l.href} className="link-fade text-xs font-medium">
                {l.label}
              </Link>
            ))}
          </div>

          {/* Copyright */}
          <div className="text-right">
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              &copy; {new Date().getFullYear()} MoriBox
            </p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{t('footer.rights')}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
