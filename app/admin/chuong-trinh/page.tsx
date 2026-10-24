'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X, Zap, Megaphone } from 'lucide-react';
import AdminShell from '../../../components/admin-shell';
import AdminStat from '../../../components/admin-stat';
import { getSupabase } from '../../../lib/supabase';
import { resolveImage } from '../../../lib/storage';
import { useAuth } from '../../../hooks/use-auth';
import { refreshCatalog, useProductCatalog } from '../../../hooks/use-product-catalog';
import { refreshBanners, type BannerRow } from '../../../hooks/use-banners';
import { useLanguage } from '../../../hooks/use-language';
import type { DictionaryKey } from '../../i18n/dictionary';

const money = (v: number) => `${v.toLocaleString('vi-VN')}đ`;
const fieldCls = 'w-full px-3 py-2.5 text-sm rounded-xl input-field';
const labelCls = 'block text-xs font-semibold mb-1.5';

// <input type="datetime-local"> wants local time without a zone.
const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fmt = (iso: string | null | undefined, locale: string) =>
  iso ? new Date(iso).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' }) : '…';

type Tone = { label: DictionaryKey; bg: string; fg: string };
function windowState(active: boolean, starts: string | null | undefined, ends: string | null | undefined): Tone {
  const now = Date.now();
  if (!active) return { label: 'adm.camp.state.off', bg: 'var(--bg-base)', fg: 'var(--text-muted)' };
  if (starts && now < new Date(starts).getTime()) return { label: 'adm.camp.state.upcoming', bg: 'rgba(59,130,246,0.14)', fg: '#2563eb' };
  if (ends && now >= new Date(ends).getTime()) return { label: 'adm.camp.state.ended', bg: 'rgba(220,38,38,0.12)', fg: '#dc2626' };
  return { label: 'adm.camp.state.running', bg: 'rgba(34,197,94,0.15)', fg: '#16a34a' };
}

function Pill({ tone }: { tone: Tone }) {
  const { t } = useLanguage();
  return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap" style={{ background: tone.bg, color: tone.fg }}>{t(tone.label)}</span>;
}

// ───────────────────────── Flash Sale ─────────────────────────
function FlashSaleSection() {
  const { language, t } = useLanguage();
  const locale = language === 'en' ? 'en-US' : 'vi-VN';
  const { products } = useProductCatalog();
  const [pct, setPct] = useState('20');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [grade, setGrade] = useState('all');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const grades = useMemo(() => Array.from(new Set(products.map(p => p.grade))), [products]);
  const visible = products.filter(p =>
    (grade === 'all' || p.grade === grade) && p.name.toLowerCase().includes(query.trim().toLowerCase()));

  // Products that carry a stored sale, grouped by their window = one "campaign".
  const campaigns = useMemo(() => {
    const map = new Map<string, { starts?: string; ends?: string; items: typeof products }>();
    for (const p of products) {
      if (p.storedSalePrice == null) continue;
      const key = `${p.saleStartsAt ?? ''}|${p.saleEndsAt ?? ''}`;
      const entry = map.get(key) ?? { starts: p.saleStartsAt, ends: p.saleEndsAt, items: [] };
      entry.items.push(p);
      map.set(key, entry);
    }
    return [...map.entries()].map(([key, v]) => ({ key, ...v }));
  }, [products]);

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const allVisibleSelected = visible.length > 0 && visible.every(p => selected.has(p.id));
  const toggleVisible = () =>
    setSelected(prev => {
      const next = new Set(prev);
      for (const p of visible) { if (allVisibleSelected) next.delete(p.id); else next.add(p.id); }
      return next;
    });

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const percent = Number(pct);
    if (!Number.isFinite(percent) || percent < 1 || percent > 90) { setMessage({ ok: false, text: t('adm.camp.errPct') }); return; }
    if (selected.size === 0) { setMessage({ ok: false, text: t('adm.camp.errNone') }); return; }
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) { setMessage({ ok: false, text: t('adm.camp.errDates') }); return; }

    setBusy(true);
    const supabase = getSupabase();
    const chosen = products.filter(p => selected.has(p.id));
    const results = await Promise.all(chosen.map(p => {
      // Round to the nearest 1.000đ, always below the normal price.
      const sale = Math.min(p.price - 1, Math.max(1000, Math.round((p.price * (1 - percent / 100)) / 1000) * 1000));
      return supabase.from('products').update({
        sale_price: sale,
        sale_starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        sale_ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      }).eq('id', p.id);
    }));
    await refreshCatalog();
    setBusy(false);
    const failed = results.filter(r => r.error).length;
    if (failed) setMessage({ ok: false, text: t('adm.camp.failed', { failed, total: chosen.length }) });
    else {
      setMessage({ ok: true, text: t('adm.camp.applied', { pct: percent, n: chosen.length }) });
      setSelected(new Set());
    }
  };

  const endCampaign = async (ids: string[]) => {
    if (!window.confirm(t('adm.camp.endConfirm', { n: ids.length }))) return;
    setBusy(true);
    const { error } = await getSupabase().from('products')
      .update({ sale_price: null, sale_starts_at: null, sale_ends_at: null }).in('id', ids);
    await refreshCatalog();
    setBusy(false);
    setMessage(error ? { ok: false, text: t('adm.camp.endFail') } : { ok: true, text: t('adm.camp.endDone') });
  };

  return (
    <section aria-labelledby="flash-heading" className="mb-10">
      <h2 id="flash-heading" className="text-base font-bold font-display mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <Zap size={16} strokeWidth={2} style={{ color: 'var(--accent)' }} /> {t('adm.camp.flashTitle')}
      </h2>
      <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
        {t('adm.camp.flashDesc')}
      </p>

      {message && (
        <p role={message.ok ? 'status' : 'alert'} className="mb-4 p-3 rounded-xl text-xs font-medium"
          style={{ background: message.ok ? 'rgba(34,197,94,0.12)' : 'var(--accent-dim)', color: message.ok ? '#16a34a' : 'var(--danger)' }}>
          {message.text}
        </p>
      )}

      <form onSubmit={apply} className="card-surface p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="fs-pct" className={labelCls} style={{ color: 'var(--text-secondary)' }}>{t('adm.camp.pct')}</label>
            <input id="fs-pct" type="number" min={1} max={90} value={pct} onChange={e => setPct(e.target.value)} className={fieldCls} />
          </div>
          <div>
            <label htmlFor="fs-start" className={labelCls} style={{ color: 'var(--text-secondary)' }}>{t('adm.camp.start')}</label>
            <input id="fs-start" type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} className={fieldCls} />
          </div>
          <div>
            <label htmlFor="fs-end" className={labelCls} style={{ color: 'var(--text-secondary)' }}>{t('adm.camp.end')}</label>
            <input id="fs-end" type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} className={fieldCls} />
          </div>
        </div>
        <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>{t('adm.camp.flashHint')}</p>

        <div className="flex flex-wrap items-center gap-2 mt-4">
          <input aria-label={t('adm.camp.search')} value={query} onChange={e => setQuery(e.target.value)} placeholder={t('adm.camp.searchPh')} className={fieldCls + ' !w-auto flex-1 min-w-40'} />
          <select aria-label={t('adm.camp.gradeAria')} value={grade} onChange={e => setGrade(e.target.value)} className={fieldCls + ' !w-auto cursor-pointer'}>
            <option value="all">{t('adm.camp.allGrades')}</option>
            {grades.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <button type="button" onClick={toggleVisible} className="btn-outline px-3 py-2.5 text-xs font-semibold cursor-pointer">
            {t(allVisibleSelected ? 'adm.camp.deselect' : 'adm.camp.select', { n: visible.length })}
          </button>
        </div>

        <ul className="mt-3 max-h-64 overflow-y-auto grid gap-1 sm:grid-cols-2 pr-1">
          {visible.map(p => (
            <li key={p.id}>
              <label className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer text-xs"
                style={{ background: selected.has(p.id) ? 'var(--accent-dim)' : 'transparent', color: 'var(--text-primary)' }}>
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="cursor-pointer" />
                <span className="flex-1 min-w-0 truncate">{p.name}</span>
                <span className="font-semibold whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{money(p.price)}</span>
              </label>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{t('adm.camp.selected', { n: selected.size })}</span>
          <button type="submit" disabled={busy} className="btn-primary px-5 py-2.5 text-sm font-semibold cursor-pointer">
            {busy ? t('adm.camp.applying') : t('adm.camp.apply')}
          </button>
        </div>
      </form>

      <div className="card-surface overflow-x-auto mt-4">
        <table className="admin-table w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {(['adm.camp.col.window', 'adm.camp.col.products', 'adm.camp.col.status'] as const).map(h => (
                <th key={h} className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-muted)' }}>{t(h)}</th>
              ))}
              <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-muted)' }}></th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center" style={{ color: 'var(--text-secondary)' }}>{t('adm.camp.noSale')}</td></tr>
            ) : campaigns.map(c => (
              <tr key={c.key} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td className="py-3 px-4 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                  {c.starts || c.ends ? `${fmt(c.starts, locale)} → ${fmt(c.ends, locale)}` : t('adm.camp.immediate')}
                </td>
                <td className="py-3 px-4" style={{ color: 'var(--text-primary)' }}>
                  <span className="font-semibold">{t('adm.camp.productCount', { n: c.items.length })}</span>
                  <span className="block truncate max-w-xs" style={{ color: 'var(--text-muted)' }}>
                    {c.items.slice(0, 3).map(p => `${p.name} (${money(p.storedSalePrice ?? 0)})`).join(', ')}{c.items.length > 3 ? '…' : ''}
                  </span>
                </td>
                <td className="py-3 px-4"><Pill tone={windowState(true, c.starts, c.ends)} /></td>
                <td className="py-3 px-4">
                  <button disabled={busy} onClick={() => endCampaign(c.items.map(p => p.id))} className="btn-outline px-3 py-1.5 text-[11px] font-semibold cursor-pointer">
                    {t('adm.camp.endBtn')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ───────────────────────── Banners ─────────────────────────
const GRADIENTS = [
  { label: 'adm.camp.grad.orange' as DictionaryKey, value: 'linear-gradient(120deg, #ff5a1f 0%, #ff8a4d 55%, #ffb37a 100%)' },
  { label: 'adm.camp.grad.deepOrange' as DictionaryKey, value: 'linear-gradient(120deg, #c2410c 0%, #ff5a1f 55%, #ffb37a 100%)' },
  { label: 'adm.camp.grad.dark' as DictionaryKey, value: 'linear-gradient(120deg, #14161a 0%, #3a2a20 55%, #ff5a1f 100%)' },
  { label: 'adm.camp.grad.blue' as DictionaryKey, value: 'linear-gradient(120deg, #0f3d91 0%, #2563eb 55%, #7aa7ff 100%)' },
];

interface BannerForm {
  eyebrow: string; headline: string; body: string; ctaLabel: string; ctaHref: string;
  image: string; gradient: string; sortOrder: string; active: boolean; startsAt: string; endsAt: string;
}
const emptyBanner: BannerForm = {
  eyebrow: '', headline: '', body: '', ctaLabel: 'Xem ngay', ctaHref: '#catalog', image: '',
  gradient: GRADIENTS[0].value, sortOrder: '0', active: true, startsAt: '', endsAt: '',
};

function BannerSection() {
  const { language, t } = useLanguage();
  const locale = language === 'en' ? 'en-US' : 'vi-VN';
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [editing, setEditing] = useState<{ id: string | null; form: BannerForm } | null>(null);
  const [formError, setFormError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await getSupabase().from('banners').select('*').order('sort_order').order('created_at');
    if (data) setBanners(data as BannerRow[]);
    setHasLoaded(true);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const openNew = () => { setFormError(''); setEditing({ id: null, form: emptyBanner }); };
  const openEdit = (b: BannerRow) => {
    setFormError('');
    setEditing({
      id: b.id,
      form: {
        eyebrow: b.eyebrow, headline: b.headline, body: b.body, ctaLabel: b.cta_label, ctaHref: b.cta_href,
        image: b.image, gradient: b.gradient, sortOrder: String(b.sort_order), active: b.active,
        startsAt: toLocalInput(b.starts_at), endsAt: toLocalInput(b.ends_at),
      },
    });
  };
  const set = <K extends keyof BannerForm>(key: K, value: BannerForm[K]) =>
    setEditing(prev => (prev ? { ...prev, form: { ...prev.form, [key]: value } } : prev));

  const pickImage = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setFormError(t('adm.camp.errImage')); return; }
    const reader = new FileReader();
    reader.onload = () => set('image', String(reader.result));
    reader.readAsDataURL(file);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const f = editing.form;
    if (!f.headline.trim()) { setFormError(t('adm.camp.errHeadline')); return; }
    if (f.startsAt && f.endsAt && new Date(f.endsAt) <= new Date(f.startsAt)) { setFormError(t('adm.camp.errDates')); return; }
    setSaving(true);
    let image = f.image;
    try { image = await resolveImage(f.image); } catch { /* keep inline */ }
    const row = {
      eyebrow: f.eyebrow.trim(), headline: f.headline.trim(), body: f.body.trim(),
      cta_label: f.ctaLabel.trim(), cta_href: f.ctaHref.trim() || '#catalog',
      image, gradient: f.gradient, sort_order: Math.floor(Number(f.sortOrder) || 0), active: f.active,
      starts_at: f.startsAt ? new Date(f.startsAt).toISOString() : null,
      ends_at: f.endsAt ? new Date(f.endsAt).toISOString() : null,
    };
    const supabase = getSupabase();
    const { error: err } = editing.id
      ? await supabase.from('banners').update(row).eq('id', editing.id)
      : await supabase.from('banners').insert(row);
    setSaving(false);
    if (err) { setFormError(t('adm.camp.errBannerSave')); return; }
    setEditing(null);
    await load();
    void refreshBanners();
  };

  const toggleActive = async (b: BannerRow) => {
    setError('');
    const { error: err } = await getSupabase().from('banners').update({ active: !b.active }).eq('id', b.id);
    if (err) setError(t('adm.camp.errBannerToggle')); else { await load(); void refreshBanners(); }
  };
  const remove = async (b: BannerRow) => {
    if (!window.confirm(t('adm.camp.confirmBannerDelete', { name: b.headline }))) return;
    setError('');
    const { error: err } = await getSupabase().from('banners').delete().eq('id', b.id);
    if (err) setError(t('adm.camp.errBannerDelete')); else { await load(); void refreshBanners(); }
  };

  return (
    <section aria-labelledby="banner-heading">
      <div className="flex items-end justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h2 id="banner-heading" className="text-base font-bold font-display mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Megaphone size={16} strokeWidth={2} style={{ color: 'var(--accent)' }} /> {t('adm.camp.bannerTitle')}
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {t('adm.camp.bannerDesc')}
          </p>
        </div>
        <button onClick={openNew} className="btn-primary px-4 py-2.5 text-sm font-semibold cursor-pointer flex items-center gap-2">
          <Plus size={15} strokeWidth={2} /> {t('adm.camp.addBanner')}
        </button>
      </div>

      {error && <p role="alert" className="mb-4 p-3 rounded-xl text-xs font-medium" style={{ background: 'var(--accent-dim)', color: 'var(--danger)' }}>{error}</p>}

      <div className="card-surface overflow-x-auto">
        <table className="admin-table w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {(['adm.camp.col.banner', 'adm.camp.col.time', 'adm.camp.col.order', 'adm.camp.col.status'] as const).map(h => (
                <th key={h} className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-muted)' }}>{t(h)}</th>
              ))}
              <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-muted)' }}></th>
            </tr>
          </thead>
          <tbody>
            {!hasLoaded ? (
              <tr><td colSpan={5} className="py-8 text-center" style={{ color: 'var(--text-secondary)' }}>{t('adm.camp.loading')}</td></tr>
            ) : banners.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center" style={{ color: 'var(--text-secondary)' }}>{t('adm.camp.noBanner')}</td></tr>
            ) : banners.map(b => (
              <tr key={b.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <span className="w-14 h-9 rounded-lg shrink-0" style={{ background: b.gradient }} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block font-semibold truncate max-w-xs" style={{ color: 'var(--text-primary)' }}>{b.headline}</span>
                      {b.eyebrow && <span className="block" style={{ color: 'var(--text-muted)' }}>{b.eyebrow}</span>}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                  {b.starts_at || b.ends_at ? `${fmt(b.starts_at, locale)} → ${fmt(b.ends_at, locale)}` : t('adm.camp.unlimited')}
                </td>
                <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>{b.sort_order}</td>
                <td className="py-3 px-4">
                  <button onClick={() => toggleActive(b)} title={b.active ? t('adm.camp.toggleOff') : t('adm.camp.toggleOn')} className="cursor-pointer">
                    <Pill tone={windowState(b.active, b.starts_at, b.ends_at)} />
                  </button>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openEdit(b)} className="btn-ghost p-1.5 cursor-pointer" aria-label={t('adm.camp.editAria', { name: b.headline })} title={t('adm.camp.edit')}><Pencil size={14} strokeWidth={2} /></button>
                    <button onClick={() => remove(b)} className="trash-btn p-1.5 cursor-pointer" aria-label={t('adm.camp.deleteAria', { name: b.headline })} title={t('adm.camp.delete')}><Trash2 size={14} strokeWidth={2} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(20,22,26,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setEditing(null)}>
          <div className="card-surface w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('adm.camp.bannerAria')}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold font-display" style={{ color: 'var(--text-primary)' }}>{editing.id ? t('adm.camp.editBanner') : t('adm.camp.addBanner')}</h2>
              <button onClick={() => setEditing(null)} className="btn-ghost p-1.5 cursor-pointer" aria-label={t('adm.camp.close')}><X size={18} strokeWidth={2} /></button>
            </div>
            {formError && <p role="alert" className="mb-4 p-3 rounded-xl text-xs font-medium" style={{ background: 'rgba(214,69,80,0.1)', color: 'var(--danger)' }}>{formError}</p>}

            <div className="rounded-2xl px-5 py-4 mb-4" style={{ background: editing.form.gradient }} aria-hidden="true">
              <span className="inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full mb-1.5" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>{editing.form.eyebrow || t('adm.camp.prevEyebrow')}</span>
              <p className="text-base font-bold text-white">{editing.form.headline || t('adm.camp.prevHeadline')}</p>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.85)' }}>{editing.form.body || t('adm.camp.prevBody')}</p>
            </div>

            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="b-eyebrow" className={labelCls} style={{ color: 'var(--text-secondary)' }}>{t('adm.camp.eyebrow')}</label>
                  <input id="b-eyebrow" value={editing.form.eyebrow} onChange={e => set('eyebrow', e.target.value)} className={fieldCls} maxLength={40} />
                </div>
                <div>
                  <label htmlFor="b-sort" className={labelCls} style={{ color: 'var(--text-secondary)' }}>{t('adm.camp.sort')}</label>
                  <input id="b-sort" type="number" value={editing.form.sortOrder} onChange={e => set('sortOrder', e.target.value)} className={fieldCls} />
                </div>
              </div>
              <div>
                <label htmlFor="b-head" className={labelCls} style={{ color: 'var(--text-secondary)' }}>{t('adm.camp.headline')}</label>
                <input id="b-head" required value={editing.form.headline} onChange={e => set('headline', e.target.value)} className={fieldCls} maxLength={90} />
              </div>
              <div>
                <label htmlFor="b-body" className={labelCls} style={{ color: 'var(--text-secondary)' }}>{t('adm.camp.body')}</label>
                <textarea id="b-body" rows={2} value={editing.form.body} onChange={e => set('body', e.target.value)} className={fieldCls + ' resize-none'} maxLength={200} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="b-cta" className={labelCls} style={{ color: 'var(--text-secondary)' }}>{t('adm.camp.ctaLabel')}</label>
                  <input id="b-cta" value={editing.form.ctaLabel} onChange={e => set('ctaLabel', e.target.value)} className={fieldCls} maxLength={30} />
                </div>
                <div>
                  <label htmlFor="b-href" className={labelCls} style={{ color: 'var(--text-secondary)' }}>{t('adm.camp.ctaHref')}</label>
                  <input id="b-href" value={editing.form.ctaHref} onChange={e => set('ctaHref', e.target.value)} className={fieldCls} placeholder="/flash-sale" />
                </div>
              </div>
              <div>
                <span className={labelCls} style={{ color: 'var(--text-secondary)' }}>{t('adm.camp.bg')}</span>
                <div className="flex flex-wrap gap-2">
                  {GRADIENTS.map(g => (
                    <button key={g.value} type="button" onClick={() => set('gradient', g.value)} aria-pressed={editing.form.gradient === g.value}
                      className="w-16 h-9 rounded-lg cursor-pointer text-[10px] font-bold text-white"
                      style={{ background: g.value, outline: editing.form.gradient === g.value ? '2px solid var(--accent)' : 'none', outlineOffset: 2 }}>
                      {t(g.label)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="b-image" className={labelCls} style={{ color: 'var(--text-secondary)' }}>{t('adm.camp.image')}</label>
                <input id="b-image" type="file" accept="image/*" onChange={e => pickImage(e.target.files?.[0])} className="text-xs" />
                {editing.form.image && (
                  <button type="button" onClick={() => set('image', '')} className="ml-3 text-[11px] font-semibold cursor-pointer" style={{ color: 'var(--danger)' }}>{t('adm.camp.removeImage')}</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="b-start" className={labelCls} style={{ color: 'var(--text-secondary)' }}>{t('adm.camp.showFrom')}</label>
                  <input id="b-start" type="datetime-local" value={editing.form.startsAt} onChange={e => set('startsAt', e.target.value)} className={fieldCls} />
                </div>
                <div>
                  <label htmlFor="b-end" className={labelCls} style={{ color: 'var(--text-secondary)' }}>{t('adm.camp.showUntil')}</label>
                  <input id="b-end" type="datetime-local" value={editing.form.endsAt} onChange={e => set('endsAt', e.target.value)} className={fieldCls} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                <input type="checkbox" checked={editing.form.active} onChange={e => set('active', e.target.checked)} className="cursor-pointer" /> {t('adm.camp.active')}
              </label>
              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={() => setEditing(null)} className="btn-outline flex-1 py-2.5 text-sm font-semibold cursor-pointer">{t('common.cancel')}</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5 text-sm font-semibold cursor-pointer">{saving ? t('adm.camp.saving') : t('adm.camp.saveBanner')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default function CampaignsPage() {
  const { role } = useAuth();
  const { t } = useLanguage();
  const { products } = useProductCatalog();
  const onSale = products.filter(p => p.storedSalePrice != null).length;
  const live = products.filter(p => p.salePrice != null).length;
  const upcoming = products.filter(p => p.salePhase === 'upcoming').length;

  return (
    <AdminShell
      active="chuong-trinh"
      title={t('adm.camp.pageTitle')}
      description={t('adm.camp.pageDesc')}
    >
      {role === 'admin' && (
        <>
          <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))' }}>
            <AdminStat label={t('adm.camp.statLive')} value={String(live)} hint={t('adm.camp.statLiveHint')} icon={<Zap size={20} strokeWidth={2} />} />
            <AdminStat label={t('adm.camp.statUpcoming')} value={String(upcoming)} hint={t('adm.camp.statUpcomingHint')} icon={<Zap size={20} strokeWidth={2} />} />
            <AdminStat label={t('adm.camp.statOnSale')} value={String(onSale)} hint={t('adm.camp.statOnSaleHint')} icon={<Zap size={20} strokeWidth={2} />} />
          </div>
          <FlashSaleSection />
          <BannerSection />
        </>
      )}
    </AdminShell>
  );
}
