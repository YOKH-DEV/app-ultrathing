import { createClient } from '@supabase/supabase-js';

/** Cliente Supabase compartido por web y escritorio. Auth + datos + realtime. */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? import.meta.env?.VITE_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? import.meta.env?.VITE_SUPABASE_ANON_KEY,
);
