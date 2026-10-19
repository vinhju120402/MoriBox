'use client';

import { useState } from 'react';
import { BadgeCheck, Hourglass, Undo2, Receipt, Search } from 'lucide-react';
import AdminShell from '../../../components/admin-shell';
import AdminStat from '../../../components/admin-stat';
import RevenueChart from '../../../components/revenue-chart';
import { useOrders, Order } from '../../../hooks/use-orders';
import { PAYMENT_LABEL, PAYMENT_STATUS_LABEL, PaymentMethodId } from '../../../lib/payments';

type Period = 7 | 30 | 90;
type StatusFilter = 'all' | 'unpaid' | 'paid' | 'cancelled' | 'refund';

const PERIODS: { value: Period; label: string }[] = [
  { value: 7, label: '7 ngày' },
  { value: 30, label: '30 ngày' },
  { value: 90, label: '90 ngày' },
];

const STATUS_FILTERS: { value: StatusFilter; label: string; match: (o: Order) => boolean }[] = [
  { value: 'all', label: 'Tất cả', match: () => true },
  { value: 'unpaid', label: 'Chưa thu tiền', match: o => o.status !== 'cancelled' && o.paymentStatus === 'unpaid' },
  { value: 'paid', label: 'Đã thu tiền', match: o => o.status !== 'cancelled' && o.paymentStatus === 'paid' },
  { value: 'cancelled', label: 'Đã hủy', match: o => o.status === 'cancelled' },
  {
    value: 'refund',
    label: 'Hoàn tiền',
    match: o => o.paymentStatus === 'refunded' || (o.status === 'cancelled' && o.paymentStatus === 'paid') || (o.cancelRequested && o.status !== 'cancelled'),
  },
];

const money = (v: number) => `${v.toLocaleString('vi-VN')}đ`;

// "Doanh thu" is the financial report: money collected vs still owed vs refunded,
// where it comes from, and what sells. Day-to-day work lives on "Tổng quan".
export default function AdminRevenuePage() {
  const { orders, setPaymentStatus, cancel } = useOrders();
  const [period, setPeriod] = useState<Period>(30);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');

  // ── Orders inside the selected period ──────────────────────────────
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (period - 1));
  const inPeriod = orders.filter(o => new Date(o.date) >= start);

  const live = inPeriod.filter(o => o.status !== 'cancelled');
  // Revenue = money actually received. Unpaid orders are receivable; a cancelled
  // order that was paid is money to give back, not revenue.
  const paidOrders = live.filter(o => o.paymentStatus === 'paid');
  const collected = paidOrders.reduce((acc, o) => acc + o.total, 0);
  const receivable = live.filter(o => o.paymentStatus === 'unpaid').reduce((acc, o) => acc + o.total, 0);
  const refunded = inPeriod.filter(o => o.paymentStatus === 'refunded').reduce((acc, o) => acc + o.total, 0);
  const toRefund = inPeriod.filter(o => o.status === 'cancelled' && o.paymentStatus === 'paid').reduce((acc, o) => acc + o.total, 0);
  const avgOrder = live.length > 0 ? Math.round(live.reduce((acc, o) => acc + o.total, 0) / live.length) : 0;

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

  const awaitingRefund = orders.filter(o => o.status === 'cancelled' && o.paymentStatus === 'paid').length;
  const cancelRequests = orders.filter(o => o.cancelRequested && o.status !== 'cancelled').length;

  const handleCancel = async (id: string, code: string, paid: boolean) => {
    const msg = paid
      ? `Hủy đơn ${code}? Đơn đã thu tiền: sau khi hủy, bạn cần chuyển lại tiền cho khách rồi bấm "Đã hoàn tiền".`
      : `Hủy đơn ${code}? Sản phẩm sẽ được trả lại kho.`;
    if (!window.confirm(msg)) return;
    const r = await cancel(id);
    if (!r.ok) window.alert('Không thể hủy đơn này (có thể đã giao hàng). Vui lòng thử lại.');
  };

  return (
    <AdminShell
      active="doanh-thu"
      title="Doanh thu"
      description="Báo cáo tài chính: tiền đã thu, còn chờ thu và đã hoàn lại cho khách. Đơn COD và chuyển khoản được xác nhận thủ công khi đã nhận tiền."
      actions={
        <div role="group" aria-label="Kỳ báo cáo" className="flex rounded-full p-0.5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          {PERIODS.map(p => {
            const active = p.value === period;
            return (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                aria-pressed={active}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-full cursor-pointer transition-colors"
                style={{ background: active ? 'var(--accent)' : 'transparent', color: active ? '#fff' : 'var(--text-secondary)' }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      }
    >
      {(awaitingRefund > 0 || cancelRequests > 0) && (
        <div role="status" className="mb-4 p-3 rounded-xl text-xs font-medium" style={{ background: 'var(--accent-dim)', color: 'var(--text-primary)' }}>
          {cancelRequests > 0 && <span>{cancelRequests} đơn khách yêu cầu hủy và hoàn tiền. </span>}
          {awaitingRefund > 0 && <span>{awaitingRefund} đơn đã hủy đang chờ hoàn tiền cho khách.</span>}
        </div>
      )}

      {/* Money position for the period */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AdminStat label={`Đã thu · ${period} ngày`} value={money(collected)} hint={`${paidOrders.length} đơn đã thu tiền`} icon={<BadgeCheck size={20} strokeWidth={2} />} />
        <AdminStat label="Còn chờ thu" value={money(receivable)} hint="COD chưa giao, chuyển khoản chưa về" icon={<Hourglass size={20} strokeWidth={2} />} tone={receivable > 0 ? 'danger' : 'default'} />
        <AdminStat
          label="Đã hoàn tiền"
          value={money(refunded)}
          hint={toRefund > 0 ? `Còn ${money(toRefund)} chờ hoàn` : 'Không có khoản chờ hoàn'}
          icon={<Undo2 size={20} strokeWidth={2} />}
          tone={toRefund > 0 ? 'danger' : 'default'}
        />
        <AdminStat label="Giá trị đơn trung bình" value={money(avgOrder)} hint={`${live.length} đơn trong kỳ`} icon={<Receipt size={20} strokeWidth={2} />} />
      </div>

      <div className="mb-6">
        <RevenueChart orders={orders} days={period} />
      </div>

      {/* Where the money comes from + what sells */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card-surface p-5">
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Theo phương thức thanh toán</h3>
          {live.length === 0 ? (
            <p className="text-xs py-6 text-center" style={{ color: 'var(--text-secondary)' }}>Chưa có đơn nào trong kỳ này.</p>
          ) : (
            <ul className="space-y-4">
              {methods.map(m => (
                <li key={m.id}>
                  <div className="flex items-baseline justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {PAYMENT_LABEL[m.id]} <span className="font-normal" style={{ color: 'var(--text-muted)' }}>· {m.count} đơn</span>
                    </span>
                    <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>{m.share.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }} aria-hidden="true">
                    <div className="h-full rounded-full" style={{ width: `${m.share}%`, background: 'linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 60%, transparent))' }} />
                  </div>
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Tổng {money(m.value)} · đã thu {money(m.paid)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card-surface p-5">
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Sản phẩm bán chạy theo doanh thu</h3>
          {topProducts.length === 0 ? (
            <p className="text-xs py-6 text-center" style={{ color: 'var(--text-secondary)' }}>Chưa có đơn nào trong kỳ này.</p>
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
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Đã bán {p.qty} cái</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Orders — filterable ledger */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc đơn hàng">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              aria-pressed={statusFilter === f.value}
              className={`filter-pill px-3.5 py-1.5 text-xs font-semibold cursor-pointer${statusFilter === f.value ? ' active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={14} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm mã đơn, tên, email…"
            aria-label="Tìm đơn hàng"
            className="input-field w-full pl-9 pr-3 py-2 text-xs"
          />
        </div>
      </div>

      <div className="card-surface overflow-x-auto">
        <table className="admin-table w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['Mã đơn', 'Khách hàng', 'Email', 'Ngày', 'Số sản phẩm', 'Tổng tiền', 'Thanh toán', 'Thao tác'].map(h => (
                <th key={h} className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center" style={{ color: 'var(--text-secondary)' }}>
                  {orders.length === 0 ? 'Chưa có đơn hàng nào.' : 'Không có đơn nào khớp bộ lọc trong kỳ này.'}
                </td>
              </tr>
            ) : (
              rows.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>{o.code}</td>
                  <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>{o.customerName}</td>
                  <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>{o.customerEmail}</td>
                  <td className="py-3 px-4 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(o.date).toLocaleString('vi-VN')}
                  </td>
                  <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>
                    {o.items.reduce((acc, i) => acc + i.quantity, 0)}
                  </td>
                  <td className="py-3 px-4 font-bold whitespace-nowrap" style={{ color: 'var(--accent)' }}>{money(o.total)}</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{PAYMENT_LABEL[o.paymentMethod]}</span>
                    {o.status === 'cancelled' ? (
                      <>
                        <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626' }}>Đã hủy</span>
                        {o.paymentStatus === 'paid' && (
                          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>Chờ hoàn tiền</span>
                        )}
                        {o.paymentStatus === 'refunded' && (
                          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(34,197,94,0.15)', color: '#16a34a' }}>Đã hoàn tiền</span>
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
                          {PAYMENT_STATUS_LABEL[o.paymentStatus]}
                        </span>
                        {o.cancelRequested && (
                          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626' }}>Khách yêu cầu hủy</span>
                        )}
                      </>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {o.status !== 'cancelled' && o.paymentStatus === 'unpaid' && (
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Xác nhận đã nhận ${money(o.total)} cho đơn ${o.code}?`)) return;
                            if (!(await setPaymentStatus(o.id, 'paid'))) window.alert('Không thể cập nhật. Vui lòng thử lại.');
                          }}
                          className="btn-outline px-3 py-1 text-[10px] font-semibold cursor-pointer whitespace-nowrap"
                        >
                          Đã nhận tiền
                        </button>
                      )}
                      {(o.status === 'pending' || o.status === 'confirmed') && (
                        <button
                          onClick={() => handleCancel(o.id, o.code, o.paymentStatus === 'paid')}
                          className="px-3 py-1 text-[10px] font-semibold rounded-full cursor-pointer whitespace-nowrap"
                          style={{ border: '1px solid var(--danger)', color: 'var(--danger)' }}
                        >
                          Hủy đơn
                        </button>
                      )}
                      {o.status === 'cancelled' && o.paymentStatus === 'paid' && (
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Bạn đã chuyển lại ${money(o.total)} cho khách (đơn ${o.code})?`)) return;
                            if (!(await setPaymentStatus(o.id, 'refunded'))) window.alert('Không thể cập nhật. Vui lòng thử lại.');
                          }}
                          className="btn-outline px-3 py-1 text-[10px] font-semibold cursor-pointer whitespace-nowrap"
                        >
                          Đã hoàn tiền
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
    </AdminShell>
  );
}
