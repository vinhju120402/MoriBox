interface AdminStatProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: 'default' | 'danger';
  /** Small secondary line under the value (e.g. "Chờ thu 1.200.000đ"). */
  hint?: string;
}

export default function AdminStat({ label, value, icon, tone = 'default', hint }: AdminStatProps) {
  const danger = tone === 'danger';
  return (
    <div className="card-surface relative overflow-hidden p-5 flex items-start justify-between gap-3">
      {/* Accent strip along the top edge */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: danger ? 'var(--danger)' : 'linear-gradient(90deg, var(--accent), transparent 80%)' }}
      />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p
          className="text-2xl font-bold font-display mt-2 truncate"
          style={{ color: danger ? 'var(--danger)' : 'var(--text-primary)' }}
        >
          {value}
        </p>
        {hint && <p className="text-[11px] mt-1.5 truncate" style={{ color: 'var(--text-secondary)' }}>{hint}</p>}
      </div>
      <div
        className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl"
        style={{
          background: danger ? 'rgba(214,69,80,0.12)' : 'var(--accent-dim)',
          color: danger ? 'var(--danger)' : 'var(--accent)',
        }}
      >
        {icon}
      </div>
    </div>
  );
}
