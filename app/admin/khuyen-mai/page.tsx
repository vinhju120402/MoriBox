'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, TicketPercent } from 'lucide-react';
import AdminShell from '../../../components/admin-shell';
import AdminStat from '../../../components/admin-stat';
import { getSupabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/use-auth';
import { useLanguage } from '../../../hooks/use-language';
import type { DictionaryKey } from '../../i18n/dictionary';

interface Coupon {
  code: string;
  kind: 'percent' | 'fixed';
  value: number;
  min_order: number;
  max_discount: number | null;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  used_count: number;
  active: boolean;
}

const money = (v: number) => `${v.toLocaleString('vi-VN')}đ`;

function couponState(c: Coupon): { label: DictionaryKey; bg: string; fg: string } {
  const now = Date.now();
  if (!c.active) return { label: 'adm.promo.state.off', bg: 'var(--bg-base)', fg: 'var(--text-muted)' };
  if (c.starts_at && now < new Date(c.starts_at).getTime()) return { label: 'adm.promo.state.upcoming', bg: 'rgba(59,130,246,0.14)', fg: '#2563eb' };
  if (c.ends_at && now > new Date(c.ends_at).getTime()) return { label: 'adm.promo.state.expired', bg: 'rgba(220,38,38,0.12)', fg: '#dc2626' };
  if (c.usage_limit !== null && c.used_count >= c.usage_limit) return { label: 'adm.promo.state.exhausted', bg: 'rgba(220,38,38,0.12)', fg: '#dc2626' };
  return { label: 'adm.promo.state.running', bg: 'rgba(34,197,94,0.15)', fg: '#16a34a' };
}

// <input type="datetime-local"> wants local time without a zone.
const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface Form {
  code: string;
  kind: 'percent' | 'fixed';
  value: string;
  minOrder: string;
  maxDiscount: string;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  active: boolean;
}

const emptyForm: Form = { code: '', kind: 'percent', value: '', minOrder: '0', maxDiscount: '', startsAt: '', endsAt: '', usageLimit: '', active: true };

const COLUMNS: DictionaryKey[] = [
  'adm.promo.col.code', 'adm.promo.col.discount', 'adm.promo.col.condition', 'adm.promo.col.time', 'adm.promo.col.used', 'adm.promo.col.status',
];

const fieldCls = 'w-full px-3 py-2.5 text-sm rounded-xl input-field';

export default function PromotionsPage() {
  const { role } = useAuth();
  const { language, t } = useLanguage();
  const locale = language === 'en' ? 'en-US' : 'vi-VN';
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [editing, setEditing] = useState<{ original: string | null; form: Form } | null>(null);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await getSupabase().from('coupons').select('*').order('created_at', { ascending: false });
    if (data) setCoupons(data as Coupon[]);
    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (role !== 'admin') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [role, load]);

  const openNew = () => { setFormError(''); setEditing({ original: null, form: emptyForm }); };
  const openEdit = (c: Coupon) => {
    setFormError('');
    setEditing({
      original: c.code,
      form: {
        code: c.code, kind: c.kind, value: String(c.value), minOrder: String(c.min_order),
        maxDiscount: c.max_discount != null ? String(c.max_discount) : '',
        startsAt: toLocalInput(c.starts_at), endsAt: toLocalInput(c.ends_at),
        usageLimit: c.usage_limit != null ? String(c.usage_limit) : '', active: c.active,
      },
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const f = editing.form;
    const code = f.code.trim().toUpperCase();
    const value = Number(f.value);
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) { setFormError(t('adm.promo.errCode')); return; }
    if (!Number.isInteger(value) || value <= 0) { setFormError(t('adm.promo.errValue')); return; }
    if (f.kind === 'percent' && value > 100) { setFormError(t('adm.promo.errPct')); return; }
    if (f.startsAt && f.endsAt && new Date(f.endsAt) <= new Date(f.startsAt)) { setFormError(t('adm.promo.errDates')); return; }

    const row = {
      code,
      kind: f.kind,
      value,
      min_order: Math.max(0, Math.floor(Number(f.minOrder) || 0)),
      max_discount: f.kind === 'percent' && f.maxDiscount ? Math.floor(Number(f.maxDiscount)) : null,
      starts_at: f.startsAt ? new Date(f.startsAt).toISOString() : null,
      ends_at: f.endsAt ? new Date(f.endsAt).toISOString() : null,
      usage_limit: f.usageLimit ? Math.floor(Number(f.usageLimit)) : null,
      active: f.active,
    };
    setSaving(true);
    const supabase = getSupabase();
    const { error: err } = editing.original
      ? await supabase.from('coupons').update(row).eq('code', editing.original)
      : await supabase.from('coupons').insert(row);
    setSaving(false);
    if (err) {
      setFormError(err.message.includes('duplicate') ? t('adm.promo.errDup') : t('adm.promo.errSave'));
      return;
    }
    setEditing(null);
    void load();
  };

  const toggleActive = async (c: Coupon) => {
    setError('');
    const { error: err } = await getSupabase().from('coupons').update({ active: !c.active }).eq('code', c.code);
    if (err) setError(t('adm.promo.errToggle')); else void load();
  };

  const remove = async (c: Coupon) => {
    if (!window.confirm(t('adm.promo.confirmDelete', { code: c.code }))) return;
    setError('');
    const { error: err } = await getSupabase().from('coupons').delete().eq('code', c.code);
    if (err) setError(t('adm.promo.errDelete')); else void load();
  };

  const running = coupons.filter(c => couponState(c).label === 'adm.promo.state.running').length;
  const totalUses = coupons.reduce((acc, c) => acc + c.used_count, 0);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setEditing(prev => (prev ? { ...prev, form: { ...prev.form, [key]: value } } : prev));

  return (
    <AdminShell
      active="khuyen-mai"
      title={t('adm.promo.title')}
      description={t('adm.promo.desc')}
      actions={
        <button onClick={openNew} className="btn-primary px-4 py-2.5 text-sm font-semibold cursor-pointer flex items-center gap-2">
          <Plus size={15} strokeWidth={2} /> {t('adm.promo.create')}
        </button>
      }
    >
      {error && <p role="alert" className="mb-4 p-3 rounded-xl text-xs font-medium" style={{ background: 'var(--accent-dim)', color: 'var(--danger)' }}>{error}</p>}

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))' }}>
        <AdminStat label={t('adm.promo.statTotal')} value={String(coupons.length)} icon={<TicketPercent size={20} strokeWidth={2} />} />
        <AdminStat label={t('adm.promo.state.running')} value={String(running)} hint={t('adm.promo.statRunningHint')} icon={<TicketPercent size={20} strokeWidth={2} />} />
        <AdminStat label={t('adm.promo.statUses')} value={String(totalUses)} hint={t('adm.promo.statUsesHint')} icon={<TicketPercent size={20} strokeWidth={2} />} />
      </div>

      <div className="card-surface overflow-x-auto">
        <table className="admin-table w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {COLUMNS.map(h => (
                <th key={h} className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-muted)' }}>{t(h)}</th>
              ))}
              <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-muted)' }}></th>
            </tr>
          </thead>
          <tbody>
            {!hasLoaded ? (
              <tr><td colSpan={7} className="py-10 text-center" style={{ color: 'var(--text-secondary)' }}>{t('common.loading')}</td></tr>
            ) : coupons.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center" style={{ color: 'var(--text-secondary)' }}>{t('adm.promo.empty')}</td></tr>
            ) : coupons.map(c => {
              const st = couponState(c);
              return (
                <tr key={c.code} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="py-3 px-4 font-bold font-hud" style={{ color: 'var(--text-primary)' }}>{c.code}</td>
                  <td className="py-3 px-4 font-semibold whitespace-nowrap" style={{ color: 'var(--accent)' }}>
                    {c.kind === 'percent' ? `${c.value}%` : money(c.value)}
                    {c.kind === 'percent' && c.max_discount && <span className="font-normal" style={{ color: 'var(--text-muted)' }}> {t('adm.promo.maxOf', { v: money(c.max_discount) })}</span>}
                  </td>
                  <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>{c.min_order > 0 ? t('adm.promo.minFrom', { v: money(c.min_order) }) : t('adm.promo.noReq')}</td>
                  <td className="py-3 px-4 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                    {c.starts_at || c.ends_at
                      ? `${c.starts_at ? new Date(c.starts_at).toLocaleDateString(locale) : '…'} → ${c.ends_at ? new Date(c.ends_at).toLocaleDateString(locale) : '…'}`
                      : t('adm.promo.unlimited')}
                  </td>
                  <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>{c.used_count}{c.usage_limit !== null ? ` / ${c.usage_limit}` : ''}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleActive(c)}
                      title={c.active ? t('adm.promo.toggleOff') : t('adm.promo.toggleOn')}
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer whitespace-nowrap"
                      style={{ background: st.bg, color: st.fg }}
                    >
                      {t(st.label)}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEdit(c)} className="btn-ghost p-1.5 cursor-pointer" aria-label={t('adm.promo.editAria', { code: c.code })} title={t('adm.promo.edit')}><Pencil size={14} strokeWidth={2} /></button>
                      <button onClick={() => remove(c)} className="trash-btn p-1.5 cursor-pointer" aria-label={t('adm.promo.deleteAria', { code: c.code })} title={t('adm.promo.delete')}><Trash2 size={14} strokeWidth={2} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(20,22,26,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setEditing(null)}>
          <div className="card-surface w-full max-w-md max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('adm.promo.dialogAria')}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold font-display" style={{ color: 'var(--text-primary)' }}>{editing.original ? t('adm.promo.editTitle') : t('adm.promo.newTitle')}</h2>
              <button onClick={() => setEditing(null)} className="btn-ghost p-1.5 cursor-pointer" aria-label={t('adm.promo.close')}><X size={18} strokeWidth={2} /></button>
            </div>
            {formError && <p role="alert" className="mb-4 p-3 rounded-xl text-xs font-medium" style={{ background: 'rgba(214,69,80,0.1)', color: 'var(--danger)' }}>{formError}</p>}
            <form onSubmit={save} className="space-y-4">
              <div>
                <label htmlFor="c-code" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t('adm.promo.code')}</label>
                <input id="c-code" required value={editing.form.code} disabled={!!editing.original} onChange={(e) => set('code', e.target.value.toUpperCase())} className={fieldCls + ' uppercase font-hud disabled:opacity-60'} placeholder={t('adm.promo.codePh')} maxLength={30} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="c-kind" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t('adm.promo.kind')}</label>
                  <select id="c-kind" value={editing.form.kind} onChange={(e) => set('kind', e.target.value as Form['kind'])} className={fieldCls + ' cursor-pointer'}>
                    <option value="percent">{t('adm.promo.kindPct')}</option>
                    <option value="fixed">{t('adm.promo.kindFixed')}</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="c-value" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{editing.form.kind === 'percent' ? t('adm.promo.valuePct') : t('adm.promo.valueFixed')}</label>
                  <input id="c-value" required type="number" min={1} max={editing.form.kind === 'percent' ? 100 : undefined} value={editing.form.value} onChange={(e) => set('value', e.target.value)} className={fieldCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="c-min" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t('adm.promo.minOrder')}</label>
                  <input id="c-min" type="number" min={0} value={editing.form.minOrder} onChange={(e) => set('minOrder', e.target.value)} className={fieldCls} />
                </div>
                <div>
                  <label htmlFor="c-max" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t('adm.promo.maxDiscount')}</label>
                  <input id="c-max" type="number" min={1} disabled={editing.form.kind !== 'percent'} value={editing.form.maxDiscount} onChange={(e) => set('maxDiscount', e.target.value)} className={fieldCls + ' disabled:opacity-50'} placeholder={editing.form.kind === 'percent' ? t('adm.promo.noLimitPh') : t('adm.promo.pctOnlyPh')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="c-start" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t('adm.promo.start')}</label>
                  <input id="c-start" type="datetime-local" value={editing.form.startsAt} onChange={(e) => set('startsAt', e.target.value)} className={fieldCls} />
                </div>
                <div>
                  <label htmlFor="c-end" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t('adm.promo.end')}</label>
                  <input id="c-end" type="datetime-local" value={editing.form.endsAt} onChange={(e) => set('endsAt', e.target.value)} className={fieldCls} />
                </div>
              </div>
              <div>
                <label htmlFor="c-limit" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t('adm.promo.limit')}</label>
                <input id="c-limit" type="number" min={1} value={editing.form.usageLimit} onChange={(e) => set('usageLimit', e.target.value)} className={fieldCls} placeholder={t('adm.promo.noLimitPh')} />
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                <input type="checkbox" checked={editing.form.active} onChange={(e) => set('active', e.target.checked)} className="cursor-pointer" /> {t('adm.promo.active')}
              </label>
              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={() => setEditing(null)} className="btn-outline flex-1 py-2.5 text-sm font-semibold cursor-pointer">{t('common.cancel')}</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5 text-sm font-semibold cursor-pointer">{saving ? t('adm.promo.saving') : t('adm.promo.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
