export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg-base)' }}
    >
      <span className="sr-only">Loading…</span>
      <span
        aria-hidden="true"
        className="w-8 h-8 rounded-full border-2 animate-spin"
        style={{ borderColor: 'var(--border-strong)', borderTopColor: 'var(--accent)' }}
      />
    </div>
  );
}
