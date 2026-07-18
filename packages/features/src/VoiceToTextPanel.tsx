'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Card } from '@ultrathing/ui';
import { engineClient } from '@ultrathing/api-client';

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Grabar voz → texto. Componente ÚNICO compartido entre escritorio y web (surface: both):
 * graba con MediaRecorder, sube el audio al motor (whisper local + pulido de ortografía)
 * y muestra el texto para copiar.
 */
export function VoiceToTextPanel() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopTracks() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // Limpieza si el componente se desmonta grabando (cambio de pantalla).
  useEffect(() => stopTracks, []);

  async function startRecording() {
    setError(null);
    setText(null);
    setCopied(false);
    setSeconds(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        stopTracks();
        void transcribe(blob);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError('No se pudo acceder al micrófono. Revisa los permisos.');
      stopTracks();
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  async function transcribe(blob: Blob) {
    setLoading(true);
    try {
      const { clean } = await engineClient.voz.transcribe(blob);
      setText(clean);
    } catch {
      setError('No se pudo transcribir. Revisa que el motor esté activo.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  return (
    <div>
      <h2 className="mb-1 font-display text-2xl text-text">Voz a texto</h2>
      <p className="mb-6 text-sm text-text-muted">
        Graba tu voz y conviértela en texto ordenado, listo para copiar.
      </p>

      <Card>
        <div className="flex items-center gap-3">
          {!recording ? (
            <Button onClick={startRecording} disabled={loading}>
              {loading ? 'Transcribiendo…' : '● Grabar'}
            </Button>
          ) : (
            <Button variant="ghost" onClick={stopRecording}>
              ■ Detener
            </Button>
          )}
          {recording && (
            <span className="flex items-center gap-2 text-sm text-text-muted">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--danger)]" />
              Grabando… {fmt(seconds)}
            </span>
          )}
          {loading && <span className="text-sm text-text-muted">Procesando audio…</span>}
        </div>

        {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}

        {text && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-text-muted">Texto</span>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? 'Copiado ✓' : 'Copiar'}
              </Button>
            </div>
            <pre className="whitespace-pre-wrap rounded border border-line bg-elevated p-3 font-sans text-sm text-text">
              {text}
            </pre>
          </div>
        )}
      </Card>
    </div>
  );
}
