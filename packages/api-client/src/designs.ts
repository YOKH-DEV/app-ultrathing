import { useEffect, useState } from 'react';
import type { Tables, DesignBackground, DesignElement, Json } from '@ultrathing/core';
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

/** Actualiza campos editables de un diseño y marca updated_at. Lanza si Supabase
 * devuelve error (RLS denegado, fila borrada en paralelo, violación de constraint, etc.)
 * para que quien llama no informe éxito falso. */
export async function updateDesign(
  id: string,
  patch: {
    title?: string;
    background?: DesignBackground;
    elements?: DesignElement[];
    thumbnail?: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from('designs')
    .update({
      title: patch.title,
      // DesignBackground/DesignElement son interfaces "cerradas" que no satisfacen
      // Json estructuralmente (sin index signature); el cast se acota a estos dos
      // campos para que el resto del payload (nombres de campo, tipos) siga
      // type-checked por el Update generado de Supabase.
      background: patch.background as unknown as Json | undefined,
      elements: patch.elements as unknown as Json | undefined,
      thumbnail: patch.thumbnail,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}

/** Elimina un diseño. Lanza si Supabase devuelve error, para que quien llama no
 * asuma silenciosamente que el borrado tuvo éxito. */
export async function deleteDesign(id: string): Promise<void> {
  const { error } = await supabase.from('designs').delete().eq('id', id);
  if (error) throw error;
}
