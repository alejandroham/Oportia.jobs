import React from 'react';
import { X, Building2, ExternalLink, Search } from 'lucide-react';
import type { CandidateProfile } from '../../types';

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
  if (!isOpen) return null;

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
      platform: 'Workday',
      description: 'Portales de talento corporativo Workday',
      query: `site:myworkdayjobs.com "${targetRole}" "Chile"`
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" />

      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl p-6 z-10 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center text-[#20A88A]">
              <Building2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Búsqueda en portales de empresas
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">
          Encuentra vacantes ocultas buscando directamente en los sistemas de selección (ATS) de empresas con presencia en Chile:
        </p>

        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {portalDorks.map((dork) => (
            <div
              key={dork.platform}
              className="p-3.5 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200/80 dark:border-zinc-700/60 flex items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-0.5 min-w-0">
                <span className="font-bold text-gray-900 dark:text-gray-100 block">
                  {dork.platform}
                </span>
                <p className="text-gray-500 dark:text-gray-400 text-[11px] truncate">
                  {dork.description}
                </p>
                <code className="text-[10px] text-gray-400 font-mono block truncate">
                  {dork.query}
                </code>
              </div>

              <button
                type="button"
                onClick={() => handleRunSearch(dork.query)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#20A88A] hover:bg-[#18856d] text-white font-medium shadow-xs transition"
              >
                <Search className="w-3 h-3" />
                <span>Explorar</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
