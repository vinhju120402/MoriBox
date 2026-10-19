'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from './use-auth';
import { subscribeOrdersChanged } from './use-orders';
import { can, isStaff } from '../lib/permissions';

// Counts of work waiting for the signed-in staff member, shown next to menu items
// (keys match ADMIN_NAV_ITEMS keys). Refreshes when orders change and every minute.
export function useAdminBadges(): Record<string, number> {
  const { role } = useAuth();
  const [badges, setBadges] = useState<Record<string, number>>({});
  const [tick, setTick] = useState(0);

  useEffect(() => subscribeOrdersChanged(() => setTick(t => t + 1)), []);

  useEffect(() => {
    if (!isStaff(role)) return;
    let cancelled = false;
    const supabase = getSupabase();

    const load = async () => {
      const next: Record<string, number> = {};
      if (can(role, 'orders')) {
        const { count } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending');
        next['don-hang'] = count ?? 0;
      }
      if (can(role, 'packing')) {
        const { data } = await supabase.rpc('get_packing_list');
        if (Array.isArray(data)) {
          // Ready to pack (COD or already paid) plus packed parcels waiting to go out.
          next['dong-goi'] = (data as { status: string; payment_method: string; payment_status: string }[]).filter(
            o => (o.status === 'pending' && (o.payment_method === 'cod' || o.payment_status === 'paid')) || o.status === 'confirmed',
          ).length;
        }
      }
      if (!cancelled) setBadges(next);
    };

    void load();
    const timer = window.setInterval(() => { void load(); }, 60_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [role, tick]);

  return isStaff(role) ? badges : {};
}
