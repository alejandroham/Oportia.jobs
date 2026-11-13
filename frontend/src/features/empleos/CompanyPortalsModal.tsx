import React from 'react';
import { Search, ExternalLink } from 'lucide-react';
import type { CandidateProfile } from '../../types';
import { Dialog } from '../../components/ui/Dialog';

interface CompanyPortalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: CandidateProfile | null;
}

export const CompanyPortalsModal: React.FC<CompanyPortalsModalProps> = ({
  isOpen,
  onClose,
  profile
}) => {
  const targetRole = profile?.primary_profession || profile?.headline || 'Desarrollador';

  const portalDorks = [
    {
      platform: 'Greenhouse',
      description: 'Ofertas publicadas directamente en boards.greenhouse.io en Chile',
      query: `site:boards.greenhouse.io "${targetRole}" ("Chile" OR "Santiago" OR "Remote")`
    },
    {
      platform: 'Lever',
      description: 'Ofertas en jobs.lever.co para Chile o Remoto',
      query: `site:jobs.lever.co "${targetRole}" ("Chile" OR "Santiago" OR "Remote")`
    },
    {
      platform: 'BambooHR',
      description: 'Portales de empresas medianas e internacionales en bamboohr.com',
      query: `site:bamboohr.com/careers "${targetRole}" ("Chile" OR "Remote")`
    },
    {
      platform: 'Workday',
      description: 'Grandes corporaciones y bancos con portales myworkdayjobs.com',
      query: `site:myworkdayjobs.com "${targetRole}" ("Chile" OR "Santiago")`
    },
    {
      platform: 'Workable',
      description: 'Startups y scaleups en apply.workable.com',
      query: `site:apply.workable.com "${targetRole}" ("Chile" OR "Remote")`
    }
  ];

  const handleRunSearch = (query: string) => {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Búsqueda en portales de empresas"
      description="Encuentra vacantes ocultas buscando directamente en los sistemas de selección (ATS) de empresas con presencia en Chile:"
      maxWidth="lg"
    >
      <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
        {portalDorks.map((dork) => (
          <div
            key={dork.platform}
            className="p-3.5 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200/80 dark:border-zinc-700/60 flex items-center justify-between gap-3 text-xs"
          >
            <div className="space-y-0.5 min-w-0">
              <span className="font-bold text-ink dark:text-gray-100 block">
                {dork.platform}
              </span>
              <p className="text-ink-muted text-xs truncate">
                {dork.description}
              </p>
              <code className="text-xs text-ink-muted font-mono block truncate">
                {dork.query}
              </code>
            </div>

            <button
              type="button"
              onClick={() => handleRunSearch(dork.query)}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-brand hover:bg-brand-600 text-white font-medium shadow-xs transition cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Explorar</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-3 mt-3 border-t border-gray-100 dark:border-ink-border">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold text-ink-muted hover:text-ink dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
        >
          Cerrar
        </button>
      </div>
    </Dialog>
  );
};
