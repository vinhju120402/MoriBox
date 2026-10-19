import { LayoutDashboard, Boxes, Users, LineChart } from 'lucide-react';
import type { Permission } from './permissions';

// Back-office menu, shared by the admin pages' own sidebar and the main site
// sidebar (shown to staff accounts). Each item is only listed for roles that
// hold its permission.
export const ADMIN_NAV_ITEMS = [
  { key: 'dashboard', href: '/admin', label: 'Tổng quan', icon: LayoutDashboard, permission: 'dashboard' },
  { key: 'kho', href: '/admin/kho', label: 'Kho hàng', icon: Boxes, permission: 'inventory' },
  { key: 'nguoi-dung', href: '/admin/nguoi-dung', label: 'Người dùng', icon: Users, permission: 'users' },
  { key: 'doanh-thu', href: '/admin/doanh-thu', label: 'Doanh thu', icon: LineChart, permission: 'revenue' },
] as const satisfies readonly { key: string; href: string; label: string; icon: unknown; permission: Permission }[];

export type AdminNavKey = (typeof ADMIN_NAV_ITEMS)[number]['key'];
