import Image from 'next/image';
import { Ruler, Puzzle, Gauge } from 'lucide-react';
import { GradeCode, GradeInfo, Product } from '../app/data/products';

const GRADE_THEME: Record<GradeCode, { gradient: string; glow: string }> = {
  PG: { gradient: 'linear-gradient(120deg, #7c2d12 0%, #c2410c 55%, #f97316 100%)', glow: 'rgba(253,186,116,0.6)' },
  MG: { gradient: 'linear-gradient(120deg, #1e293b 0%, #334155 55%, #60a5fa 100%)', glow: 'rgba(191,219,254,0.55)' },
  RG: { gradient: 'linear-gradient(120deg, #134e4a 0%, #0f766e 55%, #2dd4bf 100%)', glow: 'rgba(153,246,228,0.55)' },
  HG: { gradient: 'linear-gradient(120deg, #78350f 0%, #b45309 55%, #fbbf24 100%)', glow: 'rgba(254,240,138,0.6)' },
  EG: { gradient: 'linear-gradient(120deg, #0c4a6e 0%, #0369a1 55%, #38bdf8 100%)', glow: 'rgba(186,230,253,0.6)' },
  SD: { gradient: 'linear-gradient(120deg, #831843 0%, #be185d 55%, #f472b6 100%)', glow: 'rgba(251,207,232,0.6)' },
  ACC: { gradient: 'linear-gradient(120deg, #1f2937 0%, #4b5563 55%, #9ca3af 100%)', glow: 'rgba(226,232,240,0.55)' },
};

const PORTHOLE_LAYOUT = [
  { size: 130, top: '2%', left: '4%', rotate: '-7deg', z: 3 },
  { size: 102, top: '46%', left: '34%', rotate: '6deg', z: 2 },
  { size: 86, top: '4%', left: '66%', rotate: '-5deg', z: 1 },
];

interface GradeBannerProps {
  code: GradeCode;
  icon: React.ReactNode;
  gradeInfo: GradeInfo;
  products: Product[];
}

export default function GradeBanner({ code, icon, gradeInfo, products }: GradeBannerProps) {
  const theme = GRADE_THEME[code];

  return (
    <div
      className="relative overflow-hidden rounded-3xl px-6 sm:px-8 md:px-10 py-9 md:py-11 mb-8"
      style={{ background: theme.gradient }}
    >
      {/* Watermark code */}
      <span
        aria-hidden="true"
        className="pointer-events-none select-none absolute -right-2 -top-8 md:-top-10 text-[9rem] md:text-[11rem] font-black leading-none font-display text-white"
        style={{ opacity: 0.1 }}
      >
        {code}
      </span>

      {/* Decorative glow blobs */}
      <span aria-hidden="true" className="absolute rounded-full pointer-events-none" style={{ width: 140, height: 140, top: -50, left: '20%', background: 'rgba(255,255,255,0.14)', filter: 'blur(4px)' }} />
      <span aria-hidden="true" className="absolute rounded-full pointer-events-none" style={{ width: 80, height: 80, bottom: -26, left: '8%', background: 'rgba(255,255,255,0.12)', filter: 'blur(2px)' }} />

      <div className="relative flex flex-col md:flex-row items-center md:items-center justify-between gap-8">
        {/* Copy */}
        <div className="text-center md:text-left shrink-0 min-w-0">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold mb-4"
            style={{ background: 'rgba(20,22,26,0.35)', color: '#fff', border: '1px solid rgba(255,255,255,0.28)' }}
          >
            {icon} {code}
          </span>
          <h1
            className="text-3xl sm:text-4xl font-black font-display leading-[0.98] text-white"
            style={{ textShadow: `0 0 18px ${theme.glow}, 0 0 44px ${theme.glow}` }}
          >
            {gradeInfo.label}
          </h1>
          <p className="mt-3 text-sm max-w-sm mx-auto md:mx-0" style={{ color: 'rgba(255,255,255,0.88)' }}>
            {gradeInfo.desc}
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-5">
            {[
              { key: 'scale', icon: <Ruler size={12} strokeWidth={2} />, label: gradeInfo.scale },
              { key: 'parts', icon: <Puzzle size={12} strokeWidth={2} />, label: code === 'ACC' ? gradeInfo.parts : `${gradeInfo.parts} mảnh` },
              { key: 'diff', icon: <Gauge size={12} strokeWidth={2} />, label: `Độ khó: ${gradeInfo.diff}` },
            ].map((s) => (
              <span
                key={s.key}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
                style={{ background: 'rgba(255,255,255,0.16)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}
              >
                {s.icon}
                {s.label}
              </span>
            ))}
          </div>
        </div>

        {/* Porthole photo cluster */}
        {products.length > 0 && (
          <div className="relative w-full max-w-[280px] h-[190px] shrink-0 hidden sm:block">
            {products.slice(0, 3).map((p, i) => {
              const layout = PORTHOLE_LAYOUT[i];
              return (
                <div
                  key={p.id}
                  className="absolute rounded-full overflow-hidden"
                  style={{
                    width: layout.size,
                    height: layout.size,
                    top: layout.top,
                    left: layout.left,
                    zIndex: layout.z,
                    transform: `rotate(${layout.rotate})`,
                    border: '3px solid rgba(255,255,255,0.9)',
                    boxShadow: '0 14px 30px -8px rgba(0,0,0,0.4)',
                    background: '#fff',
                  }}
                >
                  <Image src={p.image} alt={p.name} fill sizes={`${layout.size}px`} className="object-cover" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
