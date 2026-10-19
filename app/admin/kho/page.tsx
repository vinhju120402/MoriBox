'use client';

import { useState } from 'react';
import { Boxes, PackageCheck, PackageX, TriangleAlert, Check, Plus, Pencil, Trash2 } from 'lucide-react';
import AdminShell from '../../../components/admin-shell';
import AdminStat from '../../../components/admin-stat';
import AdminProductModal from '../../../components/admin-product-modal';
import { useProductCatalog, CatalogResult } from '../../../hooks/use-product-catalog';
import { Product, GradeCode } from '../../data/products';

const GRADE_FILTERS: (GradeCode | 'ALL')[] = ['ALL', 'PG', 'MG', 'RG', 'HG', 'EG', 'SD', 'ACC'];

function stockStatus(stock: number) {
  if (stock === 0) return { label: 'Hết hàng', color: 'var(--danger)' };
  if (stock <= 5) return { label: 'Sắp hết', color: '#b45309' };
  return { label: 'Còn hàng', color: '#16a34a' };
}

export default function AdminInventoryPage() {
  const { products, addProduct, updateProduct, deleteProduct } = useProductCatalog();
  const [gradeFilter, setGradeFilter] = useState<GradeCode | 'ALL'>('ALL');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [savedId, setSavedId] = useState<string | null>(null);
  const [modalProduct, setModalProduct] = useState<Product | null | undefined>(undefined);
  const [error, setError] = useState('');

  const report = (r: CatalogResult) => setError(r.ok ? '' : `Không lưu được: ${r.error}`);

  const rows = products.filter(p => gradeFilter === 'ALL' || p.grade === gradeFilter);

  const totalSku = products.length;
  const totalUnits = products.reduce((acc, p) => acc + p.stock, 0);
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= 5).length;
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
    if (window.confirm(`Xóa sản phẩm "${product.name}"? Hành động này không thể hoàn tác.`)) {
      report(await deleteProduct(product.id));
    }
  };

  const handleModalSave = async (product: Product) => {
    report(await (modalProduct ? updateProduct(product.id, product) : addProduct(product)));
    setModalProduct(undefined);
  };

  return (
    <AdminShell active="kho">
      {error && (
        <p role="alert" className="mb-4 p-3 rounded-xl text-xs font-medium" style={{ background: 'var(--accent-dim)', color: 'var(--danger)' }}>{error}</p>
      )}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold tracking-tight font-display" style={{ color: 'var(--text-primary)' }}>
            Kho hàng
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Thêm, sửa, xóa sản phẩm và theo dõi tồn kho theo từng SKU.
          </p>
        </div>
        <button
          onClick={() => setModalProduct(null)}
          className="btn-primary px-4 py-2.5 text-sm font-semibold cursor-pointer flex items-center gap-2"
        >
          <Plus size={15} strokeWidth={2} /> Thêm sản phẩm
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AdminStat label="Tổng số SKU" value={String(totalSku)} icon={<Boxes size={18} strokeWidth={2} />} />
        <AdminStat label="Tổng số lượng tồn" value={totalUnits.toLocaleString('vi-VN')} icon={<PackageCheck size={18} strokeWidth={2} />} />
        <AdminStat label="SKU sắp hết (≤5)" value={String(lowStockCount)} icon={<TriangleAlert size={18} strokeWidth={2} />} tone={lowStockCount > 0 ? 'danger' : 'default'} />
        <AdminStat label="SKU hết hàng" value={String(outOfStockCount)} icon={<PackageX size={18} strokeWidth={2} />} tone={outOfStockCount > 0 ? 'danger' : 'default'} />
      </div>

      {/* Grade filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {GRADE_FILTERS.map(g => (
          <button
            key={g}
            onClick={() => setGradeFilter(g)}
            className={`filter-pill px-3.5 py-1.5 text-xs font-semibold cursor-pointer${gradeFilter === g ? ' active' : ''}`}
          >
            {g === 'ALL' ? 'Tất cả' : g}
          </button>
        ))}
      </div>

      <div className="card-surface overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['Sản phẩm', 'Grade', 'Giá bán', 'Tồn kho', 'Trạng thái', ''].map(h => (
                <th key={h} className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(p => {
              const status = stockStatus(p.stock);
              const currentDraft = draft[p.id];
              const isDirty = currentDraft !== undefined && Number(currentDraft) !== p.stock && currentDraft !== '';
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="py-3 px-4 font-semibold max-w-[220px] truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</td>
                  <td className="py-3 px-4">
                    <span className={`badge-grade badge-grade-${p.grade.toLowerCase()} px-2 py-0.5 text-[10px]`}>{p.grade}</span>
                  </td>
                  <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>{p.price.toLocaleString('vi-VN')}đ</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={currentDraft ?? p.stock}
                        onChange={(e) => setDraft(prev => ({ ...prev, [p.id]: e.target.value }))}
                        className="input-field w-20 px-2 py-1.5 text-xs font-semibold"
                        aria-label={`Tồn kho của ${p.name}`}
                      />
                      {isDirty && (
                        <button
                          onClick={() => handleSaveStock(p.id)}
                          className="btn-tinted px-2.5 py-1.5 text-[11px] font-semibold cursor-pointer"
                        >
                          Lưu
                        </button>
                      )}
                      {savedId === p.id && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#16a34a' }}>
                          <Check size={12} strokeWidth={2.5} /> Đã lưu
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold" style={{ color: status.color }}>{status.label}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setModalProduct(p)}
                        className="btn-ghost p-1.5 cursor-pointer"
                        aria-label={`Sửa ${p.name}`}
                        title="Sửa"
                      >
                        <Pencil size={14} strokeWidth={2} />
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="trash-btn p-1.5 cursor-pointer"
                        aria-label={`Xóa ${p.name}`}
                        title="Xóa"
                      >
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

      {modalProduct !== undefined && (
        <AdminProductModal
          product={modalProduct}
          onClose={() => setModalProduct(undefined)}
          onSave={handleModalSave}
        />
      )}
    </AdminShell>
  );
}
