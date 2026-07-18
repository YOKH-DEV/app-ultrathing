'use client';

import Link from 'next/link';
import { StatCard, Button } from '@ultrathing/ui';
import { featuresFor } from '@ultrathing/core';
import { signOut, type Session } from '@ultrathing/api-client';
import { JobsCounter } from './jobs-counter';
import { LeadsList } from './leads-list';

/** Panel de solo lectura. Muestra métricas; el "Jobs activos" es en vivo. */
export function Dashboard({ session }: { session: Session | null }) {
  const webFeatures = featuresFor('web');
  return (
    <main className="min-h-screen bg-base p-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-text">
          Ultra<span className="text-gold">thing</span> · Panel
        </h1>
        <div className="flex items-center gap-3">
          <Link href="/copywriter">
            <Button variant="ghost" size="sm">
              Copywriter
            </Button>
          </Link>
          {session && (
            <>
              <span className="text-sm text-text-faint">{session.user.email}</span>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                Salir
              </Button>
            </>
          )}
        </div>
      </header>
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Descargas" value="128" hint="este mes" />
        <StatCard label="Leads" value="3,204" hint="+412 nuevos" />
        <JobsCounter />
        <StatCard label="Módulos" value={String(webFeatures.length)} />
      </section>
      <LeadsList />
    </main>
  );
}
