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

const FLUSH_MS = 1500; // cada cuánto se manda un trozo al motor: corto = casi en vivo

const LANGS: { value: string; label: string }[] = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' },
  { value: 'fr', label: 'Français' },
  { value: 'it', label: 'Italiano' },
  { value: '', label: 'Detectar' },
];

const selectClass =
  'h-9 cursor-pointer rounded border border-[var(--gold-deep)] bg-gold px-2 text-sm font-medium text-[var(--on-gold)] outline-none focus:border-[var(--gold-bright)]';

/**
 * Dictado por voz → texto EN VIVO. Componente único compartido (surface: both):
 * captura audio con Web Audio API y, mientras grabas, manda trozos al motor
 * (whisper local) y va agregando el texto a un área editable. Puedes escribir,
 * borrar o corregir el texto en cualquier momento.
 */
export function VoiceToTextPanel() {
  const [text, setText] = useState('');
  const [lang, setLang] = useState('es');
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const bufferRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef(44100);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingRef = useRef(0);
  const langRef = useRef(lang);
  langRef.current = lang; // el trozo en vivo lee siempre el idioma actual

  function stopAudioNodes() {
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    void ctxRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    processorRef.current = null;
    sourceRef.current = null;
    ctxRef.current = null;
    streamRef.current = null;
    if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    if (secTimerRef.current) clearInterval(secTimerRef.current);
    flushTimerRef.current = null;
    secTimerRef.current = null;
  }

  // Limpieza si el componente se desmonta grabando.
  useEffect(() => stopAudioNodes, []);

  function appendText(chunk: string) {
    const t = chunk.trim();
    if (!t) return;
    setText((prev) => (prev ? `${prev.replace(/\s*$/, '')} ${t}` : t));
  }

  // Toma el audio acumulado, lo encola (en orden) y lo manda al motor.
  function flushBuffer(isFinal: boolean) {
    const chunks = bufferRef.current;
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const minSamples = sampleRateRef.current * 0.6; // ignora trozos <0.6s salvo el final
    if (total === 0 || (!isFinal && total < minSamples)) return queueRef.current;

    bufferRef.current = [];
    const merged = new Float32Array(total);
    let at = 0;
    for (const c of chunks) {
      merged.set(c, at);
      at += c.length;
    }
    const blob = encodeWav(merged, sampleRateRef.current);

    pendingRef.current += 1;
    setBusy(true);
    queueRef.current = queueRef.current.then(async () => {
      try {
        // fast=true → modelo ligero (tiny) para que el dictado vaya casi en tiempo real.
        const { clean } = await engineClient.voz.transcribe(
          blob,
          false,
          langRef.current || undefined,
          true,
        );
        appendText(clean);
      } catch {
        // Un trozo fallido no corta el dictado; se sigue con el siguiente.
      } finally {
        pendingRef.current -= 1;
        if (pendingRef.current === 0) setBusy(false);
      }
    });
    return queueRef.current;
  }

  async function startRecording() {
    setError(null);
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
      sampleRateRef.current = ctx.sampleRate;
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      bufferRef.current = [];

      processor.onaudioprocess = (e) => {
        bufferRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      source.connect(processor);
      processor.connect(ctx.destination);

      setRecording(true);
      secTimerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      flushTimerRef.current = setInterval(() => flushBuffer(false), FLUSH_MS);
    } catch (e) {
      const err = e as DOMException;
      setError(`Micrófono: ${err.name ?? 'Error'} — ${err.message ?? ''}`);
      stopAudioNodes();
    }
  }

  function stopRecording() {
    setRecording(false);
    flushBuffer(true); // manda lo que quede del audio
    stopAudioNodes();
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
        Habla y el texto aparece abajo en vivo. Puedes editarlo, borrar o escribir.
      </p>

      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          {!recording ? (
            <Button onClick={startRecording}>● Grabar</Button>
          ) : (
            <Button variant="ghost" onClick={stopRecording}>
              ■ Detener
            </Button>
          )}
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            disabled={recording}
            title="Idioma del dictado"
            className={selectClass}
          >
            {LANGS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
          {recording && (
            <span className="flex items-center gap-2 text-sm text-text-muted">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--danger)]" />
              Grabando… {fmt(seconds)}
            </span>
          )}
          {busy && <span className="text-sm text-text-faint">transcribiendo…</span>}
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setText('')} disabled={!text}>
              Limpiar
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCopy} disabled={!text}>
              {copied ? 'Copiado ✓' : 'Copiar'}
            </Button>
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-[var(--danger)]">{error}</p>}

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setCopied(false);
          }}
          placeholder="Aquí aparecerá tu dictado… (también puedes escribir a mano)"
          className="h-72 w-full resize-y overflow-auto whitespace-pre-wrap break-words rounded border border-line bg-elevated p-3 text-sm leading-relaxed text-text outline-none focus:border-gold"
        />
      </Card>
    </div>
  );
}
