'use client';

import { useState } from 'react';
import { Undo2 } from 'lucide-react';
import { useLanguage } from '../hooks/use-language';
import { useShopSettings } from '../hooks/use-shop-settings';
import {
  RETURN_REASONS, type ReturnReason, type ReturnRequest, type useReturns,
} from '../hooks/use-returns';
import type { Order } from '../hooks/use-orders';
import type { DictionaryKey } from '../app/i18n/dictionary';

type Actions = ReturnType<typeof useReturns>;

const DAY_MS = 86_400_000;

export const returnStatusTone = (s: ReturnRequest['status']): { bg: string; fg: string } =>
  s === 'refunded' ? { bg: 'rgba(34,197,94,0.15)', fg: '#16a34a' }
    : s === 'rejected' ? { bg: 'rgba(220,38,38,0.12)', fg: '#dc2626' }
      : s === 'closed' ? { bg: 'var(--bg-base)', fg: 'var(--text-secondary)' }
        : { bg: 'var(--accent-dim)', fg: 'var(--accent)' };

// Return area inside a delivered order: the request form, or the progress of the
// request already made (with the customer's own next step: send the parcel back).
export default function OrderReturns({ order, returns, actions }: { order: Order; returns: ReturnRequest[]; actions: Actions }) {
  const { t } = useLanguage();
  const { settings } = useShopSettings();
  const mine = returns.filter(r => r.orderId === order.id);
  const current = mine.find(r => r.status !== 'rejected' && r.status !== 'closed') ?? mine[0];

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReturnReason>('defective');
  const [details, setDetails] = useState('');
  const [qty, setQty] = useState<Record<string, number>>({});
  const [tracking, setTracking] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const deliveredAt = new Date(order.statusUpdatedAt ?? order.date).getTime();
  // Fixed once per mount; the database re-checks the window when the request is sent.
  const [mountedAt] = useState(() => Date.now());
  const daysLeft = Math.ceil((deliveredAt + settings.returnDays * DAY_MS - mountedAt) / DAY_MS);
  const canRequest = order.status === 'delivered' && daysLeft > 0 && (!current || current.status === 'rejected' || current.status === 'closed');

  // Several order lines can share a product, so work per product.
  const lines = Object.values(order.items.reduce<Record<string, { productId: string; name: string; price: number; bought: number }>>((acc, i) => {
    const entry = acc[i.productId] ?? { productId: i.productId, name: i.name, price: i.price, bought: 0 };
    entry.bought += i.quantity;
    acc[i.productId] = entry;
    return acc;
  }, {})).filter(l => l.productId);

  const chosen = lines.map(l => ({ ...l, quantity: Math.min(qty[l.productId] ?? 0, l.bought) })).filter(l => l.quantity > 0);
  const sum = chosen.reduce((acc, l) => acc + l.price * l.quantity, 0);
  const estimate = order.subtotal > 0 ? Math.floor((sum * (order.subtotal - order.discount)) / order.subtotal) : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (chosen.length === 0) { setMessage({ ok: false, text: t('ret.pickItems') }); return; }
    setBusy(true);
    setMessage(null);
    const r = await actions.request(order.id, reason, details.trim(), chosen.map(l => ({ productId: l.productId, quantity: l.quantity })));
    setBusy(false);
    if (r.ok) { setOpen(false); setQty({}); setDetails(''); setMessage({ ok: true, text: t('ret.sent') }); }
    else setMessage({ ok: false, text: t(r.error) });
  };

  const run = async (fn: () => ReturnType<Actions['close']>) => {
    setBusy(true);
    setMessage(null);
    const r = await fn();
    setBusy(false);
    if (!r.ok) setMessage({ ok: false, text: t(r.error) });
  };

  if (order.status !== 'delivered' && !current) return null;

  const tone = current ? returnStatusTone(current.status) : null;
  const money = (v: number) => `${v.toLocaleString('vi-VN')}đ`;

  return (
    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <p className="flex items-center gap-1.5 text-xs font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        <Undo2 size={13} strokeWidth={2} /> {t('ret.title')}
      </p>

      {message && (
        <p role={message.ok ? 'status' : 'alert'} className="mb-2 text-xs font-medium" style={{ color: message.ok ? '#16a34a' : 'var(--danger)' }}>{message.text}</p>
      )}

      {current && tone && (
        <div className="p-3 rounded-xl space-y-2" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{t('ret.code', { code: current.code })}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: tone.bg, color: tone.fg }}>
              {t(`ret.status.${current.status}` as DictionaryKey)}
            </span>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            {current.items.map(i => `${i.name} × ${i.quantity}`).join(', ')} · {t(`ret.reason.${current.reason}` as DictionaryKey)}
          </p>
          <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{t('ret.refundAmount', { amount: money(current.refundAmount) })}</p>
          {current.staffNote && <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{t('ret.staffNote', { note: current.staffNote })}</p>}

          {(current.status === 'requested' || current.status === 'shipped' || current.status === 'received') && (
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t(`ret.next.${current.status}` as DictionaryKey)}</p>
          )}
          {current.trackingCode && <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{t('ret.trackingShown', { code: current.trackingCode })}</p>}

          {current.status === 'approved' && (
            <div className="space-y-2">
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{t('ret.next.approved')}</p>
              <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {settings.businessAddress ? t('ret.sendTo', { address: settings.businessAddress }) : t('ret.sendToMissing')}
              </p>
              <div className="flex gap-2 flex-wrap">
                <label htmlFor={`trk-${current.id}`} className="sr-only">{t('ret.tracking')}</label>
                <input
                  id={`trk-${current.id}`}
                  value={tracking}
                  onChange={e => setTracking(e.target.value)}
                  placeholder={t('ret.trackingPh')}
                  maxLength={60}
                  className="input-field flex-1 min-w-48 px-3 py-2 text-xs rounded-xl"
                />
                <button disabled={busy} onClick={() => run(() => actions.ship(current.id, tracking))} className="btn-primary px-4 py-2 text-xs font-semibold cursor-pointer">
                  {t('ret.shipBtn')}
                </button>
              </div>
            </div>
          )}

          {(current.status === 'requested' || current.status === 'approved') && (
            <button
              disabled={busy}
              onClick={() => { if (window.confirm(t('ret.withdrawConfirm'))) void run(() => actions.close(current.id)); }}
              className="text-[11px] font-semibold cursor-pointer"
              style={{ color: 'var(--danger)' }}
            >
              {t('ret.withdraw')}
            </button>
          )}
        </div>
      )}

      {canRequest && !open && (
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => setOpen(true)} className="btn-outline px-4 py-2 text-xs font-semibold cursor-pointer">{t('ret.button')}</button>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t('ret.daysLeft', { n: daysLeft })}</span>
        </div>
      )}
      {order.status === 'delivered' && !current && daysLeft <= 0 && (
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t('ret.windowClosed', { days: settings.returnDays })}</p>
      )}

      {canRequest && open && (
        <form onSubmit={submit} className="space-y-3 p-3 rounded-xl" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}>
          <fieldset>
            <legend className="text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t('ret.items')}</legend>
            <ul className="space-y-1.5">
              {lines.map(l => (
                <li key={l.productId} className="flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate" style={{ color: 'var(--text-primary)' }}>{l.name}</span>
                  <select
                    aria-label={l.name}
                    value={qty[l.productId] ?? 0}
                    onChange={e => setQty(p => ({ ...p, [l.productId]: Number(e.target.value) }))}
                    className="input-field px-2 py-1 text-xs rounded-lg cursor-pointer"
                  >
                    {Array.from({ length: l.bought + 1 }, (_, n) => <option key={n} value={n}>{n} / {l.bought}</option>)}
                  </select>
                </li>
              ))}
            </ul>
          </fieldset>
          <div>
            <label htmlFor={`rr-${order.id}`} className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t('ret.reason')}</label>
            <select id={`rr-${order.id}`} value={reason} onChange={e => setReason(e.target.value as ReturnReason)} className="input-field w-full px-3 py-2 text-xs rounded-xl cursor-pointer">
              {RETURN_REASONS.map(r => <option key={r} value={r}>{t(`ret.reason.${r}` as DictionaryKey)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={`rd-${order.id}`} className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t('ret.details')}</label>
            <textarea id={`rd-${order.id}`} rows={2} maxLength={1000} value={details} onChange={e => setDetails(e.target.value)} placeholder={t('ret.detailsPh')} className="input-field w-full px-3 py-2 text-xs rounded-xl resize-none" />
          </div>
          {sum > 0 && (
            <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{t('ret.estimate', { amount: money(estimate) })}</strong> · {t('ret.estimateNote')}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn-primary px-4 py-2 text-xs font-semibold cursor-pointer">{busy ? t('ret.sending') : t('ret.submit')}</button>
            <button type="button" onClick={() => setOpen(false)} className="btn-outline px-4 py-2 text-xs font-semibold cursor-pointer">{t('ret.cancelForm')}</button>
          </div>
        </form>
      )}
    </div>
  );
}
