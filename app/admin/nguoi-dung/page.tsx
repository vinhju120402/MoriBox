'use client';

import { useState } from 'react';
import { Users, UserCheck, ShieldCheck, Wallet, Search, Lock, LockOpen, Trash2, Plus } from 'lucide-react';
import AdminShell from '../../../components/admin-shell';
import AdminStat from '../../../components/admin-stat';
import Pagination, { paginate } from '../../../components/pagination';
import { useOrders } from '../../../hooks/use-orders';
import { useAllProfiles, useAuth } from '../../../hooks/use-auth';
import { useStaffEmails, StaffEmail } from '../../../hooks/use-staff-emails';
import { ROLES, ROLE_LABEL, ROLE_DESCRIPTION, Role } from '../../../lib/permissions';

const STAFF_ROLES: StaffEmail['role'][] = ['admin', 'warehouse', 'accountant'];

export default function AdminUsersPage() {
  const { orders } = useOrders();
  const { users, setRole, setDisabled } = useAllProfiles();
  const { user: me } = useAuth();
  const { emails, add: addStaffEmail, remove: removeStaffEmail } = useStaffEmails();
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<StaffEmail['role']>('warehouse');
  const [staffMessage, setStaffMessage] = useState('');

  const changeRole = async (id: string, name: string, role: Role) => {
    if (!window.confirm(`Đổi vai trò của "${name}" thành "${ROLE_LABEL[role]}"?\n${ROLE_DESCRIPTION[role]}`)) return;
    const result = await setRole(id, role);
    setError(result.ok ? '' : 'Không thể đổi vai trò. Vui lòng thử lại.');
  };

  const toggleDisabled = async (id: string, name: string, disabled: boolean) => {
    const question = disabled
      ? `Khóa tài khoản "${name}"? Họ sẽ bị đăng xuất và không thể đặt hàng hay đăng nhập nữa.`
      : `Mở khóa tài khoản "${name}"?`;
    if (!window.confirm(question)) return;
    const result = await setDisabled(id, disabled);
    setError(result.ok ? '' : 'Không thể đổi trạng thái tài khoản. Vui lòng thử lại.');
  };

  const submitStaffEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffMessage('');
    const ok = await addStaffEmail(newEmail, newRole);
    if (ok) { setNewEmail(''); setStaffMessage('Đã thêm. Người này sẽ có vai trò khi đăng ký và xác nhận email.'); }
    else setStaffMessage('Không thêm được. Kiểm tra lại địa chỉ email.');
  };

  const rows = users.map(u => {
    const userOrders = orders.filter(o => o.userId === u.id && o.status !== 'cancelled');
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
  const lockedCount = users.filter(u => u.disabled).length;

  const q = query.trim().toLowerCase();
  const filtered = rows.filter(u => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));

  return (
    <AdminShell
      active="nguoi-dung"
      title="Người dùng"
      description="Tài khoản đã đăng ký, vai trò, trạng thái khóa và lịch sử mua hàng thực tế."
    >
      {error && (
        <p role="alert" className="mb-4 p-3 rounded-xl text-xs font-medium" style={{ background: 'var(--accent-dim)', color: 'var(--danger)' }}>{error}</p>
      )}

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))' }}>
        <AdminStat label="Tổng người dùng" value={String(totalUsers)} hint={lockedCount > 0 ? `${lockedCount} tài khoản đang bị khóa` : undefined} icon={<Users size={20} strokeWidth={2} />} />
        <AdminStat label="Khách đã từng mua" value={String(activeBuyers)} icon={<UserCheck size={20} strokeWidth={2} />} />
        <AdminStat label="Nhân viên" value={String(totalStaff)} hint="Có quyền quản trị" icon={<ShieldCheck size={20} strokeWidth={2} />} />
        <AdminStat label="Tổng chi tiêu của khách" value={`${totalSpentAll.toLocaleString('vi-VN')}đ`} icon={<Wallet size={20} strokeWidth={2} />} />
      </div>

      <div className="relative w-full sm:w-72 mb-3">
        <Search size={14} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder="Tìm theo tên hoặc email…"
          aria-label="Tìm người dùng"
          className="input-field w-full pl-9 pr-3 py-2 text-xs"
        />
      </div>

      <div className="card-surface overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="admin-table w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['Tên', 'Email', 'Vai trò', 'Ngày tham gia', 'Số đơn', 'Tổng chi tiêu', 'Quyền', ''].map(h => (
                  <th key={h} className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-10 text-center" style={{ color: 'var(--text-secondary)' }}>Không có người dùng nào khớp.</td></tr>
              ) : paginate(filtered, page).map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)', opacity: u.disabled ? 0.6 : 1 }}>
                  <td className="py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {u.name || '—'}
                    {u.disabled && <span className="ml-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626' }}>Đã khóa</span>}
                  </td>
                  <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td className="py-3 px-4">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
                      style={{
                        background: u.role !== 'customer' ? 'var(--accent-dim)' : 'var(--bg-base)',
                        color: u.role !== 'customer' ? 'var(--accent)' : 'var(--text-secondary)',
                        border: u.role !== 'customer' ? 'none' : '1px solid var(--border-subtle)',
                      }}
                    >
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                    {u.joinedAt ? new Date(u.joinedAt).toLocaleDateString('vi-VN') : '—'}
                  </td>
                  <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>{u.orderCount}</td>
                  <td className="py-3 px-4 font-bold whitespace-nowrap" style={{ color: 'var(--accent)' }}>
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
                  <td className="py-3 px-4">
                    {u.id !== me?.id && (
                      <button
                        onClick={() => toggleDisabled(u.id, u.name || u.email, !u.disabled)}
                        className="btn-ghost p-1.5 cursor-pointer"
                        aria-label={u.disabled ? `Mở khóa ${u.email}` : `Khóa ${u.email}`}
                        title={u.disabled ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                      >
                        {u.disabled ? <LockOpen size={15} strokeWidth={2} /> : <Lock size={15} strokeWidth={2} />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={filtered.length} onChange={setPage} />
      </div>

      {/* Pre-approved staff emails */}
      <section aria-labelledby="staff-emails-heading" className="card-surface p-5">
        <h2 id="staff-emails-heading" className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Email nhân viên được cấp quyền trước</h2>
        <p className="text-xs mt-1 mb-4 leading-relaxed max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
          Thêm email của nhân viên mới ở đây. Khi họ tự đăng ký bằng đúng email này và xác nhận email, họ sẽ có vai trò tương ứng, bạn không cần chỉnh tay.
          Ai đã có tài khoản và đã xác nhận email sẽ được cấp quyền ngay.
        </p>

        <form onSubmit={submitStaffEmail} className="flex flex-wrap items-end gap-3 mb-4">
          <div className="flex-1 min-w-[14rem]">
            <label htmlFor="staff-email" className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Email nhân viên</label>
            <input id="staff-email" type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="nhanvien@email.com" className="input-field w-full px-3 py-2.5 text-xs" />
          </div>
          <div>
            <label htmlFor="staff-role" className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Vai trò</label>
            <select id="staff-role" value={newRole} onChange={(e) => setNewRole(e.target.value as StaffEmail['role'])} className="input-field px-3 py-2.5 text-xs cursor-pointer">
              {STAFF_ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </div>
          <button type="submit" className="btn-primary px-4 py-2.5 text-xs font-semibold cursor-pointer flex items-center gap-1.5">
            <Plus size={14} strokeWidth={2} /> Thêm
          </button>
        </form>
        {staffMessage && <p role="status" className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>{staffMessage}</p>}

        {emails.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Chưa có email nào trong danh sách.</p>
        ) : (
          <ul>
            {emails.map(se => (
              <li key={se.email} className="flex items-center justify-between gap-3 py-2.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{se.email}</span>
                <span className="flex items-center gap-3 shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>{ROLE_LABEL[se.role]}</span>
                  <button
                    onClick={async () => {
                      if (!window.confirm(`Gỡ ${se.email} khỏi danh sách? Người đã có quyền vẫn giữ quyền, chỉ không cấp tự động nữa.`)) return;
                      if (!(await removeStaffEmail(se.email))) setStaffMessage('Không gỡ được. Vui lòng thử lại.');
                    }}
                    className="trash-btn p-1.5 cursor-pointer"
                    aria-label={`Gỡ ${se.email}`}
                    title="Gỡ khỏi danh sách"
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] mt-4 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Lưu ý bảo mật: tự động cấp quyền chỉ an toàn khi bật “Confirm email” trong Supabase. Nếu tắt, người khác biết email này có thể đăng ký trước và chiếm quyền.
        </p>
      </section>
    </AdminShell>
  );
}
