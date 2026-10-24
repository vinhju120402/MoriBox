'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Boxes, PackageCheck, PackageX, TriangleAlert, Check, Plus, Pencil, Trash2, Search, PackagePlus, History,
  Download, Upload, X, ArrowUpDown,
} from 'lucide-react';
import AdminShell from '../../../components/admin-shell';
import AdminStat from '../../../components/admin-stat';
import AdminProductModal from '../../../components/admin-product-modal';
import ProductImage from '../../../components/product-image';
import Pagination, { paginate } from '../../../components/pagination';
import { useProductCatalog, refreshCatalog, CatalogResult } from '../../../hooks/use-product-catalog';
import { useProductCosts } from '../../../hooks/use-product-costs';
import { useLanguage } from '../../../hooks/use-language';
import { getSupabase } from '../../../lib/supabase';
import { downloadCsv, parseCsv } from '../../../lib/csv';
import { Product, GradeCode, lowStockLevel, DEFAULT_LOW_STOCK } from '../../data/products';
import type { DictionaryKey } from '../../i18n/dictionary';

type TFn = (key: DictionaryKey, params?: Record<string, string | number>) => string;

const GRADE_FILTERS: (GradeCode | 'ALL')[] = ['ALL', 'PG', 'MG', 'RG', 'HG', 'EG', 'SD', 'ACC'];
const GRADES: GradeCode[] = ['PG', 'MG', 'RG', 'HG', 'EG', 'SD', 'ACC'];

type Sort = 'name' | 'stock-asc' | 'stock-desc' | 'price-asc' | 'price-desc';
const SORTS: { value: Sort; label: DictionaryKey }[] = [
  { value: 'name', label: 'adm.stock.sort.name' },
  { value: 'stock-asc', label: 'adm.stock.sort.stockAsc' },
  { value: 'stock-desc', label: 'adm.stock.sort.stockDesc' },
  { value: 'price-asc', label: 'adm.stock.sort.priceAsc' },
  { value: 'price-desc', label: 'adm.stock.sort.priceDesc' },
];

const COLUMNS: DictionaryKey[] = [
  'adm.stock.col.product', 'adm.stock.col.grade', 'adm.stock.col.price', 'adm.stock.col.cost', 'adm.stock.col.stock', 'adm.stock.col.status',
];

function stockStatus(p: Product): { label: DictionaryKey; color: string } {
  if (p.stock === 0) return { label: 'adm.stock.status.out', color: 'var(--danger)' };
  if (p.stock <= lowStockLevel(p)) return { label: 'adm.stock.status.low', color: '#b45309' };
  return { label: 'adm.stock.status.in', color: '#16a34a' };
}

const REASON_LABEL: Record<string, DictionaryKey> = {
  sale: 'adm.stock.reason.sale',
  cancel: 'adm.stock.reason.cancel',
  receive: 'adm.stock.reason.receive',
  adjust: 'adm.stock.reason.adjust',
  initial: 'adm.stock.reason.initial',
};

interface Movement {
  id: number;
  at: string;
  delta: number;
  stock_after: number;
  reason: string;
  note: string | null;
}

// ── CSV import ────────────────────────────────────────────────────────
interface ImportRow {
  line: number;
  id: string;
  isNew: boolean;
  name: string;
  grade: GradeCode;
  scale: string;
  series: string;
  price: number;
  salePrice: number | null;
  stock: number;
  threshold: number;
  cost: number;
  isNewFlag: boolean;
  isBestSeller: boolean;
}

const CSV_HEADERS = ['id', 'name', 'grade', 'scale', 'series', 'price', 'sale_price', 'stock', 'low_stock_threshold', 'cost_price', 'is_new', 'is_best_seller'];
const truthy = (v: string) => ['1', 'true', 'x', 'yes', 'co', 'có'].includes(v.trim().toLowerCase());

function parseProductsCsv(text: string, existing: Set<string>, t: TFn): { rows: ImportRow[]; errors: string[] } {
  const table = parseCsv(text);
  const errors: string[] = [];
  if (table.length < 2) return { rows: [], errors: [t('adm.stock.csv.noRows')] };
  const head = table[0].map(h => h.trim().toLowerCase());
  const col = (name: string) => head.indexOf(name);
  for (const required of ['name', 'grade', 'price']) {
    if (col(required) === -1) errors.push(t('adm.stock.csv.missingCol', { col: required }));
  }
  if (errors.length) return { rows: [], errors };

  const rows: ImportRow[] = [];
  table.slice(1).forEach((cells, idx) => {
    const line = idx + 2;
    const get = (name: string) => (col(name) === -1 ? '' : (cells[col(name)] ?? '').trim());
    const num = (name: string, fallback: number | null): number | null => {
      const raw = get(name);
      if (raw === '') return fallback;
      const n = Number(raw);
      return Number.isInteger(n) && n >= 0 ? n : NaN;
    };
    const name = get('name');
    const grade = get('grade').toUpperCase() as GradeCode;
    const price = num('price', null);
    const salePrice = num('sale_price', null);
    const stock = num('stock', 0);
    const threshold = num('low_stock_threshold', DEFAULT_LOW_STOCK);
    const cost = num('cost_price', 0);
    const problems: string[] = [];
    if (!name) problems.push(t('adm.stock.csv.noName'));
    if (!GRADES.includes(grade)) problems.push(t('adm.stock.csv.badGrade', { v: get('grade') }));
    if (price === null || Number.isNaN(price)) problems.push(t('adm.stock.csv.badPrice'));
    if (salePrice !== null && Number.isNaN(salePrice)) problems.push(t('adm.stock.csv.badSale'));
    if (stock === null || Number.isNaN(stock)) problems.push(t('adm.stock.csv.badStock'));
    if (threshold === null || Number.isNaN(threshold)) problems.push(t('adm.stock.csv.badThreshold'));
    if (cost === null || Number.isNaN(cost)) problems.push(t('adm.stock.csv.badCost'));
    if (problems.length) { errors.push(t('adm.stock.csv.line', { line, problems: problems.join(', ') })); return; }

    const id = get('id') || `custom-${Date.now()}-${idx}`;
    rows.push({
      line, id, isNew: !existing.has(id), name, grade, scale: get('scale') || '—', series: get('series') || 'MoriBox',
      price: price as number, salePrice, stock: stock as number, threshold: threshold as number, cost: cost as number,
      isNewFlag: truthy(get('is_new')), isBestSeller: truthy(get('is_best_seller')),
    });
  });
  return { rows, errors };
}

const fieldCls = 'w-full px-3 py-2.5 text-sm rounded-xl input-field';

export default function AdminInventoryPage() {
  const { language, t } = useLanguage();
  const { products, addProduct, updateProduct, deleteProduct } = useProductCatalog();
  const { costs, setCost, setManyCosts } = useProductCosts();
  const [gradeFilter, setGradeFilter] = useState<GradeCode | 'ALL'>('ALL');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('name');
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [savedId, setSavedId] = useState<string | null>(null);
  const [modalProduct, setModalProduct] = useState<Product | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [receiving, setReceiving] = useState<Product | null>(null);
  const [receiveQty, setReceiveQty] = useState('');
  const [receiveNote, setReceiveNote] = useState('');
  const [receiveBusy, setReceiveBusy] = useState(false);
  const [receiveError, setReceiveError] = useState('');

  const [historyFor, setHistoryFor] = useState<Product | null>(null);
  const [movements, setMovements] = useState<Movement[] | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [importPlan, setImportPlan] = useState<{ rows: ImportRow[]; errors: string[] } | null>(null);
  const [importBusy, setImportBusy] = useState(false);

  const report = (r: CatalogResult) => setError(r.ok ? '' : t('adm.stock.saveFail', { error: r.error ?? '' }));

  useEffect(() => {
    if (!historyFor) return;
    let cancelled = false;
    getSupabase()
      .from('stock_movements')
      .select('id, at, delta, stock_after, reason, note')
      .eq('product_id', historyFor.id)
      .order('at', { ascending: false })
      .limit(60)
      .then(({ data }) => { if (!cancelled) setMovements((data as Movement[]) ?? []); });
    return () => { cancelled = true; };
  }, [historyFor]);

  // ── list: filter → search → sort ───────────────────────────────────
  const q = query.trim().toLowerCase();
  const filtered = products
    .filter(p => (gradeFilter === 'ALL' || p.grade === gradeFilter) &&
      (!q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.series.toLowerCase().includes(q)))
    .sort((a, b) => {
      switch (sort) {
        case 'stock-asc': return a.stock - b.stock;
        case 'stock-desc': return b.stock - a.stock;
        case 'price-asc': return (a.storedSalePrice ?? a.price) - (b.storedSalePrice ?? b.price);
        case 'price-desc': return (b.storedSalePrice ?? b.price) - (a.storedSalePrice ?? a.price);
        default: return a.name.localeCompare(b.name, 'vi');
      }
    });
  const rows = paginate(filtered, page);

  const totalSku = products.length;
  const totalUnits = products.reduce((acc, p) => acc + p.stock, 0);
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= lowStockLevel(p)).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;

  const handleSaveStock = async (productId: string) => {
    const raw = draft[productId];
    if (raw === undefined) return;
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    report(await updateProduct(productId, { stock: Math.max(0, Math.floor(parsed)) }));
    setDraft(prev => { const next = { ...prev }; delete next[productId]; return next; });
    setSavedId(productId);
    setTimeout(() => setSavedId(id => (id === productId ? null : id)), 1200);
  };

  const handleDelete = async (product: Product) => {
    if (window.confirm(t('adm.stock.deleteConfirm', { name: product.name }))) {
      report(await deleteProduct(product.id));
    }
  };

  const handleModalSave = async (product: Product, cost: number) => {
    const result = await (modalProduct ? updateProduct(product.id, product) : addProduct(product));
    report(result);
    if (result.ok && !(await setCost(product.id, cost))) setError(t('adm.stock.costFail'));
    setModalProduct(undefined);
  };

  // ── receive stock ──────────────────────────────────────────────────
  const submitReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiving) return;
    const qty = Number(receiveQty);
    if (!Number.isInteger(qty) || qty < 1) { setReceiveError(t('adm.stock.qtyError')); return; }
    setReceiveBusy(true);
    setReceiveError('');
    const { error: err } = await getSupabase().rpc('receive_stock', { p_product_id: receiving.id, p_qty: qty, p_note: receiveNote.trim() });
    setReceiveBusy(false);
    if (err) { setReceiveError(t('adm.stock.receiveFail')); return; }
    await refreshCatalog();
    setNotice(t('adm.stock.received', { qty, name: receiving.name }));
    setReceiving(null); setReceiveQty(''); setReceiveNote('');
  };

  // ── CSV ────────────────────────────────────────────────────────────
  const exportCsv = () => {
    downloadCsv(`kho-hang-${new Date().toISOString().slice(0, 10)}.csv`, [
      CSV_HEADERS,
      ...products.map(p => [
        p.id, p.name, p.grade, p.scale, p.series, p.price, p.storedSalePrice ?? '', p.stock, lowStockLevel(p),
        costs[p.id] ?? 0, p.isNew ? 1 : 0, p.isBestSeller ? 1 : 0,
      ]),
    ]);
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    setImportPlan(parseProductsCsv(text, new Set(products.map(p => p.id)), t));
  };

  const confirmImport = async () => {
    if (!importPlan || importPlan.rows.length === 0) return;
    setImportBusy(true);
    const supabase = getSupabase();
    const payload = importPlan.rows.map(r => ({
      id: r.id, name: r.name, grade: r.grade, scale: r.scale, series: r.series, price: r.price,
      sale_price: r.salePrice, stock: r.stock, low_stock_threshold: r.threshold,
      is_new: r.isNewFlag, is_best_seller: r.isBestSeller,
    }));
    const { error: err } = await supabase.from('products').upsert(payload, { onConflict: 'id' });
    if (err) {
      setImportBusy(false);
      setError(t('adm.stock.importFail'));
      setImportPlan(null);
      return;
    }
    await setManyCosts(importPlan.rows.map(r => ({ productId: r.id, cost: r.cost })));
    await refreshCatalog();
    setImportBusy(false);
    setNotice(t('adm.stock.imported', { n: importPlan.rows.length }));
    setImportPlan(null);
  };

  return (
    <AdminShell
      active="kho"
      title={t('adm.stock.title')}
      description={t('adm.stock.desc')}
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={exportCsv} className="btn-outline px-3 py-2.5 text-xs font-semibold cursor-pointer flex items-center gap-1.5">
            <Download size={14} strokeWidth={2} /> {t('adm.stock.exportCsv')}
          </button>
          <button onClick={() => fileRef.current?.click()} className="btn-outline px-3 py-2.5 text-xs font-semibold cursor-pointer flex items-center gap-1.5">
            <Upload size={14} strokeWidth={2} /> {t('adm.stock.importCsv')}
          </button>
          <button onClick={() => setModalProduct(null)} className="btn-primary px-4 py-2.5 text-sm font-semibold cursor-pointer flex items-center gap-2">
            <Plus size={15} strokeWidth={2} /> {t('adm.stock.add')}
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onPickFile} className="hidden" />
        </div>
      }
    >
      {error && (
        <p role="alert" className="mb-4 p-3 rounded-xl text-xs font-medium" style={{ background: 'var(--accent-dim)', color: 'var(--danger)' }}>{error}</p>
      )}
      {notice && (
        <p role="status" className="mb-4 p-3 rounded-xl text-xs font-medium flex items-center justify-between gap-3" style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}>
          {notice}
          <button onClick={() => setNotice('')} aria-label={t('adm.stock.closeNotice')} className="cursor-pointer"><X size={14} strokeWidth={2} /></button>
        </p>
      )}

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))' }}>
        <AdminStat label={t('adm.stock.stat.sku')} value={String(totalSku)} icon={<Boxes size={20} strokeWidth={2} />} />
        <AdminStat label={t('adm.stock.stat.units')} value={totalUnits.toLocaleString('vi-VN')} icon={<PackageCheck size={20} strokeWidth={2} />} />
        <AdminStat label={t('adm.stock.stat.low')} value={String(lowStockCount)} hint={t('adm.stock.stat.lowHint')} icon={<TriangleAlert size={20} strokeWidth={2} />} tone={lowStockCount > 0 ? 'danger' : 'default'} />
        <AdminStat label={t('adm.stock.stat.out')} value={String(outOfStockCount)} icon={<PackageX size={20} strokeWidth={2} />} tone={outOfStockCount > 0 ? 'danger' : 'default'} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap gap-2">
          {GRADE_FILTERS.map(g => (
            <button
              key={g}
              onClick={() => { setGradeFilter(g); setPage(1); }}
              className={`filter-pill px-3.5 py-1.5 text-xs font-semibold cursor-pointer${gradeFilter === g ? ' active' : ''}`}
            >
              {g === 'ALL' ? t('adm.stock.filterAll') : g}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-full sm:w-56">
            <Search size={14} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder={t('adm.stock.searchPh')}
              aria-label={t('adm.stock.searchAria')}
              className="input-field w-full pl-9 pr-3 py-2 text-xs"
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <ArrowUpDown size={13} strokeWidth={2} aria-hidden="true" />
            <span className="sr-only">{t('adm.stock.sort')}</span>
            <select value={sort} onChange={(e) => { setSort(e.target.value as Sort); setPage(1); }} className="input-field px-2.5 py-2 text-xs cursor-pointer" aria-label={t('adm.stock.sort')}>
              {SORTS.map(s => <option key={s.value} value={s.value}>{t(s.label)}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
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
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center" style={{ color: 'var(--text-secondary)' }}>{t('adm.stock.empty')}</td></tr>
              ) : rows.map(p => {
                const status = stockStatus(p);
                const currentDraft = draft[p.id];
                const isDirty = currentDraft !== undefined && Number(currentDraft) !== p.stock && currentDraft !== '';
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3 min-w-[14rem]">
                        <div className="media-well relative w-10 h-10 shrink-0 rounded-lg overflow-hidden">
                          <ProductImage src={p.image} alt="" imgClassName="object-contain p-0.5" iconSize={14} compact sizes="40px" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate max-w-[16rem]" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                          <p className="text-[10px] font-hud truncate" style={{ color: 'var(--text-muted)' }}>{p.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge-grade badge-grade-${p.grade.toLowerCase()} px-2 py-0.5 text-[10px]`}>{p.grade}</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      {p.salePrice != null ? (
                        <>
                          <span className="font-semibold" style={{ color: '#dc2626' }}>{p.salePrice.toLocaleString('vi-VN')}đ</span>
                          <span className="line-through ml-1.5" style={{ color: 'var(--text-muted)' }}>{p.price.toLocaleString('vi-VN')}đ</span>
                        </>
                      ) : `${p.price.toLocaleString('vi-VN')}đ`}
                      {p.salePrice == null && p.storedSalePrice != null && (
                        <span className="block text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                          {t(p.salePhase === 'upcoming' ? 'adm.stock.saleUpcoming' : 'adm.stock.saleEnded')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      {costs[p.id] ? `${costs[p.id].toLocaleString('vi-VN')}đ` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={currentDraft ?? p.stock}
                          onChange={(e) => setDraft(prev => ({ ...prev, [p.id]: e.target.value }))}
                          className="input-field w-20 px-2 py-1.5 text-xs font-semibold"
                          aria-label={t('adm.stock.stockAria', { name: p.name })}
                        />
                        {isDirty && (
                          <button onClick={() => handleSaveStock(p.id)} className="btn-tinted px-2.5 py-1.5 text-[11px] font-semibold cursor-pointer">{t('adm.stock.save')}</button>
                        )}
                        {savedId === p.id && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#16a34a' }}>
                            <Check size={12} strokeWidth={2.5} /> {t('adm.stock.saved')}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{t('adm.stock.lowAt', { n: lowStockLevel(p) })}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold whitespace-nowrap" style={{ color: status.color }}>{t(status.label)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setReceiveError(''); setReceiving(p); }} className="btn-ghost p-1.5 cursor-pointer" aria-label={t('adm.stock.receiveAria', { name: p.name })} title={t('adm.stock.receiveTitle')}>
                          <PackagePlus size={15} strokeWidth={2} />
                        </button>
                        <button onClick={() => { setMovements(null); setHistoryFor(p); }} className="btn-ghost p-1.5 cursor-pointer" aria-label={t('adm.stock.historyAria', { name: p.name })} title={t('adm.stock.historyTitle')}>
                          <History size={15} strokeWidth={2} />
                        </button>
                        <button onClick={() => setModalProduct(p)} className="btn-ghost p-1.5 cursor-pointer" aria-label={t('adm.stock.editAria', { name: p.name })} title={t('adm.stock.edit')}>
                          <Pencil size={14} strokeWidth={2} />
                        </button>
                        <button onClick={() => handleDelete(p)} className="trash-btn p-1.5 cursor-pointer" aria-label={t('adm.stock.deleteAria', { name: p.name })} title={t('adm.stock.delete')}>
                          <Trash2 size={14} strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={filtered.length} onChange={setPage} />
      </div>

      {modalProduct !== undefined && (
        <AdminProductModal
          product={modalProduct}
          cost={modalProduct ? costs[modalProduct.id] : undefined}
          onClose={() => setModalProduct(undefined)}
          onSave={handleModalSave}
        />
      )}

      {/* Receive goods */}
      {receiving && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(20,22,26,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setReceiving(null)}>
          <div className="card-surface w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('adm.stock.receiveTitle')}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold font-display" style={{ color: 'var(--text-primary)' }}>{t('adm.stock.receiveHeading')}</h2>
              <button onClick={() => setReceiving(null)} className="btn-ghost p-1.5 cursor-pointer" aria-label={t('adm.stock.close')}><X size={18} strokeWidth={2} /></button>
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>{t('adm.stock.receiveCurrent', { name: receiving.name, n: receiving.stock })}</p>
            {receiveError && <p role="alert" className="mb-3 p-3 rounded-xl text-xs font-medium" style={{ background: 'rgba(214,69,80,0.1)', color: 'var(--danger)' }}>{receiveError}</p>}
            <form onSubmit={submitReceive} className="space-y-4">
              <div>
                <label htmlFor="rc-qty" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t('adm.stock.receiveQty')}</label>
                <input id="rc-qty" type="number" min={1} required autoFocus value={receiveQty} onChange={(e) => setReceiveQty(e.target.value)} className={fieldCls} />
              </div>
              <div>
                <label htmlFor="rc-note" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t('adm.stock.receiveNote')}</label>
                <input id="rc-note" value={receiveNote} onChange={(e) => setReceiveNote(e.target.value)} className={fieldCls} maxLength={120} />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button type="button" onClick={() => setReceiving(null)} className="btn-outline flex-1 py-2.5 text-sm font-semibold cursor-pointer">{t('common.cancel')}</button>
                <button type="submit" disabled={receiveBusy} className="btn-primary flex-1 py-2.5 text-sm font-semibold cursor-pointer">{receiveBusy ? t('adm.stock.saving') : t('adm.stock.receiveSubmit')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock history */}
      {historyFor && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(20,22,26,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setHistoryFor(null)}>
          <div className="card-surface w-full max-w-lg max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('adm.stock.historyTitle')}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold font-display" style={{ color: 'var(--text-primary)' }}>{t('adm.stock.historyTitle')}</h2>
              <button onClick={() => setHistoryFor(null)} className="btn-ghost p-1.5 cursor-pointer" aria-label={t('adm.stock.close')}><X size={18} strokeWidth={2} /></button>
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>{historyFor.name}</p>
            {movements === null ? (
              <p className="text-xs py-6 text-center" style={{ color: 'var(--text-secondary)' }}>{t('common.loading')}</p>
            ) : movements.length === 0 ? (
              <p className="text-xs py-6 text-center" style={{ color: 'var(--text-secondary)' }}>{t('adm.stock.historyEmpty')}</p>
            ) : (
              <ul>
                {movements.map(m => (
                  <li key={m.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <span className="w-12 text-right text-sm font-bold font-display" style={{ color: m.delta > 0 ? '#16a34a' : 'var(--danger)' }}>
                      {m.delta > 0 ? `+${m.delta}` : m.delta}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{REASON_LABEL[m.reason] ? t(REASON_LABEL[m.reason]) : m.reason}</p>
                      <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                        {new Date(m.at).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')}{m.note ? ` · ${m.note}` : ''}
                      </p>
                    </div>
                    <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{t('adm.stock.remaining', { n: m.stock_after })}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* CSV import preview */}
      {importPlan && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(20,22,26,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => !importBusy && setImportPlan(null)}>
          <div className="card-surface w-full max-w-lg max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('adm.stock.importTitle')}>
            <h2 className="text-base font-bold font-display mb-1" style={{ color: 'var(--text-primary)' }}>{t('adm.stock.importTitle')}</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
              {t('adm.stock.importHelp1')}<span className="font-hud">name, grade, price</span>{t('adm.stock.importHelp2')}<span className="font-hud">id</span>{t('adm.stock.importHelp3')}
            </p>
            <div className="flex gap-3 mb-4">
              <div className="flex-1 p-3 rounded-xl text-center" style={{ background: 'var(--bg-base)' }}>
                <p className="text-lg font-bold font-display" style={{ color: '#16a34a' }}>{importPlan.rows.filter(r => r.isNew).length}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{t('adm.stock.importNew')}</p>
              </div>
              <div className="flex-1 p-3 rounded-xl text-center" style={{ background: 'var(--bg-base)' }}>
                <p className="text-lg font-bold font-display" style={{ color: 'var(--accent)' }}>{importPlan.rows.filter(r => !r.isNew).length}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{t('adm.stock.importUpdated')}</p>
              </div>
              <div className="flex-1 p-3 rounded-xl text-center" style={{ background: 'var(--bg-base)' }}>
                <p className="text-lg font-bold font-display" style={{ color: importPlan.errors.length ? 'var(--danger)' : 'var(--text-muted)' }}>{importPlan.errors.length}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{t('adm.stock.importErrors')}</p>
              </div>
            </div>
            {importPlan.errors.length > 0 && (
              <ul className="mb-4 p-3 rounded-xl text-[11px] space-y-1 max-h-40 overflow-y-auto" style={{ background: 'rgba(214,69,80,0.08)', color: 'var(--danger)' }}>
                {importPlan.errors.slice(0, 20).map(er => <li key={er}>{er}</li>)}
                {importPlan.errors.length > 20 && <li>{t('adm.stock.importMore', { n: importPlan.errors.length - 20 })}</li>}
              </ul>
            )}
            <div className="flex items-center gap-3">
              <button onClick={() => setImportPlan(null)} disabled={importBusy} className="btn-outline flex-1 py-2.5 text-sm font-semibold cursor-pointer">{t('common.cancel')}</button>
              <button onClick={confirmImport} disabled={importBusy || importPlan.rows.length === 0} className="btn-primary flex-1 py-2.5 text-sm font-semibold cursor-pointer">
                {importBusy ? t('adm.stock.importBusy') : t('adm.stock.importConfirm', { n: importPlan.rows.length })}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
