'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck, Hourglass, Undo2, Receipt, Search, TrendingUp, Download, X } from 'lucide-react';
import AdminShell from '../../../components/admin-shell';
import AdminStat from '../../../components/admin-stat';
import RevenueChart from '../../../components/revenue-chart';
import Pagination, { paginate } from '../../../components/pagination';
import { useOrders, Order } from '../../../hooks/use-orders';
import { getSupabase } from '../../../lib/supabase';
import { downloadCsv } from '../../../lib/csv';
import { paymentLabelKey, paymentStatusKey, PaymentMethodId } from '../../../lib/payments';
import { useLanguage } from '../../../hooks/use-language';
import type { DictionaryKey } from '../../i18n/dictionary';

type Period = 7 | 30 | 90 | 'custom';
type StatusFilter = 'all' | 'unpaid' | 'paid' | 'cancelled' | 'refund' | 'cod_due';

const PERIODS: { value: Period; labelKey: DictionaryKey }[] = [
  { value: 7, labelKey: 'adm.rev.period7' },
  { value: 30, labelKey: 'adm.rev.period30' },
  { value: 90, labelKey: 'adm.rev.period90' },
  { value: 'custom', labelKey: 'adm.rev.periodCustom' },
];

const STATUS_FILTERS: { value: StatusFilter; labelKey: DictionaryKey; match: (o: Order) => boolean }[] = [
  { value: 'all', labelKey: 'adm.rev.filter.all', match: () => true },
  { value: 'unpaid', labelKey: 'adm.rev.filter.unpaid', match: o => o.status !== 'cancelled' && o.paymentStatus === 'unpaid' },
  { value: 'paid', labelKey: 'adm.rev.filter.paid', match: o => o.status !== 'cancelled' && o.paymentStatus === 'paid' },
  // COD that the courier has (or has delivered) but whose cash we have not confirmed yet.
  { value: 'cod_due', labelKey: 'adm.rev.filter.codDue', match: o => o.paymentMethod === 'cod' && (o.status === 'shipping' || o.status === 'delivered') && o.paymentStatus === 'unpaid' },
  { value: 'cancelled', labelKey: 'adm.rev.filter.cancelled', match: o => o.status === 'cancelled' },
  {
    value: 'refund',
    labelKey: 'adm.rev.filter.refund',
    match: o => o.paymentStatus === 'refunded' || (o.status === 'cancelled' && o.paymentStatus === 'paid') || (o.cancelRequested && o.status !== 'cancelled'),
  },
];

const money = (v: number) => `${v.toLocaleString('vi-VN')}đ`;
const DAY = 86_400_000;

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
const inputDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseInputDate = (v: string) => new Date(`${v}T00:00:00`);

// "Doanh thu" is the financial report: money collected vs still owed vs refunded,
// where it comes from, and what sells. Day-to-day work lives on "Tổng quan".
export default function AdminRevenuePage() {
  const { orders, setPaymentStatus, cancel } = useOrders();
  const { t, language } = useLanguage();
  const locale = language === 'en' ? 'en-US' : 'vi-VN';
  const [period, setPeriod] = useState<Period>(30);
  const [customFrom, setCustomFrom] = useState(() => inputDate(new Date(Date.now() - 29 * DAY)));
  const [customTo, setCustomTo] = useState(() => inputDate(new Date()));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [refunding, setRefunding] = useState<Order | null>(null);
  const [refundNote, setRefundNote] = useState('');
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundError, setRefundError] = useState('');
  const [profit, setProfit] = useState<{ itemsRevenue: number; discounts: number; cogs: number } | null>(null);

  // ── Selected range and the equally long range right before it ─────
  const validCustom = period === 'custom' && customFrom && customTo && parseInputDate(customFrom) <= parseInputDate(customTo);
  const end = endOfDay(period === 'custom' ? (validCustom ? parseInputDate(customTo) : new Date()) : new Date());
  const start = period === 'custom'
    ? (validCustom ? startOfDay(parseInputDate(customFrom)) : startOfDay(new Date(end.getTime() - 29 * DAY)))
    : startOfDay(new Date(end.getTime() - (period - 1) * DAY));
  const rangeDays = Math.round((startOfDay(end).getTime() - start.getTime()) / DAY) + 1;
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(start.getTime() - rangeDays * DAY);

  const within = (o: Order, from: Date, to: Date) => { const ms = new Date(o.date).getTime(); return ms >= from.getTime() && ms <= to.getTime(); };
  const inPeriod = orders.filter(o => within(o, start, end));
  const prevOrders = orders.filter(o => within(o, prevStart, prevEnd));

  // Revenue = money actually received. Unpaid orders are receivable; a cancelled
  // order that was paid is money to give back, not revenue.
  const collectedOf = (list: Order[]) => list.filter(o => o.status !== 'cancelled' && o.paymentStatus === 'paid').reduce((acc, o) => acc + o.total, 0);
  const live = inPeriod.filter(o => o.status !== 'cancelled');
  const paidOrders = live.filter(o => o.paymentStatus === 'paid');
  const collected = collectedOf(inPeriod);
  const prevCollected = collectedOf(prevOrders);
  const receivable = live.filter(o => o.paymentStatus === 'unpaid').reduce((acc, o) => acc + o.total, 0);
  const refunded = inPeriod.filter(o => o.paymentStatus === 'refunded').reduce((acc, o) => acc + o.total, 0);
  const toRefund = inPeriod.filter(o => o.status === 'cancelled' && o.paymentStatus === 'paid').reduce((acc, o) => acc + o.total, 0);
  const avgOrder = live.length > 0 ? Math.round(live.reduce((acc, o) => acc + o.total, 0) / live.length) : 0;

  const delta = prevCollected > 0 ? ((collected - prevCollected) / prevCollected) * 100 : null;
  const deltaText = delta === null
    ? (collected > 0 ? t('adm.rev.noPrev') : t('adm.rev.paidOrders', { n: paidOrders.length }))
    : t('adm.rev.vsPrev', { arrow: delta >= 0 ? '▲' : '▼', pct: Math.abs(delta).toFixed(0) });

  // Gross profit comes from the server (cost prices never reach the browser).
  const startMs = start.getTime();
  const endMs = end.getTime();
  useEffect(() => {
    let cancelled = false;
    getSupabase()
      .rpc('get_profit', { p_from: new Date(startMs).toISOString(), p_to: new Date(endMs + 1).toISOString() })
      .then(({ data, error }) => {
        if (cancelled) return;
        setProfit(error || !data ? null : { itemsRevenue: data.items_revenue, discounts: data.discounts, cogs: data.cogs });
      });
    return () => { cancelled = true; };
  }, [startMs, endMs]);
  const grossProfit = profit ? profit.itemsRevenue - profit.discounts - profit.cogs : null;

  // ── Breakdown by payment method (share of live order value) ───────
  const liveValue = live.reduce((acc, o) => acc + o.total, 0);
  const methods = (['cod', 'bank_transfer'] as PaymentMethodId[]).map(id => {
    const group = live.filter(o => o.paymentMethod === id);
    const value = group.reduce((acc, o) => acc + o.total, 0);
    const paid = group.filter(o => o.paymentStatus === 'paid').reduce((acc, o) => acc + o.total, 0);
    return { id, count: group.length, value, paid, share: liveValue > 0 ? (value / liveValue) * 100 : 0 };
  });

  // ── Top products by revenue ───────────────────────────────────────
  const productMap = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const o of live) {
    for (const i of o.items) {
      const key = i.productId || i.name;
      const row = productMap.get(key) ?? { name: i.name, qty: 0, revenue: 0 };
      row.qty += i.quantity;
      row.revenue += i.price * i.quantity;
      productMap.set(key, row);
    }
  }
  const topProducts = [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const topMax = Math.max(1, ...topProducts.map(p => p.revenue));

  // ── Order table: status filter + search, within the period ─────────
  const activeFilter = STATUS_FILTERS.find(f => f.value === statusFilter) ?? STATUS_FILTERS[0];
  const q = query.trim().toLowerCase();
  const rows = inPeriod.filter(o =>
    activeFilter.match(o) &&
    (!q || o.code.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || o.customerEmail.toLowerCase().includes(q)),
  );
  const pageRows = paginate(rows, page);

  const awaitingRefund = orders.filter(o => o.status === 'cancelled' && o.paymentStatus === 'paid').length;
  const cancelRequests = orders.filter(o => o.cancelRequested && o.status !== 'cancelled').length;

  const handleCancel = async (id: string, code: string, paid: boolean) => {
    const msg = paid ? t('adm.rev.confirmCancelPaid', { code }) : t('adm.rev.confirmCancel', { code });
    if (!window.confirm(msg)) return;
    const r = await cancel(id);
    if (!r.ok) window.alert(t('adm.rev.cancelFail'));
  };

  const openRefund = (o: Order) => { setRefundNote(''); setRefundError(''); setRefunding(o); };

  const submitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refunding) return;
    if (refundNote.trim().length < 3) { setRefundError(t('adm.rev.refundNoteErr')); return; }
    setRefundBusy(true);
    const ok = await setPaymentStatus(refunding.id, 'refunded', refundNote);
    setRefundBusy(false);
    if (!ok) { setRefundError(t('adm.rev.updateFail')); return; }
    setRefunding(null);
  };

  const exportCsv = () => {
    downloadCsv(`don-hang-${inputDate(start)}_${inputDate(end)}.csv`, [
      (['code', 'date', 'customer', 'email', 'phone', 'itemCount', 'subtotal', 'discount', 'coupon', 'shipping', 'total', 'payment', 'paymentStatus', 'orderStatus', 'refundNote'] as const).map(c => t(`adm.rev.csv.${c}`)),
      ...rows.map(o => [
        o.code, new Date(o.date).toLocaleString(locale), o.customerName, o.customerEmail, o.phone,
        o.items.reduce((acc, i) => acc + i.quantity, 0), o.subtotal, o.discount, o.couponCode ?? '', o.shippingFee, o.total,
        t(paymentLabelKey(o.paymentMethod)), t(paymentStatusKey(o.paymentStatus)), t(`adm.status.${o.status}`), o.refundNote ?? '',
      ]),
    ]);
  };

  const rangeLabel = `${start.toLocaleDateString(locale)} – ${end.toLocaleDateString(locale)}`;

  return (
    <AdminShell
      active="doanh-thu"
      title={t('adm.rev.title')}
      description={t('adm.rev.desc')}
      actions={
        <div role="group" aria-label={t('adm.rev.periodAria')} className="flex rounded-full p-0.5 flex-wrap" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          {PERIODS.map(p => {
            const active = p.value === period;
            return (
              <button
                key={String(p.value)}
                onClick={() => { setPeriod(p.value); setPage(1); }}
                aria-pressed={active}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-full cursor-pointer transition-colors"
                style={{ background: active ? 'var(--accent)' : 'transparent', color: active ? '#fff' : 'var(--text-secondary)' }}
              >
                {t(p.labelKey)}
              </button>
            );
          })}
        </div>
      }
    >
      {period === 'custom' && (
        <div className="card-surface p-4 mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="r-from" className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('adm.rev.from')}</label>
            <input id="r-from" type="date" value={customFrom} max={customTo || undefined} onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }} className="input-field px-3 py-2 text-xs" />
          </div>
          <div>
            <label htmlFor="r-to" className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('adm.rev.to')}</label>
            <input id="r-to" type="date" value={customTo} min={customFrom || undefined} max={inputDate(new Date())} onChange={(e) => { setCustomTo(e.target.value); setPage(1); }} className="input-field px-3 py-2 text-xs" />
          </div>
          {!validCustom && <p role="alert" className="text-xs font-medium" style={{ color: 'var(--danger)' }}>{t('adm.rev.invalidRange')}</p>}
        </div>
      )}
      <p className="text-[11px] mb-4" style={{ color: 'var(--text-muted)' }}>{t('adm.rev.range', { range: rangeLabel, days: rangeDays })}</p>

      {(awaitingRefund > 0 || cancelRequests > 0) && (
        <div role="status" className="mb-4 p-3 rounded-xl text-xs font-medium" style={{ background: 'var(--accent-dim)', color: 'var(--text-primary)' }}>
          {cancelRequests > 0 && <span>{t('adm.rev.cancelRequests', { n: cancelRequests })}</span>}
          {awaitingRefund > 0 && <span>{t('adm.rev.awaitingRefund', { n: awaitingRefund })}</span>}
        </div>
      )}

      {/* Money position for the period */}
      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))' }}>
        <AdminStat label={t('adm.rev.collected')} value={money(collected)} hint={deltaText} icon={<BadgeCheck size={20} strokeWidth={2} />} />
        <AdminStat label={t('adm.rev.receivable')} value={money(receivable)} hint={t('adm.rev.receivableHint')} icon={<Hourglass size={20} strokeWidth={2} />} tone={receivable > 0 ? 'danger' : 'default'} />
        <AdminStat
          label={t('adm.rev.grossProfit')}
          value={grossProfit === null ? '—' : money(grossProfit)}
          hint={profit === null ? t('adm.rev.calculating') : profit.cogs === 0 ? t('adm.rev.noCost') : t('adm.rev.cogs', { v: money(profit.cogs) })}
          icon={<TrendingUp size={20} strokeWidth={2} />}
          tone={grossProfit !== null && grossProfit < 0 ? 'danger' : 'default'}
        />
        <AdminStat
          label={t('adm.rev.refunded')}
          value={money(refunded)}
          hint={toRefund > 0 ? t('adm.rev.pendingRefund', { v: money(toRefund) }) : t('adm.rev.noPendingRefund')}
          icon={<Undo2 size={20} strokeWidth={2} />}
          tone={toRefund > 0 ? 'danger' : 'default'}
        />
        <AdminStat label={t('adm.rev.avgOrder')} value={money(avgOrder)} hint={t('adm.rev.ordersInPeriod', { n: live.length })} icon={<Receipt size={20} strokeWidth={2} />} />
      </div>

      <div className="mb-6">
        <RevenueChart orders={orders} days={Math.min(rangeDays, 90)} endDate={end} />
      </div>

      {/* Where the money comes from + what sells */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card-surface p-5">
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('adm.rev.byMethod')}</h3>
          {live.length === 0 ? (
            <p className="text-xs py-6 text-center" style={{ color: 'var(--text-secondary)' }}>{t('adm.rev.noOrdersPeriod')}</p>
          ) : (
            <ul className="space-y-4">
              {methods.map(m => (
                <li key={m.id}>
                  <div className="flex items-baseline justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {t(paymentLabelKey(m.id))} <span className="font-normal" style={{ color: 'var(--text-muted)' }}>· {t('adm.rev.ordersCount', { n: m.count })}</span>
                    </span>
                    <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>{m.share.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }} aria-hidden="true">
                    <div className="h-full rounded-full" style={{ width: `${m.share}%`, background: 'linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 60%, transparent))' }} />
                  </div>
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                    {t('adm.rev.methodTotals', { total: money(m.value), paid: money(m.paid) })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card-surface p-5">
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('adm.rev.topProducts')}</h3>
          {topProducts.length === 0 ? (
            <p className="text-xs py-6 text-center" style={{ color: 'var(--text-secondary)' }}>{t('adm.rev.noOrdersPeriod')}</p>
          ) : (
            <ol className="space-y-3.5">
              {topProducts.map((p, idx) => (
                <li key={p.name} className="flex items-center gap-3">
                  <span className="w-5 text-center text-xs font-bold font-hud" style={{ color: idx === 0 ? 'var(--accent)' : 'var(--text-muted)' }}>{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                      <span className="text-xs font-bold shrink-0" style={{ color: 'var(--text-primary)' }}>{money(p.revenue)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }} aria-hidden="true">
                      <div className="h-full rounded-full" style={{ width: `${(p.revenue / topMax) * 100}%`, background: idx === 0 ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 50%, transparent)' }} />
                    </div>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{t('adm.rev.sold', { n: p.qty })}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Orders — filterable ledger */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('adm.rev.filterAria')}>
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1); }}
              aria-pressed={statusFilter === f.value}
              className={`filter-pill px-3.5 py-1.5 text-xs font-semibold cursor-pointer${statusFilter === f.value ? ' active' : ''}`}
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-full sm:w-56">
            <Search size={14} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder={t('adm.rev.searchPlaceholder')}
              aria-label={t('adm.rev.searchAria')}
              className="input-field w-full pl-9 pr-3 py-2 text-xs"
            />
          </div>
          <button onClick={exportCsv} disabled={rows.length === 0} className="btn-outline px-3 py-2 text-xs font-semibold cursor-pointer flex items-center gap-1.5">
            <Download size={13} strokeWidth={2} /> {t('adm.rev.exportCsv')}
          </button>
        </div>
      </div>

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {(['code', 'customer', 'email', 'date', 'items', 'total', 'payment', 'actions'] as const).map(h => (
                  <th key={h} className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-muted)' }}>{t(`adm.rev.col.${h}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center" style={{ color: 'var(--text-secondary)' }}>
                    {orders.length === 0 ? t('adm.rev.noOrdersAtAll') : t('adm.rev.noMatch')}
                  </td>
                </tr>
              ) : (
                pageRows.map(o => (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>{o.code}</td>
                    <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>{o.customerName}</td>
                    <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>{o.customerEmail}</td>
                    <td className="py-3 px-4 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(o.date).toLocaleString(locale)}
                    </td>
                    <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>
                      {o.items.reduce((acc, i) => acc + i.quantity, 0)}
                    </td>
                    <td className="py-3 px-4 font-bold whitespace-nowrap" style={{ color: 'var(--accent)' }}>{money(o.total)}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t(paymentLabelKey(o.paymentMethod))}</span>
                      {o.status === 'cancelled' ? (
                        <>
                          <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626' }}>{t('adm.rev.badgeCancelled')}</span>
                          {o.paymentStatus === 'paid' && (
                            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>{t('adm.rev.badgeToRefund')}</span>
                          )}
                          {o.paymentStatus === 'refunded' && (
                            <>
                              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(34,197,94,0.15)', color: '#16a34a' }}>{t('adm.rev.badgeRefunded')}</span>
                              {o.refundNote && <p className="text-[10px] mt-1 max-w-[16rem] whitespace-normal" style={{ color: 'var(--text-muted)' }}>{t('adm.rev.note', { note: o.refundNote })}</p>}
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <span
                            className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{
                              background: o.paymentStatus === 'paid' ? 'rgba(34,197,94,0.15)' : 'var(--accent-dim)',
                              color: o.paymentStatus === 'paid' ? '#16a34a' : 'var(--accent)',
                            }}
                          >
                            {t(paymentStatusKey(o.paymentStatus))}
                          </span>
                          {o.cancelRequested && (
                            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626' }}>{t('adm.rev.badgeCancelReq')}</span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {o.status !== 'cancelled' && o.paymentStatus === 'unpaid' && (
                          <button
                            onClick={async () => {
                              if (!window.confirm(t('adm.rev.confirmReceived', { amount: money(o.total), code: o.code }))) return;
                              if (!(await setPaymentStatus(o.id, 'paid'))) window.alert(t('adm.rev.updateFail'));
                            }}
                            className="btn-outline px-3 py-1 text-[10px] font-semibold cursor-pointer whitespace-nowrap"
                          >
                            {t('adm.rev.received')}
                          </button>
                        )}
                        {(o.status === 'pending' || o.status === 'confirmed') && (
                          <button
                            onClick={() => handleCancel(o.id, o.code, o.paymentStatus === 'paid')}
                            className="px-3 py-1 text-[10px] font-semibold rounded-full cursor-pointer whitespace-nowrap"
                            style={{ border: '1px solid var(--danger)', color: 'var(--danger)' }}
                          >
                            {t('adm.rev.cancelOrder')}
                          </button>
                        )}
                        {o.status === 'cancelled' && o.paymentStatus === 'paid' && (
                          <button
                            onClick={() => openRefund(o)}
                            className="btn-outline px-3 py-1 text-[10px] font-semibold cursor-pointer whitespace-nowrap"
                          >
                            {t('adm.rev.markRefunded')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={rows.length} onChange={setPage} />
      </div>

      {refunding && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(20,22,26,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => !refundBusy && setRefunding(null)}>
          <div className="card-surface w-full max-w-md p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('adm.rev.refundDialog')}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold font-display" style={{ color: 'var(--text-primary)' }}>{t('adm.rev.refundTitle')}</h2>
              <button onClick={() => setRefunding(null)} className="btn-ghost p-1.5 cursor-pointer" aria-label={t('adm.rev.close')}><X size={18} strokeWidth={2} /></button>
            </div>
            <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {t('adm.rev.refundIntro', { code: refunding.code, name: refunding.customerName })}<strong style={{ color: 'var(--text-primary)' }}>{money(refunding.total)}</strong>{t('adm.rev.refundOutro')}
            </p>
            {refundError && <p role="alert" className="mb-3 p-3 rounded-xl text-xs font-medium" style={{ background: 'rgba(214,69,80,0.1)', color: 'var(--danger)' }}>{refundError}</p>}
            <form onSubmit={submitRefund} className="space-y-4">
              <div>
                <label htmlFor="refund-note" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  {t('adm.rev.refundNoteLabel')}
                </label>
                <textarea
                  id="refund-note"
                  required
                  autoFocus
                  rows={3}
                  maxLength={300}
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                  placeholder={t('adm.rev.refundNotePh')}
                  className="input-field w-full px-3 py-2.5 text-sm rounded-xl resize-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setRefunding(null)} disabled={refundBusy} className="btn-outline flex-1 py-2.5 text-sm font-semibold cursor-pointer">{t('common.cancel')}</button>
                <button type="submit" disabled={refundBusy} className="btn-primary flex-1 py-2.5 text-sm font-semibold cursor-pointer">{refundBusy ? t('adm.rev.saving') : t('adm.rev.confirmRefunded')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
