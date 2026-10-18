'use client';

import { useLeads } from '@ultrathing/api-client';

/** Lista de leads en vivo. Se llena sola por Realtime cuando el escritorio extrae. */
export function LeadsList() {
  const { leads, loading } = useLeads();

  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-lg text-text">
        Leads <span className="text-text-faint">· {loading ? '…' : leads.length}</span>
      </h2>
      {!loading && leads.length === 0 ? (
        <p className="text-sm text-text-muted">
          Todavía no hay leads. Extraé alguno desde Scraper y aparece acá al instante.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-elevated text-text-faint">
              <tr>
                <th className="px-3 py-2 font-medium">Nombre</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Teléfono</th>
                <th className="px-3 py-2 font-medium">Fuente</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t border-line">
                  <td className="px-3 py-2 text-text">{lead.name ?? '—'}</td>
                  <td className="px-3 py-2 text-gold">{lead.email ?? '—'}</td>
                  <td className="px-3 py-2 text-text-muted">{lead.phone ?? '—'}</td>
                  <td className="max-w-xs truncate px-3 py-2 text-text-faint">{lead.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
