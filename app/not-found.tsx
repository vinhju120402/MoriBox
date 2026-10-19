import Link from 'next/link';
import { Boxes } from 'lucide-react';

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="card-surface w-full max-w-sm p-8 text-center space-y-4">
        <div
          className="w-12 h-12 mx-auto flex items-center justify-center rounded-full"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
        >
          <Boxes size={20} strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-lg font-bold font-display" style={{ color: 'var(--text-primary)' }}>
            404 · Không tìm thấy trang
          </h1>
          <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Trang bạn tìm không tồn tại hoặc đã được di chuyển.
          </p>
        </div>
        <Link
          href="/"
          className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
