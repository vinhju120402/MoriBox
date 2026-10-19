'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { getSupabase } from '../lib/supabase';

export interface ShopSettings {
  shopName: string;
  shippingFee: number;
  bankBin: string;
  bankAccount: string;
  bankAccountName: string;
  bankName: string;
}

interface SettingsRow {
  shop_name: string;
  shipping_fee: number;
  bank_bin: string;
  bank_account: string;
  bank_account_name: string;
  bank_name: string;
}

const DEFAULTS: ShopSettings = {
  shopName: 'MoriBox',
  shippingFee: 30000,
  bankBin: '',
  bankAccount: '',
  bankAccountName: '',
  bankName: '',
};

const fromRow = (r: SettingsRow): ShopSettings => ({
  shopName: r.shop_name,
  shippingFee: r.shipping_fee,
  bankBin: r.bank_bin,
  bankAccount: r.bank_account,
  bankAccountName: r.bank_account_name,
  bankName: r.bank_name,
});

// Shared store (single row in `shop_settings`, readable by everyone because
// checkout needs the shipping fee and the bank details for the QR code).
interface State {
  settings: ShopSettings;
  hasLoaded: boolean;
}

const SERVER_STATE: State = { settings: DEFAULTS, hasLoaded: false };
let state: State = SERVER_STATE;
let started = false;
const listeners = new Set<() => void>();

function setState(next: State) {
  state = next;
  listeners.forEach(l => l());
}

export async function refreshShopSettings() {
  const { data, error } = await getSupabase().from('shop_settings').select('*').maybeSingle<SettingsRow>();
  if (error || !data) {
    setState({ ...state, hasLoaded: true });
    return;
  }
  setState({ settings: fromRow(data), hasLoaded: true });
}

function subscribe(cb: () => void) {
  if (!started && typeof window !== 'undefined') {
    started = true;
    void refreshShopSettings();
  }
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function useShopSettings() {
  const { settings, hasLoaded } = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);

  // Admin only — the database rejects anyone else.
  const update = useCallback(async (patch: Partial<ShopSettings>): Promise<{ ok: true } | { ok: false; error: string }> => {
    const row: Partial<SettingsRow> = {};
    if (patch.shopName !== undefined) row.shop_name = patch.shopName;
    if (patch.shippingFee !== undefined) row.shipping_fee = patch.shippingFee;
    if (patch.bankBin !== undefined) row.bank_bin = patch.bankBin;
    if (patch.bankAccount !== undefined) row.bank_account = patch.bankAccount;
    if (patch.bankAccountName !== undefined) row.bank_account_name = patch.bankAccountName;
    if (patch.bankName !== undefined) row.bank_name = patch.bankName;
    const { error } = await getSupabase().from('shop_settings').update({ ...row, updated_at: new Date().toISOString() }).eq('id', true);
    if (error) return { ok: false, error: error.message };
    await refreshShopSettings();
    return { ok: true };
  }, []);

  return { settings, hasLoaded, update };
}
