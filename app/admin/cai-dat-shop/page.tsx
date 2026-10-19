'use client';

import { useState } from 'react';
import AdminShell from '../../../components/admin-shell';
import { useShopSettings, ShopSettings } from '../../../hooks/use-shop-settings';
import { isBankConfigured, vietQrUrl } from '../../../lib/payments';

// Common Vietnamese banks and their VietQR BIN codes.
const BANKS: { name: string; bin: string }[] = [
  { name: 'Vietcombank', bin: '970436' },
  { name: 'VietinBank', bin: '970415' },
  { name: 'BIDV', bin: '970418' },
  { name: 'Agribank', bin: '970405' },
  { name: 'MB Bank', bin: '970422' },
  { name: 'Techcombank', bin: '970407' },
  { name: 'ACB', bin: '970416' },
  { name: 'VPBank', bin: '970432' },
  { name: 'TPBank', bin: '970423' },
  { name: 'Sacombank', bin: '970403' },
  { name: 'HDBank', bin: '970437' },
  { name: 'VIB', bin: '970441' },
];

const fieldCls = 'w-full px-3 py-2.5 text-sm rounded-xl input-field';

// Remounted (via key) once the saved settings arrive so the form starts from them.
function SettingsForm({ initial, onSave }: { initial: ShopSettings; onSave: (s: ShopSettings) => Promise<string | null> }) {
  const [form, setForm] = useState({
    shopName: initial.shopName,
    shippingFee: String(initial.shippingFee),
    bankBin: initial.bankBin,
    bankAccount: initial.bankAccount,
    bankAccountName: initial.bankAccountName,
    bankName: initial.bankName,
  });
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const set = (key: keyof typeof form, value: string) => { setForm(p => ({ ...p, [key]: value })); setStatus('idle'); };

  const pickBank = (name: string) => {
    const found = BANKS.find(b => b.name === name);
    setForm(p => ({ ...p, bankName: name, bankBin: found ? found.bin : p.bankBin }));
    setStatus('idle');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fee = Number(form.shippingFee);
    if (!Number.isInteger(fee) || fee < 0) { setStatus('error'); setMessage('Phí vận chuyển phải là số nguyên không âm.'); return; }
    if (form.bankBin && !/^\d{6}$/.test(form.bankBin.trim())) { setStatus('error'); setMessage('Mã ngân hàng (BIN) gồm đúng 6 chữ số.'); return; }
    if (form.bankAccount && !/^\d{6,19}$/.test(form.bankAccount.trim())) { setStatus('error'); setMessage('Số tài khoản chỉ gồm 6–19 chữ số.'); return; }
    setStatus('saving');
    const err = await onSave({
      shopName: form.shopName.trim() || 'MoriBox',
      shippingFee: fee,
      bankBin: form.bankBin.trim(),
      bankAccount: form.bankAccount.trim(),
      bankAccountName: form.bankAccountName.trim().toUpperCase(),
      bankName: form.bankName.trim(),
    });
    if (err) { setStatus('error'); setMessage(err); } else { setStatus('ok'); setMessage('Đã lưu cài đặt.'); }
  };

  const preview = {
    bankBin: form.bankBin.trim(), bankAccount: form.bankAccount.trim(),
    bankAccountName: form.bankAccountName.trim().toUpperCase(), bankName: form.bankName.trim(),
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <section className="card-surface p-5 space-y-4">
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Thông tin chung</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="s-name" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Tên cửa hàng</label>
              <input id="s-name" value={form.shopName} onChange={(e) => set('shopName', e.target.value)} className={fieldCls} />
            </div>
            <div>
              <label htmlFor="s-fee" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Phí vận chuyển (đ)</label>
              <input id="s-fee" type="number" min={0} value={form.shippingFee} onChange={(e) => set('shippingFee', e.target.value)} className={fieldCls} />
            </div>
          </div>
        </section>

        <section className="card-surface p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Tài khoản nhận chuyển khoản</h3>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Điền đủ ba mục đầu để khách thấy lựa chọn “Chuyển khoản ngân hàng (QR)” khi thanh toán.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="s-bank" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Ngân hàng</label>
              <input id="s-bank" list="bank-list" value={form.bankName} onChange={(e) => pickBank(e.target.value)} className={fieldCls} placeholder="Chọn hoặc nhập tên" />
              <datalist id="bank-list">{BANKS.map(b => <option key={b.bin} value={b.name} />)}</datalist>
            </div>
            <div>
              <label htmlFor="s-bin" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Mã ngân hàng (BIN)</label>
              <input id="s-bin" inputMode="numeric" maxLength={6} value={form.bankBin} onChange={(e) => set('bankBin', e.target.value.replace(/\D/g, ''))} className={fieldCls + ' font-hud'} placeholder="970436" />
            </div>
            <div>
              <label htmlFor="s-acc" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Số tài khoản</label>
              <input id="s-acc" inputMode="numeric" value={form.bankAccount} onChange={(e) => set('bankAccount', e.target.value.replace(/\D/g, ''))} className={fieldCls + ' font-hud'} />
            </div>
            <div>
              <label htmlFor="s-accname" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Chủ tài khoản (viết hoa, không dấu)</label>
              <input id="s-accname" value={form.bankAccountName} onChange={(e) => set('bankAccountName', e.target.value.toUpperCase())} className={fieldCls + ' uppercase'} placeholder="NGUYEN VAN A" />
            </div>
          </div>
        </section>

        <div className="flex items-center gap-3 flex-wrap">
          <button type="submit" disabled={status === 'saving'} className="btn-primary px-6 py-2.5 text-sm font-semibold cursor-pointer">
            {status === 'saving' ? 'Đang lưu…' : 'Lưu cài đặt'}
          </button>
          {(status === 'ok' || status === 'error') && (
            <p role="status" className="text-xs font-medium" style={{ color: status === 'ok' ? '#16a34a' : 'var(--danger)' }}>{message}</p>
          )}
        </div>
      </div>

      <aside className="card-surface p-5 h-fit">
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Xem thử mã QR</h3>
        {isBankConfigured(preview) ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={vietQrUrl(preview, 100000, 'MS-123456')} alt="Mã QR xem thử" width={220} height={220} className="mx-auto rounded-xl bg-white" />
            <p className="text-[11px] mt-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Mẫu 100.000đ, nội dung MS-123456. Hãy quét bằng app ngân hàng của bạn để kiểm tra đúng tài khoản và tên chủ tài khoản (đừng chuyển tiền).
            </p>
          </>
        ) : (
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Điền mã ngân hàng, số tài khoản và tên chủ tài khoản để xem mã QR mẫu.</p>
        )}
      </aside>
    </form>
  );
}

export default function ShopSettingsPage() {
  const { settings, hasLoaded, update } = useShopSettings();

  return (
    <AdminShell
      active="cai-dat-shop"
      title="Cài đặt cửa hàng"
      description="Phí vận chuyển và tài khoản ngân hàng nhận tiền. Thay đổi áp dụng ngay cho các đơn mới."
    >
      {!hasLoaded ? (
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Đang tải…</p>
      ) : (
        <SettingsForm
          key={JSON.stringify(settings)}
          initial={settings}
          onSave={async (s) => {
            const r = await update(s);
            return r.ok ? null : 'Không lưu được. Bạn cần quyền quản trị hệ thống.';
          }}
        />
      )}
    </AdminShell>
  );
}
