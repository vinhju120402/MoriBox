'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import AuthShell from '../../components/auth-shell';
import { useLanguage } from '../../hooks/use-language';
import { getSupabase } from '../../lib/supabase';

type Stage = 'checking' | 'ready' | 'invalid' | 'done';

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const [stage, setStage] = useState<Stage>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // The emailed link lands here with a one-time code; the Supabase client
  // exchanges it for a temporary "recovery" session. If no session shows up
  // shortly, the link was expired, already used, or opened in another browser.
  useEffect(() => {
    const supabase = getSupabase();
    let settled = false;
    const markReady = () => { settled = true; setStage(s => (s === 'done' ? s : 'ready')); };

    supabase.auth.getSession().then(({ data }) => { if (data.session) markReady(); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) markReady();
    });
    const timer = window.setTimeout(() => { if (!settled) setStage('invalid'); }, 4000);

    return () => { sub.subscription.unsubscribe(); window.clearTimeout(timer); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError(t('reset.tooShort')); return; }
    if (password !== confirm) { setError(t('reset.mismatch')); return; }
    setSubmitting(true);
    const { error: err } = await getSupabase().auth.updateUser({ password });
    setSubmitting(false);
    if (err) {
      const m = err.message.toLowerCase();
      setError(m.includes('different') ? t('reset.samePassword') : m.includes('password') ? t('reset.tooShort') : t('reset.failed'));
      return;
    }
    setStage('done');
  };

  const fieldCls = 'w-full pl-9 pr-4 py-2.5 text-sm rounded-xl text-white placeholder:text-white/40 focus:outline-none';
  const fieldStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)' };

  return (
    <AuthShell
      title={t('reset.title')}
      subtitle={stage === 'ready' ? t('reset.subtitle') : undefined}
      footer={stage === 'done' ? undefined : <Link href="/dang-nhap" className="font-semibold" style={{ color: '#fdba74' }}>{t('forgot.backToLogin')}</Link>}
    >
      {stage === 'checking' && (
        <p role="status" className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.7)' }}>{t('reset.checking')}</p>
      )}

      {stage === 'invalid' && (
        <div className="text-center space-y-3">
          <p role="alert" className="text-xs leading-relaxed text-white">{t('reset.invalid')}</p>
          <Link href="/quen-mat-khau" className="btn-primary inline-block px-5 py-2.5 text-xs font-semibold">{t('reset.requestNew')}</Link>
        </div>
      )}

      {stage === 'done' && (
        <div className="text-center space-y-4">
          <span className="w-12 h-12 mx-auto flex items-center justify-center rounded-full" style={{ background: 'rgba(34,197,94,0.18)', color: '#86efac' }}>
            <CheckCircle2 size={22} strokeWidth={2} />
          </span>
          <p role="status" className="text-xs leading-relaxed text-white">{t('reset.done')}</p>
          <Link href="/" className="btn-primary inline-block px-5 py-2.5 text-xs font-semibold">{t('reset.goHome')}</Link>
        </div>
      )}

      {stage === 'ready' && (
        <>
          {error && (
            <div className="mb-4 flex items-start gap-2.5 p-3.5 rounded-xl" style={{ background: 'rgba(220,38,38,0.18)', border: '1px solid rgba(220,38,38,0.3)' }}>
              <AlertCircle size={16} strokeWidth={2} className="shrink-0 mt-0.5" style={{ color: '#fca5a5' }} />
              <p role="alert" className="text-xs leading-relaxed text-white">{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { id: 'new-password', label: t('reset.newPassword'), value: password, set: setPassword },
              { id: 'confirm-password', label: t('reset.confirmPassword'), value: confirm, set: setConfirm },
            ].map(f => (
              <div key={f.id}>
                <label htmlFor={f.id} className="block text-xs font-semibold mb-1.5 text-white">{f.label}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <Lock size={14} strokeWidth={2} />
                  </div>
                  <input
                    id={f.id}
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    className={fieldCls}
                    style={fieldStyle}
                  />
                </div>
              </div>
            ))}
            <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5 text-sm font-semibold cursor-pointer">
              {submitting ? t('common.processing') : t('reset.submit')}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
