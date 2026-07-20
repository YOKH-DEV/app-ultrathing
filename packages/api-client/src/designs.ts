import { useEffect, useState } from 'react';
import type { Tables, DesignBackground, DesignElement } from '@ultrathing/core';
import { supabase } from './supabase';

export type Design = Tables<'designs'>;

/** Lista de diseños del usuario, en vivo (Realtime). RLS acota a las filas propias.
 * Mismo patrón que useLeads. */
export function useDesigns(): { designs: Design[]; loading: boolean } {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('designs')
        .select('*')
        .order('updated_at', { ascending: false });
      setDesigns(data ?? []);
      setLoading(false);
    }
    load();
    const channel = supabase
      .channel('designs-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'designs' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { designs, loading };
}

/** Carga un diseño por id (o null si no existe / sin acceso RLS). */
export async function getDesign(id: string): Promise<Design | null> {
  const { data } = await supabase.from('designs').select('*').eq('id', id).maybeSingle();
  return data;
}

/** Crea un diseño vacío con el tamaño elegido. Devuelve la fila creada (o null si falla,
 * p.ej. sin sesión bajo el bypass de auth). El user_id lo pone RLS/DEFAULT del token. */
export async function createDesign(input: {
  title: string;
  width: number;
  height: number;
}): Promise<Design | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;
  const { data } = await supabase
    .from('designs')
    .insert({ user_id: userId, title: input.title, width: input.width, height: input.height })
    .select('*')
    .single();
  return data ?? null;
}

/** Actualiza campos editables de un diseño y marca updated_at. */
export async function updateDesign(
  id: string,
  patch: {
    title?: string;
    background?: DesignBackground;
    elements?: DesignElement[];
    thumbnail?: string | null;
  },
): Promise<void> {
  await supabase
    .from('designs')
    .update({ ...patch, updated_at: new Date().toISOString() } as never)
    .eq('id', id);
}

/** Elimina un diseño. */
export async function deleteDesign(id: string): Promise<void> {
  await supabase.from('designs').delete().eq('id', id);
}
