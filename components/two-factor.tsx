'use client';

import { useCallback, useEffect, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { getSupabase } from '../lib/supabase';

interface Factor {
  id: string;
  friendly_name?: string;
  status: string;
}

// Two-factor authentication with an authenticator app (TOTP). Once a staff account
// has a verified factor, the database only honours its staff role for sessions that
// have entered the code (see user_role() in schema.sql).
export default function TwoFactor() {
  const [factor, setFactor] = useState<Factor | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data } = await getSupabase().auth.mfa.listFactors();
    setFactor((data?.totp.find(f => f.status === 'verified') as Factor | undefined) ?? null);
    setLoaded(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const start = async () => {
    setMessage(null);
    setBusy(true);
    const supabase = getSupabase();
    // Remove half-finished attempts so enrolling again never collides with an old name.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const f of existing?.all ?? []) {
      if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `MoriBox ${Date.now()}` });
    setBusy(false);
    if (error || !data) {
      setMessage({ tone: 'error', text: 'Không bắt đầu được. Có thể xác thực hai bước chưa được bật trong Supabase.' });
      return;
    }
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    setCode('');
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enroll) return;
    setBusy(true);
    const { error } = await getSupabase().auth.mfa.challengeAndVerify({ factorId: enroll.id, code: code.trim() });
    setBusy(false);
    if (error) { setMessage({ tone: 'error', text: 'Mã không đúng hoặc đã hết hạn. Hãy thử mã mới.' }); return; }
    setEnroll(null);
    setMessage({ tone: 'ok', text: 'Đã bật xác thực hai bước. Lần đăng nhập sau bạn sẽ cần nhập mã.' });
    await load();
  };

  const disable = async () => {
    if (!factor) return;
    if (!window.confirm('Tắt xác thực hai bước? Tài khoản sẽ kém an toàn hơn.')) return;
    setBusy(true);
    const { error } = await getSupabase().auth.mfa.unenroll({ factorId: factor.id });
    setBusy(false);
    if (error) { setMessage({ tone: 'error', text: 'Không tắt được. Hãy đăng xuất, đăng nhập lại (kèm nhập mã) rồi thử lại.' }); return; }
    setMessage({ tone: 'ok', text: 'Đã tắt xác thực hai bước.' });
    await load();
  };

  return (
    <div className="card-surface p-4">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
          {factor ? <ShieldCheck size={17} strokeWidth={2} /> : <KeyRound size={17} strokeWidth={2} />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Xác thực hai bước</p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {factor
              ? 'Đang bật. Khi đăng nhập, bạn cần nhập mã 6 số từ ứng dụng xác thực.'
              : 'Khuyến nghị cho tài khoản nhân viên: thêm mã từ ứng dụng xác thực (Google Authenticator, Authy…) ngoài mật khẩu.'}
          </p>

          {!enroll && loaded && (
            <div className="mt-3">
              {factor ? (
                <button onClick={disable} disabled={busy} className="px-4 py-2 text-xs font-semibold rounded-full cursor-pointer" style={{ border: '1px solid var(--danger)', color: 'var(--danger)' }}>
                  Tắt xác thực hai bước
                </button>
              ) : (
                <button onClick={start} disabled={busy} className="btn-primary px-4 py-2 text-xs font-semibold cursor-pointer">
                  {busy ? 'Đang chuẩn bị…' : 'Bật xác thực hai bước'}
                </button>
              )}
            </div>
          )}

          {enroll && (
            <form onSubmit={confirm} className="mt-4 space-y-3">
              <ol className="text-xs space-y-1.5 list-decimal pl-4" style={{ color: 'var(--text-secondary)' }}>
                <li>Mở ứng dụng xác thực trên điện thoại và quét mã QR bên dưới.</li>
                <li>Nhập mã 6 số mà ứng dụng hiển thị để hoàn tất.</li>
              </ol>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enroll.qr} alt="Mã QR để thêm vào ứng dụng xác thực" width={180} height={180} className="rounded-xl bg-white p-2" />
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Không quét được? Nhập khóa này vào ứng dụng: <span className="font-hud break-all select-all" style={{ color: 'var(--text-primary)' }}>{enroll.secret}</span>
              </p>
              <div className="flex items-end gap-2 flex-wrap">
                <div>
                  <label htmlFor="tf-code" className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Mã 6 số</label>
                  <input
                    id="tf-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className="input-field w-36 px-3 py-2.5 text-sm tracking-[0.3em] text-center font-hud"
                    placeholder="123456"
                  />
                </div>
                <button type="submit" disabled={busy || code.length < 6} className="btn-primary px-4 py-2.5 text-xs font-semibold cursor-pointer">Xác nhận và bật</button>
                <button type="button" onClick={() => setEnroll(null)} className="btn-outline px-4 py-2.5 text-xs font-semibold cursor-pointer">Hủy</button>
              </div>
            </form>
          )}

          {message && (
            <p role={message.tone === 'error' ? 'alert' : 'status'} className="text-xs font-medium mt-3" style={{ color: message.tone === 'ok' ? '#16a34a' : 'var(--danger)' }}>
              {message.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
