'use client';

import { useState } from 'react';
import { Printer, PackageCheck, Truck, RefreshCw, Phone, MapPin, Hourglass } from 'lucide-react';
import AdminShell from '../../../components/admin-shell';
import { usePackingList, PackingOrder } from '../../../hooks/use-packing-list';
import { PAYMENT_LABEL } from '../../../lib/payments';

type Tab = 'pending' | 'confirmed' | 'shipping';
const TABS: { value: Tab; label: string; empty: string }[] = [
  { value: 'pending', label: 'Cần đóng gói', empty: 'Không có đơn nào cần đóng gói.' },
  { value: 'confirmed', label: 'Chờ giao cho vận chuyển', empty: 'Chưa có đơn nào đã đóng gói đang chờ giao đi.' },
  { value: 'shipping', label: 'Đang giao', empty: 'Chưa có đơn nào đang giao.' },
];

const awaitingPayment = (o: PackingOrder) => o.paymentMethod !== 'cod' && o.paymentStatus !== 'paid';

function describeError(raw: string) {
  if (raw.includes('awaiting_payment')) return 'Đơn chuyển khoản này chưa nhận được tiền nên chưa thể đóng gói.';
  if (raw.includes('order_cancelled')) return 'Đơn này đã bị hủy, vui lòng tải lại danh sách.';
  return 'Không thể cập nhật. Vui lòng thử lại.';
}

export default function PackingPage() {
  const { orders, hasLoaded, reload, setStatus } = usePackingList();
  const [tab, setTab] = useState<Tab>('pending');
  const [message, setMessage] = useState('');

  const visible = orders.filter(o => o.status === tab);
  const activeTab = TABS.find(t => t.value === tab) ?? TABS[0];

  // Units to pick across every order still waiting to be packed.
  const pickTotals = new Map<string, number>();
  for (const o of orders.filter(x => x.status === 'pending' && !awaitingPayment(x))) {
    for (const i of o.items) pickTotals.set(i.name, (pickTotals.get(i.name) ?? 0) + i.quantity);
  }
  const pickList = [...pickTotals.entries()].sort((a, b) => b[1] - a[1]);

  const move = async (o: PackingOrder, to: 'confirmed' | 'shipping') => {
    setMessage('');
    const r = await setStatus(o.id, to);
    if (!r.ok) setMessage(describeError(r.error));
  };

  return (
    <AdminShell
      active="dong-goi"
      title="Đóng gói"
      description="Những gì cần soạn và giao đi. Danh sách này không hiện giá tiền."
      actions={
        <div className="flex items-center gap-2">
          <button onClick={reload} className="btn-outline px-3 py-2 text-xs font-semibold cursor-pointer flex items-center gap-1.5">
            <RefreshCw size={13} strokeWidth={2} /> Tải lại
          </button>
          <button onClick={() => window.print()} className="btn-primary px-3 py-2 text-xs font-semibold cursor-pointer flex items-center gap-1.5">
            <Printer size={13} strokeWidth={2} /> In danh sách
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
          <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Tổng hợp cần soạn ({pickList.reduce((a, [, n]) => a + n, 0)} sản phẩm)</h3>
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

      <div className="flex flex-wrap gap-2 mb-4 print:hidden" role="tablist" aria-label="Trạng thái đóng gói">
        {TABS.map(t => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={`filter-pill px-3.5 py-1.5 text-xs font-semibold cursor-pointer${tab === t.value ? ' active' : ''}`}
          >
            {t.label} <span className="opacity-60">({orders.filter(o => o.status === t.value).length})</span>
          </button>
        ))}
      </div>

      {!hasLoaded ? (
        <p className="py-12 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>Đang tải…</p>
      ) : visible.length === 0 ? (
        <div className="card-surface py-14 text-center">
          <PackageCheck size={26} strokeWidth={1.8} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{activeTab.empty}</p>
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
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{new Date(o.createdAt).toLocaleString('vi-VN')}</p>
                  </div>
                  <span
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
                    style={blocked
                      ? { background: 'rgba(220,38,38,0.12)', color: '#dc2626' }
                      : { background: 'rgba(34,197,94,0.15)', color: '#16a34a' }}
                  >
                    {o.paymentMethod === 'cod' ? 'COD' : o.paymentStatus === 'paid' ? `${PAYMENT_LABEL[o.paymentMethod]} · đã thu` : `${PAYMENT_LABEL[o.paymentMethod]} · chờ tiền`}
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
                        <Hourglass size={13} strokeWidth={2} /> Chờ nhận tiền chuyển khoản, chưa đóng gói được.
                      </p>
                    ) : o.status === 'pending' ? (
                      <button onClick={() => move(o, 'confirmed')} className="btn-primary w-full py-2.5 text-xs font-semibold cursor-pointer flex items-center justify-center gap-2">
                        <PackageCheck size={14} strokeWidth={2} /> Đã đóng gói
                      </button>
                    ) : (
                      <button onClick={() => move(o, 'shipping')} className="btn-primary w-full py-2.5 text-xs font-semibold cursor-pointer flex items-center justify-center gap-2">
                        <Truck size={14} strokeWidth={2} /> Đã giao cho vận chuyển
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
