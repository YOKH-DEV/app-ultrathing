import { createClient } from '@supabase/supabase-js';
import type { Database } from '@ultrathing/core';

// En Next llegan por process.env; en Vite el bridge de vite.config.mts las
// inyecta también en process.env (a partir de VITE_SUPABASE_*).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Cliente Supabase compartido por web y escritorio. Auth + datos + realtime. */
export const supabase = createClient<Database>(url, anonKey);
