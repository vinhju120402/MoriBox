// Role → permission matrix for the back office.
// This only drives the UI (which pages/buttons are shown). The REAL enforcement
// is Row Level Security and the role checks inside the SQL functions in
// supabase/schema.sql — keep the two in sync.

export type Role = 'customer' | 'admin' | 'warehouse' | 'accountant';
export type Permission =
  | 'dashboard'
  | 'inventory'
  | 'revenue'
  | 'users'
  | 'orders'
  | 'packing'
  | 'promotions'
  | 'audit'
  | 'settings';

export const ROLES: Role[] = ['customer', 'admin', 'warehouse', 'accountant'];

const MATRIX: Record<Permission, Role[]> = {
  dashboard: ['admin', 'warehouse', 'accountant'],
  inventory: ['admin', 'warehouse'],
  revenue: ['admin', 'accountant'],
  users: ['admin'],
  orders: ['admin', 'accountant'],
  packing: ['admin', 'warehouse'],
  promotions: ['admin'],
  audit: ['admin'],
  settings: ['admin'],
};

export function can(role: Role | undefined, permission: Permission): boolean {
  return !!role && MATRIX[permission].includes(role);
}

export const isStaff = (role: Role | undefined) => !!role && role !== 'customer';

export const ROLE_LABEL: Record<Role, string> = {
  customer: 'Khách hàng',
  admin: 'Quản trị hệ thống',
  warehouse: 'Thủ kho',
  accountant: 'Kế toán',
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  customer: 'Mua hàng, xem đơn của chính mình.',
  admin: 'Toàn quyền: đơn hàng, kho, khuyến mãi, doanh thu, người dùng, nhật ký và cài đặt cửa hàng.',
  warehouse: 'Đóng gói và giao đơn cho vận chuyển, quản lý sản phẩm, tồn kho và nhập hàng.',
  accountant: 'Xem đơn hàng và doanh thu, xác nhận đã nhận tiền, hoàn tiền, xác nhận đơn đã giao.',
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as string[]).includes(value);
}
