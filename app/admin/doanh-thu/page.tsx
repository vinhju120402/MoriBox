'use client';

import { Wallet, ReceiptText, TrendingUp } from 'lucide-react';
import AdminShell from '../../../components/admin-shell';
import AdminStat from '../../../components/admin-stat';
import { useOrders } from '../../../hooks/use-orders';

function lastNDays(n: number) {
  const days: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({
      key: d.toISOString().slice(0, 10),
      label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
    });
  }
  return days;
}

export default function AdminRevenuePage() {
  const { orders } = useOrders();

  const totalRevenue = orders.reduce((acc, o) => acc + o.total, 0);
  const totalOrders = orders.length;
  const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const days = lastNDays(7);
  const revenueByDay = days.map(day => ({
    ...day,
    total: orders
      .filter(o => o.date.slice(0, 10) === day.key)
      .reduce((acc, o) => acc + o.total, 0),
  }));
  const maxRevenue = Math.max(1, ...revenueByDay.map(d => d.total));

  const recentOrders = [...orders].reverse();

  return (
    <AdminShell active="doanh-thu">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight font-display" style={{ color: 'var(--text-primary)' }}>
          Doanh thu
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Doanh thu được tính từ các đơn hàng thật đã đặt trên MoriBox.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <AdminStat label="Tổng doanh thu" value={`${totalRevenue.toLocaleString('vi-VN')}đ`} icon={<Wallet size={18} strokeWidth={2} />} />
        <AdminStat label="Tổng đơn hàng" value={String(totalOrders)} icon={<ReceiptText size={18} strokeWidth={2} />} />
        <AdminStat label="Giá trị đơn trung bình" value={`${avgOrder.toLocaleString('vi-VN')}đ`} icon={<TrendingUp size={18} strokeWidth={2} />} />
      </div>

      {/* Revenue chart — 7 ngày gần nhất */}
      <div className="card-surface p-5 mb-6">
        <h3 className="text-sm font-bold mb-5" style={{ color: 'var(--text-primary)' }}>Doanh thu 7 ngày gần nhất</h3>
        <div className="flex items-end gap-3 h-48">
          {revenueByDay.map((d) => {
            const heightPct = Math.max(2, (d.total / maxRevenue) * 100);
            return (
              <div key={d.key} className="group relative flex-1 flex flex-col items-center justify-end h-full">
                {/* Tooltip */}
                <div
                  className="absolute -top-8 px-2 py-1 rounded-lg text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10"
                  style={{ background: 'var(--text-primary)', color: '#fff' }}
                >
                  {d.total.toLocaleString('vi-VN')}đ
                </div>
                {/* Bar */}
                <div
                  className="w-full rounded-t-[4px] transition-all"
                  style={{
                    height: `${heightPct}%`,
                    background: d.total > 0 ? 'var(--accent)' : 'var(--border-subtle)',
                    minHeight: 4,
                  }}
                />
                {/* Day label */}
                <p className="text-[10px] font-semibold mt-2" style={{ color: 'var(--text-muted)' }}>{d.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Orders table */}
      <div className="card-surface overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['Mã đơn', 'Khách hàng', 'Email', 'Ngày', 'Số sản phẩm', 'Tổng tiền'].map(h => (
                <th key={h} className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                  Chưa có đơn hàng nào.
                </td>
              </tr>
            ) : (
              recentOrders.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>{o.code}</td>
                  <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>{o.customerName}</td>
                  <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>{o.customerEmail}</td>
                  <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(o.date).toLocaleString('vi-VN')}
                  </td>
                  <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>
                    {o.items.reduce((acc, i) => acc + i.quantity, 0)}
                  </td>
                  <td className="py-3 px-4 font-bold" style={{ color: 'var(--accent)' }}>{o.total.toLocaleString('vi-VN')}đ</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
