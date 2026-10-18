import { NavLink } from 'react-router-dom';
import { featuresFor } from '@ultrathing/core';
import { cn } from '@ultrathing/ui';

interface SidebarProps {
  /** En móvil: si el panel está abierto. En escritorio siempre visible. */
  open?: boolean;
  /** Cerrar el panel (móvil): al tocar el backdrop o navegar. */
  onClose?: () => void;
}

/**
 * Navegación lateral generada desde el registro de features. En escritorio queda fija;
 * en pantallas chicas se comporta como panel deslizable sobre un backdrop.
 */
export function Sidebar({ open = false, onClose }: SidebarProps) {
  const features = featuresFor('desktop');

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
          role="presentation"
        />
      )}
      <aside
        className={cn(
          'z-40 flex w-56 shrink-0 flex-col border-r border-[var(--glass-border)]',
          'bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)]',
          // Escritorio: parte del flujo. Móvil: fijo y deslizable.
          'fixed inset-y-0 left-0 transition-transform duration-200 md:static md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="px-5 py-6">
          <h1 className="font-display text-xl tracking-tight text-text">
            Ultra<span className="text-gold">thing</span>
          </h1>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-gold opacity-80">
            Studio · Open source
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
          {features.map((f) => (
            <NavLink
              key={f.id}
              to={f.route}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'relative rounded-lg px-3 py-2 text-sm transition-all',
                  isActive
                    ? 'bg-[var(--glass-strong)] text-gold shadow-[inset_2px_0_0_var(--gold),var(--glow-gold)]'
                    : 'text-text-muted hover:bg-[var(--glass-strong)] hover:text-text',
                )
              }
            >
              {f.name}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
