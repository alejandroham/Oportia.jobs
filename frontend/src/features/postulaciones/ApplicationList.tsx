import React, { useState } from 'react';
import type { JobPosting } from '../../types';
import { Search, Building2, MapPin, ChevronRight, Bookmark } from 'lucide-react';

interface ApplicationListProps {
  jobs: JobPosting[];
  selectedJobId: string | null;
  onSelectJob: (job: JobPosting) => void;
  className?: string;
}

export const ApplicationList: React.FC<ApplicationListProps> = ({
  jobs,
  selectedJobId,
  onSelectJob,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredJobs = jobs.filter((j) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      j.title.toLowerCase().includes(term) ||
      j.company.toLowerCase().includes(term) ||
      (j.location && j.location.toLowerCase().includes(term))
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'offer':
        return { label: 'Oferta recibida', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'interview_scheduled':
      case 'interview_done':
      case 'final_stage':
      case 'contact_received':
        return { label: 'En entrevista', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'applied':
      case 'pending_send':
        return { label: 'Postulada', color: 'bg-teal-50 text-teal-700 border-teal-200' };
      case 'rejected':
      case 'archived':
        return { label: 'Cerrada', color: 'bg-gray-100 text-gray-600 border-gray-200' };
      default:
        return { label: 'Guardada', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Buscador de lista */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filtrar por cargo o empresa..."
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#20A88A]/30"
        />
      </div>

      {/* Lista de postulaciones */}
      <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
        {filteredJobs.length > 0 ? (
          filteredJobs.map((job) => {
            const isSelected = job.id === selectedJobId;
            const badge = getStatusBadge(job.status);

            return (
              <div
                key={job.id}
                onClick={() => onSelectJob(job)}
                className={`p-3.5 rounded-2xl border transition cursor-pointer text-left ${
                  isSelected
                    ? 'bg-teal-50/60 dark:bg-teal-950/30 border-[#20A88A] shadow-xs'
                    : 'bg-white dark:bg-zinc-900 border-gray-200/80 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0 flex-1">
                    <span className="text-xs font-semibold text-gray-500 truncate block">
                      {job.company}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1">
                      {job.title}
                    </h4>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold border ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400 pt-2 mt-1 border-t border-gray-100 dark:border-zinc-800/80">
                  <span className="truncate">{job.location || 'Chile'}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-xs text-gray-400">
            No hay postulaciones que coincidan con la búsqueda.
          </div>
        )}
      </div>
    </div>
  );
};
