'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Card } from '@ultrathing/ui';
import { engineClient } from '@ultrathing/api-client';

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Codifica muestras PCM (mono, float) a un WAV de 16-bit. Evita depender de
 * MediaRecorder, que WebKitGTK (escritorio en Linux) no soporta. */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Grabar voz → texto. Componente ÚNICO compartido entre escritorio y web (surface: both):
 * captura audio con Web Audio API (getUserMedia + ScriptProcessor), lo codifica a WAV,
 * lo sube al motor (whisper local + pulido de ortografía) y muestra el texto para copiar.
 */
export function VoiceToTextPanel() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function teardown() {
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    void ctxRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    processorRef.current = null;
    sourceRef.current = null;
    ctxRef.current = null;
    streamRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // Limpieza si el componente se desmonta grabando (cambio de pantalla).
  useEffect(() => teardown, []);

  async function startRecording() {
    setError(null);
    setText(null);
    setCopied(false);
    setSeconds(0);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('El micrófono no está disponible en este entorno.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      chunksRef.current = [];

      processor.onaudioprocess = (e) => {
        chunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      source.connect(processor);
      processor.connect(ctx.destination);

      setRecording(true);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e) {
      const err = e as DOMException;
      setError(`Micrófono: ${err.name ?? 'Error'} — ${err.message ?? ''}`);
      teardown();
    }
  }

  function stopRecording() {
    setRecording(false);
    const sampleRate = ctxRef.current?.sampleRate ?? 44100;
    const chunks = chunksRef.current;
    teardown();

    const total = chunks.reduce((n, c) => n + c.length, 0);
    if (total === 0) {
      setError('No se capturó audio. Intenta de nuevo.');
      return;
    }
    const merged = new Float32Array(total);
    let at = 0;
    for (const c of chunks) {
      merged.set(c, at);
      at += c.length;
    }
    void transcribe(encodeWav(merged, sampleRate));
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
