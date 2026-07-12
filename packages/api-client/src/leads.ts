import { useEffect, useState } from 'react';
import type { Tables } from '@ultrathing/core';
import { supabase } from './supabase';

export type Lead = Tables<'leads'>;

/** Lista de leads del usuario, en vivo. Se refresca por Realtime cuando el motor
 * (escritorio) inserta uno nuevo — así la web lo ve al instante. RLS acota las filas
 * a las del propio usuario. Reutilizable por web y escritorio. */
export function useLeads(): { leads: Lead[]; loading: boolean } {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      setLeads(data ?? []);
      setLoading(false);
    }
    load();
    const channel = supabase
      .channel('leads-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { leads, loading };
}
