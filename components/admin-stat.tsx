interface AdminStatProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: 'default' | 'danger';
}

export default function AdminStat({ label, value, icon, tone = 'default' }: AdminStatProps) {
  return (
    <div className="card-surface p-5 flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</p>
        <p
          className="text-2xl font-bold font-display mt-1.5"
          style={{ color: tone === 'danger' ? 'var(--danger)' : 'var(--text-primary)' }}
        >
          {value}
        </p>
      </div>
      <div
        className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full"
        style={{
          background: tone === 'danger' ? 'rgba(214,69,80,0.12)' : 'var(--accent-dim)',
          color: tone === 'danger' ? 'var(--danger)' : 'var(--accent)',
        }}
      >
        {icon}
      </div>
    </div>
  );
}
