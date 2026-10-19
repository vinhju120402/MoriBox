'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from './use-auth';
import type { Role } from '../lib/permissions';

export interface StaffEmail {
  email: string;
  role: Exclude<Role, 'customer'>;
}

// Emails that become staff automatically once their owner signs up and confirms
// the address. Admin only (the database functions check it too).
export function useStaffEmails() {
  const { role } = useAuth();
  const [emails, setEmails] = useState<StaffEmail[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (role !== 'admin') return;
    let cancelled = false;
    getSupabase().rpc('list_staff_emails').then(({ data }) => {
      if (!cancelled && Array.isArray(data)) setEmails(data as StaffEmail[]);
    });
    return () => { cancelled = true; };
  }, [role, version]);

  const add = useCallback(async (email: string, staffRole: StaffEmail['role']): Promise<boolean> => {
    const { error } = await getSupabase().rpc('set_staff_email', { p_email: email, p_role: staffRole });
    if (error) return false;
    setVersion(v => v + 1);
    return true;
  }, []);

  const remove = useCallback(async (email: string): Promise<boolean> => {
    const { error } = await getSupabase().rpc('remove_staff_email', { p_email: email });
    if (error) return false;
    setVersion(v => v + 1);
    return true;
  }, []);

  return { emails: role === 'admin' ? emails : [], add, remove };
}
