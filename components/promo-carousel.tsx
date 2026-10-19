'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';

interface Slide {
  id: string;
  eyebrow: string;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
  imageAlt: string;
  gradient: string;
}

const SLIDES: Slide[] = [
  {
    id: 'new-arrivals',
    eyebrow: 'Mới về',
    headline: 'Cập nhật mô hình mới mỗi tuần',
    body: 'Khám phá các bản Gundam mới nhất vừa lên kệ, số lượng có hạn.',
    ctaLabel: 'Xem ngay',
    ctaHref: '#catalog',
    image: '/images/exia.png',
    imageAlt: 'Gundam Exia',
    gradient: 'linear-gradient(120deg, #ff5a1f 0%, #ff8a4d 55%, #ffb37a 100%)',
  },
  {
    id: 'grades',
    eyebrow: 'Sáu cấp độ',
    headline: 'Từ Entry Grade nhập môn đến Perfect Grade chuyên gia',
    body: 'Mỗi cấp độ một trải nghiệm lắp ráp khác nhau, phù hợp mọi trình độ builder.',
    ctaLabel: 'Xem hệ thống Grade',
    ctaHref: '#catalog',
    image: '/images/unicorn.png',
    imageAlt: 'Unicorn Gundam Real Grade',
    gradient: 'linear-gradient(120deg, #c2410c 0%, #ff5a1f 55%, #ffb37a 100%)',
  },
  {
    id: 'shipping',
    eyebrow: 'Cam kết dịch vụ',
    headline: 'Chính hãng Bandai, giao hàng toàn quốc',
    body: 'Đặt hàng trực tuyến, nhận mô hình chính hãng tận nơi kèm chính sách đổi trả 7 ngày.',
    ctaLabel: 'Mua ngay',
    ctaHref: '#catalog',
    image: '/images/rx782.png',
    imageAlt: 'RX-78-2 Gundam Perfect Grade',
    gradient: 'linear-gradient(120deg, #14161a 0%, #3a2a20 55%, #ff5a1f 100%)',
  },
];

const AUTOPLAY_MS = 5500;

export default function PromoCarousel() {
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (isPaused || reducedMotionRef.current) return;
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % SLIDES.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [isPaused]);

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 md:pb-5">
      <div
        className="relative w-full h-64 sm:h-72 md:h-80 rounded-2xl overflow-hidden"
        style={{ boxShadow: '0 8px 24px -8px rgba(20,22,26,0.18)' }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        role="region"
        aria-roledescription="carousel"
        aria-label="Chương trình nổi bật"
      >
        {SLIDES.map((slide, i) => (
          <div
            key={slide.id}
            className="promo-slide absolute inset-0 flex items-center"
            style={{ background: slide.gradient, opacity: i === active ? 1 : 0, pointerEvents: i === active ? 'auto' : 'none' }}
            aria-hidden={i !== active}
          >
            <div className="relative z-10 flex-1 px-6 sm:px-10 md:px-14 py-8 max-w-lg">
              <span className="inline-block text-[11px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full mb-3" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
                {slide.eyebrow}
              </span>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight tracking-tight font-display text-white">
                {slide.headline}
              </h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed max-w-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {slide.body}
              </p>
              <a
                href={slide.ctaHref}
                className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold cursor-pointer transition-transform duration-150 active:scale-95"
                style={{ background: '#fff', color: '#14161a' }}
              >
                {slide.ctaLabel} <ChevronRight size={14} strokeWidth={2} />
              </a>
            </div>

            <div className="hidden sm:flex relative z-10 items-center justify-center h-full w-2/5 pr-6 md:pr-10">
              <div className="relative w-full h-4/5">
                <Image
                  src={slide.image}
                  alt={slide.imageAlt}
                  fill
                  sizes="(min-width: 1024px) 512px, 40vw"
                  priority={i === 0}
                  className="object-contain"
                  style={{ filter: 'drop-shadow(0 12px 20px rgba(0,0,0,0.25))' }}
                />
              </div>
            </div>
          </div>
        ))}

        {/* Dot navigation */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.id}
              onClick={() => setActive(i)}
              aria-label={`Xem chương trình ${i + 1}: ${slide.headline}`}
              aria-current={i === active}
              className="promo-dot cursor-pointer"
              style={{
                width: i === active ? '20px' : '6px',
                background: i === active ? '#fff' : 'rgba(255,255,255,0.5)',
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
