import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | undefined;

// One shared browser client — the app is fully client-rendered, so no
// server-side/cookie client is needed. Both values are public by design;
// access control lives in the Row Level Security rules (supabase/schema.sql).
export function getSupabase(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example)');
    }
    client = createBrowserClient(url, key);
  }
  return client;
}
