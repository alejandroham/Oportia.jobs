import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search } from 'lucide-react';
import { OpiAvatar } from './ui/OpiAvatar';

/**
 * 1.6.4 (DT-13): página para direcciones que no existen. Antes cualquier ruta desconocida
 * redirigía a Inicio sin avisar; ahora se explica y la URL no cambia.
 */
export const NotFoundPage: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    const previous = document.title;
    document.title = 'Página no encontrada — Oportia Jobs IA';
    return () => {
      document.title = previous;
    };
  }, []);
  return (
    <section aria-labelledby="not-found-title" className="max-w-lg mx-auto py-10 text-center space-y-5">
      <OpiAvatar expression="pensando" size={96} decorative className="mx-auto" />
      <div className="space-y-2">
        <h1 id="not-found-title" className="text-xl font-bold text-gray-900 dark:text-white">No encontramos esta página</h1>
        <p className="text-sm text-ink-muted dark:text-ink-200">
          La dirección <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-ink-raised text-xs break-all">{pathname}</code> no existe
          o cambió. Puedes seguir desde aquí:
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          to="/"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:outline-none"
        >
          <Home className="w-4 h-4" aria-hidden="true" /> Ir a Inicio
        </Link>
        <Link
          to="/empleos"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-2xl border border-gray-200 dark:border-ink-border text-ink dark:text-gray-200 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-ink-raised transition focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:outline-none"
        >
          <Search className="w-4 h-4" aria-hidden="true" /> Buscar empleo
        </Link>
      </div>
    </section>
  );
};
