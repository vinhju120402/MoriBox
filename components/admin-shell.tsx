'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Boxes, Users, LineChart, LogOut, Store, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/use-auth';

const NAV_ITEMS = [
  { key: 'dashboard', href: '/admin', label: 'Tổng quan', icon: LayoutDashboard },
  { key: 'kho', href: '/admin/kho', label: 'Kho hàng', icon: Boxes },
  { key: 'nguoi-dung', href: '/admin/nguoi-dung', label: 'Người dùng', icon: Users },
  { key: 'doanh-thu', href: '/admin/doanh-thu', label: 'Doanh thu', icon: LineChart },
] as const;

interface AdminShellProps {
  active: (typeof NAV_ITEMS)[number]['key'];
  children: React.ReactNode;
}

export default function AdminShell({ active, children }: AdminShellProps) {
  const { user, isLoggedIn, isAdmin, hasLoaded, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!hasLoaded) return;
    if (!isLoggedIn) { router.replace('/dang-nhap?redirect=/admin'); return; }
    if (!isAdmin) { router.replace('/'); }
  }, [hasLoaded, isLoggedIn, isAdmin, router]);

  if (!hasLoaded || !isLoggedIn || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Đang kiểm tra quyền truy cập…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <aside
        className="hidden md:flex w-64 shrink-0 flex-col"
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2.5 px-5 h-16 shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
          >
            <ShieldCheck size={16} strokeWidth={2} />
          </div>
          <h1 className="text-sm font-bold tracking-tight font-display" style={{ color: 'var(--text-primary)' }}>
            MoriBox Admin
          </h1>
        </div>

        <nav className="flex-1 px-4 py-5 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`filter-pill w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold cursor-pointer${isActive ? ' active' : ''}`}
              >
                <Icon size={15} strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-5 space-y-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <p className="px-1 text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {user?.name}
          </p>
          <p className="px-1 text-[11px] truncate mb-1" style={{ color: 'var(--text-muted)' }}>
            {user?.email}
          </p>
          <Link
            href="/"
            className="btn-ghost w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold cursor-pointer"
            style={{ border: '1px solid var(--border-subtle)' }}
          >
            <Store size={13} strokeWidth={2} /> Về cửa hàng
          </Link>
          <button
            onClick={() => { logout(); router.push('/'); }}
            className="btn-ghost w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold cursor-pointer"
            style={{ border: '1px solid var(--border-subtle)' }}
          >
            <LogOut size={13} strokeWidth={2} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 overflow-y-auto p-5 md:p-8">
        {children}
      </main>
    </div>
  );
}
