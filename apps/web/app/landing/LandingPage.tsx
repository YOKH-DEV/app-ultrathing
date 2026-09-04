'use client';

import Link from 'next/link';
import { cn } from '@ultrathing/ui';
import { HeroBanner } from './HeroBanner';
import { StudioBoard } from './StudioBoard';
import { SOCIAL } from './social';
import './landing.css';

function GoldLink({
  href,
  children,
  variant = 'primary',
  size = 'md',
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
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
        className,
      )}
    >
      {children}
    </Link>
  );
}

function Pricing() {
  return (
    <section id="planes" className="mx-auto max-w-5xl px-4 pb-24 md:px-8">
      <h2 className="max-w-xl font-display text-[clamp(1.7rem,3vw,2.4rem)] leading-[1.05] tracking-[-0.025em]">
        Gratis para entrar. Premium para el estudio completo.
      </h2>
      <p className="mt-3 max-w-xl text-[var(--text-muted)]">
        Dos caminos. El de $10 abre UltraThing entero y UltraThing Black.
      </p>
      <div className="mt-10 grid items-stretch gap-4 md:grid-cols-2">
        <article className="flex flex-col rounded-[22px] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-8">
          <h3 className="font-display text-xl">Gratis</h3>
          <p className="mt-4 font-display text-4xl tracking-[-0.04em]">$0</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Para conocer el estudio y crear tu cuenta.</p>
          <ul className="mt-8 flex flex-1 flex-col gap-2 text-sm text-text">
            <li>Lienzo y galería de diseños</li>
            <li>Copy, OCR y voz de prueba</li>
            <li>Tu sesión, tus datos, con RLS</li>
          </ul>
          <GoldLink href="/entrar?modo=registro" className="mt-8 w-full" variant="outline">
            Crear cuenta
          </GoldLink>
        </article>

        <article className="ut-plan-featured relative flex flex-col overflow-hidden rounded-[22px] bg-gold p-8 text-[var(--on-gold)] shadow-[var(--glow-gold)]">
          <h3 className="font-display text-xl">Premium</h3>
          <p className="mt-4 font-display text-4xl tracking-[-0.04em]">
            $10<span className="text-lg tracking-normal"> / mes</span>
          </p>
          <p className="mt-1 text-sm opacity-80">Todas las herramientas de UltraThing y UltraThing Black.</p>
          <ul className="mt-8 flex flex-1 flex-col gap-2 text-sm">
            <li>Diseño, copy, voz, OCR, descargas, PDF, scraper y leads</li>
            <li>UltraThing Black: el motor visual de orbes y el estudio completo</li>
            <li>Sin techo de módulos</li>
          </ul>
          <GoldLink href="/entrar?modo=registro" className="ut-plan-featured-cta mt-8 w-full">
            Pasar a Premium
          </GoldLink>
        </article>
      </div>
    </section>
  );
}

function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.7-2.8 5.7-5.5 6 .4.3.8 1 .8 2.1v3.1c0 .3.2.7.8.6A12 12 0 0 0 12 .3z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4.98 3.5A2.5 2.5 0 1 1 0 3.5a2.5 2.5 0 0 1 4.98 0zM.24 8.5h4.7V24H.24zM8.5 8.5h4.5v2.1h.1c.6-1.2 2.1-2.5 4.4-2.5 4.7 0 5.6 3.1 5.6 7.1V24h-4.7v-7.6c0-1.8 0-4.1-2.5-4.1s-2.9 2-2.9 4v7.7H8.5z" />
    </svg>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-[var(--glass-border)] px-4 py-12 md:px-8">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-lg text-text">
            Ultra<span className="text-gold">thing</span>
          </p>
          <p className="mt-2 max-w-sm text-sm text-[var(--text-muted)]">
            Estudio de marketing en el escritorio. Construido por Cristian Henao · YOKH-DEV.
          </p>
        </div>
        <nav className="flex flex-col gap-2 text-sm text-[var(--text-muted)]" aria-label="Pie">
          <a href="#herramientas" className="hover:text-gold">
            Herramientas
          </a>
          <a href="#caracteristicas" className="hover:text-gold">
            Características
          </a>
          <a href="#planes" className="hover:text-gold">
            Planes
          </a>
          <Link href="/entrar" className="hover:text-gold">
            Entrar
          </Link>
        </nav>
        <div>
          <p className="text-sm text-[var(--text-muted)]">Seguime</p>
          <div className="mt-3 flex gap-3">
            <a
              href={SOCIAL.github}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub de YOKH-DEV"
              className="grid h-11 w-11 place-items-center rounded-full border border-[var(--glass-border)] text-text transition-colors hover:border-gold hover:text-gold"
            >
              <GitHubIcon />
            </a>
            <a
              href={SOCIAL.linkedin}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn de Cristian Henao"
              className="grid h-11 w-11 place-items-center rounded-full border border-[var(--glass-border)] text-text transition-colors hover:border-gold hover:text-gold"
            >
              <LinkedInIcon />
            </a>
          </div>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl text-xs text-[var(--text-faint)]">
        UltraThing · YOKH-DEV · el trabajo pesado se queda en tu máquina
      </p>
    </footer>
  );
}

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

      <HeroBanner />

      <main>
        <StudioBoard />

        <Pricing />

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
                Copy, OCR, descargas, scraper, PDF, voz, quitar fondo y el video piden el
                motor en tu máquina (puerto 8787). El lienzo y los leads viven en el
                navegador.
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

      <SiteFooter />
    </div>
  );
}
