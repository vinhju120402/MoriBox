'use client';

import { useRef, useState } from 'react';
import { X, Upload, Camera, ImageOff } from 'lucide-react';
import { Product, GradeCode } from '../app/data/products';

const GRADE_OPTIONS: GradeCode[] = ['PG', 'MG', 'RG', 'HG', 'EG', 'SD', 'ACC'];
const MAX_IMAGES = 5;

interface AdminProductModalProps {
  product: Product | null; // null = adding a new product
  onClose: () => void;
  onSave: (product: Product) => void;
}

type FormState = {
  name: string;
  grade: GradeCode;
  scale: string;
  series: string;
  price: string;
  salePrice: string;
  stock: string;
  images: string[];
  isNew: boolean;
  isBestSeller: boolean;
  height: string;
  partsCount: string;
  difficulty: string;
  weaponList: string;
  description: string;
};

function toFormState(product: Product | null): FormState {
  if (!product) {
    return {
      name: '', grade: 'HG', scale: '', series: '', price: '', salePrice: '',
      stock: '10', images: [], isNew: true, isBestSeller: false,
      height: '', partsCount: '', difficulty: 'Beginner', weaponList: '', description: '',
    };
  }
  return {
    name: product.name,
    grade: product.grade,
    scale: product.scale,
    series: product.series,
    price: String(product.price),
    salePrice: product.salePrice != null ? String(product.salePrice) : '',
    stock: String(product.stock),
    images: [product.image, ...(product.images ?? [])].filter(Boolean),
    isNew: product.isNew,
    isBestSeller: product.isBestSeller,
    height: product.specs.height,
    partsCount: String(product.specs.partsCount),
    difficulty: product.specs.difficulty,
    weaponList: product.specs.weaponList.join(', '),
    description: product.description,
  };
}

const fieldCls = 'w-full px-3 py-2.5 text-sm rounded-xl input-field';

export default function AdminProductModal({ product, onClose, onSave }: AdminProductModalProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(product));
  const [error, setError] = useState('');
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm(prev => (
        prev.images.length >= MAX_IMAGES
          ? prev
          : { ...prev, images: [...prev.images, reader.result as string] }
      ));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.price || !form.stock) {
      setError('Vui lòng nhập đầy đủ tên, giá bán và tồn kho.');
      return;
    }

    const id = product?.id ?? `custom-${Date.now()}`;
    const weaponList = form.weaponList.split(',').map(w => w.trim()).filter(Boolean);

    const saved: Product = {
      id,
      name: form.name.trim(),
      grade: form.grade,
      scale: form.scale.trim() || '—',
      series: form.series.trim() || 'MoriBox',
      price: Number(form.price),
      salePrice: form.salePrice ? Number(form.salePrice) : undefined,
      image: form.images[0] ?? '',
      images: form.images.length > 1 ? form.images.slice(1) : undefined,
      stock: Math.max(0, Math.floor(Number(form.stock))),
      isNew: form.isNew,
      isBestSeller: form.isBestSeller,
      specs: {
        height: form.height.trim() || '—',
        partsCount: Number(form.partsCount) || 0,
        difficulty: form.difficulty.trim() || 'Beginner',
        weaponList,
      },
      description: form.description.trim(),
    };

    onSave(saved);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(20,22,26,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="card-surface w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold font-display" style={{ color: 'var(--text-primary)' }}>
            {product ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5 cursor-pointer" aria-label="Đóng">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-xs font-medium" style={{ background: 'rgba(214,69,80,0.1)', color: 'var(--danger)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Images */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Hình ảnh sản phẩm ({form.images.length}/{MAX_IMAGES})
            </label>
            <div className="flex flex-wrap items-center gap-2.5 mb-3">
              {form.images.length === 0 && (
                <div
                  className="media-well relative w-20 h-20 shrink-0 rounded-xl overflow-hidden flex items-center justify-center"
                  style={{ border: '1px solid var(--border-subtle)' }}
                >
                  <ImageOff size={20} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                </div>
              )}
              {form.images.map((src, i) => (
                <div
                  key={i}
                  className="media-well relative w-20 h-20 shrink-0 rounded-xl overflow-hidden"
                  style={{ border: i === 0 ? '2px solid var(--accent)' : '1px solid var(--border-subtle)' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Ảnh ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                  {i === 0 && (
                    <span
                      className="absolute bottom-0 left-0 right-0 text-center text-[9px] font-bold py-0.5"
                      style={{ background: 'rgba(20,22,26,0.65)', color: '#fff' }}
                    >
                      Ảnh bìa
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    aria-label={`Xóa ảnh ${i + 1}`}
                    title="Xóa ảnh"
                    className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer"
                    style={{ background: 'rgba(20,22,26,0.7)', color: '#fff' }}
                  >
                    <X size={11} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                disabled={form.images.length >= MAX_IMAGES}
                className="btn-outline px-3 py-2 text-xs font-semibold cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload size={13} strokeWidth={2} /> Tải ảnh lên
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={form.images.length >= MAX_IMAGES}
                className="btn-outline px-3 py-2 text-xs font-semibold cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera size={13} strokeWidth={2} /> Chụp ảnh
              </button>
            </div>
            <input ref={uploadInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
          </div>

          {/* Name + Grade */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label htmlFor="p-name" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Tên sản phẩm *</label>
              <input id="p-name" required value={form.name} onChange={(e) => set('name', e.target.value)} className={fieldCls} placeholder="VD: RX-78-2 Gundam" />
            </div>
            <div>
              <label htmlFor="p-grade" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Grade</label>
              <select id="p-grade" value={form.grade} onChange={(e) => set('grade', e.target.value as GradeCode)} className={fieldCls + ' cursor-pointer'} title="Grade">
                {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="p-scale" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Tỷ lệ</label>
              <input id="p-scale" value={form.scale} onChange={(e) => set('scale', e.target.value)} className={fieldCls} placeholder="1/144" />
            </div>
          </div>

          <div>
            <label htmlFor="p-series" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Series</label>
            <input id="p-series" value={form.series} onChange={(e) => set('series', e.target.value)} className={fieldCls} placeholder="Mobile Suit Gundam" />
          </div>

          {/* Price + Sale + Stock */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="p-price" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Giá bán *</label>
              <input id="p-price" required type="number" min={0} value={form.price} onChange={(e) => set('price', e.target.value)} className={fieldCls} />
            </div>
            <div>
              <label htmlFor="p-sale" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Giá sale</label>
              <input id="p-sale" type="number" min={0} value={form.salePrice} onChange={(e) => set('salePrice', e.target.value)} className={fieldCls} placeholder="Bỏ trống nếu không sale" />
            </div>
            <div>
              <label htmlFor="p-stock" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Tồn kho *</label>
              <input id="p-stock" required type="number" min={0} value={form.stock} onChange={(e) => set('stock', e.target.value)} className={fieldCls} />
            </div>
          </div>

          {/* Specs */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="p-height" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Chiều cao</label>
              <input id="p-height" value={form.height} onChange={(e) => set('height', e.target.value)} className={fieldCls} placeholder="13 cm" />
            </div>
            <div>
              <label htmlFor="p-parts" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Số mảnh</label>
              <input id="p-parts" type="number" min={0} value={form.partsCount} onChange={(e) => set('partsCount', e.target.value)} className={fieldCls} />
            </div>
            <div>
              <label htmlFor="p-diff" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Độ khó</label>
              <input id="p-diff" value={form.difficulty} onChange={(e) => set('difficulty', e.target.value)} className={fieldCls} placeholder="Beginner" />
            </div>
          </div>

          <div>
            <label htmlFor="p-weapons" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Phụ kiện đi kèm (cách nhau bởi dấu phẩy)</label>
            <input id="p-weapons" value={form.weaponList} onChange={(e) => set('weaponList', e.target.value)} className={fieldCls} placeholder="Beam Rifle, Beam Saber, Shield" />
          </div>

          <div>
            <label htmlFor="p-desc" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Mô tả</label>
            <textarea id="p-desc" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} className={fieldCls + ' resize-none'} />
          </div>

          {/* Flags */}
          <div className="flex items-center gap-5">
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer" style={{ color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={form.isNew} onChange={(e) => set('isNew', e.target.checked)} className="cursor-pointer" />
              Đánh dấu Mới
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer" style={{ color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={form.isBestSeller} onChange={(e) => set('isBestSeller', e.target.checked)} className="cursor-pointer" />
              Đánh dấu Bán chạy
            </label>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-outline flex-1 py-2.5 text-sm font-semibold cursor-pointer">
              Hủy
            </button>
            <button type="submit" className="btn-primary flex-1 py-2.5 text-sm font-semibold cursor-pointer">
              Lưu sản phẩm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
