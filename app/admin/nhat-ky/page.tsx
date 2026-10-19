'use client';

import { useEffect, useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import AdminShell from '../../../components/admin-shell';
import Pagination, { paginate } from '../../../components/pagination';
import { getSupabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/use-auth';
import { ROLE_LABEL, isRole } from '../../../lib/permissions';

interface AuditRow {
  id: number;
  at: string;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: Record<string, unknown>;
}

const ACTION_LABEL: Record<string, string> = {
  'product.create': 'Thêm sản phẩm',
  'product.update': 'Sửa sản phẩm',
  'product.delete': 'Xóa sản phẩm',
  'order.status': 'Đổi trạng thái đơn',
  'order.payment': 'Cập nhật thanh toán đơn',
  'order.cancel': 'Hủy đơn',
  'order.cancel_request': 'Khách yêu cầu hủy đơn',
  'user.role': 'Đổi vai trò người dùng',
  'user.disabled': 'Khóa / mở khóa tài khoản',
  'staff_email.set': 'Thêm email nhân viên',
  'staff_email.remove': 'Gỡ email nhân viên',
  'coupons.insert': 'Tạo mã giảm giá',
  'coupons.update': 'Sửa mã giảm giá',
  'coupons.delete': 'Xóa mã giảm giá',
  'shop_settings.update': 'Đổi cài đặt cửa hàng',
};

const FIELD_LABEL: Record<string, string> = {
  name: 'Tên', price: 'Giá', sale_price: 'Giá sale', stock: 'Tồn kho', grade: 'Grade', scale: 'Tỷ lệ', series: 'Series',
  is_new: 'Mới', is_best_seller: 'Bán chạy', low_stock_threshold: 'Ngưỡng sắp hết', active: 'Đang bật', value: 'Giá trị',
  kind: 'Loại', min_order: 'Đơn tối thiểu', max_discount: 'Giảm tối đa', usage_limit: 'Giới hạn lượt', starts_at: 'Bắt đầu',
  ends_at: 'Kết thúc', shop_name: 'Tên shop', shipping_fee: 'Phí vận chuyển', bank_bin: 'Mã ngân hàng', bank_account: 'Số tài khoản',
  bank_account_name: 'Chủ tài khoản', bank_name: 'Ngân hàng',
};

const fmt = (v: unknown) => (v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));

function describe(row: AuditRow): string {
  const d = row.detail ?? {};
  const changes = d.changes as Record<string, { from: unknown; to: unknown }> | undefined;
  const parts: string[] = [];
  if (typeof d.name === 'string') parts.push(d.name);
  if (typeof d.code === 'string') parts.push(`#${d.code}`);
  if (row.action === 'order.status') parts.push(`${fmt(d.from)} → ${fmt(d.to)}`);
  if (row.action === 'order.payment') parts.push(`→ ${fmt(d.status)}`);
  if (row.action === 'user.role') parts.push(`→ ${isRole(d.role) ? ROLE_LABEL[d.role] : fmt(d.role)}`);
  if (row.action === 'user.disabled') parts.push(d.disabled ? 'đã khóa' : 'đã mở khóa');
  if (row.action === 'staff_email.set') parts.push(`${row.target_id ?? ''} → ${isRole(d.role) ? ROLE_LABEL[d.role] : fmt(d.role)}`);
  if (row.action === 'staff_email.remove') parts.push(row.target_id ?? '');
  if (changes) {
    parts.push(Object.entries(changes).map(([k, v]) => `${FIELD_LABEL[k] ?? k}: ${fmt(v.from)} → ${fmt(v.to)}`).join('; '));
  }
  return parts.filter(Boolean).join(' · ') || (row.target_id ?? '');
}

export default function AuditLogPage() {
  const { role } = useAuth();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (role !== 'admin') return;
    let cancelled = false;
    getSupabase()
      .from('audit_log')
      .select('*')
      .order('at', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        if (cancelled) return;
        if (data) setRows(data as AuditRow[]);
        setHasLoaded(true);
      });
    return () => { cancelled = true; };
  }, [role, version]);

  const q = query.trim().toLowerCase();
  const filtered = rows.filter(r =>
    !q ||
    (ACTION_LABEL[r.action] ?? r.action).toLowerCase().includes(q) ||
    (r.actor_email ?? '').toLowerCase().includes(q) ||
    describe(r).toLowerCase().includes(q),
  );

  return (
    <AdminShell
      active="nhat-ky"
      title="Nhật ký thao tác"
      description="Ai đã làm gì và lúc nào: sửa sản phẩm, đổi trạng thái đơn, xác nhận và hoàn tiền, đổi vai trò. Hiển thị 500 thao tác gần nhất."
      actions={
        <button onClick={() => setVersion(v => v + 1)} className="btn-outline px-3 py-2 text-xs font-semibold cursor-pointer flex items-center gap-1.5">
          <RefreshCw size={13} strokeWidth={2} /> Tải lại
        </button>
      }
    >
      <div className="relative w-full sm:w-80 mb-3">
        <Search size={14} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder="Tìm theo hành động, người làm, nội dung…"
          aria-label="Tìm trong nhật ký"
          className="input-field w-full pl-9 pr-3 py-2 text-xs"
        />
      </div>

      <div className="card-surface overflow-x-auto">
        <table className="admin-table w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['Thời gian', 'Người thực hiện', 'Hành động', 'Chi tiết'].map(h => (
                <th key={h} className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!hasLoaded ? (
              <tr><td colSpan={4} className="py-10 text-center" style={{ color: 'var(--text-secondary)' }}>Đang tải…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="py-10 text-center" style={{ color: 'var(--text-secondary)' }}>
                {rows.length === 0 ? 'Chưa có thao tác nào được ghi lại.' : 'Không có thao tác nào khớp.'}
              </td></tr>
            ) : paginate(filtered, page).map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td className="py-3 px-4 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{new Date(r.at).toLocaleString('vi-VN')}</td>
                <td className="py-3 px-4">
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{r.actor_email ?? 'Hệ thống'}</p>
                  {r.actor_role && isRole(r.actor_role) && <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{ROLE_LABEL[r.actor_role]}</p>}
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                    {ACTION_LABEL[r.action] ?? r.action}
                  </span>
                </td>
                <td className="py-3 px-4 max-w-md break-words" style={{ color: 'var(--text-secondary)' }}>{describe(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={filtered.length} onChange={setPage} />
      </div>
    </AdminShell>
  );
}
