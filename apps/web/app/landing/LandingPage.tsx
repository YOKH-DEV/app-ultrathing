'use client';

import Link from 'next/link';
import { cn } from '@ultrathing/ui';
import { PieceCanvas } from './PieceCanvas';
import './landing.css';

function GoldLink({
  href,
  children,
  variant = 'primary',
  size = 'md',
}: {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold',
        variant === 'primary' &&
          'bg-gold text-[var(--on-gold)] shadow-[var(--glow-gold)] hover:bg-gold-bright hover:shadow-[0_0_34px_rgba(229,185,78,0.5)]',
        variant === 'ghost' && 'bg-transparent text-text hover:bg-[var(--glass-strong)]',
        variant === 'outline' &&
          'border border-[var(--glass-border)] bg-[var(--glass-bg)] text-text backdrop-blur-[var(--glass-blur)] hover:border-gold hover:text-gold',
        size === 'sm' && 'h-8 px-3 text-sm',
        size === 'md' && 'h-10 px-4 text-sm',
        size === 'lg' && 'h-12 px-6 text-base',
      )}
    >
      {children}
    </Link>
  );
}

const TOOLS = [
  {
    id: 'diseno',
    name: 'Diseño',
    span: 'lg:col-span-2 lg:row-span-2',
    body: 'Lienzo tipo estudio. Imagen → capas editables, generar pieza con IA, exportar PNG, ZIP o PDF, y renderizar video.',
    play: 'Studio',
  },
  {
    id: 'copy',
    name: 'Copywriter',
    span: '',
    body: 'Brief, tono y formato. El texto sale listo para pegar en la pieza.',
    play: 'IA de texto',
  },
  {
    id: 'voz',
    name: 'Voz a texto',
    span: '',
    body: 'Dictás. Whisper transcribe en tu máquina. El pulido de ortografía es opcional.',
    play: 'Micrófono',
  },
  {
    id: 'ocr',
    name: 'Imagen a texto',
    span: '',
    body: 'Pegá un pantallazo. Gemini lee lo que Tesseract se come: flechas, emojis, carteles.',
    play: 'OCR',
  },
  {
    id: 'descargas',
    name: 'Descargas',
    span: '',
    body: 'URL in, MP3 o MP4 out. El archivo queda en tu disco, no en un bucket ajeno.',
    play: 'yt-dlp',
  },
  {
    id: 'scraper',
    name: 'Scraper + leads',
    span: 'lg:col-span-2',
    body: 'Playwright abre el directorio, extrae nombre / mail / teléfono y lo espeja a tu cuenta por Realtime.',
    play: 'Leads en vivo',
  },
  {
    id: 'archivos',
    name: 'Archivos',
    span: 'lg:col-span-2',
    body: 'PDF con tablas → CSV. Sirve para listados que todavía viven en un informe.',
    play: 'PDF → CSV',
  },
] as const;

/**
 * Primera superficie que ve un visitante. Modo Persuadir.
 * Tesis: UltraThing es el estudio donde se termina una pieza de marketing,
 * no un dashboard con iconos. El hero ES el lienzo.
 */
export function LandingPage() {
  return (
    <div className="ut-landing relative min-h-screen overflow-x-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(900px 520px at 12% -8%, rgba(229,185,78,0.16), transparent 58%),
            radial-gradient(800px 640px at 100% 8%, rgba(70,110,200,0.10), transparent 55%),
            radial-gradient(700px 500px at 50% 100%, rgba(229,185,78,0.06), transparent 60%),
            var(--bg-base)
          `,
        }}
      />

      <header className="sticky top-0 z-30 px-4 pt-4 md:px-8">
        <nav
          className="ut-liquid mx-auto flex max-w-6xl items-center justify-between rounded-full px-4 py-2.5 md:px-5"
          aria-label="Principal"
        >
          <Link href="/" className="font-display text-lg tracking-tight text-text">
            Ultra<span className="text-gold">thing</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm text-[var(--text-muted)] md:flex">
            <a href="#herramientas" className="transition-colors hover:text-gold">
              Herramientas
            </a>
            <a href="#como" className="transition-colors hover:text-gold">
              Cómo entra
            </a>
          </div>
          <div className="flex items-center gap-2">
            <GoldLink href="/entrar" variant="ghost" size="sm">
              Entrar
            </GoldLink>
            <GoldLink href="/entrar?modo=registro" size="sm">
              Crear cuenta
            </GoldLink>
          </div>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-start gap-10 px-4 pb-20 pt-10 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:pt-14">
          <div>
            <h1 className="ut-hero-title font-display text-[clamp(2.4rem,6vw,4.4rem)] font-semibold leading-[0.92] tracking-[-0.032em] text-text">
              Terminá la pieza
              <span className="block text-gold">en una sola mesa.</span>
            </h1>
            <p className="ut-hero-lead mt-6 max-w-[36rem] text-base leading-relaxed text-[var(--text-muted)] md:text-lg">
              UltraThing es el estudio de marketing que corre en tu computadora. Diseñás el
              flyer, le dictás el copy, le sacás el texto a un pantallazo, bajás el video y
              extraés los leads. El trabajo pesado no se va a un servidor.
            </p>
            <div className="ut-hero-cta mt-8 flex flex-wrap items-center gap-3">
              <GoldLink href="/entrar?modo=registro" size="lg">
                Crear cuenta
              </GoldLink>
              <GoldLink href="/entrar" variant="outline" size="lg">
                Ya tengo sesión
              </GoldLink>
            </div>
            <p className="mt-4 text-xs text-[var(--text-faint)]">
              Registro con correo y contraseña. Cada cuenta ve sólo lo suyo.
            </p>
          </div>
          <PieceCanvas />
        </section>

        <section id="herramientas" className="mx-auto max-w-6xl px-4 pb-24 md:px-8">
          <h2 className="max-w-xl font-display text-[clamp(1.7rem,3vw,2.4rem)] leading-[1.05] tracking-[-0.025em]">
            Lo que hace, no lo que promete.
          </h2>
          <p className="mt-3 max-w-xl text-[var(--text-muted)]">
            Ocho herramientas. La misma sesión. El Studio es el centro; el resto alimenta la
            pieza o el listado.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-3">
            {TOOLS.map((tool) => (
              <article
                key={tool.id}
                className={`ut-mosaic-tile flex min-h-[11rem] flex-col justify-between p-5 ${tool.span} ${
                  tool.id === 'diseno' ? 'min-h-[22rem] bg-gold/[0.06]' : ''
                }`}
              >
                <div>
                  <p className="font-display text-xl text-text">{tool.name}</p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                    {tool.body}
                  </p>
                </div>
                <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.16em] text-gold">
                  {tool.play}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="como" className="mx-auto max-w-6xl px-4 pb-24 md:px-8">
          <h2 className="font-display text-[clamp(1.7rem,3vw,2.4rem)] leading-[1.05] tracking-[-0.025em]">
            Llegás. Entrás. Trabajás.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="rounded-[18px] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-6 backdrop-blur-[var(--glass-blur)]">
              <h3 className="font-display text-lg">Crear cuenta</h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Correo y contraseña. La sesión queda en este navegador. No hay código por
                mail en este entorno.
              </p>
            </article>
            <article className="rounded-[18px] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-6 backdrop-blur-[var(--glass-blur)]">
              <h3 className="font-display text-lg">Abrir el panel</h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Diseño, copy, voz, OCR, descargas, archivos, scraper y leads. Cada uno con
                su ruta. Los datos van a tu fila, con RLS.
              </p>
            </article>
            <article className="rounded-[18px] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-6 backdrop-blur-[var(--glass-blur)]">
              <h3 className="font-display text-lg">Motor local</h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Descargas, scraper, PDF, voz, quitar fondo y render de video piden el motor
                en tu máquina (puerto 8787). Copy, OCR y el lienzo viven en el navegador.
              </p>
            </article>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-28 md:px-8">
          <div className="ut-liquid relative overflow-hidden rounded-[28px] px-6 py-12 md:px-12 md:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold/20 blur-3xl"
            />
            <h2 className="relative max-w-xl font-display text-[clamp(1.8rem,3.4vw,2.8rem)] leading-[1.05] tracking-[-0.028em]">
              Si la pieza todavía está en cinco pestañas, esta es la mesa.
            </h2>
            <div className="relative mt-8 flex flex-wrap gap-3">
              <GoldLink href="/entrar?modo=registro" size="lg">
                Crear cuenta
              </GoldLink>
              <GoldLink href="/entrar" variant="outline" size="lg">
                Entrar
              </GoldLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--glass-border)] px-4 py-8 text-center text-xs text-[var(--text-faint)] md:px-8">
        UltraThing · estudio de marketing en el escritorio
      </footer>
    </div>
  );
}
