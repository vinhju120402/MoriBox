import {
  LayoutDashboard, ClipboardList, PackageCheck, Boxes, TicketPercent, Users, LineChart, ScrollText, Settings2, Megaphone, Undo2,
} from 'lucide-react';
import type { Permission } from './permissions';
import type { DictionaryKey } from '../app/i18n/dictionary';

// Back-office menu, shared by the admin pages' own sidebar and the main site
// sidebar (shown to staff accounts). Each item is only listed for roles that
// hold its permission; group headings only appear if the role sees an item in them.
export const ADMIN_NAV_ITEMS = [
  { key: 'dashboard', href: '/admin', labelKey: 'adm.nav.dashboard', icon: LayoutDashboard, permission: 'dashboard', groupKey: 'adm.nav.group.ops' },
  { key: 'don-hang', href: '/admin/don-hang', labelKey: 'adm.nav.don-hang', icon: ClipboardList, permission: 'orders', groupKey: 'adm.nav.group.ops' },
  { key: 'dong-goi', href: '/admin/dong-goi', labelKey: 'adm.nav.dong-goi', icon: PackageCheck, permission: 'packing', groupKey: 'adm.nav.group.ops' },
  { key: 'doi-tra', href: '/admin/doi-tra', labelKey: 'adm.nav.doi-tra', icon: Undo2, permission: 'returns', groupKey: 'adm.nav.group.ops' },
  { key: 'kho', href: '/admin/kho', labelKey: 'adm.nav.kho', icon: Boxes, permission: 'inventory', groupKey: 'adm.nav.group.ops' },
  { key: 'khuyen-mai', href: '/admin/khuyen-mai', labelKey: 'adm.nav.khuyen-mai', icon: TicketPercent, permission: 'promotions', groupKey: 'adm.nav.group.business' },
  { key: 'chuong-trinh', href: '/admin/chuong-trinh', labelKey: 'adm.nav.chuong-trinh', icon: Megaphone, permission: 'promotions', groupKey: 'adm.nav.group.business' },
  { key: 'doanh-thu', href: '/admin/doanh-thu', labelKey: 'adm.nav.doanh-thu', icon: LineChart, permission: 'revenue', groupKey: 'adm.nav.group.business' },
  { key: 'nguoi-dung', href: '/admin/nguoi-dung', labelKey: 'adm.nav.nguoi-dung', icon: Users, permission: 'users', groupKey: 'adm.nav.group.system' },
  { key: 'nhat-ky', href: '/admin/nhat-ky', labelKey: 'adm.nav.nhat-ky', icon: ScrollText, permission: 'audit', groupKey: 'adm.nav.group.system' },
  { key: 'cai-dat-shop', href: '/admin/cai-dat-shop', labelKey: 'adm.nav.cai-dat-shop', icon: Settings2, permission: 'settings', groupKey: 'adm.nav.group.system' },
] as const satisfies readonly { key: string; href: string; labelKey: DictionaryKey; icon: unknown; permission: Permission; groupKey: DictionaryKey }[];

export type AdminNavKey = (typeof ADMIN_NAV_ITEMS)[number]['key'];

// Split into labelled groups, keeping only the items a role may open.
export function groupedNav<T extends { groupKey: DictionaryKey }>(items: readonly T[]): { groupKey: DictionaryKey; items: T[] }[] {
  const out: { groupKey: DictionaryKey; items: T[] }[] = [];
  for (const item of items) {
    const last = out[out.length - 1];
    if (last && last.groupKey === item.groupKey) last.items.push(item);
    else out.push({ groupKey: item.groupKey, items: [item] });
  }
  return out;
}
