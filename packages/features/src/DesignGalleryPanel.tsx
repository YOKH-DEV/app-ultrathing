'use client';

import { useMemo, useState } from 'react';
import {
  Clapperboard,
  GraduationCap,
  Presentation,
  Printer,
  Share2,
  type LucideIcon,
} from 'lucide-react';
import { Button, Card, cn } from '@ultrathing/ui';
import {
  CANVAS_PRESETS,
  DESIGN_TEMPLATES,
  TEMPLATE_CATEGORIES,
  presetById,
  type TemplateCategoryId,
} from '@ultrathing/core';
import { createDesign, deleteDesign, useDesigns } from '@ultrathing/api-client';

const CAT_ICON: Record<TemplateCategoryId, LucideIcon> = {
  redes: Share2,
  video: Clapperboard,
  presentacion: Presentation,
  imprimir: Printer,
  educacion: GraduationCap,
};

/**
 * Galería de Diseño compartida (web + escritorio): categorías, medidas y plantillas
 * listas. `openDesign` navega al editor; el segundo arg es el id de plantilla a montar.
 */
export function DesignGalleryPanel({
  openDesign,
}: {
  openDesign: (id: string, templateId?: string) => void;
}) {
  const { designs, loading } = useDesigns();
  const [category, setCategory] = useState<TemplateCategoryId>('redes');
  const [presetId, setPresetId] = useState<string | 'all'>('all');
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sizes = useMemo(() => CANVAS_PRESETS.filter((p) => p.category === category), [category]);
  const templates = useMemo(
    () =>
      DESIGN_TEMPLATES.filter(
        (t) => t.category === category && (presetId === 'all' || t.presetId === presetId),
      ),
    [category, presetId],
  );

  async function useTemplate(templateId: string) {
    const tpl = DESIGN_TEMPLATES.find((t) => t.id === templateId);
    const preset = tpl ? presetById(tpl.presetId) : undefined;
    if (!tpl || !preset) return;
    setCreating(templateId);
    setError(null);
    try {
      const design = await createDesign({
        title: tpl.title,
        width: preset.width,
        height: preset.height,
      });
      if (!design) {
        setError('No hay sesión activa: los diseños no se pueden guardar.');
        return;
      }
      openDesign(design.id, tpl.kind === 'blank' ? undefined : tpl.id);
    } catch {
      setError('No se pudo crear el diseño. Intentá de nuevo.');
    } finally {
      setCreating(null);
    }
  }

  async function handleNewBlank() {
    const preset =
      (presetId !== 'all' ? sizes.find((s) => s.id === presetId) : undefined) ?? sizes[0] ?? CANVAS_PRESETS[0];
    setCreating('blank');
    setError(null);
    try {
      const design = await createDesign({
        title: 'Diseño sin título',
        width: preset.width,
        height: preset.height,
      });
      if (!design) {
        setError('No hay sesión activa: los diseños no se pueden guardar.');
        return;
      }
      openDesign(design.id);
    } catch {
      setError('No se pudo crear el diseño. Intentá de nuevo.');
    } finally {
      setCreating(null);
    }
  }

  return (
    <div>
      <h2 className="mb-1 font-display text-2xl text-text">Diseño</h2>
      <p className="mb-6 text-sm text-text-muted">
        Elegí categoría y medida, o partí de una plantilla lista.
      </p>

      <div className="-mx-1 flex gap-1 overflow-x-auto pb-3">
        {TEMPLATE_CATEGORIES.map((cat) => {
          const Icon = CAT_ICON[cat.id];
          const on = category === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setCategory(cat.id);
                setPresetId('all');
              }}
              className={cn(
                'flex w-[5.5rem] shrink-0 flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-[11px] font-medium transition-colors',
                on
                  ? 'bg-gold text-[var(--on-gold)]'
                  : 'text-text-muted hover:bg-[var(--glass-strong)] hover:text-text',
              )}
            >
              <span
                className={cn(
                  'grid h-11 w-11 place-items-center rounded-full',
                  on ? 'bg-[var(--on-gold)]/15' : 'bg-elevated',
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              {cat.name}
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPresetId('all')}
          className={cn(
            'h-8 rounded-full px-3 text-xs',
            presetId === 'all' ? 'bg-gold text-[var(--on-gold)]' : 'bg-elevated text-text-muted',
          )}
        >
          Todas las medidas
        </button>
        {sizes.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setPresetId(s.id)}
            className={cn(
              'h-8 rounded-full px-3 text-xs',
              presetId === s.id ? 'bg-gold text-[var(--on-gold)]' : 'bg-elevated text-text-muted',
            )}
          >
            {s.name}
          </button>
        ))}
        <Button size="sm" onClick={() => void handleNewBlank()} disabled={!!creating} className="ml-auto">
          {creating === 'blank' ? 'Creando…' : '+ En blanco'}
        </Button>
      </div>

      {error && <p className="mb-3 text-sm text-[var(--danger)]">{error}</p>}

      <h3 className="mb-3 text-sm text-text-muted">Plantillas</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {templates.map((t) => {
          const preset = presetById(t.presetId);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => void useTemplate(t.id)}
              disabled={!!creating}
              className="group overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-left transition-colors hover:border-gold/60 disabled:opacity-50"
            >
              <div
                className="grid aspect-[4/3] place-items-center text-[11px] font-medium"
                style={{ background: t.swatch, color: t.swatch === '#ffffff' || t.swatch === '#f5efe0' ? '#111' : '#f5efe0' }}
              >
                {preset ? `${preset.width}×${preset.height}` : ''}
              </div>
              <div className="px-3 py-2">
                <p className="truncate text-sm text-text">{creating === t.id ? 'Abriendo…' : t.title}</p>
                <p className="truncate text-[11px] text-text-faint">{preset?.name}</p>
              </div>
            </button>
          );
        })}
      </div>

      <h3 className="mb-3 mt-8 text-sm text-text-muted">Tus diseños</h3>
      {loading ? (
        <p className="text-sm text-text-muted">Cargando…</p>
      ) : designs.length === 0 ? (
        <p className="text-sm text-text-faint">Todavía no hay diseños. Usá una plantilla o creá en blanco.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {designs.map((d) => (
            <Card key={d.id}>
              <button type="button" onClick={() => openDesign(d.id)} className="block w-full text-left">
                <div className="mb-2 grid aspect-video place-items-center overflow-hidden rounded bg-elevated text-xs text-text-faint">
                  {d.thumbnail ? (
                    // Miniatura del studio (data URL).
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.thumbnail} alt={d.title} className="h-full w-full object-contain" />
                  ) : (
                    <span>
                      {d.width}×{d.height}
                    </span>
                  )}
                </div>
                <p className="truncate text-sm text-text">{d.title}</p>
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await deleteDesign(d.id);
                  } catch {
                    setError('No se pudo eliminar el diseño. Intentá de nuevo.');
                  }
                }}
                className="mt-2 text-xs text-text-faint transition-colors hover:text-[var(--danger)]"
              >
                Eliminar
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
