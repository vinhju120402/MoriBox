'use client';

import Link from 'next/link';
import { Wallet, ReceiptText, Users, AlertTriangle, Boxes, LineChart, ArrowRight } from 'lucide-react';
import AdminShell from '../../components/admin-shell';
import AdminStat from '../../components/admin-stat';
import { useOrders } from '../../hooks/use-orders';
import { getRegisteredUsers } from '../../hooks/use-auth';
import { useProductCatalog } from '../../hooks/use-product-catalog';

export default function AdminDashboardPage() {
  const { orders } = useOrders();
  const { products } = useProductCatalog();

  const totalRevenue = orders.reduce((acc, o) => acc + o.total, 0);
  const totalOrders = orders.length;
  const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= 5);
  const outOfStockProducts = products.filter(p => p.stock === 0);
  const totalUsers = getRegisteredUsers().length;

  const recentOrders = [...orders].reverse().slice(0, 5);

  return (
    <AdminShell active="dashboard">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight font-display" style={{ color: 'var(--text-primary)' }}>
          Tổng quan
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Số liệu tổng hợp từ đơn hàng, kho và tài khoản người dùng thực tế trên MoriBox.
        </p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <AdminStat label="Tổng doanh thu" value={`${totalRevenue.toLocaleString('vi-VN')}đ`} icon={<Wallet size={18} strokeWidth={2} />} />
        <AdminStat label="Tổng đơn hàng" value={String(totalOrders)} icon={<ReceiptText size={18} strokeWidth={2} />} />
        <AdminStat label="Người dùng đã đăng ký" value={String(totalUsers)} icon={<Users size={18} strokeWidth={2} />} />
        <AdminStat
          label="Sản phẩm sắp/hết hàng"
          value={String(lowStockProducts.length + outOfStockProducts.length)}
          icon={<AlertTriangle size={18} strokeWidth={2} />}
          tone={outOfStockProducts.length > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { href: '/admin/kho', label: 'Quản lý kho hàng', desc: 'Xem & cập nhật tồn kho theo từng sản phẩm.', icon: Boxes },
          { href: '/admin/nguoi-dung', label: 'Quản lý người dùng', desc: 'Danh sách tài khoản, vai trò và lịch sử mua hàng.', icon: Users },
          { href: '/admin/doanh-thu', label: 'Báo cáo doanh thu', desc: 'Biểu đồ doanh thu và danh sách đơn hàng.', icon: LineChart },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className="card-surface is-interactive p-5 flex flex-col cursor-pointer">
              <div
                className="w-9 h-9 flex items-center justify-center rounded-full mb-3"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
              >
                <Icon size={16} strokeWidth={2} />
              </div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{card.label}</p>
              <p className="text-xs mt-1 leading-relaxed flex-1" style={{ color: 'var(--text-secondary)' }}>{card.desc}</p>
              <span className="text-xs font-semibold mt-3 inline-flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                Xem chi tiết <ArrowRight size={12} strokeWidth={2} />
              </span>
            </Link>
          );
        })}
      </div>

      {/* Recent orders */}
      <div className="card-surface p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Đơn hàng gần đây</h3>
          <Link href="/admin/doanh-thu" className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
            Xem tất cả
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="text-xs py-6 text-center" style={{ color: 'var(--text-secondary)' }}>
            Chưa có đơn hàng nào. Đơn hàng thật từ khách sẽ hiển thị tại đây.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Mã đơn', 'Khách hàng', 'Ngày', 'Số sản phẩm', 'Tổng tiền'].map(h => (
                    <th key={h} className="text-left py-2 font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(o => (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="py-2.5 font-semibold" style={{ color: 'var(--text-primary)' }}>{o.code}</td>
                    <td className="py-2.5" style={{ color: 'var(--text-secondary)' }}>{o.customerName}</td>
                    <td className="py-2.5" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(o.date).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-2.5" style={{ color: 'var(--text-secondary)' }}>
                      {o.items.reduce((acc, i) => acc + i.quantity, 0)}
                    </td>
                    <td className="py-2.5 font-bold" style={{ color: 'var(--accent)' }}>{o.total.toLocaleString('vi-VN')}đ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
