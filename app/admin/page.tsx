'use client';

import Link from 'next/link';
import { Wallet, ReceiptText, Users, AlertTriangle, Hourglass, ChevronRight, CheckCircle2, Ban, Undo2, PackageX, BadgeCheck, Boxes, PackageCheck, ClipboardList } from 'lucide-react';
import AdminShell from '../../components/admin-shell';
import AdminStat from '../../components/admin-stat';
import ProductImage from '../../components/product-image';
import { useOrders, Order } from '../../hooks/use-orders';
import { useAllProfiles, useAuth } from '../../hooks/use-auth';
import { useAdminBadges } from '../../hooks/use-admin-badges';
import { useProductCatalog } from '../../hooks/use-product-catalog';
import { can, roleLabelKey } from '../../lib/permissions';
import { useLanguage } from '../../hooks/use-language';
import { lowStockLevel } from '../data/products';
import { paymentLabelKey } from '../../lib/payments';
import type { DictionaryKey } from '../i18n/dictionary';

const sameLocalDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// "Tổng quan" is the daily control desk: what happened today and what needs doing.
// The money analysis (charts, breakdowns, filters) lives on the "Doanh thu" page.
export default function AdminDashboardPage() {
  const { user, role } = useAuth();
  const { t, language } = useLanguage();
  const { orders } = useOrders();
  const { products } = useProductCatalog();
  const { users } = useAllProfiles();
  const badges = useAdminBadges();

  const showRevenue = can(role, 'revenue');
  const showUsers = can(role, 'users');
  const showInventory = can(role, 'inventory');

  // ── Numbers ────────────────────────────────────────────────────────
  const live = orders.filter(o => o.status !== 'cancelled');
  const today = new Date();
  const todaysOrders = live.filter(o => sameLocalDay(new Date(o.date), today));
  const todaysValue = todaysOrders.reduce((acc, o) => acc + o.total, 0);
  const awaitingPayment = live.filter(o => o.paymentStatus === 'unpaid');
  const awaitingValue = awaitingPayment.reduce((acc, o) => acc + o.total, 0);

  const sumOf = (list: Order[]) => list.reduce((acc, o) => acc + o.total, 0);
  const paidAll = live.filter(o => o.paymentStatus === 'paid');
  const toRefundOrders = orders.filter(o => o.status === 'cancelled' && o.paymentStatus === 'paid');
  const refundedOrders = orders.filter(o => o.paymentStatus === 'refunded');
  // Where all the money currently sits, in one glance.
  const flowDefs: { labelKey: DictionaryKey; color: string; list: Order[] }[] = [
    { labelKey: 'adm.dash.flow.paid', color: '#16a34a', list: paidAll },
    { labelKey: 'adm.dash.flow.awaiting', color: 'var(--accent)', list: awaitingPayment },
    { labelKey: 'adm.dash.flow.toRefund', color: 'var(--danger)', list: toRefundOrders },
    { labelKey: 'adm.dash.flow.refunded', color: 'var(--text-muted)', list: refundedOrders },
  ];
  const flow = flowDefs.map(seg => ({ ...seg, value: sumOf(seg.list), count: seg.list.length }));
  const flowTotal = flow.reduce((acc, seg) => acc + seg.value, 0);

  const outOfStock = products.filter(p => p.stock === 0);
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= lowStockLevel(p)).sort((a, b) => a.stock - b.stock);
  const needRestock = [...outOfStock, ...lowStock];
  const totalUnits = products.reduce((acc, p) => acc + p.stock, 0);

  // ── "Việc cần xử lý": things waiting on someone ───────────────────
  const cancelRequests = orders.filter(o => o.cancelRequested && o.status !== 'cancelled').length;
  const awaitingRefund = orders.filter(o => o.status === 'cancelled' && o.paymentStatus === 'paid').length;

  const showOrders = can(role, 'orders');
  const showPacking = can(role, 'packing');

  const tasks = [
    showOrders && { href: '/admin/don-hang', icon: ClipboardList, labelKey: 'adm.dash.task.pending', count: badges['don-hang'] ?? 0 },
    showPacking && { href: '/admin/dong-goi', icon: PackageCheck, labelKey: 'adm.dash.task.packing', count: badges['dong-goi'] ?? 0 },
    showRevenue && { href: '/admin/doanh-thu', icon: Hourglass, labelKey: 'adm.dash.task.payment', count: awaitingPayment.length },
    showRevenue && { href: '/admin/doanh-thu', icon: Ban, labelKey: 'adm.dash.task.cancelReq', count: cancelRequests },
    showRevenue && { href: '/admin/doanh-thu', icon: Undo2, labelKey: 'adm.dash.task.refund', count: awaitingRefund },
    showInventory && { href: '/admin/kho', icon: PackageX, labelKey: 'adm.dash.task.outOfStock', count: outOfStock.length },
    showInventory && { href: '/admin/kho', icon: AlertTriangle, labelKey: 'adm.dash.task.lowStock', count: lowStock.length },
  ].filter((x): x is { href: string; icon: typeof Hourglass; labelKey: DictionaryKey; count: number } => !!x);
  const openTasks = tasks.reduce((acc, t) => acc + t.count, 0);

  const recentOrders = orders.slice(0, 6); // already newest first
  const dateLabel = today.toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' });

  return (
    <AdminShell
      active="dashboard"
      title={user?.name ? t('adm.dash.helloName', { name: user.name }) : t('adm.dash.hello')}
      description={`${role ? t(roleLabelKey(role)) : ''} · ${dateLabel}`}
    >
      {/* Today at a glance — each role only sees what it may access */}
      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))' }}>
        {showRevenue && (
          <AdminStat
            label={t('adm.dash.todayOrders')}
            value={String(todaysOrders.length)}
            hint={t('adm.dash.worth', { v: `${todaysValue.toLocaleString('vi-VN')}đ` })}
            icon={<ReceiptText size={20} strokeWidth={2} />}
          />
        )}
        {showRevenue && (
          <AdminStat
            label={t('adm.dash.totalCollected')}
            value={`${sumOf(paidAll).toLocaleString('vi-VN')}đ`}
            hint={t('adm.dash.fromPaid', { n: paidAll.length })}
            icon={<BadgeCheck size={20} strokeWidth={2} />}
          />
        )}
        {showRevenue && (
          <AdminStat
            label={t('adm.dash.awaitingPay')}
            value={`${awaitingValue.toLocaleString('vi-VN')}đ`}
            hint={t('adm.dash.unconfirmed', { n: awaitingPayment.length })}
            icon={<Wallet size={20} strokeWidth={2} />}
            tone={awaitingPayment.length > 0 ? 'danger' : 'default'}
          />
        )}
        {showUsers && (
          <AdminStat label={t('adm.dash.users')} value={String(users.length)} hint={t('adm.dash.usersHint')} icon={<Users size={20} strokeWidth={2} />} />
        )}
        {!showRevenue && showInventory && (
          <>
            <AdminStat label={t('adm.dash.totalProducts')} value={String(products.length)} hint={t('adm.dash.totalProductsHint')} icon={<Boxes size={20} strokeWidth={2} />} />
            <AdminStat label={t('adm.dash.totalStock')} value={totalUnits.toLocaleString('vi-VN')} hint={t('adm.dash.totalStockHint')} icon={<PackageCheck size={20} strokeWidth={2} />} />
          </>
        )}
        <AdminStat
          label={t('adm.dash.attention')}
          value={String(needRestock.length)}
          hint={t('adm.dash.attentionHint', { out: outOfStock.length, low: lowStock.length })}
          icon={<AlertTriangle size={20} strokeWidth={2} />}
          tone={outOfStock.length > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* Latest orders + to-do */}
      <div className={`grid grid-cols-1 gap-4 mb-6 ${showRevenue ? 'lg:grid-cols-3' : ''}`}>
        {showRevenue && (
          <div className="card-surface p-5 min-w-0 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t('adm.dash.latestOrders')}</h3>
              <Link href="/admin/doanh-thu" className="text-xs font-semibold inline-flex items-center gap-0.5" style={{ color: 'var(--accent)' }}>
                {t('adm.dash.viewAll')} <ChevronRight size={13} strokeWidth={2} />
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <p className="text-xs py-10 text-center" style={{ color: 'var(--text-secondary)' }}>
                {t('adm.dash.noOrders')}
              </p>
            ) : (
              <ul className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {recentOrders.map(o => (
                  <li key={o.id} className="flex items-center gap-3 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
                    <span
                      className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl"
                      style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
                      aria-hidden="true"
                    >
                      <ReceiptText size={16} strokeWidth={2} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {o.code} · {o.customerName}
                      </p>
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                        {new Date(o.date).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                        {' · '}
                        {t('adm.dash.items', { n: o.items.reduce((acc, i) => acc + i.quantity, 0) })} · {t(paymentLabelKey(o.paymentMethod))}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{o.total.toLocaleString('vi-VN')}đ</p>
                      <span
                        className="inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                        style={
                          o.status === 'cancelled'
                            ? { background: 'rgba(220,38,38,0.12)', color: '#dc2626' }
                            : o.paymentStatus === 'paid'
                              ? { background: 'rgba(34,197,94,0.15)', color: '#16a34a' }
                              : { background: 'var(--accent-dim)', color: 'var(--accent)' }
                        }
                      >
                        {o.status === 'cancelled' ? t('adm.status.cancelled') : o.paymentStatus === 'paid' ? t('adm.dash.statusPaid') : t('adm.dash.statusUnpaid')}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="card-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t('adm.dash.toDo')}</h3>
            {openTasks === 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#16a34a' }}>
                <CheckCircle2 size={13} strokeWidth={2.2} /> {t('adm.dash.allDone')}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>{openTasks}</span>
            )}
          </div>
          <ul className="space-y-1.5">
            {tasks.map(task => {
              const Icon = task.icon;
              const active = task.count > 0;
              return (
                <li key={task.labelKey}>
                  <Link
                    href={task.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors hover:bg-[var(--accent-dim)]"
                    style={{ opacity: active ? 1 : 0.55 }}
                  >
                    <span
                      className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg"
                      style={{ background: active ? 'var(--accent-dim)' : 'var(--bg-base)', color: active ? 'var(--accent)' : 'var(--text-muted)' }}
                    >
                      <Icon size={15} strokeWidth={2} />
                    </span>
                    <span className="flex-1 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t(task.labelKey)}</span>
                    <span className="text-sm font-bold font-display" style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}>{task.count}</span>
                    <ChevronRight size={14} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-4 ${showRevenue && showInventory ? 'lg:grid-cols-2' : ''}`}>
      {/* Where the money stands */}
      {showRevenue && (
        <div className="card-surface p-5 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t('adm.dash.cashStatus')}</h3>
            <Link href="/admin/doanh-thu" className="text-xs font-semibold inline-flex items-center gap-0.5" style={{ color: 'var(--accent)' }}>
              {t('adm.dash.report')} <ChevronRight size={13} strokeWidth={2} />
            </Link>
          </div>

          {flowTotal === 0 ? (
            <p className="text-xs py-8 text-center" style={{ color: 'var(--text-secondary)' }}>{t('adm.dash.noTx')}</p>
          ) : (
            <>
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5" role="img" aria-label={t('adm.dash.flowAria')}>
                {flow.filter(seg => seg.value > 0).map(seg => (
                  <span key={seg.labelKey} style={{ width: `${(seg.value / flowTotal) * 100}%`, background: seg.color }} />
                ))}
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mt-5">
                {flow.map(seg => (
                  <li key={seg.labelKey} className="flex items-start gap-2.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: seg.color }} aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{t('adm.dash.flowCount', { label: t(seg.labelKey), n: seg.count })}</p>
                      <p className="text-sm font-bold font-display truncate" style={{ color: 'var(--text-primary)' }}>
                        {seg.value.toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* Stock that needs attention */}
      {showInventory && (
        <div className="card-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t('adm.dash.needRestock')}</h3>
            <Link href="/admin/kho" className="text-xs font-semibold inline-flex items-center gap-0.5" style={{ color: 'var(--accent)' }}>
              {t('adm.dash.openInventory')} <ChevronRight size={13} strokeWidth={2} />
            </Link>
          </div>

          {needRestock.length === 0 ? (
            <p className="text-xs py-8 text-center" style={{ color: 'var(--text-secondary)' }}>{t('adm.dash.allStocked')}</p>
          ) : (
            <ul className={`grid grid-cols-1 gap-x-8 gap-y-4 ${showRevenue ? '' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
              {needRestock.slice(0, 9).map(p => {
                const out = p.stock === 0;
                return (
                  <li key={p.id} className="flex items-center gap-3 min-w-0">
                    <div className="media-well relative w-11 h-11 shrink-0 rounded-xl overflow-hidden">
                      <ProductImage src={p.image} alt={p.name} imgClassName="object-contain p-1" iconSize={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                      <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }} aria-hidden="true">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.max(out ? 0 : 8, (p.stock / Math.max(1, lowStockLevel(p))) * 100)}%`, background: out ? 'var(--danger)' : '#f59e0b' }}
                        />
                      </div>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
                      style={{ background: out ? 'rgba(214,69,80,0.12)' : 'rgba(245,158,11,0.15)', color: out ? 'var(--danger)' : '#b45309' }}
                    >
                      {out ? t('adm.dash.outOfStock') : t('adm.dash.left', { n: p.stock })}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      </div>
    </AdminShell>
  );
}
