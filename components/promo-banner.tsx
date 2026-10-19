'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Boxes, Star } from 'lucide-react';

interface BannerImage {
  src: string;
  alt: string;
}

interface PromoBannerProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  gradient: string;
  glowColor: string;
  images: BannerImage[];
  ctaLabel: string;
  ctaHref: string;
  onCtaClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

const PORTHOLE_LAYOUT = [
  { size: 132, top: '2%', left: '4%', rotate: '-7deg', z: 3 },
  { size: 104, top: '46%', left: '34%', rotate: '6deg', z: 2 },
  { size: 88, top: '4%', left: '66%', rotate: '-5deg', z: 1 },
];

export default function PromoBanner({
  eyebrow,
  title,
  subtitle,
  gradient,
  glowColor,
  images,
  ctaLabel,
  ctaHref,
  onCtaClick,
}: PromoBannerProps) {
  return (
    <div>
      {/* Star-flanked eyebrow */}
      <div className="flex items-center justify-center gap-2.5 mb-4">
        <Star size={12} strokeWidth={2} fill="currentColor" style={{ color: 'var(--accent)' }} />
        <span className="hud-tag font-bold">
          {eyebrow}
        </span>
        <Star size={12} strokeWidth={2} fill="currentColor" style={{ color: 'var(--accent)' }} />
      </div>

      {/* Banner */}
      <div
        className="banner-hud relative overflow-hidden rounded-3xl px-6 sm:px-8 md:px-10 py-9 md:py-11"
        style={{ background: gradient }}
      >
        {/* Decorative balloon blobs */}
        <span aria-hidden="true" className="absolute rounded-full pointer-events-none" style={{ width: 140, height: 140, top: -50, left: '18%', background: 'rgba(255,255,255,0.16)', filter: 'blur(4px)' }} />
        <span aria-hidden="true" className="absolute rounded-full pointer-events-none" style={{ width: 90, height: 90, bottom: -30, left: '6%', background: 'rgba(255,255,255,0.14)', filter: 'blur(2px)' }} />
        <span aria-hidden="true" className="absolute rounded-full pointer-events-none" style={{ width: 60, height: 60, top: '55%', right: '4%', background: 'rgba(255,255,255,0.12)', filter: 'blur(2px)' }} />

        <div className="relative flex flex-col md:flex-row items-center md:items-center justify-between gap-8">
          {/* Copy */}
          <div className="text-center md:text-left shrink-0">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold mb-4"
              style={{ background: 'rgba(20,22,26,0.35)', color: '#fff', border: '1px solid rgba(255,255,255,0.28)' }}
            >
              <Boxes size={12} strokeWidth={2} /> MoriBox
            </span>
            <h3
              className="text-4xl sm:text-5xl font-black font-display leading-[0.95] text-white uppercase"
              style={{ textShadow: `0 0 18px ${glowColor}, 0 0 44px ${glowColor}` }}
            >
              {title}
            </h3>
            <p className="mt-3 text-sm max-w-xs mx-auto md:mx-0" style={{ color: 'rgba(255,255,255,0.88)' }}>
              {subtitle}
            </p>
          </div>

          {/* Porthole photo cluster */}
          <div className="relative w-full max-w-[280px] h-[190px] shrink-0 hidden sm:block">
            {images.slice(0, 3).map((img, i) => {
              const layout = PORTHOLE_LAYOUT[i];
              return (
                <div
                  key={img.src}
                  className="porthole-float absolute rounded-full overflow-hidden"
                  style={{
                    width: layout.size,
                    height: layout.size,
                    top: layout.top,
                    left: layout.left,
                    zIndex: layout.z,
                    transform: `rotate(${layout.rotate})`,
                    border: '3px solid rgba(255,255,255,0.9)',
                    boxShadow: '0 14px 30px -8px rgba(0,0,0,0.4)',
                  }}
                >
                  <Image src={img.src} alt={img.alt} fill sizes={`${layout.size}px`} priority={i === 0} className="object-cover" />
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA pinned bottom-right */}
        <Link
          href={ctaHref}
          onClick={onCtaClick}
          className="absolute bottom-5 right-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold cursor-pointer"
          style={{ background: '#fff', color: '#14161a' }}
        >
          {ctaLabel} <ArrowRight size={13} strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}
