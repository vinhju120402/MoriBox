'use client';

import type { Order } from '../hooks/use-orders';

const pad = (n: number) => String(n).padStart(2, '0');
// Local-calendar day key (not UTC), so an order at 1am Vietnam time lands on the right day.
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function lastNDays(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, idx) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (n - 1 - idx));
    return { key: dayKey(d), label: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`, isToday: idx === n - 1 };
  });
}

const compact = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}tr` : v >= 1_000 ? `${Math.round(v / 1_000)}k` : String(v);

// Money actually collected per day (paid, not cancelled) for the last `days` days.
export default function RevenueChart({ orders, days = 7 }: { orders: Order[]; days?: number }) {
  const series = lastNDays(days).map(day => ({
    ...day,
    total: orders
      .filter(o => o.status !== 'cancelled' && o.paymentStatus === 'paid' && dayKey(new Date(o.date)) === day.key)
      .reduce((acc, o) => acc + o.total, 0),
  }));
  const max = Math.max(1, ...series.map(d => d.total));
  const sum = series.reduce((acc, d) => acc + d.total, 0);
  const labelStep = Math.ceil(days / 8); // keep the x-axis readable for 30/90 days
  const gap = days > 14 ? 'gap-px sm:gap-0.5' : 'gap-2 sm:gap-3';

  return (
    <div className="card-surface p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Doanh thu {days} ngày gần nhất</h3>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>Chỉ tính đơn đã thu tiền</p>
        </div>
        <p className="text-lg font-bold font-display" style={{ color: 'var(--accent)' }}>{sum.toLocaleString('vi-VN')}đ</p>
      </div>

      <div className="relative h-48">
        {/* Gridlines */}
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            aria-hidden="true"
            className="absolute inset-x-0 flex items-center"
            style={{ top: `${(i / 3) * 100}%` }}
          >
            <span className="w-8 pr-1.5 text-right text-[9px] -translate-y-1/2 font-hud" style={{ color: 'var(--text-muted)' }}>
              {compact(Math.round(max * (1 - i / 3)))}
            </span>
            <span className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
          </div>
        ))}

        {/* Bars */}
        <div className={`absolute inset-0 pl-9 flex items-end ${gap}`}>
          {series.map(d => {
            const heightPct = d.total > 0 ? Math.max(3, (d.total / max) * 100) : 0;
            return (
              <div
                key={d.key}
                tabIndex={0}
                aria-label={`${d.label}: ${d.total.toLocaleString('vi-VN')}đ`}
                className="group relative flex-1 h-full flex items-end justify-center outline-offset-2"
              >
                <div
                  role="tooltip"
                  className="absolute z-10 px-2 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
                  style={{ bottom: `calc(${heightPct}% + 6px)`, background: 'var(--text-primary)', color: 'var(--bg-base)' }}
                >
                  {d.label}: {d.total.toLocaleString('vi-VN')}đ
                </div>
                <div
                  className={`w-full max-w-10 ${days > 14 ? 'rounded-t-sm' : 'rounded-t-lg'} transition-[height,filter] duration-500 group-hover:brightness-110`}
                  style={{
                    height: d.total > 0 ? `${heightPct}%` : 3,
                    background: d.total > 0
                      ? 'linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 45%, transparent))'
                      : 'var(--border-subtle)',
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Day labels */}
      <div className={`pl-9 flex ${gap} mt-2`}>
        {series.map((d, idx) => (
          <p
            key={d.key}
            className="flex-1 text-center text-[10px] font-semibold overflow-visible whitespace-nowrap"
            style={{ color: d.isToday ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            {d.isToday ? (days <= 14 ? 'Hôm nay' : 'Nay') : idx % labelStep === 0 ? d.label : ''}
          </p>
        ))}
      </div>
    </div>
  );
}
