'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';

interface ProductImageProps {
  src: string;
  alt: string;
  imgClassName?: string;
  imgStyle?: React.CSSProperties;
  iconSize?: number;
  /** Compact mode drops the caption text — for small thumbnails (e.g. cart line items). */
  compact?: boolean;
  /** Passed through to next/image — required alongside `fill` for correct responsive sizing. */
  sizes?: string;
  /** Set for the single largest above-the-fold image on a page (e.g. product detail hero) to skip lazy-loading. */
  priority?: boolean;
}

export default function ProductImage({
  src,
  alt,
  imgClassName,
  imgStyle,
  iconSize = 22,
  compact = false,
  sizes = '(min-width: 1024px) 300px, (min-width: 640px) 45vw, 90vw',
  priority = false,
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div className="img-fallback absolute inset-0">
        <ImageOff size={iconSize} strokeWidth={1.5} />
        {!compact && (
          <span className="text-[10px] font-medium leading-tight">
            Hình ảnh đang cập nhật
          </span>
        )}
      </div>
    );
  }

  // Admin-uploaded/captured photos are stored as data URLs (no image host to
  // upload them to). next/image's optimizer doesn't handle those — a plain
  // <img> renders them as-is, which is all a data URL needs anyway.
  if (src.startsWith('data:')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={`absolute inset-0 w-full h-full ${imgClassName ?? ''}`}
        style={imgStyle}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={imgClassName}
      style={imgStyle}
      onError={() => setFailed(true)}
    />
  );
}
