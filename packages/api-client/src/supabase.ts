import { createClient } from '@supabase/supabase-js';
import type { Database } from '@ultrathing/core';

// En Next llegan por process.env; en Vite el bridge de vite.config.mts las
// inyecta también en process.env (a partir de VITE_SUPABASE_*).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Cliente Supabase compartido por web y escritorio. Auth + datos + realtime.
 *
 * Sesión persistente: el token se guarda en localStorage (en la webview de Tauri
 * persiste en el data dir de la app) y se auto-refresca, así la sesión sobrevive
 * cerrar y reabrir la app en la misma PC — no hay que volver a entrar cada vez. */
export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'ultrathing-auth',
  },
});
