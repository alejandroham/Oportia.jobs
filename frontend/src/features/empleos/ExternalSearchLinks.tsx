import React from 'react';
import { ExternalLink } from 'lucide-react';
import { normalizeText } from '../../utils/searchText';

/**
 * "Buscar también en": abre la búsqueda en el propio sitio de cada portal, con tus mismos términos.
 * Oportia no lee ni copia nada de estos sitios: tú navegas en ellos. Si encuentras una oferta,
 * copia su texto y usa "Importar oferta → Pegar texto".
 */
const slug = (t: string) => normalizeText(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function externalSearchUrls(term: string, region?: string) {
  const q = encodeURIComponent(term.trim());
  const where = encodeURIComponent((region || 'Chile').replace(/^Región( de| del)?\s*/i, ''));
  return [
    { name: 'Indeed', url: `https://cl.indeed.com/jobs?q=${q}&l=${where}` },
    { name: 'Computrabajo', url: `https://cl.computrabajo.com/trabajo-de-${slug(term)}` },
    { name: 'Laborum', url: `https://www.laborum.cl/empleos-busqueda-${slug(term)}.html` },
    { name: 'LinkedIn', url: `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${where}` },
    { name: 'Bolsa Nacional de Empleo', url: 'https://www.bne.cl/' }
  ];
}

export const ExternalSearchLinks: React.FC<{ term: string; region?: string; onPasteOffer: () => void }> = ({ term, region, onPasteOffer }) => {
  if (!term.trim()) return null;
  return (
    <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-gray-200 dark:border-ink-border bg-white dark:bg-ink-surface text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-ink dark:text-white">Buscar también «{term.trim()}» en:</span>
        {externalSearchUrls(term, region).map((l) => (
          <a
            key={l.name}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 min-h-[32px] px-2.5 rounded-lg border border-gray-300 dark:border-ink-line font-semibold text-ink dark:text-white hover:bg-gray-50 dark:hover:bg-ink-hover"
          >
            {l.name} <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        ))}
      </div>
      <p className="text-ink-muted dark:text-ink-200">
        Se abre en el sitio de cada portal. ¿Te gustó una oferta? Copia su texto y{' '}
        <button type="button" onClick={onPasteOffer} className="underline font-semibold text-brand-700 dark:text-brand-300 cursor-pointer">
          pégalo en Oportia
        </button>{' '}
        para evaluar tu compatibilidad y adaptar tu CV.
      </p>
    </div>
  );
};
