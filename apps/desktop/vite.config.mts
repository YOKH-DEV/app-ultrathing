import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// El .env.local vive en la raíz del monorepo (no duplicamos secretos por app).
const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '../..');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '');
  return {
    plugins: [react(), tailwindcss()],
    envDir: rootDir,
    server: { port: 1420, strictPort: true },
    // Puente para que el cliente Supabase compartido lea las claves también en Vite.
    define: {
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL ?? ''),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY ?? ''),
    },
  };
});
