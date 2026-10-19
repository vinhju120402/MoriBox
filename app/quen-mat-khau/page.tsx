'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, AlertCircle, MailCheck } from 'lucide-react';
import AuthShell from '../../components/auth-shell';
import { useLanguage } from '../../hooks/use-language';
import { getSupabase } from '../../lib/supabase';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error: err } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/dat-lai-mat-khau`,
    });
    setSubmitting(false);
    // Rate-limit is the one error worth surfacing; everything else gets the
    // same neutral "sent" screen so the form can't be used to probe which
    // emails have accounts.
    if (err && err.message.toLowerCase().includes('rate limit')) {
      setError(t('forgot.rateLimit'));
      return;
    }
    setSent(true);
  };

  return (
    <AuthShell
      title={t('forgot.title')}
      subtitle={sent ? undefined : t('forgot.subtitle')}
      footer={<Link href="/dang-nhap" className="font-semibold" style={{ color: '#fdba74' }}>{t('forgot.backToLogin')}</Link>}
    >
      {sent ? (
        <div className="text-center space-y-3">
          <span className="w-12 h-12 mx-auto flex items-center justify-center rounded-full" style={{ background: 'rgba(34,197,94,0.18)', color: '#86efac' }}>
            <MailCheck size={22} strokeWidth={2} />
          </span>
          <p role="status" className="text-xs leading-relaxed text-white">{t('forgot.sent')}</p>
          <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{t('forgot.sentHint')}</p>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 flex items-start gap-2.5 p-3.5 rounded-xl" style={{ background: 'rgba(220,38,38,0.18)', border: '1px solid rgba(220,38,38,0.3)' }}>
              <AlertCircle size={16} strokeWidth={2} className="shrink-0 mt-0.5" style={{ color: '#fca5a5' }} />
              <p role="alert" className="text-xs leading-relaxed text-white">{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold mb-1.5 text-white">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <Mail size={14} strokeWidth={2} />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ban@email.com"
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl text-white placeholder:text-white/40 focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)' }}
                />
              </div>
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5 text-sm font-semibold cursor-pointer">
              {submitting ? t('common.processing') : t('forgot.submit')}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
