'use client';

import { useState } from 'react';
import AdminShell from '../../../components/admin-shell';
import { returnStatusTone } from '../../../components/order-returns';
import { useAuth } from '../../../hooks/use-auth';
import { useLanguage } from '../../../hooks/use-language';
import { useReturns, type ReturnRequest } from '../../../hooks/use-returns';
import type { DictionaryKey } from '../../i18n/dictionary';

type Tab = 'todo' | 'all' | 'done';
const OPEN: ReturnRequest['status'][] = ['requested', 'approved', 'shipped', 'received'];

const money = (v: number) => `${v.toLocaleString('vi-VN')}đ`;

function ReturnCard({ r, role, api }: { r: ReturnRequest; role: string | undefined; api: ReturnType<typeof useReturns> }) {
  const { t } = useLanguage();
  const [note, setNote] = useState('');
  const [restock, setRestock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isMoney = role === 'admin' || role === 'accountant';
  const isStock = role === 'admin' || role === 'warehouse';
  const tone = returnStatusTone(r.status);

  const run = async (fn: () => ReturnType<typeof api.close>) => {
    setBusy(true);
    setError('');
    const res = await fn();
    setBusy(false);
    if (!res.ok) setError(t(res.error)); else setNote('');
  };

  const can =
    (r.status === 'requested' && isMoney) ? 'review'
      : (r.status === 'shipped' && isStock) ? 'receive'
        : (r.status === 'received' && isMoney) ? 'refund'
          : null;

  return (
    <article className="card-surface p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{r.code}</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {t('adm.ret.order', { code: r.orderCode })} · {new Date(r.createdAt).toLocaleString('vi-VN')}
          </p>
          {r.customerName && <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{t('adm.ret.customer', { name: r.customerName })}</p>}
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: tone.bg, color: tone.fg }}>
          {t(`ret.status.${r.status}` as DictionaryKey)}
        </span>
      </div>

      <ul className="mt-3 space-y-1">
        {r.items.map(i => (
          <li key={i.productId} className="flex justify-between gap-3 text-xs">
            <span style={{ color: 'var(--text-secondary)' }}>{i.name} × {i.quantity}</span>
            <span style={{ color: 'var(--text-primary)' }}>{money(i.price * i.quantity)}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
        {t(`ret.reason.${r.reason}` as DictionaryKey)} · <strong style={{ color: 'var(--accent)' }}>{t('adm.ret.refund', { amount: money(r.refundAmount) })}</strong>
        {r.restocked && <> · {t('adm.ret.restocked')}</>}
      </p>
      {r.details && <p className="text-xs mt-1.5 whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{t('adm.ret.detailsLabel', { text: r.details })}</p>}
      {r.trackingCode && <p className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--text-primary)' }}>{t('ret.trackingShown', { code: r.trackingCode })}</p>}
      {r.staffNote && <p className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>{t('ret.staffNote', { note: r.staffNote })}</p>}

      {error && <p role="alert" className="mt-3 text-xs font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}

      {can ? (
        <div className="mt-4 pt-4 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div>
            <label htmlFor={`note-${r.id}`} className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t('adm.ret.noteLabel')}</label>
            <input id={`note-${r.id}`} value={note} onChange={e => setNote(e.target.value)} maxLength={300} className="input-field w-full px-3 py-2 text-xs rounded-xl" />
          </div>
          {can === 'review' && (
            <div className="flex gap-2">
              <button disabled={busy} onClick={() => run(() => api.review(r.id, true, note))} className="btn-primary px-4 py-2 text-xs font-semibold cursor-pointer">{t('adm.ret.approve')}</button>
              <button
                disabled={busy}
                onClick={() => { if (!note.trim()) { setError(t('adm.ret.rejectNeedsNote')); return; } void run(() => api.review(r.id, false, note)); }}
                className="px-4 py-2 text-xs font-semibold rounded-full cursor-pointer"
                style={{ border: '1px solid var(--danger)', color: 'var(--danger)' }}
              >
                {t('adm.ret.reject')}
              </button>
            </div>
          )}
          {can === 'receive' && (
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                <input type="checkbox" checked={restock} onChange={e => setRestock(e.target.checked)} className="cursor-pointer" /> {t('adm.ret.restock')}
              </label>
              <button disabled={busy} onClick={() => run(() => api.receive(r.id, restock, note))} className="btn-primary px-4 py-2 text-xs font-semibold cursor-pointer">{t('adm.ret.receive')}</button>
            </div>
          )}
          {can === 'refund' && (
            <div className="space-y-2">
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t('adm.ret.refundHint')}</p>
              <button disabled={busy} onClick={() => run(() => api.refund(r.id, note))} className="btn-primary px-4 py-2 text-xs font-semibold cursor-pointer">{t('adm.ret.refundBtn')}</button>
            </div>
          )}
        </div>
      ) : OPEN.includes(r.status) && (
        <p className="mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {r.status === 'approved' ? t('adm.ret.waitingCustomer') : t('adm.ret.waitingStaff')}
        </p>
      )}
    </article>
  );
}

export default function ReturnsAdminPage() {
  const { role } = useAuth();
  const { t } = useLanguage();
  const api = useReturns();
  const [tab, setTab] = useState<Tab>('todo');

  // "To do" = a step this role can take right now.
  const actionable = (r: ReturnRequest) =>
    (r.status === 'requested' && (role === 'admin' || role === 'accountant'))
    || (r.status === 'shipped' && (role === 'admin' || role === 'warehouse'))
    || (r.status === 'received' && (role === 'admin' || role === 'accountant'));
  const list = api.returns.filter(r => (tab === 'all' ? true : tab === 'todo' ? actionable(r) : !OPEN.includes(r.status)));
  const todoCount = api.returns.filter(actionable).length;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'todo', label: `${t('adm.ret.tab.todo')}${todoCount ? ` (${todoCount})` : ''}` },
    { key: 'all', label: t('adm.ret.tab.all') },
    { key: 'done', label: t('adm.ret.tab.done') },
  ];

  return (
    <AdminShell active="doi-tra" title={t('adm.ret.title')} description={t('adm.ret.desc')}>
      <div role="tablist" className="flex gap-1 mb-4 overflow-x-auto no-scrollbar">
        {tabs.map(x => (
          <button
            key={x.key}
            role="tab"
            aria-selected={tab === x.key}
            onClick={() => setTab(x.key)}
            className="px-4 py-2 text-xs font-semibold rounded-full cursor-pointer whitespace-nowrap"
            style={{ background: tab === x.key ? 'var(--accent)' : 'var(--bg-surface)', color: tab === x.key ? '#fff' : 'var(--text-secondary)' }}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {!api.hasLoaded ? (
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('adm.ret.loading')}</p>
        ) : list.length === 0 ? (
          <div className="card-surface text-center py-14 text-sm" style={{ color: 'var(--text-secondary)' }}>{t('adm.ret.empty')}</div>
        ) : list.map(r => <ReturnCard key={r.id} r={r} role={role} api={api} />)}
      </div>
    </AdminShell>
  );
}
