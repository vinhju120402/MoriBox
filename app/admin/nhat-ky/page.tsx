'use client';

import { useEffect, useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import AdminShell from '../../../components/admin-shell';
import Pagination, { paginate } from '../../../components/pagination';
import { getSupabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/use-auth';
import { roleLabelKey, isRole } from '../../../lib/permissions';
import { useLanguage } from '../../../hooks/use-language';
import type { DictionaryKey } from '../../../app/i18n/dictionary';

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

const ACTION_KEYS = {
  'product.create': 'adm.audit.action.product.create',
  'product.update': 'adm.audit.action.product.update',
  'product.delete': 'adm.audit.action.product.delete',
  'order.status': 'adm.audit.action.order.status',
  'order.payment': 'adm.audit.action.order.payment',
  'order.cancel': 'adm.audit.action.order.cancel',
  'order.cancel_request': 'adm.audit.action.order.cancel_request',
  'user.role': 'adm.audit.action.user.role',
  'user.disabled': 'adm.audit.action.user.disabled',
  'staff_email.set': 'adm.audit.action.staff_email.set',
  'staff_email.remove': 'adm.audit.action.staff_email.remove',
  'coupons.insert': 'adm.audit.action.coupons.insert',
  'coupons.update': 'adm.audit.action.coupons.update',
  'coupons.delete': 'adm.audit.action.coupons.delete',
  'shop_settings.update': 'adm.audit.action.shop_settings.update',
} as const satisfies Record<string, DictionaryKey>;

const FIELD_KEYS = {
  name: 'adm.audit.field.name',
  price: 'adm.audit.field.price',
  sale_price: 'adm.audit.field.sale_price',
  stock: 'adm.audit.field.stock',
  grade: 'adm.audit.field.grade',
  scale: 'adm.audit.field.scale',
  series: 'adm.audit.field.series',
  is_new: 'adm.audit.field.is_new',
  is_best_seller: 'adm.audit.field.is_best_seller',
  low_stock_threshold: 'adm.audit.field.low_stock_threshold',
  active: 'adm.audit.field.active',
  value: 'adm.audit.field.value',
  kind: 'adm.audit.field.kind',
  min_order: 'adm.audit.field.min_order',
  max_discount: 'adm.audit.field.max_discount',
  usage_limit: 'adm.audit.field.usage_limit',
  starts_at: 'adm.audit.field.starts_at',
  ends_at: 'adm.audit.field.ends_at',
  shop_name: 'adm.audit.field.shop_name',
  shipping_fee: 'adm.audit.field.shipping_fee',
  bank_bin: 'adm.audit.field.bank_bin',
  bank_account: 'adm.audit.field.bank_account',
  bank_account_name: 'adm.audit.field.bank_account_name',
  bank_name: 'adm.audit.field.bank_name',
} as const satisfies Record<string, DictionaryKey>;

const actionKey = (a: string): DictionaryKey | undefined => (a in ACTION_KEYS ? ACTION_KEYS[a as keyof typeof ACTION_KEYS] : undefined);
const fieldKey = (f: string): DictionaryKey | undefined => (f in FIELD_KEYS ? FIELD_KEYS[f as keyof typeof FIELD_KEYS] : undefined);

const fmt = (v: unknown) => (v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));

function describe(row: AuditRow, t: (key: DictionaryKey) => string): string {
  const d = row.detail ?? {};
  const changes = d.changes as Record<string, { from: unknown; to: unknown }> | undefined;
  const parts: string[] = [];
  if (typeof d.name === 'string') parts.push(d.name);
  if (typeof d.code === 'string') parts.push(`#${d.code}`);
  if (row.action === 'order.status') parts.push(`${fmt(d.from)} → ${fmt(d.to)}`);
  if (row.action === 'order.payment') parts.push(`→ ${fmt(d.status)}${d.note ? ` (${fmt(d.note)})` : ''}`);
  if (row.action === 'user.role') parts.push(`→ ${isRole(d.role) ? t(roleLabelKey(d.role)) : fmt(d.role)}`);
  if (row.action === 'user.disabled') parts.push(d.disabled ? t('adm.audit.locked') : t('adm.audit.unlocked'));
  if (row.action === 'staff_email.set') parts.push(`${row.target_id ?? ''} → ${isRole(d.role) ? t(roleLabelKey(d.role)) : fmt(d.role)}`);
  if (row.action === 'staff_email.remove') parts.push(row.target_id ?? '');
  if (changes) {
    parts.push(Object.entries(changes).map(([k, v]) => `${fieldKey(k) ? t(fieldKey(k) as DictionaryKey) : k}: ${fmt(v.from)} → ${fmt(v.to)}`).join('; '));
  }
  return parts.filter(Boolean).join(' · ') || (row.target_id ?? '');
}

export default function AuditLogPage() {
  const { role } = useAuth();
  const { language, t } = useLanguage();
  const actionLabel = (a: string) => { const k = actionKey(a); return k ? t(k) : a; };
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
    actionLabel(r.action).toLowerCase().includes(q) ||
    (r.actor_email ?? '').toLowerCase().includes(q) ||
    describe(r, t).toLowerCase().includes(q),
  );

  return (
    <AdminShell
      active="nhat-ky"
      title={t('adm.audit.title')}
      description={t('adm.audit.desc')}
      actions={
        <button onClick={() => setVersion(v => v + 1)} className="btn-outline px-3 py-2 text-xs font-semibold cursor-pointer flex items-center gap-1.5">
          <RefreshCw size={13} strokeWidth={2} /> {t('adm.audit.reload')}
        </button>
      }
    >
      <div className="relative w-full sm:w-80 mb-3">
        <Search size={14} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder={t('adm.audit.searchPh')}
          aria-label={t('adm.audit.searchAria')}
          className="input-field w-full pl-9 pr-3 py-2 text-xs"
        />
      </div>

      <div className="card-surface overflow-x-auto">
        <table className="admin-table w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {(['adm.audit.col.time', 'adm.audit.col.actor', 'adm.audit.col.action', 'adm.audit.col.detail'] as const).map(h => (
                <th key={h} className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-muted)' }}>{t(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!hasLoaded ? (
              <tr><td colSpan={4} className="py-10 text-center" style={{ color: 'var(--text-secondary)' }}>{t('adm.audit.loading')}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="py-10 text-center" style={{ color: 'var(--text-secondary)' }}>
                {rows.length === 0 ? t('adm.audit.empty') : t('adm.audit.noMatch')}
              </td></tr>
            ) : paginate(filtered, page).map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td className="py-3 px-4 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{new Date(r.at).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')}</td>
                <td className="py-3 px-4">
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{r.actor_email ?? t('adm.audit.system')}</p>
                  {r.actor_role && isRole(r.actor_role) && <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t(roleLabelKey(r.actor_role))}</p>}
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                    {actionLabel(r.action)}
                  </span>
                </td>
                <td className="py-3 px-4 max-w-md break-words" style={{ color: 'var(--text-secondary)' }}>{describe(r, t)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={filtered.length} onChange={setPage} />
      </div>
    </AdminShell>
  );
}
