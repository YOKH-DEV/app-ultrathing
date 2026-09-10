import { Job } from '@ultrathing/core';
import { supabase } from './supabase';

const BASE = 'http://127.0.0.1:8787';

async function post<T>(path: string, body: unknown): Promise<T> {
  // El motor recibe el token del usuario para persistir el resultado a su nombre.
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Engine ${res.status}`);
  return res.json() as Promise<T>;
}

async function postForm<T>(path: string, form: FormData): Promise<T> {
  // Igual que `post`, pero para subir archivos (multipart). No fija content-type:
  // el navegador pone el boundary correcto solo.
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: form });
  if (!res.ok) throw new Error(`Engine ${res.status}`);
  return res.json() as Promise<T>;
}

async function request<T>(path: string, method: 'GET' | 'DELETE'): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method, headers });
  if (!res.ok) throw new Error(`Engine ${res.status}`);
  return res.json() as Promise<T>;
}

/** Una fila del historial local de descargas. */
export interface DownloadHistoryItem {
  title: string;
  platform: string;
  format: DownloadFormat;
  ext: string;
  duration: number | null;
  at: string;
}

/** Escucha el progreso de un job por SSE. Devuelve una función para cancelar. */
export function streamJob(id: string, onUpdate: (job: Job) => void): () => void {
  const es = new EventSource(`${BASE}/jobs/${id}/stream`);
  let terminal = false;
  const finish = (job?: Job) => {
    if (terminal) return;
    terminal = true;
    es.close();
    if (job) onUpdate(job);
  };
  es.onmessage = (e) => {
    const job = Job.parse(JSON.parse(e.data));
    onUpdate(job);
    if (job.status === 'done' || job.status === 'error') finish();
  };
  es.onerror = () => {
    finish(
      Job.parse({
        id,
        module: 'unknown',
        status: 'error',
        progress: 0,
        result: null,
        error: 'Se cortó la conexión con el motor.',
      }),
    );
  };
  return () => finish();
}

/** Un objeto editable extraído por el tracer (coincide con schemas.py del motor).
 * Coordenadas en px de la imagen fuente; el studio las traduce a shapes del lienzo. */
export interface TracedElement {
  kind: 'text' | 'rect' | 'ellipse' | 'image';
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string | null;
  font_size?: number | null;
  color?: string | null;
  fill?: string | null;
  src?: string | null;
  // Enfoque no destructivo (overlay): un texto del tracer no se pinta hasta editarse,
  // así se ve el original. `patch`/`bg_color` tapan la zona al editar.
  overlay?: boolean | null;
  bg_color?: string | null;
  patch?: string | null;
  font_family?: string | null;
  font_weight?: number | null;
}

/** Resultado de descomponer una imagen en objetos editables. */
export interface TraceResult {
  width: number;
  height: number;
  background: string | null;
  palette: string[];
  elements: TracedElement[];
  count: number;
}

/** Formato/tono que acepta el copywriter (deben coincidir con schemas.py del motor). */
export type CopyTone = 'profesional' | 'cercano' | 'persuasivo' | 'divertido';
export type CopyFormat = 'post' | 'anuncio' | 'email' | 'titulares';
/** Acciones rápidas de IA sobre un texto ya existente (coincide con schemas.py). */
export type RewriteAction =
  | 'acortar'
  | 'alargar'
  | 'profesional'
  | 'persuasivo'
  | 'corregir'
  | 'traducir_en';

/** Opciones de descarga (deben coincidir con schemas.py del downloader). */
export type DownloadFormat = 'mp4' | 'mp3';
export type DownloadQuality = 'mejor' | '2160' | '1440' | '1080' | '720';

/** Un modelo de IA configurado en esta máquina (`~/Ultrathing/models.json`). */
export interface AiModel {
  id: string;
  name: string;
  kind: 'openai' | 'vertex';
  model: string;
  base_url?: string | null;
  has_key?: boolean;
  key_hint?: string | null;
  project?: string | null;
  location?: string | null;
  has_credentials?: boolean;
}

export interface AiModelInput {
  id?: string;
  name: string;
  kind: 'openai' | 'vertex';
  model: string;
  base_url?: string;
  api_key?: string;
  project?: string;
  location?: string;
  credentials?: Record<string, unknown>;
}

export interface AiModelsState {
  active_id: string | null;
  models: AiModel[];
  fallback: { zai: boolean; vertex: boolean };
}

/** Cliente tipado del motor. Lo usan el escritorio y la web (el copywriter es surface: both). */
export const engineClient = {
  downloader: {
    start: (
      url: string,
      format: DownloadFormat = 'mp4',
      quality: DownloadQuality = 'mejor',
      dest?: string,
    ) => post<{ job_id: string }>('/modules/downloader/start', { url, format, quality, dest }),
    history: () => request<DownloadHistoryItem[]>('/modules/downloader/history', 'GET'),
    clearHistory: () => request<{ status: string }>('/modules/downloader/history', 'DELETE'),
  },
  image: {
    removeBackground: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return postForm<{ job_id: string }>('/modules/image/remove-bg', form);
    },
    // Versión síncrona para el editor: devuelve el PNG sin fondo como dataURL,
    // sin job ni persistencia (ver /modules/image/remove-bg-inline del motor).
    removeBackgroundInline: (blob: Blob) => {
      const form = new FormData();
      form.append('file', blob, 'imagen.png');
      return postForm<{ image: string }>('/modules/image/remove-bg-inline', form);
    },
  },
  files: {
    pdfToCsv: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return postForm<{ job_id: string }>('/modules/files/pdf-to-csv', form);
    },
  },
  scraper: {
    start: (url: string) => post<{ job_id: string }>('/modules/scraper/start', { url }),
  },
  copywriter: {
    // Petición corta: devuelve el copy directo, sin job system (ver router.py del motor).
    generate: (brief: string, tone: CopyTone, format: CopyFormat) =>
      post<{ text: string }>('/modules/copywriter/generate', { brief, tone, format }),
    // Acción rápida de IA sobre un texto existente (acortar, tono, traducir…).
    rewrite: (text: string, action: RewriteAction) =>
      post<{ text: string }>('/modules/copywriter/rewrite', { text, action }),
  },
  ocr: {
    // Sube una imagen (pantallazo o foto) y devuelve el texto detectado.
    extract: (image: Blob) => {
      const form = new FormData();
      form.append('file', image, 'imagen.png');
      return postForm<{ text: string }>('/modules/ocr/extract', form);
    },
  },
  tracer: {
    // Sube una imagen y la descompone en objetos editables (texto/fondo/paleta).
    // Job + SSE (varios segundos); el `result` es un TraceResult.
    decompose: (image: Blob) => {
      const form = new FormData();
      form.append('file', image, 'imagen.png');
      return postForm<{ job_id: string }>('/modules/tracer/decompose', form);
    },
  },
  design: {
    // Genera una pieza gráfica editable desde un brief (la IA emite los elementos).
    // Devuelve un TraceResult (mismo formato que el tracer) para montar en el lienzo.
    generate: (brief: string, width: number, height: number) =>
      post<TraceResult>('/modules/design/generate', { brief, width, height }),
  },
  video: {
    // Renderiza los elementos del lienzo como mp4 (Remotion). Job + SSE.
    render: (elements: TracedElement[], background: string, width: number, height: number) =>
      post<{ job_id: string }>('/modules/video/render', { elements, background, width, height }),
  },
  imagegen: {
    // Genera una imagen desde un prompt (Gemini en Vertex). Devuelve dataURL PNG.
    generate: (prompt: string) =>
      post<{ image: string }>('/modules/imagegen/generate', { prompt }),
  },
  models: {
    list: () => request<AiModelsState>('/modules/models', 'GET'),
    save: (body: AiModelInput) => post<AiModel>('/modules/models', body),
    activate: (id: string) => post<{ status: string }>(`/modules/models/${id}/activate`, {}),
    remove: (id: string) => request<{ status: string }>(`/modules/models/${id}`, 'DELETE'),
    test: (body: AiModelInput) =>
      post<{ ok: boolean; preview?: string; error?: string }>('/modules/models/test', body),
  },
  voz: {
    // Sube audio WAV (Web Audio). `cleanup=false` salta el pulido IA (trozos en vivo).
    // `language` fuerza el idioma; `tier` (rapido/equilibrado/preciso) elige el modelo.
    transcribe: (audio: Blob, cleanup = true, language?: string, tier?: string) => {
      const form = new FormData();
      form.append('file', audio, 'grabacion.wav');
      const params = new URLSearchParams();
      if (!cleanup) params.set('cleanup', 'false');
      if (language) params.set('language', language);
      if (tier) params.set('tier', tier);
      const q = params.toString() ? `?${params.toString()}` : '';
      return postForm<{ raw: string; clean: string }>(`/modules/voz/transcribe${q}`, form);
    },
  },
};
