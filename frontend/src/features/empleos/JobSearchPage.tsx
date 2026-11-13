import React, { useState, useMemo } from 'react';
import type { JobPosting, CandidateProfile, FitEvaluation } from '../../types';
import { useAppStore } from '../../state/useAppStore';
import { api } from '../../api';
import { useToast } from '../../components/Toast';
import { JobSearchBar } from './JobSearchBar';
import { JobAdvancedFilters } from './JobAdvancedFilters';
import { JobCard } from './JobCard';
import { JobDetailModal } from './JobDetailModal';
import { FitEvaluationModal } from './FitEvaluationModal';
import { ImportUrlModal } from './ImportUrlModal';
import { CompanyPortalsModal } from './CompanyPortalsModal';
import { EmptyState } from '../../components/common/EmptyState';
import { Info, HelpCircle } from 'lucide-react';

interface JobSearchPageProps {
  jobs: JobPosting[];
  profile: CandidateProfile | null;
  hasActiveKey: boolean;
  onOpenSettings?: () => void;
  onApply: (job: JobPosting) => void;
  onNavigateToTracker?: () => void;
  onRefresh?: () => Promise<void>;
  onNavigateToTab?: (tab: string) => void;
}

export const JobSearchPage: React.FC<JobSearchPageProps> = ({
  jobs,
  profile,
  hasActiveKey,
  onOpenSettings,
  onApply,
  onNavigateToTracker
}) => {
  const toast = useToast();
  const { setJobs, addOrUpdateJob, removeJob } = useAppStore();

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [modalityFilter, setModalityFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('fit_desc');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedCommune, setSelectedCommune] = useState('');
  const [minSalary, setMinSalary] = useState<number | undefined>(undefined);
  const [selectedSource, setSelectedSource] = useState('all');
  const [isScanning, setIsScanning] = useState(false);
  const [isBatchRanking, setIsBatchRanking] = useState(false);
  const [pageSize, setPageSize] = useState(12);
  const [page, setPage] = useState(1);

  // Modals state
  const [selectedJobForDetail, setSelectedJobForDetail] = useState<JobPosting | null>(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState<FitEvaluation | null>(null);
  const [isLoadingEvaluation, setIsLoadingEvaluation] = useState(false);
  const [isFullEvaluationOpen, setIsFullEvaluationOpen] = useState(false);
  const [isImportUrlOpen, setIsImportUrlOpen] = useState(false);
  const [isCompanyPortalsOpen, setIsCompanyPortalsOpen] = useState(false);

  const userRegion = profile?.region || '';

  // Scan / Search jobs
  const handleScan = async () => {
    setIsScanning(true);
    try {
      const searchKw = searchTerm.trim() || (profile?.primary_profession || profile?.headline || '');
      const found = await api.searchJobs({
        keywords: searchKw,
        remote_only: modalityFilter === 'Remoto',
        search_scope: regionFilter === 'user_region' ? 'regional' : 'all',
        region: selectedRegion || undefined,
        commune: selectedCommune || undefined
      });

      if (Array.isArray(found) && found.length > 0) {
        const store = useAppStore.getState();
        const existingTracked = store.jobs.filter((j) => j.status && j.status !== 'discovered');
        const existingIds = new Set(existingTracked.map((j) => j.id));
        const merged = [...existingTracked, ...found.filter((j) => !existingIds.has(j.id))];
        await store.setJobs(merged);
        toast.success(`Búsqueda completada: ${found.length} ofertas encontradas`);
      } else {
        toast.info('No se encontraron ofertas nuevas con esos términos');
      }
    } catch (e: any) {
      toast.error('Error al buscar empleos: ' + (e?.message || e));
    } finally {
      setIsScanning(false);
    }
  };

  // Toggle tracking
  const handleToggleTrack = async (job: JobPosting) => {
    const isTracked = job.status && job.status !== 'discovered';
    const updated: JobPosting = {
      ...job,
      status: isTracked ? 'discovered' : 'applied_no_response',
      tracked_at: isTracked ? undefined : new Date().toISOString()
    };
    await addOrUpdateJob(updated);
    toast.success(isTracked ? 'Oferta quitada de seguimiento' : 'Oferta guardada en seguimiento');
  };

  // Discard job from radar
  const handleDiscard = async (jobId: string) => {
    await removeJob(jobId);
    toast.info('Oferta descartada del radar');
  };

  // Evaluate single job
  const handleEvaluate = async (job: JobPosting) => {
    if (!profile?.technical_skills?.length && !profile?.headline) {
      toast.info('Para evaluar compatibilidad con IA, primero completa tu perfil en Mi CV.');
      return;
    }
    setIsLoadingEvaluation(true);
    try {
      const evaluation = await api.evaluateJob(job, profile);
      setSelectedEvaluation(evaluation);
      const updatedJob: JobPosting = { ...job, fit_score: evaluation.overall_score };
      await addOrUpdateJob(updatedJob);
      setSelectedJobForDetail(updatedJob);
      toast.success(`Compatibilidad evaluada: ${evaluation.overall_score}%`);
    } catch (e: any) {
      toast.error('Error al evaluar: ' + (e?.message || e));
    } finally {
      setIsLoadingEvaluation(false);
    }
  };

  // Batch rank
  const handleBatchRank = async () => {
    if (!hasActiveKey) {
      toast.info('Conecta tu clave de IA en Ajustes para clasificar automáticamente con IA.');
      if (onOpenSettings) onOpenSettings();
      return;
    }
    setIsBatchRanking(true);
    try {
      await api.batchRank();
      setSortBy('fit_desc');
      toast.success('Ofertas clasificadas por compatibilidad');
    } catch (e: any) {
      toast.error('Error al clasificar: ' + (e?.message || e));
    } finally {
      setIsBatchRanking(false);
    }
  };

  // Clear radar
  const handleClearRadar = async () => {
    if (window.confirm('¿Seguro que deseas vaciar todas las ofertas no guardadas de tu radar?')) {
      await setJobs([]);
      toast.info('Radar vaciado con éxito');
    }
  };

  // Filter and sort jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (j.in_radar === false) return false;
      const term = searchTerm.toLowerCase().trim();
      if (term) {
        const matchesTerm =
          j.title?.toLowerCase().includes(term) ||
          j.company?.toLowerCase().includes(term) ||
          j.description?.toLowerCase().includes(term) ||
          j.tags?.some((t) => t.toLowerCase().includes(term));
        if (!matchesTerm) return false;
      }
      if (modalityFilter !== 'all') {
        const mod = (j.modality || (j.is_remote ? 'Remoto' : 'Presencial')).toLowerCase();
        if (modalityFilter === 'Remoto' && !j.is_remote && !mod.includes('remoto')) return false;
        if (modalityFilter === 'Presencial' && j.is_remote) return false;
        if (modalityFilter === 'Híbrido' && !mod.includes('híbrido') && !mod.includes('hibrido')) return false;
      }
      if (regionFilter === 'user_region' && userRegion && !j.location?.toLowerCase().includes(userRegion.toLowerCase()) && !j.is_user_region) {
        return false;
      }
      if (selectedRegion && !j.location?.toLowerCase().includes(selectedRegion.toLowerCase()) && j.region !== selectedRegion) {
        return false;
      }
      if (selectedSource !== 'all' && j.source?.toLowerCase() !== selectedSource.toLowerCase()) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'fit_desc') return (b.fit_score ?? -1) - (a.fit_score ?? -1);
      if (sortBy === 'recent') return new Date(b.posted_at || b.discovered_at).getTime() - new Date(a.posted_at || a.discovered_at).getTime();
      return 0;
    });
  }, [jobs, searchTerm, modalityFilter, regionFilter, selectedRegion, selectedSource, sortBy, userRegion]);

  const totalPages = Math.ceil(filteredJobs.length / pageSize) || 1;
  const paginatedJobs = filteredJobs.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      {/* Cabecera y Tooltip informativo */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Buscar empleo
            </h1>
            <div className="group relative">
              <HelpCircle className="w-4 h-4 text-gray-400 hover:text-[#20A88A] cursor-pointer" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-72 p-3 bg-gray-900 text-white text-xs rounded-xl shadow-xl z-30 leading-relaxed">
                El radar rastrea vacantes reales en Chile (Get on Board, CompuTrabajo, etc.) y calcula la afinidad con tu CV respetando tu privacidad.
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            {filteredJobs.length} ofertas disponibles · Filtra por cargo, región o modalidad
          </p>
        </div>
      </div>

      {/* Barra de búsqueda y filtros rápidos */}
      <JobSearchBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onScan={handleScan}
        isScanning={isScanning}
        modalityFilter={modalityFilter}
        onModalityChange={setModalityFilter}
        regionFilter={regionFilter}
        onRegionChange={setRegionFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        isAdvancedOpen={isAdvancedOpen}
        onToggleAdvanced={() => setIsAdvancedOpen(!isAdvancedOpen)}
        onOpenImportUrl={() => setIsImportUrlOpen(true)}
        onBatchRank={handleBatchRank}
        onOpenCompanyPortals={() => setIsCompanyPortalsOpen(true)}
        onClearRadar={handleClearRadar}
        isBatchRanking={isBatchRanking}
      />

      {/* Panel desplegable de filtros avanzados */}
      {isAdvancedOpen && (
        <JobAdvancedFilters
          selectedRegion={selectedRegion}
          onRegionChange={setSelectedRegion}
          selectedCommune={selectedCommune}
          onCommuneChange={setSelectedCommune}
          minSalary={minSalary}
          onMinSalaryChange={setMinSalary}
          selectedSource={selectedSource}
          onSourceChange={setSelectedSource}
          onResetFilters={() => {
            setSelectedRegion('');
            setSelectedCommune('');
            setMinSalary(undefined);
            setSelectedSource('all');
            setModalityFilter('all');
            setRegionFilter('all');
          }}
        />
      )}

      {/* Grid de resultados */}
      {paginatedJobs.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                userRegion={userRegion}
                onViewDetail={(j) => setSelectedJobForDetail(j)}
                onToggleTrack={handleToggleTrack}
                onDiscard={handleDiscard}
              />
            ))}
          </div>

          {/* Paginación simple */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-xs font-semibold disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-xs text-gray-500">
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-xs font-semibold disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={Info}
          title="Sin ofertas encontradas"
          description="Prueba con otros términos de búsqueda o haz clic en 'Buscar' para escanear portales chilenos."
          actionLabel="Buscar ofertas ahora"
          onAction={handleScan}
        />
      )}

      {/* Modal de Detalle */}
      <JobDetailModal
        job={selectedJobForDetail}
        evaluation={selectedEvaluation}
        isLoadingEvaluation={isLoadingEvaluation}
        onEvaluate={handleEvaluate}
        onOpenFullEvaluation={() => setIsFullEvaluationOpen(true)}
        onApply={onApply}
        onToggleTrack={handleToggleTrack}
        onClose={() => {
          setSelectedJobForDetail(null);
          setSelectedEvaluation(null);
        }}
      />

      {/* Modal de Comité / 5 perspectivas */}
      <FitEvaluationModal
        isOpen={isFullEvaluationOpen}
        onClose={() => setIsFullEvaluationOpen(false)}
        evaluation={selectedEvaluation}
        job={selectedJobForDetail}
      />

      {/* Modal Importar por URL */}
      <ImportUrlModal
        isOpen={isImportUrlOpen}
        onClose={() => setIsImportUrlOpen(false)}
        onImportSuccess={async () => {}}
      />

      {/* Modal Búsqueda en Portales ATS */}
      <CompanyPortalsModal
        isOpen={isCompanyPortalsOpen}
        onClose={() => setIsCompanyPortalsOpen(false)}
        profile={profile}
      />
    </div>
  );
};
