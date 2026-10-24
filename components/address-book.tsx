'use client';

import { useState } from 'react';
import { MapPin, Pencil, Trash2, Plus, Star } from 'lucide-react';
import { useAddresses, Address, AddressInput } from '../hooks/use-addresses';

const SECTORS = ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Khu vực khác'];
const fieldCls = 'w-full px-3 py-2.5 text-sm rounded-xl input-field';

const blank: AddressInput = { label: '', name: '', phone: '', address: '', sector: 'Hà Nội', isDefault: false };

function describeError(raw: string) {
  if (raw.includes('too_many_addresses')) return 'Bạn chỉ lưu được tối đa 10 địa chỉ. Hãy xóa bớt địa chỉ cũ.';
  if (raw.includes('missing_fields')) return 'Vui lòng nhập đủ họ tên, số điện thoại và địa chỉ.';
  return 'Không lưu được. Vui lòng thử lại.';
}

// Saved delivery addresses (Settings). The default one is filled in at checkout.
export default function AddressBook() {
  const { addresses, loaded, save, setDefault, remove } = useAddresses();
  const [editing, setEditing] = useState<AddressInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const edit = (a: Address) => { setError(''); setEditing({ id: a.id, label: a.label, name: a.name, phone: a.phone, address: a.address, sector: a.sector, isDefault: a.isDefault }); };
  const set = <K extends keyof AddressInput>(key: K, value: AddressInput[K]) => setEditing(prev => (prev ? { ...prev, [key]: value } : prev));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError('');
    const r = await save(editing);
    setBusy(false);
    if (!r.ok) { setError(describeError(r.error)); return; }
    setEditing(null);
  };

  return (
    <div className="space-y-3">
      {!loaded ? (
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Đang tải…</p>
      ) : addresses.length === 0 && !editing ? (
        <div className="card-surface p-5 text-center">
          <MapPin size={22} strokeWidth={1.8} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Chưa có địa chỉ nào</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Lưu địa chỉ để không phải nhập lại ở mỗi lần thanh toán.</p>
        </div>
      ) : (
        addresses.map(a => (
          <article key={a.id} className="card-surface p-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {a.label || a.name}
                {a.isDefault && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>Mặc định</span>
                )}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{a.name} · {a.phone}</p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{a.address}, {a.sector}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {!a.isDefault && (
                <button
                  onClick={async () => { const r = await setDefault(a.id); if (!r.ok) setError(describeError(r.error)); }}
                  className="btn-ghost p-1.5 cursor-pointer"
                  aria-label={`Đặt ${a.label || a.name} làm mặc định`}
                  title="Đặt làm mặc định"
                >
                  <Star size={15} strokeWidth={2} />
                </button>
              )}
              <button onClick={() => edit(a)} className="btn-ghost p-1.5 cursor-pointer" aria-label={`Sửa ${a.label || a.name}`} title="Sửa"><Pencil size={14} strokeWidth={2} /></button>
              <button
                onClick={async () => { if (window.confirm('Xóa địa chỉ này?')) { const r = await remove(a.id); if (!r.ok) setError(describeError(r.error)); } }}
                className="trash-btn p-1.5 cursor-pointer"
                aria-label={`Xóa ${a.label || a.name}`}
                title="Xóa"
              >
                <Trash2 size={14} strokeWidth={2} />
              </button>
            </div>
          </article>
        ))
      )}

      {error && !editing && <p role="alert" className="text-xs font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}

      {editing ? (
        <form onSubmit={submit} className="card-surface p-5 space-y-4">
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{editing.id ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}</p>
          {error && <p role="alert" className="p-3 rounded-xl text-xs font-medium" style={{ background: 'rgba(214,69,80,0.1)', color: 'var(--danger)' }}>{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ad-label" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Tên gọi (Nhà, Công ty…)</label>
              <input id="ad-label" value={editing.label} onChange={(e) => set('label', e.target.value)} maxLength={40} className={fieldCls} placeholder="Nhà riêng" />
            </div>
            <div>
              <label htmlFor="ad-name" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Họ và tên người nhận *</label>
              <input id="ad-name" required value={editing.name} onChange={(e) => set('name', e.target.value)} className={fieldCls} />
            </div>
            <div>
              <label htmlFor="ad-phone" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Số điện thoại *</label>
              <input id="ad-phone" required type="tel" value={editing.phone} onChange={(e) => set('phone', e.target.value)} className={fieldCls} placeholder="0901234567" />
            </div>
            <div>
              <label htmlFor="ad-sector" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Khu vực *</label>
              <select id="ad-sector" value={editing.sector} onChange={(e) => set('sector', e.target.value)} className={fieldCls + ' cursor-pointer'}>
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="ad-address" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Địa chỉ chi tiết *</label>
            <textarea id="ad-address" required rows={2} value={editing.address} onChange={(e) => set('address', e.target.value)} className={fieldCls + ' resize-none'} placeholder="Số nhà, đường, phường, quận…" />
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer" style={{ color: 'var(--text-primary)' }}>
            <input type="checkbox" checked={editing.isDefault} onChange={(e) => set('isDefault', e.target.checked)} className="cursor-pointer" /> Đặt làm địa chỉ mặc định
          </label>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setEditing(null)} className="btn-outline px-5 py-2.5 text-xs font-semibold cursor-pointer">Hủy</button>
            <button type="submit" disabled={busy} className="btn-primary px-5 py-2.5 text-xs font-semibold cursor-pointer">{busy ? 'Đang lưu…' : 'Lưu địa chỉ'}</button>
          </div>
        </form>
      ) : (
        <button onClick={() => { setError(''); setEditing(blank); }} className="btn-outline px-4 py-2.5 text-xs font-semibold cursor-pointer flex items-center gap-1.5">
          <Plus size={14} strokeWidth={2} /> Thêm địa chỉ mới
        </button>
      )}
    </div>
  );
}
