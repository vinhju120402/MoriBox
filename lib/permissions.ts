// Role → permission matrix for the back office.
// This only drives the UI (which pages/buttons are shown). The REAL enforcement
// is Row Level Security and the role checks inside the SQL functions in
// supabase/schema.sql — keep the two in sync.

import type { DictionaryKey } from '../app/i18n/dictionary';

export type Role = 'customer' | 'admin' | 'warehouse' | 'accountant';
export type Permission =
  | 'dashboard'
  | 'inventory'
  | 'revenue'
  | 'users'
  | 'orders'
  | 'packing'
  | 'returns'
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
  returns: ['admin', 'warehouse', 'accountant'],
  promotions: ['admin'],
  audit: ['admin'],
  settings: ['admin'],
};

export function can(role: Role | undefined, permission: Permission): boolean {
  return !!role && MATRIX[permission].includes(role);
}

export const isStaff = (role: Role | undefined) => !!role && role !== 'customer';

// Dictionary keys for the role names/descriptions (use with t()).
export const roleLabelKey = (role: Role) => `role.${role}` as DictionaryKey;
export const roleDescKey = (role: Role) => `role.desc.${role}` as DictionaryKey;

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as string[]).includes(value);
}
