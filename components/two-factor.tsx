'use client';

import { useCallback, useEffect, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { getSupabase } from '../lib/supabase';
import { useLanguage } from '../hooks/use-language';

interface Factor {
  id: string;
  friendly_name?: string;
  status: string;
}

// Two-factor authentication with an authenticator app (TOTP). Once a staff account
// has a verified factor, the database only honours its staff role for sessions that
// have entered the code (see user_role() in schema.sql).
export default function TwoFactor() {
  const { t } = useLanguage();
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
      setMessage({ tone: 'error', text: t('twofa.startFail') });
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
    if (error) { setMessage({ tone: 'error', text: t('twofa.badCode') }); return; }
    setEnroll(null);
    setMessage({ tone: 'ok', text: t('twofa.enabledMsg') });
    await load();
  };

  const disable = async () => {
    if (!factor) return;
    if (!window.confirm(t('twofa.confirmDisable'))) return;
    setBusy(true);
    const { error } = await getSupabase().auth.mfa.unenroll({ factorId: factor.id });
    setBusy(false);
    if (error) { setMessage({ tone: 'error', text: t('twofa.disableFail') }); return; }
    setMessage({ tone: 'ok', text: t('twofa.disabledMsg') });
    await load();
  };

  return (
    <div className="card-surface p-4">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
          {factor ? <ShieldCheck size={17} strokeWidth={2} /> : <KeyRound size={17} strokeWidth={2} />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('twofa.title')}</p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {factor
              ? t('twofa.onDesc')
              : t('twofa.offDesc')}
          </p>

          {!enroll && loaded && (
            <div className="mt-3">
              {factor ? (
                <button onClick={disable} disabled={busy} className="px-4 py-2 text-xs font-semibold rounded-full cursor-pointer" style={{ border: '1px solid var(--danger)', color: 'var(--danger)' }}>
                  {t('twofa.disable')}
                </button>
              ) : (
                <button onClick={start} disabled={busy} className="btn-primary px-4 py-2 text-xs font-semibold cursor-pointer">
                  {busy ? t('twofa.preparing') : t('twofa.enable')}
                </button>
              )}
            </div>
          )}

          {enroll && (
            <form onSubmit={confirm} className="mt-4 space-y-3">
              <ol className="text-xs space-y-1.5 list-decimal pl-4" style={{ color: 'var(--text-secondary)' }}>
                <li>{t('twofa.step1')}</li>
                <li>{t('twofa.step2')}</li>
              </ol>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enroll.qr} alt={t('twofa.qrAlt')} width={180} height={180} className="rounded-xl bg-white p-2" />
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {t('twofa.cantScan')}<span className="font-hud break-all select-all" style={{ color: 'var(--text-primary)' }}>{enroll.secret}</span>
              </p>
              <div className="flex items-end gap-2 flex-wrap">
                <div>
                  <label htmlFor="tf-code" className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('twofa.codeLabel')}</label>
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
                <button type="submit" disabled={busy || code.length < 6} className="btn-primary px-4 py-2.5 text-xs font-semibold cursor-pointer">{t('twofa.confirmEnable')}</button>
                <button type="button" onClick={() => setEnroll(null)} className="btn-outline px-4 py-2.5 text-xs font-semibold cursor-pointer">{t('twofa.cancel')}</button>
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
