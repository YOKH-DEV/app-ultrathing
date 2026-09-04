'use client';

import Link from 'next/link';

const MEDALS = [
  { href: '#herramientas', label: 'Imagen a texto' },
  { href: '#herramientas', label: 'Descargas' },
  { href: '#herramientas', label: 'Archivos' },
  { href: '#caracteristicas', label: 'Diseño' },
  { href: '#herramientas', label: 'Copywriter' },
  { href: '#herramientas', label: 'Voz a texto' },
] as const;

/**
 * Primera pantalla: réplica del mock (negro, Anaktoria, ángeles, medallones).
 */
export function HeroBanner() {
  return (
    <div className="ut-hero">
      <header className="ut-hero-bar">
        <nav className="ut-hero-nav" aria-label="Principal">
          <Link href="/" className="ut-hero-mark">
            ULTRATHING
          </Link>
          <div className="ut-hero-links">
            <a href="#herramientas">Herramientas</a>
            <a href="#caracteristicas">Características</a>
            <a href="#planes">Planes</a>
          </div>
          <div className="ut-hero-actions">
            <Link href="/entrar" className="ut-hero-entrar">
              Entrar
            </Link>
            <Link href="/entrar?modo=registro" className="ut-hero-crear">
              Crear cuenta
            </Link>
          </div>
        </nav>
      </header>

      <section className="ut-hero-stage">
        <img
          src="/hero/angels.jpg"
          alt=""
          className="ut-hero-angels"
        />

        <div className="ut-hero-copy">
          <h1 className="ut-hero-title">ULTRATHING</h1>
          <p className="ut-hero-lead">
            Herramientas poderosas de diseño y marketing en un solo lugar, potenciando tus
            habilidades y desempeño
          </p>
          <Link href="/entrar?modo=registro" className="ut-hero-iniciar">
            INICIAR
          </Link>
        </div>

        <nav className="ut-hero-medals" aria-label="Módulos">
          <img
            src="/hero/medallions.png"
            srcSet="/hero/medallions.png 1200w, /hero/medallions@2x.png 2400w"
            sizes="(min-width: 768px) min(78vw, 1040px), calc(100vw - 1.8rem)"
            alt=""
            className="ut-hero-medals-img"
            decoding="async"
          />
          <div className="ut-hero-medals-map">
            {MEDALS.map((m) => (
              <a key={m.label} href={m.href} aria-label={m.label}>
                <span className="sr-only">{m.label}</span>
              </a>
            ))}
          </div>
        </nav>
      </section>
    </div>
  );
}
