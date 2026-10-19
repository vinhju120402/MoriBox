'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Store, ShieldCheck, Menu, X, BellRing } from 'lucide-react';
import { useAuth } from '../hooks/use-auth';
import { useAdminBadges } from '../hooks/use-admin-badges';
import { notifyOrdersChanged } from '../hooks/use-orders';
import { getSupabase } from '../lib/supabase';
import { can, ROLE_LABEL } from '../lib/permissions';
import { ADMIN_NAV_ITEMS as NAV_ITEMS, AdminNavKey, groupedNav } from '../lib/admin-nav';

interface AdminShellProps {
  active: AdminNavKey;
  /** Page heading — rendered by the shell so every admin page looks the same. */
  title: string;
  description?: string;
  /** Right-aligned buttons next to the heading (e.g. "Thêm sản phẩm"). */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export default function AdminShell({ active, title, description, actions, children }: AdminShellProps) {
  const { user, isLoggedIn, isStaff, role, hasLoaded, logout } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const badges = useAdminBadges();
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);

  // New orders reach admins/accountants the moment they are placed (Supabase
  // Realtime, filtered by the same row-level security as the tables). Every open
  // orders table reloads, and a toast pops up.
  useEffect(() => {
    if (!can(role, 'orders')) return;
    const supabase = getSupabase();
    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        notifyOrdersChanged();
        if (payload.eventType === 'INSERT') {
          const code = (payload.new as { code?: string }).code ?? '';
          const id = Date.now() + Math.random();
          setToasts(t => [...t, { id, text: `Có đơn hàng mới ${code}` }]);
          window.setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 8000);
        }
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [role]);

  useEffect(() => {
    if (!hasLoaded) return;
    if (!isLoggedIn) { router.replace('/dang-nhap?redirect=/admin'); return; }
    if (!isStaff) { router.replace('/'); }
  }, [hasLoaded, isLoggedIn, isStaff, router]);

  if (!hasLoaded || !isLoggedIn || !isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Đang kiểm tra quyền truy cập…</p>
      </div>
    );
  }

  const allowedNav = NAV_ITEMS.filter(item => can(role, item.permission));
  const activeItem = NAV_ITEMS.find(item => item.key === active);
  const allowed = !!activeItem && can(role, activeItem.permission);

  const brand = (
    <span className="flex items-center gap-2.5">
      <span
        className="w-8 h-8 flex items-center justify-center rounded-xl"
        style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
      >
        <ShieldCheck size={16} strokeWidth={2} />
      </span>
      <span className="text-sm font-bold tracking-tight font-display" style={{ color: 'var(--text-primary)' }}>MoriBox Admin</span>
    </span>
  );

  return (
    <div className="min-h-screen md:flex" style={{ background: 'var(--bg-base)' }}>
      {/* Mobile top bar — the sidebar becomes a drawer below md */}
      <header
        className="md:hidden print:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4"
        style={{
          background: 'color-mix(in srgb, var(--bg-surface) 92%, transparent)',
          borderBottom: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <button onClick={() => setMobileOpen(true)} aria-label="Mở menu" className="btn-ghost p-2 cursor-pointer">
          <Menu size={20} strokeWidth={2} />
        </button>
        {brand}
        <span className="w-9" aria-hidden="true" />
      </header>

      {mobileOpen && (
        <div
          className="md:hidden print:hidden fixed inset-0 z-40"
          style={{ background: 'rgba(15,17,19,0.5)' }}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: pinned to the viewport on desktop, slide-in drawer on mobile */}
      <aside
        className={[
          'print:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 ease-out',
          'md:sticky md:top-0 md:h-screen md:self-start md:z-auto md:translate-x-0 md:shrink-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between px-5 h-16 shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          {brand}
          <button onClick={() => setMobileOpen(false)} aria-label="Đóng menu" className="md:hidden btn-ghost p-1.5 cursor-pointer">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-5" aria-label="Quản trị">
          {groupedNav(allowedNav).map(group => (
            <div key={group.group} className="space-y-1.5">
              <p className="px-1 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>{group.group}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.key;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`filter-pill w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold cursor-pointer${isActive ? ' active' : ''}`}
                  >
                    <Icon size={15} strokeWidth={2} />
                    {item.label}
                    {(badges[item.key] ?? 0) > 0 && (
                      <span
                        className="ml-auto min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center"
                        style={{ background: 'var(--accent)', color: '#fff' }}
                        aria-label={`${badges[item.key]} việc cần xử lý`}
                      >
                        {badges[item.key]}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="px-4 py-5 space-y-2 shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="px-1">
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user?.name || 'Tài khoản'}</p>
            <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
            {role && (
              <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                {ROLE_LABEL[role]}
              </span>
            )}
          </div>
          <Link
            href="/"
            className="btn-ghost w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold cursor-pointer"
            style={{ border: '1px solid var(--border-subtle)' }}
          >
            <Store size={13} strokeWidth={2} /> Về cửa hàng
          </Link>
          <button
            onClick={() => { void logout(); router.push('/'); }}
            className="btn-ghost w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold cursor-pointer"
            style={{ border: '1px solid var(--border-subtle)' }}
          >
            <LogOut size={13} strokeWidth={2} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 print:max-w-none print:p-0">
          {allowed ? (
            <>
              <div className="mb-7 flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold tracking-tight font-display" style={{ color: 'var(--text-primary)' }}>{title}</h1>
                  {description && (
                    <p className="text-sm mt-1.5 max-w-2xl leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{description}</p>
                  )}
                </div>
                {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
              </div>
              {children}
            </>
          ) : (
            <div className="card-surface max-w-md mx-auto mt-12 p-8 text-center space-y-3" role="alert">
              <ShieldCheck size={22} strokeWidth={2} className="mx-auto" style={{ color: 'var(--accent)' }} />
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Bạn không có quyền truy cập trang này</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Vai trò hiện tại của bạn là {role ? ROLE_LABEL[role] : '—'}. Liên hệ quản trị viên nếu cần thêm quyền.
              </p>
              {allowedNav[0] && (
                <Link href={allowedNav[0].href} className="btn-primary inline-block px-5 py-2 text-xs font-semibold">
                  Về {allowedNav[0].label}
                </Link>
              )}
            </div>
          )}
        </div>
      </main>

      {/* New-order toasts */}
      <div className="print:hidden fixed bottom-4 right-4 z-[300] flex flex-col gap-2" role="status" aria-live="polite">
        {toasts.map(t => (
          <Link
            key={t.id}
            href="/admin/don-hang"
            className="card-surface flex items-center gap-3 px-4 py-3 shadow-lg"
            style={{ borderColor: 'var(--accent)' }}
          >
            <BellRing size={16} strokeWidth={2} style={{ color: 'var(--accent)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{t.text}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
