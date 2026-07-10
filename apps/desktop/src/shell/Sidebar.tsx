import { NavLink } from 'react-router-dom';
import { featuresFor } from '@ultrathing/core';
import { cn } from '@ultrathing/ui';

/** Navegación lateral generada desde el registro de features. No se escribe a mano. */
export function Sidebar() {
  const features = featuresFor('desktop');

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-surface">
      <div className="px-5 py-6">
        <h1 className="font-display text-xl text-text">
          Ultra<span className="text-gold">thing</span>
        </h1>
        <p className="mt-1 text-xs text-text-faint">Centro de comando</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <NavLink
              key={f.id}
              to={f.route}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-elevated text-gold'
                    : 'text-text-muted hover:bg-elevated hover:text-text',
                )
              }
            >
              <Icon size={18} strokeWidth={1.75} />
              {f.name}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
