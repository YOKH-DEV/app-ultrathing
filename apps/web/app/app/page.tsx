'use client';

import Link from 'next/link';
import { featuresFor } from '@ultrathing/core';
import { JobsCounter } from '../jobs-counter';
import { LeadsList } from '../leads-list';
import '../features';

export default function AppHome() {
  const features = featuresFor('web');

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-3xl tracking-tight">Tu mesa</h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--text-muted)]">
          Elegí una herramienta. Los números de abajo son los tuyos, no un demo.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <JobsCounter />
        <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5 backdrop-blur-[var(--glass-blur)]">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-faint)]">Módulos</p>
          <p className="mt-2 font-display text-3xl text-gold">{features.length}</p>
        </div>
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <Link
            key={f.id}
            href={f.route}
            className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 transition-all hover:border-gold/50 hover:shadow-[var(--glow-gold)]"
          >
            <p className="font-display text-text">{f.name}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{f.description}</p>
          </Link>
        ))}
      </section>

      <div className="mt-8">
        <LeadsList />
      </div>

      <p className="mt-10 text-sm text-[var(--text-faint)]">
        ¿Volvés a la presentación?{' '}
        <Link href="/" className="text-gold hover:underline">
          UltraThing
        </Link>
        <span className="mx-2">·</span>
        <Link href="/app/diseno" className="text-gold hover:underline">
          Abrir Diseño
        </Link>
      </p>
    </div>
  );
}
