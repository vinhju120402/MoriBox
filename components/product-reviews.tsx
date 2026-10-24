'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { Stars, StarInput } from './star-rating';
import { useReviews } from '../hooks/use-reviews';
import { useAuth } from '../hooks/use-auth';

const PAGE = 5;

function describeError(raw: string) {
  if (raw.includes('not_purchased')) return 'Chỉ khách đã nhận hàng mới đánh giá được sản phẩm này.';
  if (raw.includes('not_authenticated')) return 'Vui lòng đăng nhập để đánh giá.';
  if (raw.includes('review_too_long')) return 'Nội dung đánh giá tối đa 1000 ký tự.';
  return 'Không gửi được đánh giá. Vui lòng thử lại.';
}

// Star summary, rating breakdown, the list of reviews, and (for customers who have
// received the product) the form to write or edit their own.
export default function ProductReviews({ productId }: { productId: string }) {
  const { user, isAdmin } = useAuth();
  const { reviews, loaded, canReview, submit, remove } = useReviews(productId);
  const mine = reviews.find(r => r.userId && r.userId === user?.id);

  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [shown, setShown] = useState(PAGE);
  // Editing starts from the customer's existing review, once.
  const [seeded, setSeeded] = useState(false);
  if (mine && !seeded) {
    setSeeded(true);
    setRating(mine.rating);
    setBody(mine.body);
  }

  const count = reviews.length;
  const avg = count ? reviews.reduce((acc, r) => acc + r.rating, 0) / count : 0;
  const dist = [5, 4, 3, 2, 1].map(star => ({ star, n: reviews.filter(r => r.rating === star).length }));

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) { setMessage({ ok: false, text: 'Hãy chọn số sao.' }); return; }
    setBusy(true);
    setMessage(null);
    const r = await submit(rating, body);
    setBusy(false);
    setMessage(r.ok ? { ok: true, text: mine ? 'Đã cập nhật đánh giá của bạn.' : 'Cảm ơn bạn đã đánh giá!' } : { ok: false, text: describeError(r.error) });
  };

  return (
    <section id="danh-gia" aria-labelledby="reviews-heading" className="mt-10 md:mt-12">
      <h2 id="reviews-heading" className="text-lg font-bold tracking-tight font-display mb-6" style={{ color: 'var(--text-primary)' }}>
        Đánh giá sản phẩm {count > 0 && <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>({count})</span>}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="card-surface p-5 md:col-span-1">
          {count === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {loaded ? 'Chưa có đánh giá nào. Hãy là người đầu tiên chia sẻ cảm nhận sau khi nhận hàng.' : 'Đang tải…'}
            </p>
          ) : (
            <>
              <div className="flex items-end gap-3">
                <p className="text-4xl font-black font-display" style={{ color: 'var(--text-primary)' }}>{avg.toFixed(1)}</p>
                <div className="pb-1.5">
                  <Stars value={avg} size={16} />
                  <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{count} đánh giá</p>
                </div>
              </div>
              <ul className="mt-4 space-y-1.5">
                {dist.map(d => (
                  <li key={d.star} className="flex items-center gap-2 text-[11px]">
                    <span className="w-6" style={{ color: 'var(--text-secondary)' }}>{d.star} ★</span>
                    <span className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }} aria-hidden="true">
                      <span className="block h-full rounded-full" style={{ width: `${(d.n / count) * 100}%`, background: '#f59e0b' }} />
                    </span>
                    <span className="w-5 text-right" style={{ color: 'var(--text-muted)' }}>{d.n}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="md:col-span-2 space-y-4">
          {/* Write / edit */}
          <div className="card-surface p-5">
            {!user ? (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                <Link href={`/dang-nhap?redirect=${encodeURIComponent(`/san-pham/${productId}`)}`} className="font-semibold" style={{ color: 'var(--accent)' }}>Đăng nhập</Link>
                {' '}để viết đánh giá.
              </p>
            ) : canReview ? (
              <form onSubmit={send} className="space-y-3">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{mine ? 'Sửa đánh giá của bạn' : 'Viết đánh giá của bạn'}</p>
                <StarInput value={rating} onChange={setRating} />
                <div>
                  <label htmlFor="review-body" className="sr-only">Nội dung đánh giá</label>
                  <textarea
                    id="review-body"
                    rows={3}
                    maxLength={1000}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Chất lượng nhựa, độ khớp, hộp đóng gói… (không bắt buộc)"
                    className="input-field w-full px-3 py-2.5 text-sm rounded-xl resize-none"
                  />
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <button type="submit" disabled={busy} className="btn-primary px-5 py-2.5 text-xs font-semibold cursor-pointer">
                    {busy ? 'Đang gửi…' : mine ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
                  </button>
                  {message && <p role={message.ok ? 'status' : 'alert'} className="text-xs font-medium" style={{ color: message.ok ? '#16a34a' : 'var(--danger)' }}>{message.text}</p>}
                </div>
              </form>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Chỉ khách đã nhận hàng mới đánh giá được sản phẩm này, để mọi nhận xét đều từ người đã mua thật.
              </p>
            )}
          </div>

          {/* List */}
          {reviews.slice(0, shown).map(r => (
            <article key={r.id} className="card-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {r.authorName} <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#16a34a' }}>Đã mua hàng</span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Stars value={r.rating} />
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{new Date(r.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
                {(r.userId === user?.id || isAdmin) && (
                  <button
                    onClick={async () => { if (window.confirm('Xóa đánh giá này?')) await remove(r.id); }}
                    className="trash-btn p-1.5 cursor-pointer"
                    aria-label="Xóa đánh giá"
                    title="Xóa đánh giá"
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                )}
              </div>
              {r.body && <p className="text-sm mt-3 leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{r.body}</p>}
            </article>
          ))}
          {reviews.length > shown && (
            <button onClick={() => setShown(n => n + PAGE)} className="btn-outline w-full py-2.5 text-xs font-semibold cursor-pointer">
              Xem thêm đánh giá ({reviews.length - shown})
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
