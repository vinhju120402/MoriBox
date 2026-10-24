'use client';

import { useState } from 'react';
import { Users, UserCheck, ShieldCheck, Wallet, Search, Lock, LockOpen, Trash2, Plus } from 'lucide-react';
import AdminShell from '../../../components/admin-shell';
import AdminStat from '../../../components/admin-stat';
import Pagination, { paginate } from '../../../components/pagination';
import { useOrders } from '../../../hooks/use-orders';
import { useAllProfiles, useAuth } from '../../../hooks/use-auth';
import { useStaffEmails, StaffEmail } from '../../../hooks/use-staff-emails';
import { ROLES, roleLabelKey, roleDescKey, Role } from '../../../lib/permissions';
import { useLanguage } from '../../../hooks/use-language';

const STAFF_ROLES: StaffEmail['role'][] = ['admin', 'warehouse', 'accountant'];

export default function AdminUsersPage() {
  const { orders } = useOrders();
  const { t, language } = useLanguage();
  const { users, setRole, setDisabled } = useAllProfiles();
  const { user: me } = useAuth();
  const { emails, add: addStaffEmail, remove: removeStaffEmail } = useStaffEmails();
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<StaffEmail['role']>('warehouse');
  const [staffMessage, setStaffMessage] = useState('');

  const changeRole = async (id: string, name: string, role: Role) => {
    if (!window.confirm(t('adm.users.confirmRole', { name, role: t(roleLabelKey(role)), desc: t(roleDescKey(role)) }))) return;
    const result = await setRole(id, role);
    setError(result.ok ? '' : t('adm.users.roleFail'));
  };

  const toggleDisabled = async (id: string, name: string, disabled: boolean) => {
    const question = disabled ? t('adm.users.confirmLock', { name }) : t('adm.users.confirmUnlock', { name });
    if (!window.confirm(question)) return;
    const result = await setDisabled(id, disabled);
    setError(result.ok ? '' : t('adm.users.lockFail'));
  };

  const submitStaffEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffMessage('');
    const ok = await addStaffEmail(newEmail, newRole);
    if (ok) { setNewEmail(''); setStaffMessage(t('adm.users.staffAdded')); }
    else setStaffMessage(t('adm.users.staffAddFail'));
  };

  const rows = users.map(u => {
    const userOrders = orders.filter(o => o.userId === u.id && o.status !== 'cancelled');
    return {
      ...u,
      orderCount: userOrders.length,
      totalSpent: userOrders.reduce((acc, o) => acc + o.total, 0),
    };
  });

  const totalUsers = users.length;
  const totalStaff = users.filter(u => u.role !== 'customer').length;
  const activeBuyers = rows.filter(r => r.orderCount > 0).length;
  const totalSpentAll = rows.reduce((acc, r) => acc + r.totalSpent, 0);
  const lockedCount = users.filter(u => u.disabled).length;

  const q = query.trim().toLowerCase();
  const filtered = rows.filter(u => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));

  return (
    <AdminShell
      active="nguoi-dung"
      title={t('adm.users.title')}
      description={t('adm.users.desc')}
    >
      {error && (
        <p role="alert" className="mb-4 p-3 rounded-xl text-xs font-medium" style={{ background: 'var(--accent-dim)', color: 'var(--danger)' }}>{error}</p>
      )}

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))' }}>
        <AdminStat label={t('adm.users.total')} value={String(totalUsers)} hint={lockedCount > 0 ? t('adm.users.lockedHint', { n: lockedCount }) : undefined} icon={<Users size={20} strokeWidth={2} />} />
        <AdminStat label={t('adm.users.buyers')} value={String(activeBuyers)} icon={<UserCheck size={20} strokeWidth={2} />} />
        <AdminStat label={t('adm.users.staff')} value={String(totalStaff)} hint={t('adm.users.staffHint')} icon={<ShieldCheck size={20} strokeWidth={2} />} />
        <AdminStat label={t('adm.users.totalSpent')} value={`${totalSpentAll.toLocaleString('vi-VN')}đ`} icon={<Wallet size={20} strokeWidth={2} />} />
      </div>

      <div className="relative w-full sm:w-72 mb-3">
        <Search size={14} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder={t('adm.users.searchPh')}
          aria-label={t('adm.users.searchAria')}
          className="input-field w-full pl-9 pr-3 py-2 text-xs"
        />
      </div>

      <div className="card-surface overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="admin-table w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {(['name', 'email', 'role', 'joined', 'orders', 'spent', 'access', ''] as const).map(h => (
                  <th key={h} className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-muted)' }}>{h && t(`adm.users.col.${h}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-10 text-center" style={{ color: 'var(--text-secondary)' }}>{t('adm.users.noMatch')}</td></tr>
              ) : paginate(filtered, page).map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)', opacity: u.disabled ? 0.6 : 1 }}>
                  <td className="py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {u.name || '—'}
                    {u.disabled && <span className="ml-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626' }}>{t('adm.users.locked')}</span>}
                  </td>
                  <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td className="py-3 px-4">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
                      style={{
                        background: u.role !== 'customer' ? 'var(--accent-dim)' : 'var(--bg-base)',
                        color: u.role !== 'customer' ? 'var(--accent)' : 'var(--text-secondary)',
                        border: u.role !== 'customer' ? 'none' : '1px solid var(--border-subtle)',
                      }}
                    >
                      {t(roleLabelKey(u.role))}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                    {u.joinedAt ? new Date(u.joinedAt).toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN') : '—'}
                  </td>
                  <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>{u.orderCount}</td>
                  <td className="py-3 px-4 font-bold whitespace-nowrap" style={{ color: 'var(--accent)' }}>
                    {u.totalSpent.toLocaleString('vi-VN')}đ
                  </td>
                  <td className="py-3 px-4">
                    {u.id === me?.id ? (
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t('adm.users.you')}</span>
                    ) : (
                      <select
                        aria-label={t('adm.users.roleOf', { who: u.name || u.email })}
                        value={u.role}
                        onChange={(e) => changeRole(u.id, u.name || u.email, e.target.value as Role)}
                        className="input-field text-[11px] font-semibold px-2 py-1.5 cursor-pointer"
                      >
                        {ROLES.map(r => <option key={r} value={r}>{t(roleLabelKey(r))}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {u.id !== me?.id && (
                      <button
                        onClick={() => toggleDisabled(u.id, u.name || u.email, !u.disabled)}
                        className="btn-ghost p-1.5 cursor-pointer"
                        aria-label={u.disabled ? t('adm.users.unlockAria', { email: u.email }) : t('adm.users.lockAria', { email: u.email })}
                        title={u.disabled ? t('adm.users.unlockTitle') : t('adm.users.lockTitle')}
                      >
                        {u.disabled ? <LockOpen size={15} strokeWidth={2} /> : <Lock size={15} strokeWidth={2} />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={filtered.length} onChange={setPage} />
      </div>

      {/* Pre-approved staff emails */}
      <section aria-labelledby="staff-emails-heading" className="card-surface p-5">
        <h2 id="staff-emails-heading" className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t('adm.users.preTitle')}</h2>
        <p className="text-xs mt-1 mb-4 leading-relaxed max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
          {t('adm.users.preDesc')}
        </p>

        <form onSubmit={submitStaffEmail} className="flex flex-wrap items-end gap-3 mb-4">
          <div className="flex-1 min-w-[14rem]">
            <label htmlFor="staff-email" className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('adm.users.staffEmail')}</label>
            <input id="staff-email" type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder={t('adm.users.staffEmailPh')} className="input-field w-full px-3 py-2.5 text-xs" />
          </div>
          <div>
            <label htmlFor="staff-role" className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('adm.users.roleLabel')}</label>
            <select id="staff-role" value={newRole} onChange={(e) => setNewRole(e.target.value as StaffEmail['role'])} className="input-field px-3 py-2.5 text-xs cursor-pointer">
              {STAFF_ROLES.map(r => <option key={r} value={r}>{t(roleLabelKey(r))}</option>)}
            </select>
          </div>
          <button type="submit" className="btn-primary px-4 py-2.5 text-xs font-semibold cursor-pointer flex items-center gap-1.5">
            <Plus size={14} strokeWidth={2} /> {t('adm.users.add')}
          </button>
        </form>
        {staffMessage && <p role="status" className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>{staffMessage}</p>}

        {emails.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('adm.users.noEmails')}</p>
        ) : (
          <ul>
            {emails.map(se => (
              <li key={se.email} className="flex items-center justify-between gap-3 py-2.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{se.email}</span>
                <span className="flex items-center gap-3 shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>{t(roleLabelKey(se.role))}</span>
                  <button
                    onClick={async () => {
                      if (!window.confirm(t('adm.users.confirmRemove', { email: se.email }))) return;
                      if (!(await removeStaffEmail(se.email))) setStaffMessage(t('adm.users.removeFail'));
                    }}
                    className="trash-btn p-1.5 cursor-pointer"
                    aria-label={t('adm.users.removeAria', { email: se.email })}
                    title={t('adm.users.removeTitle')}
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] mt-4 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {t('adm.users.securityNote')}
        </p>
      </section>
    </AdminShell>
  );
}
