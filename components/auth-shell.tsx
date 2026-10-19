import Link from 'next/link';
import { Boxes } from 'lucide-react';
import Starfield from './starfield';

// Shared frame for the lightweight account pages (forgot / reset password):
// same deep-space look as login & register, without the heavy tilt effects.
export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden"
      style={{ background: 'radial-gradient(ellipse 90% 60% at 30% 10%, #7c2d12 0%, transparent 60%), linear-gradient(165deg, #1a0500 0%, #2a0a02 45%, #431407 100%)' }}
    >
      <Starfield count={60} />

      <div className="relative z-10 w-full max-w-sm">
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-8">
          <span
            className="w-11 h-11 flex items-center justify-center rounded-2xl text-white"
            style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.32), rgba(255,255,255,0.08))', border: '1px solid rgba(255,255,255,0.35)' }}
          >
            <Boxes size={20} strokeWidth={2} />
          </span>
          <span className="text-lg font-bold tracking-tight font-display text-white">MoriBox</span>
        </Link>

        <div
          className="p-8 rounded-3xl"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.18)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 30px 60px -20px rgba(0,0,0,0.55)',
          }}
        >
          <h1 className="text-lg font-bold font-display text-center text-white">{title}</h1>
          {subtitle && (
            <p className="text-xs text-center mt-1.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{subtitle}</p>
          )}
          <div className="mt-6">{children}</div>
          {footer && <div className="text-xs text-center mt-6" style={{ color: 'rgba(255,255,255,0.7)' }}>{footer}</div>}
        </div>
      </div>
    </div>
  );
}
