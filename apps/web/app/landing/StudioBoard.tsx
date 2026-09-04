'use client';

import { useRef, useState } from 'react';

function Tile({
  kicker,
  title,
  body,
  points,
  play,
  className = '',
}: {
  kicker?: string;
  title: string;
  body?: string;
  points?: readonly string[];
  play?: string;
  className?: string;
}) {
  return (
    <article className={`ut-tile ${className}`}>
      {kicker && <p className="ut-tile-kicker">{kicker}</p>}
      <h3 className="ut-tile-title">{title}</h3>
      {body && <p className="ut-tile-body">{body}</p>}
      {points && (
        <ul className="ut-tile-points">
          {points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {play && <p className="ut-tile-play">{play}</p>}
    </article>
  );
}

function Preview({ kicker, title }: { kicker: string; title: string }) {
  return (
    <article className="ut-tile ut-tile-preview">
      <p className="ut-tile-kicker">{kicker}</p>
      <h3 className="ut-tile-title">{title}</h3>
      <div className="ut-tile-bar" />
      <p className="ut-tile-hint">Listo para guardar en tu cuenta.</p>
    </article>
  );
}

/** Segunda sección: mosaico de herramientas + video de orbes. */
export function StudioBoard() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);

  function toggle() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
  }

  return (
    <section id="herramientas" className="ut-board-wrap">
      <div id="caracteristicas" className="ut-board">
        <div className="ut-board-grid">
          <Tile
            className="ut-span-2"
            kicker="Studio"
            title="El lienzo es el documento."
            body="Subís una imagen, la partís en capas y editás el texto encima. Generás una pieza desde un brief, exportás PNG, ZIP o PDF, y el mismo tablero se puede renderizar a video."
            points={['Imagen → editable', 'Generar pieza con IA', 'Export PNG / ZIP / PDF', 'Preview y render de video']}
          />
          <Preview kicker="Studio" title="Imagen → editable" />

          <Tile title="Copywriter" body="Brief, tono y formato. El texto sale listo para pegar en la pieza." play="IA de texto" />
          <Tile title="Voz a texto" body="Dictás. Whisper transcribe en tu máquina. El pulido de ortografía es opcional." play="Micrófono" />
          <Tile
            className="ut-span-row-2"
            kicker="Inteligencia"
            title="La IA entra a la pieza, no a un chat."
            body="Copy, OCR y voz viven al lado del lienzo. Dictás un párrafo, pegás un pantallazo o reescribís un titular sin saltar de app."
            points={['Copywriter por brief y tono', 'OCR con visión (Gemini)', 'Voz a texto en tu máquina', 'Acciones de texto sobre el canvas']}
          />

          <Tile title="Imagen a texto" body="Pegá un pantallazo. Gemini lee lo que Tesseract se come: flechas, emojis, carteles." play="OCR" />
          <Tile title="Descargas" body="URL in, MP3 o MP4 out. El archivo queda en tu disco, no en un bucket ajeno." play="yt-dlp" />

          <Tile
            className="ut-span-2"
            title="Lo que está afuera, entra a tu mesa."
            body="Bajás el video, convertís el PDF, extraés leads de un directorio. El resultado queda en tu disco y, si hay sesión, en tu fila."
            points={['Descargas MP3 / MP4', 'PDF con tablas → CSV', 'Scraper con Playwright', 'Leads en vivo por Realtime']}
          />
          <Preview kicker="Captura" title="Descargas MP3 / MP4" />
        </div>

        <div className="ut-board-film">
          <video
            ref={videoRef}
            className="ut-board-video"
            src="/hero/orbs.mp4"
            autoPlay
            muted
            loop
            playsInline
            aria-label="UltraThing Black, orbes de oro y mármol"
          />
          <button
            type="button"
            className="ut-board-play"
            onClick={toggle}
            aria-label={paused ? 'Reproducir' : 'Pausar'}
          >
            {paused ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M7 5h4v14H7zm6 0h4v14h-4z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
