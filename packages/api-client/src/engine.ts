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

/** Cliente tipado del motor. Solo lo usa el escritorio (surface: desktop). */
export const engineClient = {
  downloader: {
    start: (url: string) => post<{ job_id: string }>('/modules/downloader/start', { url }),
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
};
