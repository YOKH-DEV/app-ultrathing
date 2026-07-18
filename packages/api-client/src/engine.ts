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

/** Escucha el progreso de un job por SSE. Devuelve una función para cancelar. */
export function streamJob(id: string, onUpdate: (job: Job) => void): () => void {
  const es = new EventSource(`${BASE}/jobs/${id}/stream`);
  es.onmessage = (e) => onUpdate(Job.parse(JSON.parse(e.data)));
  return () => es.close();
}

/** Formato/tono que acepta el copywriter (deben coincidir con schemas.py del motor). */
export type CopyTone = 'profesional' | 'cercano' | 'persuasivo' | 'divertido';
export type CopyFormat = 'post' | 'anuncio' | 'email' | 'titulares';

/** Opciones de descarga (deben coincidir con schemas.py del downloader). */
export type DownloadFormat = 'mp4' | 'mp3';
export type DownloadQuality = 'mejor' | '2160' | '1440' | '1080' | '720';

/** Cliente tipado del motor. Lo usan el escritorio y la web (el copywriter es surface: both). */
export const engineClient = {
  downloader: {
    start: (url: string, format: DownloadFormat = 'mp4', quality: DownloadQuality = 'mejor') =>
      post<{ job_id: string }>('/modules/downloader/start', { url, format, quality }),
  },
  image: {
    removeBackground: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return postForm<{ job_id: string }>('/modules/image/remove-bg', form);
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
  },
  voz: {
    // Sube audio WAV (Web Audio). `cleanup=false` salta el pulido IA (trozos en vivo, + rápido).
    // `language` (ej. 'es','en') fuerza el idioma; vacío/undefined = autodetectar.
    transcribe: (audio: Blob, cleanup = true, language?: string) => {
      const form = new FormData();
      form.append('file', audio, 'grabacion.wav');
      const params = new URLSearchParams();
      if (!cleanup) params.set('cleanup', 'false');
      if (language) params.set('language', language);
      const q = params.toString() ? `?${params.toString()}` : '';
      return postForm<{ raw: string; clean: string }>(`/modules/voz/transcribe${q}`, form);
    },
  },
};
