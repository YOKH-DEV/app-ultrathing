'use client';

import { useEffect, useState } from 'react';

const BASE = 'http://127.0.0.1:8787';

export function useEngineHealth() {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    let stop = false;
    async function ping() {
      try {
        const res = await fetch(`${BASE}/health`, { cache: 'no-store' });
        if (!stop) setOk(res.ok);
      } catch {
        if (!stop) setOk(false);
      }
    }
    ping();
    const id = setInterval(ping, 8000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  return ok;
}

export function EngineBanner() {
  const ok = useEngineHealth();
  if (ok !== false) return null;
  return (
    <p className="mb-4 rounded-lg border border-[var(--warning)]/40 bg-[var(--warning)]/10 px-3 py-2 text-sm text-[var(--warning)]">
      El motor local no responde en :8787. El lienzo y los leads siguen. Copy, OCR,
      descargas, scraper, PDF, voz, quitar fondo y video necesitan `pnpm engine`.
    </p>
  );
}
