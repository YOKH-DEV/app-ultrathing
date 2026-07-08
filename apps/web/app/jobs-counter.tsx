'use client';

import { useEffect, useState } from 'react';
import { StatCard } from '@ultrathing/ui';
import { supabase } from '@ultrathing/api-client';

/** "Jobs activos" en vivo: cuenta queued/running del usuario y se refresca por Realtime. */
export function JobsCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      // RLS limita el conteo a los jobs del propio usuario.
      const { count } = await supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .in('status', ['queued', 'running']);
      setCount(count ?? 0);
    }
    load();
    const channel = supabase
      .channel('jobs-activos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return <StatCard label="Jobs activos" value={count === null ? '…' : String(count)} />;
}
