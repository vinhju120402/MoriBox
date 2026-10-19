import {
  LayoutDashboard, ClipboardList, PackageCheck, Boxes, TicketPercent, Users, LineChart, ScrollText, Settings2,
} from 'lucide-react';
import type { Permission } from './permissions';

// Back-office menu, shared by the admin pages' own sidebar and the main site
// sidebar (shown to staff accounts). Each item is only listed for roles that
// hold its permission; group headings only appear if the role sees an item in them.
export const ADMIN_NAV_ITEMS = [
  { key: 'dashboard', href: '/admin', label: 'Tổng quan', icon: LayoutDashboard, permission: 'dashboard', group: 'Vận hành' },
  { key: 'don-hang', href: '/admin/don-hang', label: 'Đơn hàng', icon: ClipboardList, permission: 'orders', group: 'Vận hành' },
  { key: 'dong-goi', href: '/admin/dong-goi', label: 'Đóng gói', icon: PackageCheck, permission: 'packing', group: 'Vận hành' },
  { key: 'kho', href: '/admin/kho', label: 'Kho hàng', icon: Boxes, permission: 'inventory', group: 'Vận hành' },
  { key: 'khuyen-mai', href: '/admin/khuyen-mai', label: 'Khuyến mãi', icon: TicketPercent, permission: 'promotions', group: 'Kinh doanh' },
  { key: 'doanh-thu', href: '/admin/doanh-thu', label: 'Doanh thu', icon: LineChart, permission: 'revenue', group: 'Kinh doanh' },
  { key: 'nguoi-dung', href: '/admin/nguoi-dung', label: 'Người dùng', icon: Users, permission: 'users', group: 'Hệ thống' },
  { key: 'nhat-ky', href: '/admin/nhat-ky', label: 'Nhật ký thao tác', icon: ScrollText, permission: 'audit', group: 'Hệ thống' },
  { key: 'cai-dat-shop', href: '/admin/cai-dat-shop', label: 'Cài đặt cửa hàng', icon: Settings2, permission: 'settings', group: 'Hệ thống' },
] as const satisfies readonly { key: string; href: string; label: string; icon: unknown; permission: Permission; group: string }[];

export type AdminNavKey = (typeof ADMIN_NAV_ITEMS)[number]['key'];

// Split into labelled groups, keeping only the items a role may open.
export function groupedNav<T extends { group: string }>(items: readonly T[]): { group: string; items: T[] }[] {
  const out: { group: string; items: T[] }[] = [];
  for (const item of items) {
    const last = out[out.length - 1];
    if (last && last.group === item.group) last.items.push(item);
    else out.push({ group: item.group, items: [item] });
  }
  return out;
}
