// Role → permission matrix for the back office.
// This only drives the UI (which pages/buttons are shown). The REAL enforcement
// is Row Level Security in supabase/schema.sql — keep the two in sync.

export type Role = 'customer' | 'admin' | 'warehouse' | 'accountant';
export type Permission = 'dashboard' | 'inventory' | 'revenue' | 'users';

export const ROLES: Role[] = ['customer', 'admin', 'warehouse', 'accountant'];

const MATRIX: Record<Permission, Role[]> = {
  dashboard: ['admin', 'warehouse', 'accountant'],
  inventory: ['admin', 'warehouse'],
  revenue: ['admin', 'accountant'],
  users: ['admin'],
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
  admin: 'Toàn quyền: kho, doanh thu, người dùng và phân quyền.',
  warehouse: 'Thêm, sửa, xóa sản phẩm và cập nhật tồn kho.',
  accountant: 'Chỉ xem doanh thu và đơn hàng (không sửa được gì).',
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as string[]).includes(value);
}
