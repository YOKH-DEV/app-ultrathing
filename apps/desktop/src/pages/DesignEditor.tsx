import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@ultrathing/ui';
import { getDesign, updateDesign, type Design } from '@ultrathing/api-client';

/**
 * Editor-shell (Fase 1). Carga el diseño por id y muestra un lienzo VACÍO dimensionado
 * al tamaño del diseño, con título editable y guardar. Prueba el round-trip de
 * persistencia. El lienzo real (react-konva) y los elementos llegan en la Fase 2.
 */
export function DesignEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [design, setDesign] = useState<Design | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getDesign(id).then((d) => {
      setDesign(d);
      setTitle(d?.title ?? '');
      setLoading(false);
      if (!d) setError('No se pudo cargar el diseño (¿sin sesión o no existe?).');
    });
  }, [id]);

  async function handleSave() {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      await updateDesign(id, { title });
      setSavedAt(new Date().toLocaleTimeString());
    } catch {
      setError('No se pudo guardar. Revisa la conexión.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-text-muted">Cargando…</p>;
  if (!design)
    return (
      <div>
        <p className="mb-3 text-sm text-[var(--danger)]">{error ?? 'Diseño no encontrado.'}</p>
        <Button variant="ghost" size="sm" onClick={() => navigate('/diseno')}>
          ← Volver
        </Button>
      </div>
    );

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/diseno')}>
          ← Galería
        </Button>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 rounded border border-line bg-elevated px-3 py-1 text-sm text-text outline-none focus:border-gold"
        />
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
        {savedAt && <span className="text-xs text-text-faint">Guardado {savedAt}</span>}
      </div>

      {error && <p className="mb-3 text-sm text-[var(--danger)]">{error}</p>}

      {/* Lienzo placeholder dimensionado al tamaño del diseño (escalado para caber). */}
      <div className="grid place-items-center rounded border border-line bg-elevated p-6">
        <div
          className="bg-white shadow-glow"
          style={{
            width: Math.min(design.width, 720),
            aspectRatio: `${design.width} / ${design.height}`,
          }}
        />
      </div>
      <p className="mt-2 text-center text-xs text-text-faint">
        Lienzo {design.width}×{design.height} · (los elementos llegan en la próxima fase)
      </p>
    </div>
  );
}
