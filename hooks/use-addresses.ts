'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from './use-auth';

export interface Address {
  id: string;
  label: string;
  name: string;
  phone: string;
  address: string;
  sector: string;
  isDefault: boolean;
}

interface AddressRow {
  id: string;
  label: string;
  name: string;
  phone: string;
  address: string;
  sector: string;
  is_default: boolean;
}

export interface AddressInput {
  id?: string;
  label: string;
  name: string;
  phone: string;
  address: string;
  sector: string;
  isDefault: boolean;
}

export type AddressResult = { ok: true } | { ok: false; error: string };

const fromRow = (r: AddressRow): Address => ({
  id: r.id, label: r.label, name: r.name, phone: r.phone, address: r.address, sector: r.sector, isDefault: r.is_default,
});

// The signed-in customer's saved delivery addresses (default first). Row-level
// security means each person only ever sees their own.
export function useAddresses() {
  const { user } = useAuth();
  const userId = user?.id;
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getSupabase()
      .from('addresses')
      .select('id, label, name, phone, address, sector, is_default')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        setAddresses(((data ?? []) as AddressRow[]).map(fromRow));
        setLoaded(true);
      });
    return () => { cancelled = true; };
  }, [userId, version]);

  const save = useCallback(async (input: AddressInput): Promise<AddressResult> => {
    const { error } = await getSupabase().rpc('save_address', {
      p_id: input.id ?? null,
      p_label: input.label,
      p_name: input.name,
      p_phone: input.phone,
      p_address: input.address,
      p_sector: input.sector,
      p_default: input.isDefault,
    });
    if (error) return { ok: false, error: error.message };
    setVersion(v => v + 1);
    return { ok: true };
  }, []);

  const setDefault = useCallback(async (id: string): Promise<AddressResult> => {
    const { error } = await getSupabase().rpc('set_default_address', { p_id: id });
    if (error) return { ok: false, error: error.message };
    setVersion(v => v + 1);
    return { ok: true };
  }, []);

  const remove = useCallback(async (id: string): Promise<AddressResult> => {
    const { error } = await getSupabase().rpc('delete_address', { p_id: id });
    if (error) return { ok: false, error: error.message };
    setVersion(v => v + 1);
    return { ok: true };
  }, []);

  return { addresses: userId ? addresses : [], loaded, save, setDefault, remove };
}
