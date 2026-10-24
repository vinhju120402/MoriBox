'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight, Monitor, Moon, Sun, Check, User, SlidersHorizontal, Languages, FileText, ShieldCheck,
  LogOut, Trash2, Database, ExternalLink, MapPin,
} from 'lucide-react';
import Navbar from '../../components/navbar';
import CartDrawer from '../../components/cart-drawer';
import SiteFooter from '../../components/site-footer';
import TwoFactor from '../../components/two-factor';
import AddressBook from '../../components/address-book';
import { useGatedCart } from '../../hooks/use-gated-cart';
import { useTheme, ThemePreference } from '../../hooks/use-theme';
import { useDisplay, TextSize } from '../../hooks/use-display';
import { useLanguage } from '../../hooks/use-language';
import { AuthUser } from '../../hooks/use-auth';
import { ROLE_LABEL, isStaff as isStaffRole } from '../../lib/permissions';
import { DictionaryKey, Language } from '../i18n/dictionary';
import { GRADE_CATEGORIES } from '../data/products';

type T = (key: DictionaryKey) => string;

const THEME_OPTIONS: { value: ThemePreference; label: DictionaryKey; hint: DictionaryKey; icon: React.ReactNode; swatch: [string, string, string] }[] = [
  { value: 'light', label: 'settings.display.light', hint: 'settings.display.lightHint', icon: <Sun size={16} strokeWidth={2} />, swatch: ['#f7f8f9', '#ffffff', '#ff5a1f'] },
  { value: 'dark', label: 'settings.display.dark', hint: 'settings.display.darkHint', icon: <Moon size={16} strokeWidth={2} />, swatch: ['#0b0e13', '#161c25', '#ff7a2f'] },
  { value: 'system', label: 'settings.display.system', hint: 'settings.display.systemHint', icon: <Monitor size={16} strokeWidth={2} />, swatch: ['#f7f8f9', '#161c25', '#ff7a2f'] },
];

const TEXT_SIZES: { value: TextSize; label: DictionaryKey; sample: string }[] = [
  { value: 'sm', label: 'settings.display.small', sample: 'text-xs' },
  { value: 'md', label: 'settings.display.normal', sample: 'text-base' },
  { value: 'lg', label: 'settings.display.large', sample: 'text-xl' },
];

const LANGUAGES: { value: Language; label: DictionaryKey; code: string }[] = [
  { value: 'vi', label: 'settings.language.vi', code: 'VI' },
  { value: 'en', label: 'settings.language.en', code: 'EN' },
];

const SECTIONS: { id: string; label: DictionaryKey; icon: React.ReactNode }[] = [
  { id: 'account', label: 'settings.nav.account', icon: <User size={14} strokeWidth={2} /> },
  { id: 'addresses', label: 'settings.nav.addresses', icon: <MapPin size={14} strokeWidth={2} /> },
  { id: 'display', label: 'settings.nav.display', icon: <SlidersHorizontal size={14} strokeWidth={2} /> },
  { id: 'language', label: 'settings.nav.language', icon: <Languages size={14} strokeWidth={2} /> },
  { id: 'terms', label: 'settings.nav.terms', icon: <FileText size={14} strokeWidth={2} /> },
  { id: 'security', label: 'settings.nav.security', icon: <ShieldCheck size={14} strokeWidth={2} /> },
];

function SectionHeader({ id, title, desc }: { id: string; title: string; desc: string }) {
  return (
    <div className="mb-5">
      <h2 id={`${id}-heading`} className="text-lg font-bold font-display" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
    </div>
  );
}

function ProfileForm({
  user, t, onSave,
}: {
  user: AuthUser;
  t: T;
  onSave: (name: string) => Promise<'ok' | 'invalid' | 'error'>;
}) {
  const [name, setName] = useState(user.name);
  const [status, setStatus] = useState<'idle' | 'ok' | 'invalid' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(await onSave(name));
  };

  const joined = user.joinedAt
    ? new Date(user.joinedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <form onSubmit={submit} className="card-surface p-5 space-y-4">
      <div>
        <label htmlFor="profile-name" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
          {t('settings.account.name')}
        </label>
        <input
          id="profile-name"
          value={name}
          onChange={e => { setName(e.target.value); setStatus('idle'); }}
          required
          className="input-field w-full px-3.5 py-2.5 text-sm"
        />
      </div>
      <div>
        <label htmlFor="profile-email" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
          {t('settings.account.email')}
        </label>
        <input
          id="profile-email"
          type="email"
          value={user.email}
          readOnly
          disabled
          className="input-field w-full px-3.5 py-2.5 text-sm disabled:opacity-60"
        />
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>{t('settings.account.emailLocked')}</p>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-xs pt-1">
        <div>
          <dt style={{ color: 'var(--text-muted)' }}>{t('settings.account.role')}</dt>
          <dd className="font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
            {ROLE_LABEL[user.role]}
          </dd>
        </div>
        {joined && (
          <div>
            <dt style={{ color: 'var(--text-muted)' }}>{t('settings.account.joined')}</dt>
            <dd className="font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{joined}</dd>
          </div>
        )}
      </dl>

      <div className="flex items-center gap-3 flex-wrap">
        <button type="submit" className="btn-primary px-5 py-2.5 text-sm font-semibold cursor-pointer">
          {t('common.save')}
        </button>
        <p role="status" className="text-xs font-medium" style={{ color: status === 'ok' ? '#16a34a' : 'var(--danger)' }}>
          {status === 'ok' && t('common.saved')}
          {status === 'invalid' && t('settings.account.invalid')}
          {status === 'error' && t('settings.account.saveError')}
        </p>
      </div>
    </form>
  );
}

export default function SettingsPage() {
  const {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    handleUpdateQuantity,
    handleRemoveItem,
    handleClearCart,
    likedProducts,
    toggleLike,
    isLoggedIn,
    isStaff,
    hasLoaded,
    user,
    logout,
    updateProfile,
    deleteAccount,
  } = useGatedCart();
  const { preference, setPreference } = useTheme();
  const { textSize, setTextSize, reduceMotion, setReduceMotion } = useDisplay();
  const { language, setLanguage, t } = useLanguage();

  const [cleared, setCleared] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const clearShoppingData = () => {
    handleClearCart();
    likedProducts.forEach(id => toggleLike(id));
    setCleared(true);
  };

  const radioStyle = (active: boolean) =>
    active ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-dim)' } : undefined;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Navbar
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
        onCartClick={() => setIsCartOpen(true)}
        gradeCategories={GRADE_CATEGORIES}
        isLoggedIn={isLoggedIn}
        isStaff={isStaff}
        userName={user?.name}
        onLogout={logout}
      />

      <div className="lg:pl-72 flex flex-col min-h-screen">
        <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 w-full">
          <nav className="flex items-center gap-1.5 text-xs mb-6" style={{ color: 'var(--text-secondary)' }} aria-label="Breadcrumb">
            <Link href="/" className="link-fade">{t('common.home')}</Link>
            <ChevronRight size={12} strokeWidth={2} />
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t('settings.title')}</span>
          </nav>

          <h1 className="text-3xl font-black font-display" style={{ color: 'var(--text-primary)' }}>{t('settings.title')}</h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>{t('settings.subtitle')}</p>

          {/* Quick jump */}
          <nav
            aria-label={t('settings.title')}
            className="sticky top-14 lg:top-0 z-20 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 mt-6 flex gap-2 overflow-x-auto no-scrollbar"
            style={{ background: 'color-mix(in srgb, var(--bg-base) 90%, transparent)', backdropFilter: 'blur(10px)' }}
          >
            {SECTIONS.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="filter-pill shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold cursor-pointer"
              >
                {s.icon} {t(s.label)}
              </a>
            ))}
          </nav>

          <div className="space-y-12 mt-6">
            {/* ── Account ── */}
            <section id="account" aria-labelledby="account-heading" className="scroll-mt-28">
              <SectionHeader id="account" title={t('settings.account.title')} desc={t('settings.account.desc')} />
              {!hasLoaded ? null : user ? (
                <ProfileForm key={user.email} user={user} t={t} onSave={updateProfile} />
              ) : (
                <div className="card-surface p-5 flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('settings.account.loginPrompt')}</p>
                  <Link href="/dang-nhap?redirect=/cai-dat" className="btn-primary px-5 py-2.5 text-sm font-semibold cursor-pointer">
                    {t('common.login')}
                  </Link>
                </div>
              )}
            </section>

            {/* ── Addresses ── */}
            <section id="addresses" aria-labelledby="addresses-heading" className="scroll-mt-28">
              <SectionHeader id="addresses" title={t('settings.addresses.title')} desc={t('settings.addresses.desc')} />
              {user ? (
                <AddressBook />
              ) : hasLoaded ? (
                <div className="card-surface p-5 flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('settings.account.loginPrompt')}</p>
                  <Link href="/dang-nhap?redirect=/cai-dat" className="btn-primary px-5 py-2.5 text-sm font-semibold cursor-pointer">
                    {t('common.login')}
                  </Link>
                </div>
              ) : null}
            </section>

            {/* ── Display ── */}
            <section id="display" aria-labelledby="display-heading" className="scroll-mt-28">
              <SectionHeader id="display" title={t('settings.display.title')} desc={t('settings.display.desc')} />

              <p className="hud-tag mb-3">{t('settings.display.theme')}</p>
              <div role="radiogroup" aria-label={t('settings.display.theme')} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {THEME_OPTIONS.map(opt => {
                  const active = preference === opt.value;
                  return (
                    <button
                      key={opt.value}
                      role="radio"
                      aria-checked={active}
                      onClick={() => setPreference(opt.value)}
                      className="card-surface text-left p-4 cursor-pointer"
                      style={radioStyle(active)}
                    >
                      <div className="flex h-14 rounded-lg overflow-hidden mb-3" style={{ border: '1px solid var(--border-subtle)' }} aria-hidden="true">
                        <span className="flex-1" style={{ background: opt.swatch[0] }} />
                        <span className="flex-1" style={{ background: opt.swatch[1] }} />
                        <span className="w-4" style={{ background: opt.swatch[2] }} />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {opt.icon} {t(opt.label)}
                        </span>
                        {active && <Check size={16} strokeWidth={2.5} style={{ color: 'var(--accent)' }} />}
                      </div>
                      <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t(opt.hint)}</p>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{t('settings.display.themeSaved')}</p>

              <p className="hud-tag mt-8 mb-3">{t('settings.display.textSize')}</p>
              <div role="radiogroup" aria-label={t('settings.display.textSize')} className="grid grid-cols-3 gap-3">
                {TEXT_SIZES.map(opt => {
                  const active = textSize === opt.value;
                  return (
                    <button
                      key={opt.value}
                      role="radio"
                      aria-checked={active}
                      onClick={() => setTextSize(opt.value)}
                      className="card-surface p-4 cursor-pointer text-center"
                      style={radioStyle(active)}
                    >
                      <span className={`${opt.sample} font-bold font-display block`} style={{ color: 'var(--text-primary)' }}>Aa</span>
                      <span className="text-xs font-semibold mt-1 block" style={{ color: 'var(--text-secondary)' }}>{t(opt.label)}</span>
                    </button>
                  );
                })}
              </div>

              <div className="card-surface p-4 mt-6 flex items-center justify-between gap-4">
                <div>
                  <p id="motion-label" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('settings.display.motion')}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{t('settings.display.motionHint')}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={reduceMotion}
                  aria-labelledby="motion-label"
                  onClick={() => setReduceMotion(!reduceMotion)}
                  className="relative shrink-0 w-11 h-6 rounded-full cursor-pointer"
                  style={{ background: reduceMotion ? 'var(--accent)' : 'var(--border-strong)', transition: 'background-color 0.2s ease' }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white"
                    style={{ transform: reduceMotion ? 'translateX(20px)' : 'none', transition: 'transform 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
                  />
                </button>
              </div>
            </section>

            {/* ── Language ── */}
            <section id="language" aria-labelledby="language-heading" className="scroll-mt-28">
              <SectionHeader id="language" title={t('settings.language.title')} desc={t('settings.language.desc')} />
              <div role="radiogroup" aria-label={t('settings.language.title')} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {LANGUAGES.map(opt => {
                  const active = language === opt.value;
                  return (
                    <button
                      key={opt.value}
                      role="radio"
                      aria-checked={active}
                      lang={opt.value}
                      onClick={() => setLanguage(opt.value)}
                      className="card-surface p-4 cursor-pointer flex items-center justify-between gap-3"
                      style={radioStyle(active)}
                    >
                      <span className="flex items-center gap-3">
                        <span className="font-hud text-xs font-bold px-2 py-1 rounded-md" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>{opt.code}</span>
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t(opt.label)}</span>
                      </span>
                      {active && <Check size={16} strokeWidth={2.5} style={{ color: 'var(--accent)' }} />}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{t('settings.language.note')}</p>
            </section>

            {/* ── Terms ── */}
            <section id="terms" aria-labelledby="terms-heading" className="scroll-mt-28">
              <SectionHeader id="terms" title={t('settings.terms.title')} desc={t('settings.terms.desc')} />
              <Link
                href="/dieu-khoan"
                className="card-surface is-interactive p-4 flex items-center justify-between gap-3 cursor-pointer"
              >
                <span className="flex items-center gap-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <FileText size={16} strokeWidth={2} style={{ color: 'var(--accent)' }} />
                  {t('settings.terms.read')}
                </span>
                <ExternalLink size={14} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
              </Link>
            </section>

            {/* ── Security ── */}
            <section id="security" aria-labelledby="security-heading" className="scroll-mt-28">
              <SectionHeader id="security" title={t('settings.security.title')} desc={t('settings.security.desc')} />

              <div className="card-surface p-4 flex gap-3">
                <Database size={18} strokeWidth={2} className="shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('settings.security.storageTitle')}</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t('settings.security.storageBody')}</p>
                </div>
              </div>

              {user && isStaffRole(user.role) && (
                <div className="mt-3">
                  <TwoFactor />
                </div>
              )}

              <div className="mt-3 space-y-3">
                <div className="card-surface p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('settings.security.clear')}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {cleared ? t('settings.security.cleared') : t('settings.security.clearHint')}
                    </p>
                  </div>
                  <button onClick={clearShoppingData} className="btn-outline px-4 py-2 text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                    <Trash2 size={13} strokeWidth={2} /> {t('settings.security.clear')}
                  </button>
                </div>

                {user ? (
                  <>
                    <div className="card-surface p-4 flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('settings.security.logout')}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{t('settings.security.logoutHint')}</p>
                      </div>
                      <button onClick={logout} className="btn-outline px-4 py-2 text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                        <LogOut size={13} strokeWidth={2} /> {t('nav.logout')}
                      </button>
                    </div>

                    <div className="card-surface p-4" style={{ borderColor: 'color-mix(in srgb, var(--danger) 35%, transparent)' }}>
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>{t('settings.security.delete')}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            {isStaffRole(user.role) ? t('settings.security.adminLocked') : t('settings.security.deleteHint')}
                          </p>
                        </div>
                        {!isStaffRole(user.role) && (confirmDelete ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => { const ok = await deleteAccount(); if (ok) { handleClearCart(); likedProducts.forEach(id => toggleLike(id)); } }}
                              className="px-4 py-2 text-xs font-semibold rounded-full cursor-pointer text-white"
                              style={{ background: 'var(--danger)' }}
                            >
                              {t('settings.security.deleteConfirm')}
                            </button>
                            <button onClick={() => setConfirmDelete(false)} className="btn-ghost px-3 py-2 text-xs font-semibold cursor-pointer">
                              {t('common.cancel')}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(true)}
                            className="px-4 py-2 text-xs font-semibold rounded-full cursor-pointer flex items-center gap-1.5"
                            style={{ border: '1px solid var(--danger)', color: 'var(--danger)' }}
                          >
                            <Trash2 size={13} strokeWidth={2} /> {t('settings.security.delete')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : hasLoaded ? (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('settings.security.needLogin')}</p>
                ) : null}
              </div>
            </section>
          </div>
        </main>

        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cartItems={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
        />

        <SiteFooter />
      </div>
    </div>
  );
}
