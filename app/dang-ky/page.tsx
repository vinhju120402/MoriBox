'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Boxes, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/use-auth';
import Starfield from '../../components/starfield';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [redirectTo, setRedirectTo] = useState('/');
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [iconTilt, setIconTilt] = useState({ rx: 0, ry: 0 });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRedirectTo(params.get('redirect') || '/');
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const ok = register({ name, email });
    if (ok) {
      router.push(redirectTo);
    } else {
      setError('Email này đã có tài khoản. Vui lòng đăng nhập.');
    }
  };

  const makeTiltHandler = (setter: (t: { rx: number; ry: number }) => void, strength: number) =>
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      setter({ rx: py * -strength, ry: px * strength });
    };

  return (
    <div
      className="onboard-stage-3d relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden"
      style={{ background: 'radial-gradient(ellipse 90% 60% at 70% 10%, #0f766e 0%, transparent 60%), linear-gradient(165deg, #011210 0%, #032422 45%, #134e4a 100%)' }}
    >
      <Starfield count={70} />

      {/* Flying Gundams in the background */}
      <div className="onboard-gundam-fly hidden sm:block absolute pointer-events-none" style={{ top: '10%', left: '7%' }} aria-hidden="true">
        <div className="relative">
          <span className="absolute inset-0 rounded-full" style={{ background: 'rgba(153,246,228,0.55)', filter: 'blur(26px)', transform: 'scale(1.3)' }} />
          <div className="relative rounded-full overflow-hidden" style={{ width: 160, height: 160, border: '3px solid rgba(255,255,255,0.3)', boxShadow: '0 24px 50px -18px rgba(0,0,0,0.6)' }}>
            <Image src="/images/unicorn.png" alt="Unicorn Gundam" fill sizes="160px" className="object-cover" />
          </div>
        </div>
      </div>
      <div className="onboard-gundam-fly-2 hidden sm:block absolute pointer-events-none" style={{ bottom: '10%', right: '6%' }} aria-hidden="true">
        <div className="relative">
          <span className="absolute inset-0 rounded-full" style={{ background: 'rgba(253,186,116,0.5)', filter: 'blur(22px)', transform: 'scale(1.3)' }} />
          <div className="relative rounded-full overflow-hidden" style={{ width: 110, height: 110, border: '2.5px solid rgba(255,255,255,0.3)', boxShadow: '0 20px 40px -16px rgba(0,0,0,0.6)' }}>
            <Image src="/images/rx782.png" alt="RX-78-2 Gundam" fill sizes="110px" className="object-cover" />
          </div>
        </div>
      </div>

      {/* Decorative nebula glow */}
      <span aria-hidden="true" className="absolute rounded-full pointer-events-none" style={{ width: 220, height: 220, top: '6%', right: '8%', background: 'rgba(255,255,255,0.08)', filter: 'blur(8px)' }} />
      <span aria-hidden="true" className="absolute rounded-full pointer-events-none" style={{ width: 160, height: 160, bottom: '8%', left: '10%', background: 'rgba(255,255,255,0.06)', filter: 'blur(6px)' }} />

      <div className="onboard-slide-3d relative z-10 w-full max-w-sm">
        {/* 3D floating logo */}
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-8">
          <div
            className="relative w-14 h-14"
            onMouseMove={makeTiltHandler(setIconTilt, 18)}
            onMouseLeave={() => setIconTilt({ rx: 0, ry: 0 })}
            style={{ perspective: 500 }}
          >
            <div
              className="onboard-icon-3d w-11 h-11 mx-auto mt-1.5 flex items-center justify-center rounded-2xl"
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.32), rgba(255,255,255,0.08))',
                border: '1px solid rgba(255,255,255,0.35)',
                boxShadow: '0 16px 26px -12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4)',
                color: '#fff',
                transform: `rotateX(${iconTilt.rx}deg) rotateY(${iconTilt.ry}deg)`,
                transition: 'transform 0.15s ease-out',
              }}
            >
              <Boxes size={20} strokeWidth={2} />
            </div>
            <span aria-hidden="true" className="onboard-icon-shadow absolute left-1/2 -translate-x-1/2 bottom-0 rounded-full" style={{ width: 32, height: 8, background: 'rgba(0,0,0,0.4)', filter: 'blur(3px)' }} />
          </div>
          <span className="text-lg font-bold tracking-tight font-display text-white">MoriBox</span>
        </Link>

        {/* 3D tilt glass card */}
        <div
          onMouseMove={makeTiltHandler(setTilt, 6)}
          onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
          style={{ perspective: 1400 }}
        >
          <div
            className="p-8 rounded-3xl"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.18)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 30px 60px -20px rgba(0,0,0,0.55)',
              transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
              transition: 'transform 0.2s ease-out',
              transformStyle: 'preserve-3d',
            }}
          >
            <h1 className="text-lg font-bold font-display text-center text-white">
              Tạo tài khoản
            </h1>
            <p className="text-xs text-center mt-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Tạo tài khoản để mua sắm nhanh hơn trong lần sau.
            </p>

            {error && (
              <div className="mt-5 flex items-start gap-2.5 p-3.5 rounded-xl" style={{ background: 'rgba(220,38,38,0.18)', border: '1px solid rgba(220,38,38,0.3)' }}>
                <AlertCircle size={16} strokeWidth={2} className="shrink-0 mt-0.5" style={{ color: '#fca5a5' }} />
                <p className="text-xs leading-relaxed text-white">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="name" className="block text-xs font-semibold mb-1.5 text-white">
                  Họ và tên
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <User size={14} strokeWidth={2} />
                  </div>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl text-white placeholder:text-white/40 focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)' }}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-semibold mb-1.5 text-white">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <Mail size={14} strokeWidth={2} />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ban@email.com"
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl text-white placeholder:text-white/40 focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)' }}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-semibold mb-1.5 text-white">
                  Mật khẩu
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <Lock size={14} strokeWidth={2} />
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl text-white placeholder:text-white/40 focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary w-full py-2.5 text-sm font-semibold cursor-pointer"
              >
                Đăng ký
              </button>
            </form>

            <p className="text-xs text-center mt-6" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Đã có tài khoản?{' '}
              <Link href={`/dang-nhap?redirect=${encodeURIComponent(redirectTo)}`} className="font-semibold" style={{ color: '#5eead4' }}>
                Đăng nhập
              </Link>
            </p>
          </div>
        </div>

        <p className="text-xs text-center mt-6">
          <Link href="/" className="font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>Về trang chủ</Link>
        </p>
      </div>
    </div>
  );
}
