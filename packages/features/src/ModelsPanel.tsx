'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card } from '@ultrathing/ui';
import { engineClient, type AiModel, type AiModelsState } from '@ultrathing/api-client';

const EMPTY: AiModelsState = { active_id: null, models: [], fallback: { zai: false, vertex: false } };

/**
 * Conectar cualquier modelo (OpenAI-compatible o JSON de Vertex). Las keys viven
 * en `~/Ultrathing/models.json` en esta máquina, no en el repo ni en Supabase.
 */
export function ModelsPanel() {
  const [state, setState] = useState<AiModelsState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [kind, setKind] = useState<'openai' | 'vertex'>('openai');
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [vertexJson, setVertexJson] = useState('');
  const [project, setProject] = useState('');
  const [location, setLocation] = useState('global');
  const [editingId, setEditingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setState(await engineClient.models.list());
    } catch {
      setError('No se pudo hablar con el motor. Levantá el engine en :8787.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function resetForm() {
    setEditingId(null);
    setName('');
    setKind('openai');
    setBaseUrl('https://api.openai.com/v1');
    setApiKey('');
    setModel('gpt-4o-mini');
    setVertexJson('');
    setProject('');
    setLocation('global');
  }

  function fill(m: AiModel) {
    setEditingId(m.id);
    setName(m.name);
    setKind(m.kind);
    setBaseUrl(m.base_url ?? 'https://api.openai.com/v1');
    setApiKey('');
    setModel(m.model);
    setVertexJson('');
    setProject(m.project ?? '');
    setLocation(m.location ?? 'global');
  }

  function payload() {
    if (kind === 'vertex') {
      let credentials: Record<string, unknown> | undefined;
      if (vertexJson.trim()) {
        credentials = JSON.parse(vertexJson) as Record<string, unknown>;
      }
      return {
        id: editingId ?? undefined,
        name: name.trim() || 'Vertex',
        kind: 'vertex' as const,
        model: model.trim(),
        project: project.trim() || undefined,
        location: location.trim() || 'global',
        credentials,
      };
    }
    return {
      id: editingId ?? undefined,
      name: name.trim() || 'OpenAI',
      kind: 'openai' as const,
      base_url: baseUrl.trim(),
      api_key: apiKey.trim() || undefined,
      model: model.trim(),
    };
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      JSON.stringify(payload());
    } catch {
      setError('El JSON de la cuenta de servicio no es válido.');
      setSaving(false);
      return;
    }
    try {
      await engineClient.models.save(payload());
      setOk('Guardado en esta máquina.');
      resetForm();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setError(null);
    setOk(null);
    try {
      const r = await engineClient.models.test(payload());
      setOk(r.ok ? `Respondió: ${r.preview}` : r.error ?? 'Sin respuesta');
      if (!r.ok) setError(r.error ?? 'Falló la prueba');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo probar.');
    } finally {
      setTesting(false);
    }
  }

  const inputClass =
    'h-10 w-full rounded border border-line bg-elevated px-3 text-sm text-text outline-none focus:border-gold';

  return (
    <div>
      <h2 className="mb-1 font-display text-2xl text-text">Modelos IA</h2>
      <p className="mb-6 max-w-xl text-sm text-text-muted">
        Pegá una API compatible con OpenAI o el JSON de una cuenta de servicio. Queda en{' '}
        <span className="text-text">~/Ultrathing/models.json</span> — no se sube al repo. Copy,
        reescribir texto y generar pieza usan el modelo activo.
      </p>

      {loading ? (
        <p className="text-sm text-text-muted">Cargando…</p>
      ) : (
        <>
          <p className="mb-4 text-xs text-text-faint">
            Respaldo del .env: z.ai {state.fallback.zai ? 'sí' : 'no'} · Vertex {state.fallback.vertex ? 'sí' : 'no'}
            {state.active_id ? ' · hay un modelo activo (manda sobre el .env)' : ' · sin activo, se usa el .env'}
          </p>

          {state.models.length > 0 && (
            <ul className="mb-6 space-y-2">
              {state.models.map((m) => (
                <li key={m.id}>
                  <Card>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm text-text">
                        {m.name}{' '}
                        <span className="text-text-faint">
                          · {m.kind} · {m.model}
                          {m.has_key ? ` · key ${m.key_hint}` : ''}
                        </span>
                      </p>
                      {state.active_id === m.id && (
                        <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-medium text-[var(--on-gold)]">
                          Activo
                        </span>
                      )}
                      <div className="ml-auto flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => fill(m)}>
                          Editar
                        </Button>
                        {state.active_id !== m.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              await engineClient.models.activate(m.id);
                              await refresh();
                            }}
                          >
                            Activar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            await engineClient.models.remove(m.id);
                            await refresh();
                          }}
                        >
                          Quitar
                        </Button>
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}

          <Card>
            <p className="mb-3 font-display text-text">{editingId ? 'Editar modelo' : 'Agregar modelo'}</p>
            <div className="flex flex-col gap-3">
              <input className={inputClass} placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
              <select
                className="h-10 cursor-pointer rounded border border-[var(--gold-deep)] bg-gold px-3 text-sm font-medium text-[var(--on-gold)] outline-none"
                value={kind}
                onChange={(e) => setKind(e.target.value as 'openai' | 'vertex')}
              >
                <option value="openai">API (OpenAI, Groq, Ollama, z.ai…)</option>
                <option value="vertex">JSON de cuenta de servicio (Vertex)</option>
              </select>
              {kind === 'openai' ? (
                <>
                  <input
                    className={inputClass}
                    placeholder="Base URL — https://api.openai.com/v1"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                  />
                  <input
                    className={inputClass}
                    type="password"
                    autoComplete="off"
                    placeholder={editingId ? 'Key (vacío = no cambiar)' : 'API key'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </>
              ) : (
                <>
                  <textarea
                    className="min-h-[8rem] rounded border border-line bg-elevated px-3 py-2 font-mono text-xs text-text outline-none focus:border-gold"
                    placeholder='Pegá el JSON de la service account'
                    value={vertexJson}
                    onChange={(e) => setVertexJson(e.target.value)}
                  />
                  <input
                    className={inputClass}
                    placeholder="Project (opcional si viene en el JSON)"
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                  />
                  <input
                    className={inputClass}
                    placeholder="Location (global)"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </>
              )}
              <input
                className={inputClass}
                placeholder="Nombre del modelo — gpt-4o-mini, llama3.1, zai-org/glm-5-maas…"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void handleSave()} disabled={saving || !model.trim()}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </Button>
                <Button variant="outline" onClick={() => void handleTest()} disabled={testing || !model.trim()}>
                  {testing ? 'Probando…' : 'Probar conexión'}
                </Button>
                {editingId && (
                  <Button variant="ghost" onClick={resetForm}>
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {ok && <p className="mt-3 text-sm text-gold">{ok}</p>}
          {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
        </>
      )}
    </div>
  );
}
