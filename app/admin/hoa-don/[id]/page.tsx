'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Printer, ArrowLeft } from 'lucide-react';
import AdminShell from '../../../../components/admin-shell';
import { useOrders } from '../../../../hooks/use-orders';
import { useShopSettings } from '../../../../hooks/use-shop-settings';
import { PAYMENT_METHOD_FULL_LABEL, PAYMENT_STATUS_LABEL } from '../../../../lib/payments';

const money = (v: number) => `${v.toLocaleString('vi-VN')}đ`;

// Printable order slip / invoice (admin + accountant). The surrounding admin
// chrome is hidden when printing.
export default function InvoicePage() {
  const params = useParams<{ id: string }>();
  const { orders, hasLoaded } = useOrders();
  const { settings } = useShopSettings();
  const order = orders.find(o => o.id === params.id);

  return (
    <AdminShell
      active="don-hang"
      title={order ? `Phiếu đơn ${order.code}` : 'Phiếu đơn hàng'}
      description="Bản in dành cho đơn hàng: thông tin giao nhận, sản phẩm và số tiền."
      actions={
        <div className="flex items-center gap-2 print:hidden">
          <Link href="/admin/don-hang" className="btn-outline px-3 py-2 text-xs font-semibold flex items-center gap-1.5">
            <ArrowLeft size={13} strokeWidth={2} /> Đơn hàng
          </Link>
          <button onClick={() => window.print()} disabled={!order} className="btn-primary px-3 py-2 text-xs font-semibold cursor-pointer flex items-center gap-1.5">
            <Printer size={13} strokeWidth={2} /> In phiếu
          </button>
        </div>
      }
    >
      {!hasLoaded ? (
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Đang tải…</p>
      ) : !order ? (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Không tìm thấy đơn hàng này.</p>
      ) : (
        <article className="card-surface p-6 sm:p-8 max-w-2xl print:shadow-none print:border-0 print:p-0">
          <header className="flex items-start justify-between gap-4 pb-5" style={{ borderBottom: '2px solid var(--text-primary)' }}>
            <div>
              <p className="text-xl font-black font-display" style={{ color: 'var(--text-primary)' }}>{settings.shopName}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>PHIẾU ĐƠN HÀNG</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{order.code}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{new Date(order.date).toLocaleString('vi-VN')}</p>
            </div>
          </header>

          <section className="grid grid-cols-2 gap-6 py-5 text-xs">
            <div className="space-y-1">
              <p className="font-bold uppercase tracking-wide text-[10px]" style={{ color: 'var(--text-muted)' }}>Người nhận</p>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{order.customerName}</p>
              <p style={{ color: 'var(--text-secondary)' }}>{order.phone}</p>
              <p style={{ color: 'var(--text-secondary)' }}>{order.address}, {order.sector}</p>
            </div>
            <div className="space-y-1">
              <p className="font-bold uppercase tracking-wide text-[10px]" style={{ color: 'var(--text-muted)' }}>Thanh toán</p>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{PAYMENT_METHOD_FULL_LABEL[order.paymentMethod]}</p>
              <p style={{ color: 'var(--text-secondary)' }}>{order.status === 'cancelled' ? 'Đơn đã hủy' : PAYMENT_STATUS_LABEL[order.paymentStatus]}</p>
              {order.paymentMethod === 'cod' && order.status !== 'cancelled' && order.paymentStatus !== 'paid' && (
                <p className="font-bold" style={{ color: 'var(--text-primary)' }}>Thu hộ: {money(order.total)}</p>
              )}
            </div>
          </section>

          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderTop: '1px solid var(--border-strong)', borderBottom: '1px solid var(--border-strong)' }}>
                {['Sản phẩm', 'SL', 'Đơn giá', 'Thành tiền'].map((h, i) => (
                  <th key={h} className={`py-2 font-bold ${i === 0 ? 'text-left' : 'text-right'}`} style={{ color: 'var(--text-primary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {order.items.map((i, idx) => (
                <tr key={`${i.productId}-${idx}`} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="py-2.5" style={{ color: 'var(--text-primary)' }}>{i.name}</td>
                  <td className="py-2.5 text-right" style={{ color: 'var(--text-secondary)' }}>{i.quantity}</td>
                  <td className="py-2.5 text-right" style={{ color: 'var(--text-secondary)' }}>{money(i.price)}</td>
                  <td className="py-2.5 text-right font-semibold" style={{ color: 'var(--text-primary)' }}>{money(i.price * i.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="mt-4 ml-auto w-full sm:w-64 space-y-1.5 text-xs">
            <div className="flex justify-between"><dt style={{ color: 'var(--text-secondary)' }}>Tạm tính</dt><dd style={{ color: 'var(--text-primary)' }}>{money(order.subtotal)}</dd></div>
            {order.discount > 0 && (
              <div className="flex justify-between"><dt style={{ color: 'var(--text-secondary)' }}>Giảm giá{order.couponCode ? ` (${order.couponCode})` : ''}</dt><dd>-{money(order.discount)}</dd></div>
            )}
            <div className="flex justify-between"><dt style={{ color: 'var(--text-secondary)' }}>Phí vận chuyển</dt><dd style={{ color: 'var(--text-primary)' }}>{money(order.shippingFee)}</dd></div>
            <div className="flex justify-between pt-2 text-sm font-bold" style={{ borderTop: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}>
              <dt>Tổng cộng</dt><dd>{money(order.total)}</dd>
            </div>
          </dl>

          <p className="mt-8 text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>Cảm ơn bạn đã mua sắm tại {settings.shopName}.</p>
        </article>
      )}
    </AdminShell>
  );
}
