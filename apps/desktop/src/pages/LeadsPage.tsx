import { Card } from '@ultrathing/ui';
import { useLeads } from '@ultrathing/api-client';

/** Base de leads extraídos, en vivo (Realtime). Se llena al usar el Scraper. */
export function LeadsPage() {
  const { leads, loading } = useLeads();

  return (
    <div>
      <h2 className="mb-1 font-display text-2xl text-text">Leads</h2>
      <p className="mb-6 text-sm text-text-muted">
        Contactos guardados. Se actualiza al instante cuando extraes desde el Scraper.
      </p>

      <Card>
        <p className="mb-3 font-display text-text">
          {loading ? 'Cargando…' : `${leads.length} ${leads.length === 1 ? 'lead' : 'leads'}`}
        </p>
        {!loading && leads.length === 0 ? (
          <p className="text-sm text-text-muted">
            Aún no hay leads. Extrae alguno desde el Scraper.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {leads.map((lead) => (
              <li key={lead.id} className="flex flex-wrap gap-x-4 gap-y-1 py-2 text-sm">
                <span className="min-w-40 text-text">{lead.name ?? '—'}</span>
                {lead.email && <span className="text-gold">{lead.email}</span>}
                {lead.phone && <span className="text-text-muted">{lead.phone}</span>}
                <span className="ml-auto max-w-xs truncate text-text-faint">{lead.source}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
