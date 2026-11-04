import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function isGuestbookShared(): boolean {
  return Boolean(import.meta.env.PUBLIC_SUPABASE_URL && import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabase(): SupabaseClient | null {
  if (!isGuestbookShared()) return null;
  if (!client) {
    client = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL!,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return client;
}
