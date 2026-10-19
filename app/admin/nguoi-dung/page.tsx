'use client';

import { Users, UserCheck, ShieldCheck, Wallet } from 'lucide-react';
import AdminShell from '../../../components/admin-shell';
import AdminStat from '../../../components/admin-stat';
import { useOrders } from '../../../hooks/use-orders';
import { useState } from 'react';
import { useAllProfiles, useAuth } from '../../../hooks/use-auth';
import { ROLES, ROLE_LABEL, ROLE_DESCRIPTION, Role } from '../../../lib/permissions';

export default function AdminUsersPage() {
  const { orders } = useOrders();
  const { users, setRole } = useAllProfiles();
  const { user: me } = useAuth();
  const [error, setError] = useState('');

  const changeRole = async (id: string, name: string, role: Role) => {
    if (!window.confirm(`Đổi vai trò của "${name}" thành "${ROLE_LABEL[role]}"?\n${ROLE_DESCRIPTION[role]}`)) return;
    const result = await setRole(id, role);
    setError(result.ok ? '' : 'Không thể đổi vai trò. Vui lòng thử lại.');
  };

  const rows = users.map(u => {
    const userOrders = orders.filter(o => o.customerEmail.toLowerCase() === u.email.toLowerCase());
    return {
      ...u,
      orderCount: userOrders.length,
      totalSpent: userOrders.reduce((acc, o) => acc + o.total, 0),
    };
  });

  const totalUsers = users.length;
  const totalStaff = users.filter(u => u.role !== 'customer').length;
  const activeBuyers = rows.filter(r => r.orderCount > 0).length;
  const totalSpentAll = rows.reduce((acc, r) => acc + r.totalSpent, 0);

  return (
    <AdminShell active="nguoi-dung">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight font-display" style={{ color: 'var(--text-primary)' }}>
          Người dùng
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Danh sách tài khoản đã đăng ký trên MoriBox, kèm lịch sử mua hàng thực tế.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AdminStat label="Tổng người dùng" value={String(totalUsers)} icon={<Users size={18} strokeWidth={2} />} />
        <AdminStat label="Khách đã từng mua hàng" value={String(activeBuyers)} icon={<UserCheck size={18} strokeWidth={2} />} />
        <AdminStat label="Nhân viên (có quyền quản trị)" value={String(totalStaff)} icon={<ShieldCheck size={18} strokeWidth={2} />} />
        <AdminStat label="Tổng chi tiêu (mọi user)" value={`${totalSpentAll.toLocaleString('vi-VN')}đ`} icon={<Wallet size={18} strokeWidth={2} />} />
      </div>

      {error && (
        <p role="alert" className="mb-4 p-3 rounded-xl text-xs font-medium" style={{ background: 'var(--accent-dim)', color: 'var(--danger)' }}>{error}</p>
      )}

      <div className="card-surface overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['Tên', 'Email', 'Vai trò', 'Ngày tham gia', 'Số đơn hàng', 'Tổng chi tiêu', 'Quyền'].map(h => (
                <th key={h} className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td className="py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>{u.name}</td>
                <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                <td className="py-3 px-4">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{
                      background: u.role !== 'customer' ? 'var(--accent-dim)' : 'var(--bg-base)',
                      color: u.role !== 'customer' ? 'var(--accent)' : 'var(--text-secondary)',
                      border: u.role !== 'customer' ? 'none' : '1px solid var(--border-subtle)',
                    }}
                  >
                    {ROLE_LABEL[u.role]}
                  </span>
                </td>
                <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>
                  {u.joinedAt ? new Date(u.joinedAt).toLocaleDateString('vi-VN') : '—'}
                </td>
                <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>{u.orderCount}</td>
                <td className="py-3 px-4 font-bold" style={{ color: 'var(--accent)' }}>
                  {u.totalSpent.toLocaleString('vi-VN')}đ
                </td>
                <td className="py-3 px-4">
                  {u.id === me?.id ? (
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Bạn</span>
                  ) : (
                    <select
                      aria-label={`Vai trò của ${u.name || u.email}`}
                      value={u.role}
                      onChange={(e) => changeRole(u.id, u.name || u.email, e.target.value as Role)}
                      className="input-field text-[11px] font-semibold px-2 py-1.5 cursor-pointer"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
