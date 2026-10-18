import { useEffect, useState } from 'react';
import type { Tables, DesignBackground, Json } from '@ultrathing/core';
import { supabase } from './supabase';

export type Design = Tables<'designs'>;

/** Fila resumida para la galería: sin `background`/`elements` (JSON potencialmente
 * grande) ni columnas que no se muestran. Evita traer cada diseño completo solo para
 * pintar un título y un WxH — importa sobre todo cuando la Fase 2 autoguarde ~1×/s. */
export type DesignSummary = Pick<
  Design,
  'id' | 'title' | 'width' | 'height' | 'thumbnail' | 'updated_at'
>;

const GALLERY_COLUMNS = 'id, title, width, height, thumbnail, updated_at';

/** Lista de diseños del usuario, en vivo (Realtime). RLS acota a las filas propias.
 * Mismo patrón que useLeads. Trae solo las columnas que la galería pinta (ver
 * DesignSummary); para el diseño completo usar getDesign(). */
export function useDesigns(): { designs: DesignSummary[]; loading: boolean } {
  const [designs, setDesigns] = useState<DesignSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        if (!cancelled) {
          setDesigns([]);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from('designs')
        .select(GALLERY_COLUMNS)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      if (!cancelled) {
        setDesigns(data ?? []);
        setLoading(false);
      }
    }

    void load();
    const { data: auth } = supabase.auth.onAuthStateChange(() => {
      void load();
    });
    const channel = supabase
      .channel('designs-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'designs' }, () => {
        void load();
      })
      .subscribe();
    return () => {
      cancelled = true;
      auth.subscription.unsubscribe();
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

/** Crea un diseño vacío con el tamaño elegido. Devuelve `null` (sin lanzar) si no hay
 * sesión — bajo el bypass de auth de desarrollo eso es el estado normal, y quien llama
 * lo distingue de un error real para mostrar el mensaje correcto. Si hay sesión pero
 * Supabase devuelve error, lanza (igual que updateDesign/deleteDesign) para que quien
 * llama no informe éxito falso. El user_id lo pone RLS/DEFAULT del token. */
export async function createDesign(input: {
  title: string;
  width: number;
  height: number;
}): Promise<Design | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;
  const { data, error } = await supabase
    .from('designs')
    .insert({ user_id: userId, title: input.title, width: input.width, height: input.height })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/** Actualiza campos editables de un diseño y marca updated_at. Lanza si Supabase
 * devuelve error (RLS denegado, fila borrada en paralelo, violación de constraint, etc.)
 * para que quien llama no informe éxito falso. */
export async function updateDesign(
  id: string,
  patch: {
    title?: string;
    background?: DesignBackground;
    /** Documento del diseño. Con el studio (tldraw) es el snapshot completo (objeto);
     * por eso el tipo es `Json` y no `DesignElement[]` como en el editor konva viejo. */
    elements?: Json;
    thumbnail?: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from('designs')
    .update({
      title: patch.title,
      // DesignBackground es una interfaz "cerrada" que no satisface Json
      // estructuralmente (sin index signature); el cast se acota a ese campo para que
      // el resto del payload siga type-checked por el Update generado de Supabase.
      background: patch.background as unknown as Json | undefined,
      elements: patch.elements,
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
