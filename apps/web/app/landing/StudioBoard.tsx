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

/** Segunda sección: mosaico de herramientas + still de orbes superpuesto. */
export function StudioBoard() {
  return (
    <section id="herramientas" className="ut-board-wrap">
      <div id="caracteristicas" className="ut-board">
        <div className="ut-board-grid">
          <Tile
            className="ut-span-2"
            kicker="Studio"
            title="El lienzo es el documento."
            body="Subís una imagen, la partís en capas y editás el texto encima. Generás una pieza desde un brief, exportás PNG, ZIP o PDF, y el mismo tablero se puede renderizar a video."
            points={[
              'Imagen → editable',
              'Generar pieza con IA',
              'Export PNG / ZIP / PDF',
              'Preview y render de video',
            ]}
          />
          <Preview kicker="Studio" title="Imagen → editable" />

          <Tile
            title="Copywriter"
            body="Brief, tono y formato. El texto sale listo para pegar en la pieza."
            play="IA de texto"
          />
          <Tile
            title="Voz a texto"
            body="Dictás. Whisper transcribe en tu máquina. El pulido de ortografía es opcional."
            play="Micrófono"
          />
          <Tile
            className="ut-span-row-2"
            kicker="Inteligencia"
            title="Tu modelo entra al trabajo, no a otro chat."
            body="Conectá OpenAI, Groq, Ollama, z.ai u otro proveedor OpenAI-compatible, o usá Vertex. El modelo activo alimenta el copywriter, la generación de diseño y el pulido de la transcripción."
            points={[
              'Copywriter por brief y tono',
              'Generación de diseño',
              'Pulido de transcripciones',
              'OCR con integración de visión',
            ]}
          />

          <Tile
            title="Imagen a texto"
            body="Pegá un pantallazo. Gemini lee lo que Tesseract se come: flechas, emojis, carteles."
            play="OCR"
          />
          <Tile
            title="Descargas"
            body="URL in, MP3 o MP4 out. El archivo queda en tu disco, no en un bucket ajeno."
            play="yt-dlp"
          />

          <Tile
            className="ut-span-2"
            title="Lo que está afuera, entra a tu mesa."
            body="Bajás el video, convertís el PDF, extraés leads de un directorio. El resultado queda en tu disco y, si hay sesión, en tu fila."
            points={[
              'Descargas MP3 / MP4',
              'PDF con tablas → CSV',
              'Scraper con Playwright',
              'Leads en vivo por Realtime',
            ]}
          />
          <Preview kicker="Captura" title="Descargas MP3 / MP4" />
        </div>

        <div className="ut-board-film" aria-hidden>
          <img src="/hero/orbs.webp" alt="" className="ut-board-orbs" />
        </div>
      </div>
    </section>
  );
}
