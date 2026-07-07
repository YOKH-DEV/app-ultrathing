import { StatCard } from '@ultrathing/ui';
import { featuresFor } from '@ultrathing/core';

// La web es un dashboard de solo lectura: muestra datos, no ejecuta trabajo pesado.
export default function Dashboard() {
  const webFeatures = featuresFor('web');
  return (
    <main className="min-h-screen bg-base p-8">
      <h1 className="mb-6 font-display text-2xl text-text">
        Ultra<span className="text-gold">thing</span> · Panel
      </h1>
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Descargas" value="128" hint="este mes" />
        <StatCard label="Leads" value="3,204" hint="+412 nuevos" />
        <StatCard label="Jobs activos" value="2" />
        <StatCard label="Módulos" value={String(webFeatures.length)} />
      </section>
    </main>
  );
}
