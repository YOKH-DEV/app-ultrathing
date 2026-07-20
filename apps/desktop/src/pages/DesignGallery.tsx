import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@ultrathing/ui';
import { CANVAS_PRESETS, type CanvasPreset } from '@ultrathing/core';
import { useDesigns, createDesign, deleteDesign } from '@ultrathing/api-client';

/** Galería de diseños del usuario: crear (con preset de tamaño), abrir y eliminar. */
export function DesignGallery() {
  const { designs, loading } = useDesigns();
  const navigate = useNavigate();
  const [preset, setPreset] = useState<CanvasPreset>(CANVAS_PRESETS[0]);
  const [creating, setCreating] = useState(false);

  async function handleNew() {
    setCreating(true);
    const design = await createDesign({
      title: 'Diseño sin título',
      width: preset.width,
      height: preset.height,
    });
    setCreating(false);
    if (design) navigate(`/diseno/${design.id}`);
  }

  return (
    <div>
      <h2 className="mb-1 font-display text-2xl text-text">Diseño</h2>
      <p className="mb-6 text-sm text-text-muted">Crea piezas gráficas en un lienzo.</p>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-text-muted">Nuevo diseño:</span>
          <select
            value={preset.id}
            onChange={(e) =>
              setPreset(CANVAS_PRESETS.find((p) => p.id === e.target.value) ?? CANVAS_PRESETS[0])
            }
            className="rounded border border-line bg-gold px-2 py-1 text-sm text-[var(--on-gold)]"
          >
            {CANVAS_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={handleNew} disabled={creating}>
            {creating ? 'Creando…' : '+ Crear'}
          </Button>
        </div>
      </Card>

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-text-muted">Cargando…</p>
        ) : designs.length === 0 ? (
          <p className="text-sm text-text-faint">Aún no tienes diseños. Crea el primero arriba.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {designs.map((d) => (
              <Card key={d.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/diseno/${d.id}`)}
                  className="block w-full text-left"
                >
                  <div className="mb-2 grid aspect-video place-items-center rounded bg-elevated text-xs text-text-faint">
                    {d.width}×{d.height}
                  </div>
                  <p className="truncate text-sm text-text">{d.title}</p>
                </button>
                <button
                  type="button"
                  onClick={() => deleteDesign(d.id)}
                  className="mt-2 text-xs text-text-faint transition-colors hover:text-[var(--danger)]"
                >
                  Eliminar
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
