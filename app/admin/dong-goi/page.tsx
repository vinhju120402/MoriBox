'use client';

import { useState } from 'react';
import { Printer, PackageCheck, Truck, RefreshCw, Phone, MapPin, Hourglass } from 'lucide-react';
import AdminShell from '../../../components/admin-shell';
import { usePackingList, PackingOrder } from '../../../hooks/use-packing-list';
import { paymentLabelKey } from '../../../lib/payments';
import { useLanguage } from '../../../hooks/use-language';
import type { DictionaryKey } from '../../../app/i18n/dictionary';

type Tab = 'pending' | 'confirmed' | 'shipping';
const TABS: { value: Tab; label: DictionaryKey; empty: DictionaryKey }[] = [
  { value: 'pending', label: 'adm.pack.tab.pending', empty: 'adm.pack.tab.pendingEmpty' },
  { value: 'confirmed', label: 'adm.pack.tab.confirmed', empty: 'adm.pack.tab.confirmedEmpty' },
  { value: 'shipping', label: 'adm.pack.tab.shipping', empty: 'adm.pack.tab.shippingEmpty' },
];

const awaitingPayment = (o: PackingOrder) => o.paymentMethod !== 'cod' && o.paymentStatus !== 'paid';

function describeError(raw: string): DictionaryKey {
  if (raw.includes('awaiting_payment')) return 'adm.pack.err.awaitingPayment';
  if (raw.includes('order_cancelled')) return 'adm.pack.err.cancelled';
  return 'adm.pack.err.generic';
}

export default function PackingPage() {
  const { orders, hasLoaded, reload, setStatus } = usePackingList();
  const { language, t } = useLanguage();
  const [tab, setTab] = useState<Tab>('pending');
  const [message, setMessage] = useState('');

  const visible = orders.filter(o => o.status === tab);
  const activeTab = TABS.find(x => x.value === tab) ?? TABS[0];

  // Units to pick across every order still waiting to be packed.
  const pickTotals = new Map<string, number>();
  for (const o of orders.filter(x => x.status === 'pending' && !awaitingPayment(x))) {
    for (const i of o.items) pickTotals.set(i.name, (pickTotals.get(i.name) ?? 0) + i.quantity);
  }
  const pickList = [...pickTotals.entries()].sort((a, b) => b[1] - a[1]);

  const move = async (o: PackingOrder, to: 'confirmed' | 'shipping') => {
    setMessage('');
    const r = await setStatus(o.id, to);
    if (!r.ok) setMessage(t(describeError(r.error)));
  };

  return (
    <AdminShell
      active="dong-goi"
      title={t('adm.pack.title')}
      description={t('adm.pack.desc')}
      actions={
        <div className="flex items-center gap-2">
          <button onClick={reload} className="btn-outline px-3 py-2 text-xs font-semibold cursor-pointer flex items-center gap-1.5">
            <RefreshCw size={13} strokeWidth={2} /> {t('adm.pack.reload')}
          </button>
          <button onClick={() => window.print()} className="btn-primary px-3 py-2 text-xs font-semibold cursor-pointer flex items-center gap-1.5">
            <Printer size={13} strokeWidth={2} /> {t('adm.pack.print')}
          </button>
        </div>
      }
    >
      {message && (
        <p role="alert" className="mb-4 p-3 rounded-xl text-xs font-medium print:hidden" style={{ background: 'var(--accent-dim)', color: 'var(--danger)' }}>{message}</p>
      )}

      {/* Pick list: totals per product for everything waiting to be packed */}
      {pickList.length > 0 && (
        <div className="card-surface p-5 mb-6">
          <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{t('adm.pack.pickTotal', { n: pickList.reduce((a, [, n]) => a + n, 0) })}</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5">
            {pickList.map(([name, qty]) => (
              <li key={name} className="flex justify-between gap-3 text-xs">
                <span style={{ color: 'var(--text-secondary)' }}>{name}</span>
                <span className="font-bold" style={{ color: 'var(--accent)' }}>× {qty}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4 print:hidden" role="tablist" aria-label={t('adm.pack.tabsAria')}>
        {TABS.map(tb => (
          <button
            key={tb.value}
            role="tab"
            aria-selected={tab === tb.value}
            onClick={() => setTab(tb.value)}
            className={`filter-pill px-3.5 py-1.5 text-xs font-semibold cursor-pointer${tab === tb.value ? ' active' : ''}`}
          >
            {t(tb.label)} <span className="opacity-60">({orders.filter(o => o.status === tb.value).length})</span>
          </button>
        ))}
      </div>

      {!hasLoaded ? (
        <p className="py-12 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>{t('adm.pack.loading')}</p>
      ) : visible.length === 0 ? (
        <div className="card-surface py-14 text-center">
          <PackageCheck size={26} strokeWidth={1.8} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t(activeTab.empty)}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visible.map(o => {
            const blocked = o.status === 'pending' && awaitingPayment(o);
            return (
              <article key={o.id} className="card-surface p-5 break-inside-avoid">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{o.code}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{new Date(o.createdAt).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')}</p>
                  </div>
                  <span
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
                    style={blocked
                      ? { background: 'rgba(220,38,38,0.12)', color: '#dc2626' }
                      : { background: 'rgba(34,197,94,0.15)', color: '#16a34a' }}
                  >
                    {o.paymentMethod === 'cod' ? 'COD' : o.paymentStatus === 'paid' ? t('adm.pack.badgePaid', { method: t(paymentLabelKey(o.paymentMethod)) }) : t('adm.pack.badgeWaiting', { method: t(paymentLabelKey(o.paymentMethod)) })}
                  </span>
                </div>

                <ul className="mt-4 space-y-2">
                  {o.items.map((i, idx) => (
                    <li key={`${i.productId}-${idx}`} className="flex items-center justify-between gap-3 text-xs">
                      <span className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <span className="w-4 h-4 rounded border shrink-0" style={{ borderColor: 'var(--border-strong)' }} aria-hidden="true" />
                        {i.name}
                      </span>
                      <span className="font-bold" style={{ color: 'var(--accent)' }}>× {i.quantity}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 pt-4 space-y-1.5 text-xs" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{o.customerName}</p>
                  <p className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}><Phone size={12} strokeWidth={2} /> {o.phone}</p>
                  <p className="flex items-start gap-1.5" style={{ color: 'var(--text-secondary)' }}><MapPin size={12} strokeWidth={2} className="mt-0.5 shrink-0" /> {o.address}, {o.sector}</p>
                </div>

                {o.status !== 'shipping' && (
                  <div className="mt-4 print:hidden">
                    {blocked ? (
                      <p className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: '#dc2626' }}>
                        <Hourglass size={13} strokeWidth={2} /> {t('adm.pack.blocked')}
                      </p>
                    ) : o.status === 'pending' ? (
                      <button onClick={() => move(o, 'confirmed')} className="btn-primary w-full py-2.5 text-xs font-semibold cursor-pointer flex items-center justify-center gap-2">
                        <PackageCheck size={14} strokeWidth={2} /> {t('adm.pack.markPacked')}
                      </button>
                    ) : (
                      <button onClick={() => move(o, 'shipping')} className="btn-primary w-full py-2.5 text-xs font-semibold cursor-pointer flex items-center justify-center gap-2">
                        <Truck size={14} strokeWidth={2} /> {t('adm.pack.markShipped')}
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
