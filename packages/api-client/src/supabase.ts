import { createClient } from '@supabase/supabase-js';
import type { Database } from '@ultrathing/core';

// En Next llegan por process.env; en Vite el bridge de vite.config.mts las
// inyecta también en process.env (a partir de VITE_SUPABASE_*).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const isBrowser = typeof window !== 'undefined';

/** Cliente Supabase compartido por web y escritorio. Auth + datos + realtime.
 *
 * Sesión persistente: el token se guarda en localStorage (en la webview de Tauri
 * persiste en el data dir de la app) y se auto-refresca, así la sesión sobrevive
 * cerrar y reabrir la app en la misma PC — no hay que volver a entrar cada vez.
 *
 * `detectSessionInUrl` va en false: el callback de Google (`/auth/callback`)
 * intercambia el `code` a mano. Si el cliente auto-detecta Y el effect también
 * llama `exchangeCodeForSession`, el segundo tiro no encuentra el verifier PKCE
 * (Next Strict Mode monta dos veces) y muestra el error aunque la sesión exista. */
export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: isBrowser,
    detectSessionInUrl: false,
    flowType: 'pkce',
    storageKey: 'ultrathing-auth',
    ...(isBrowser ? { storage: window.localStorage } : {}),
  },
});
