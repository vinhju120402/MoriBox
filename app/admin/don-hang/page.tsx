'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Printer, Truck, PackageCheck, CheckCheck, ChevronDown } from 'lucide-react';
import AdminShell from '../../../components/admin-shell';
import Pagination, { paginate } from '../../../components/pagination';
import { useOrders, Order, OrderStatus } from '../../../hooks/use-orders';
import { useAuth } from '../../../hooks/use-auth';
import { paymentLabelKey, paymentStatusKey } from '../../../lib/payments';
import { useLanguage } from '../../../hooks/use-language';
import type { DictionaryKey } from '../../../app/i18n/dictionary';

const STATUS_TONE: Record<OrderStatus, { bg: string; fg: string }> = {
  pending: { bg: 'var(--accent-dim)', fg: 'var(--accent)' },
  confirmed: { bg: 'rgba(59,130,246,0.14)', fg: '#2563eb' },
  shipping: { bg: 'rgba(168,85,247,0.14)', fg: '#9333ea' },
  delivered: { bg: 'rgba(34,197,94,0.15)', fg: '#16a34a' },
  cancelled: { bg: 'rgba(220,38,38,0.12)', fg: '#dc2626' },
};

type Filter = 'all' | OrderStatus;
const FILTERS: { value: Filter; label: DictionaryKey }[] = [
  { value: 'all', label: 'adm.orders.filter.all' },
  { value: 'pending', label: 'adm.status.pending' },
  { value: 'confirmed', label: 'adm.status.confirmed' },
  { value: 'shipping', label: 'adm.status.shipping' },
  { value: 'delivered', label: 'adm.status.delivered' },
  { value: 'cancelled', label: 'adm.status.cancelled' },
];

const money = (v: number) => `${v.toLocaleString('vi-VN')}đ`;

const NEXT_STEP: Partial<Record<OrderStatus, { to: OrderStatus; label: DictionaryKey; icon: typeof Truck }>> = {
  pending: { to: 'confirmed', label: 'adm.orders.step.pack', icon: PackageCheck },
  confirmed: { to: 'shipping', label: 'adm.orders.step.ship', icon: Truck },
  shipping: { to: 'delivered', label: 'adm.orders.step.deliver', icon: CheckCheck },
};

// Which roles may take which step — mirrors set_order_status() in the database,
// which is what actually enforces it.
const STEP_ROLES: Record<string, string[]> = {
  confirmed: ['admin', 'warehouse'],
  shipping: ['admin', 'warehouse'],
  delivered: ['admin', 'accountant'],
};

function describeError(raw: string): DictionaryKey {
  if (raw.includes('awaiting_payment')) return 'adm.orders.err.awaitingPayment';
  if (raw.includes('order_cancelled')) return 'adm.orders.err.cancelled';
  if (raw.includes('invalid_transition')) return 'adm.orders.err.invalidTransition';
  return 'adm.orders.err.generic';
}

export default function AdminOrdersPage() {
  const { role } = useAuth();
  const { language, t } = useLanguage();
  const { orders, hasLoaded, setStatus } = useOrders();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const counts = (f: Filter) => (f === 'all' ? orders.length : orders.filter(o => o.status === f).length);

  const q = query.trim().toLowerCase();
  const rows = orders.filter(o =>
    (filter === 'all' || o.status === filter) &&
    (!q || o.code.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) ||
      o.customerEmail.toLowerCase().includes(q) || o.phone.includes(q)),
  );
  const pageRows = paginate(rows, page);

  const advance = async (o: Order, to: OrderStatus) => {
    setMessage('');
    const r = await setStatus(o.id, to);
    if (!r.ok) setMessage(t(describeError(r.error)));
  };

  return (
    <AdminShell
      active="don-hang"
      title={t('adm.orders.title')}
      description={t('adm.orders.desc')}
    >
      {message && (
        <p role="alert" className="mb-4 p-3 rounded-xl text-xs font-medium" style={{ background: 'var(--accent-dim)', color: 'var(--danger)' }}>{message}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('adm.orders.filterAria')}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => { setFilter(f.value); setPage(1); }}
              aria-pressed={filter === f.value}
              className={`filter-pill px-3.5 py-1.5 text-xs font-semibold cursor-pointer${filter === f.value ? ' active' : ''}`}
            >
              {t(f.label)} <span className="opacity-60">({counts(f.value)})</span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={14} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder={t('adm.orders.searchPh')}
            aria-label={t('adm.orders.searchAria')}
            className="input-field w-full pl-9 pr-3 py-2 text-xs"
          />
        </div>
      </div>

      <div className="card-surface overflow-hidden">
        {!hasLoaded ? (
          <p className="py-12 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>{t('adm.orders.loading')}</p>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
            {orders.length === 0 ? t('adm.orders.empty') : t('adm.orders.noMatch')}
          </p>
        ) : (
          <ul>
            {pageRows.map(o => {
              const open = openId === o.id;
              const tone = STATUS_TONE[o.status];
              const step = NEXT_STEP[o.status];
              const canStep = !!step && role !== undefined && (STEP_ROLES[step.to] ?? []).includes(role);
              const waitingPayment = o.status === 'pending' && o.paymentMethod !== 'cod' && o.paymentStatus !== 'paid';
              const StepIcon = step?.icon;
              return (
                <li key={o.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center gap-3 px-4 py-3.5 flex-wrap">
                    <button
                      onClick={() => setOpenId(open ? null : o.id)}
                      aria-expanded={open}
                      aria-label={t('adm.orders.detailAria', { code: o.code })}
                      className="btn-ghost p-1.5 cursor-pointer"
                    >
                      <ChevronDown size={15} strokeWidth={2} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>
                    <div className="min-w-[8rem]">
                      <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{o.code}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{new Date(o.date).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')}</p>
                    </div>
                    <div className="flex-1 min-w-[10rem]">
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{o.customerName}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{o.phone} · {o.sector}</p>
                    </div>
                    <div className="text-right min-w-[7rem]">
                      <p className="text-xs font-bold" style={{ color: 'var(--accent)' }}>{money(o.total)}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {t(paymentLabelKey(o.paymentMethod))} · {o.status === 'cancelled' ? t('adm.orders.cancelledLower') : o.paymentStatus === 'paid' ? t('adm.orders.collectedLower') : t('adm.orders.uncollectedLower')}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap" style={{ background: tone.bg, color: tone.fg }}>
                      {t(`adm.status.${o.status}`)}
                    </span>
                    <div className="flex items-center gap-1.5 ml-auto">
                      {step && StepIcon && canStep && (
                        <button
                          onClick={() => advance(o, step.to)}
                          disabled={waitingPayment && step.to === 'confirmed'}
                          title={waitingPayment && step.to === 'confirmed' ? t('adm.orders.waitingTransfer') : undefined}
                          className="btn-primary px-3 py-1.5 text-[11px] font-semibold cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <StepIcon size={13} strokeWidth={2} /> {t(step.label)}
                        </button>
                      )}
                      <Link href={`/admin/hoa-don/${o.id}`} className="btn-outline p-2 cursor-pointer" aria-label={t('adm.orders.printAria', { code: o.code })} title={t('adm.orders.printTitle')}>
                        <Printer size={14} strokeWidth={2} />
                      </Link>
                    </div>
                  </div>

                  {open && (
                    <div className="px-4 pb-4 pl-14 grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                      <div>
                        <p className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{t('adm.orders.products')}</p>
                        <ul className="space-y-1.5">
                          {o.items.map((i, idx) => (
                            <li key={`${i.productId}-${idx}`} className="flex justify-between gap-3">
                              <span style={{ color: 'var(--text-secondary)' }}>{i.name} × {i.quantity}</span>
                              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{money(i.price * i.quantity)}</span>
                            </li>
                          ))}
                          {o.discount > 0 && (
                            <li className="flex justify-between gap-3">
                              <span style={{ color: 'var(--text-secondary)' }}>{t('adm.orders.discount')}{o.couponCode ? ` (${o.couponCode})` : ''}</span>
                              <span style={{ color: '#16a34a' }}>-{money(o.discount)}</span>
                            </li>
                          )}
                          <li className="flex justify-between gap-3">
                            <span style={{ color: 'var(--text-secondary)' }}>{t('adm.orders.shippingFee')}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{money(o.shippingFee)}</span>
                          </li>
                        </ul>
                      </div>
                      <div className="space-y-1.5">
                        <p className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{t('adm.orders.shipPay')}</p>
                        <p style={{ color: 'var(--text-secondary)' }}><span style={{ color: 'var(--text-muted)' }}>{t('adm.orders.recipient')}</span>{o.customerName} · {o.phone}</p>
                        <p style={{ color: 'var(--text-secondary)' }}><span style={{ color: 'var(--text-muted)' }}>{t('adm.orders.address')}</span>{o.address}, {o.sector}</p>
                        <p style={{ color: 'var(--text-secondary)' }}><span style={{ color: 'var(--text-muted)' }}>{t('adm.orders.email')}</span>{o.customerEmail || '—'}</p>
                        <p style={{ color: 'var(--text-secondary)' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{t('adm.orders.payment')}</span>
                          {t(paymentLabelKey(o.paymentMethod))} · {t(paymentStatusKey(o.paymentStatus))}
                        </p>
                        {o.paymentStatus === 'refunded' && o.refundNote && (
                          <p style={{ color: 'var(--text-secondary)' }}><span style={{ color: 'var(--text-muted)' }}>{t('adm.orders.refundNote')}</span>{o.refundNote}</p>
                        )}
                        {waitingPayment && (
                          <p className="font-medium" style={{ color: 'var(--accent)' }}>{t('adm.orders.waitingBeforePack')}</p>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <Pagination page={page} total={rows.length} onChange={setPage} />
      </div>
    </AdminShell>
  );
}
