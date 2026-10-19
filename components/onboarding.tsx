'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Boxes, LayoutGrid, Zap, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import Starfield from './starfield';

interface Slide {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  desc: string;
  gradient: string;
  glow: string;
}

const SLIDES: Slide[] = [
  {
    icon: <Boxes size={30} strokeWidth={1.8} />,
    eyebrow: 'Chào mừng',
    title: 'Chào mừng đến với MoriBox',
    desc: 'Thiên đường Gunpla chính hãng Bandai — nơi hội tụ mọi cấp độ mô hình, từ nhập môn đến chuyên gia.',
    gradient: 'radial-gradient(ellipse 90% 60% at 30% 15%, #7c2d12 0%, transparent 60%), linear-gradient(165deg, #1a0500 0%, #2a0a02 45%, #431407 100%)',
    glow: 'rgba(253,186,116,0.6)',
  },
  {
    icon: <LayoutGrid size={30} strokeWidth={1.8} />,
    eyebrow: 'Danh mục',
    title: '6 cấp độ, một điểm đến',
    desc: 'Từ Entry Grade dễ lắp cho người mới đến Perfect Grade siêu chi tiết cho dân chơi lâu năm — phân loại rõ ràng, dễ tìm.',
    gradient: 'radial-gradient(ellipse 90% 60% at 70% 15%, #334155 0%, transparent 60%), linear-gradient(165deg, #020617 0%, #0b1224 45%, #1e293b 100%)',
    glow: 'rgba(191,219,254,0.55)',
  },
  {
    icon: <Zap size={30} strokeWidth={1.8} />,
    eyebrow: 'Ưu đãi',
    title: 'Ưu đãi mỗi ngày',
    desc: 'Flash Sale giá sốc, hàng mới về liên tục, sản phẩm bán chạy được cập nhật thường xuyên.',
    gradient: 'radial-gradient(ellipse 90% 60% at 30% 15%, #be185d 0%, transparent 60%), linear-gradient(165deg, #170314 0%, #33061f 45%, #831843 100%)',
    glow: 'rgba(251,207,232,0.6)',
  },
  {
    icon: <ShieldCheck size={30} strokeWidth={1.8} />,
    eyebrow: 'Cam kết',
    title: 'An tâm mua sắm',
    desc: 'Chính hãng Bandai, giao hàng toàn quốc, đổi trả trong 7 ngày. Sẵn sàng bắt đầu bộ sưu tập của bạn chưa?',
    gradient: 'radial-gradient(ellipse 90% 60% at 70% 15%, #0f766e 0%, transparent 60%), linear-gradient(165deg, #011210 0%, #032422 45%, #134e4a 100%)',
    glow: 'rgba(153,246,228,0.55)',
  },
];

// The 3 real product photos, cycled per slide so each intro screen shows a
// different combination flying past — swap this once more product photos exist.
const GUNDAM_IMAGES = [
  { image: '/images/rx782.png', alt: 'RX-78-2 Gundam bay trong không gian' },
  { image: '/images/exia.png', alt: 'Gundam Exia bay trong không gian' },
  { image: '/images/unicorn.png', alt: 'Unicorn Gundam bay trong không gian' },
];

// Three fixed flight paths (size/position/drift) reused every slide — only
// which photo occupies each slot changes, so the choreography stays readable.
interface FlightSlot {
  size: number;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  animClass: string;
  border: number;
}

const FLIGHT_SLOTS: FlightSlot[] = [
  { size: 190, top: '10%', right: '6%', animClass: 'onboard-gundam-fly', border: 3 },
  { size: 120, bottom: '14%', left: '6%', animClass: 'onboard-gundam-fly-2', border: 2.5 },
  { size: 84, top: '54%', right: '20%', animClass: 'onboard-gundam-fly-3', border: 2 },
];

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [index, setIndex] = useState(0);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const slide = SLIDES[index];
  const isFirst = index === 0;
  const isLast = index === SLIDES.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setIndex(i => i + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setIndex(i => i - 1);
  };

  const handleTiltMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: py * -16, ry: px * 16 });
  };
  const handleTiltLeave = () => setTilt({ rx: 0, ry: 0 });

  return (
    <div
      className="onboard-stage-3d fixed inset-0 z-[100] flex items-center justify-center px-4 py-10 overflow-hidden transition-[background] duration-500"
      style={{ background: slide.gradient }}
    >
      {/* Galaxy starfield */}
      <Starfield />

      {/* Flying Gundams — a few real units drifting across the scene, each on its own path */}
      {FLIGHT_SLOTS.map((slot, slotIndex) => {
        const gundam = GUNDAM_IMAGES[(index + slotIndex) % GUNDAM_IMAGES.length];
        return (
          <div
            key={`gundam-${index}-${slotIndex}`}
            className={`${slot.animClass} hidden sm:block absolute pointer-events-none`}
            style={{ top: slot.top, bottom: slot.bottom, left: slot.left, right: slot.right }}
            aria-hidden="true"
          >
            <div className="relative">
              <span
                className="absolute inset-0 rounded-full"
                style={{ background: slide.glow, filter: 'blur(24px)', transform: 'scale(1.3)' }}
              />
              <div
                className="relative rounded-full overflow-hidden"
                style={{
                  width: slot.size,
                  height: slot.size,
                  border: `${slot.border}px solid rgba(255,255,255,0.35)`,
                  boxShadow: '0 24px 50px -18px rgba(0,0,0,0.6)',
                }}
              >
                <Image src={gundam.image} alt={gundam.alt} fill sizes={`${slot.size}px`} className="object-cover" />
              </div>
            </div>
          </div>
        );
      })}

      {/* Skip */}
      <button
        onClick={onComplete}
        className="absolute top-5 right-5 sm:top-8 sm:right-8 text-xs font-semibold cursor-pointer px-3 py-1.5 rounded-full z-10"
        style={{ color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.3)' }}
      >
        Bỏ qua
      </button>

      {/* Decorative nebula glow blobs */}
      <span aria-hidden="true" className="absolute rounded-full pointer-events-none" style={{ width: 220, height: 220, top: '8%', left: '8%', background: 'rgba(255,255,255,0.1)', filter: 'blur(8px)' }} />
      <span aria-hidden="true" className="absolute rounded-full pointer-events-none" style={{ width: 160, height: 160, bottom: '10%', right: '10%', background: 'rgba(255,255,255,0.08)', filter: 'blur(6px)' }} />

      <div key={index} className="onboard-slide-3d relative z-10 w-full max-w-sm text-center">
        {/* 3D floating icon — tilts toward the cursor, idles with a gentle float */}
        <div
          className="relative w-20 h-20 mx-auto mb-3"
          onMouseMove={handleTiltMove}
          onMouseLeave={handleTiltLeave}
          style={{ perspective: 600 }}
        >
          <div
            className="onboard-icon-3d w-16 h-16 mx-auto flex items-center justify-center rounded-2xl"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.32), rgba(255,255,255,0.08))',
              border: '1px solid rgba(255,255,255,0.35)',
              boxShadow: '0 20px 30px -12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4)',
              color: '#fff',
              transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
              transition: 'transform 0.15s ease-out',
            }}
          >
            {slide.icon}
          </div>
          <span
            aria-hidden="true"
            className="onboard-icon-shadow absolute left-1/2 -translate-x-1/2 bottom-0 rounded-full"
            style={{ width: 44, height: 10, background: 'rgba(0,0,0,0.35)', filter: 'blur(4px)' }}
          />
        </div>

        <span
          className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] mb-3"
          style={{ color: 'rgba(255,255,255,0.75)' }}
        >
          {slide.eyebrow}
        </span>

        <h1
          className="text-2xl sm:text-3xl font-black font-display leading-tight text-white"
          style={{ textShadow: `0 0 18px ${slide.glow}, 0 0 44px ${slide.glow}` }}
        >
          {slide.title}
        </h1>

        <p className="text-sm leading-relaxed mt-4" style={{ color: 'rgba(255,255,255,0.88)' }}>
          {slide.desc}
        </p>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mt-8 mb-8">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                height: 6,
                width: i === index ? 20 : 6,
                background: i === index ? '#fff' : 'rgba(255,255,255,0.4)',
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          {!isFirst && (
            <button
              onClick={handlePrev}
              aria-label="Quay lại"
              className="shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-full cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-bold cursor-pointer"
            style={{ background: '#fff', color: '#14161a' }}
          >
            {isLast ? 'Bắt đầu' : 'Tiếp tục'}
            <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
