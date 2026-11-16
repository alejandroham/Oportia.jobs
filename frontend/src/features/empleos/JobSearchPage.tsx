import React, { useState, useMemo } from 'react';
import type { JobPosting, CandidateProfile, FitEvaluation } from '../../types';
import { useAppStore } from '../../state/useAppStore';
import { api, isAINotConnectedError, getHumanErrorMessage } from '../../api';
import { useToast } from '../../components/Toast';
import { JobSearchBar } from './JobSearchBar';
import { JobAdvancedFilters } from './JobAdvancedFilters';
import { JobResultsFeed } from './JobResultsFeed';
import { IndexResultsBanner } from './IndexResultsBanner';
import { FailedSourcesBanner } from './FailedSourcesBanner';
import { JobDetailModal } from './JobDetailModal';
import { FitEvaluationModal } from './FitEvaluationModal';
import { ImportUrlModal } from './ImportUrlModal';
import { CompanyPortalsModal } from './CompanyPortalsModal';
import { HelpCircle } from 'lucide-react';
import { matchesQuery, normalizeText } from '../../utils/searchText';

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
  const { setJobs, addOrUpdateJob, removeJob, preferences } = useAppStore();

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
  // Ofertas que trajo la última búsqueda al servidor: no se vuelven a filtrar por el mismo texto,
  // porque el servidor ya las eligió (sinónimos, inglés, otras redacciones).
  const [lastSearch, setLastSearch] = useState<{ term: string; ids: Set<string> }>({ term: '', ids: new Set() });
  const [isBatchRanking, setIsBatchRanking] = useState(false);
  const [sourcesFailed, setSourcesFailed] = useState<string[]>([]);
  // Si la última búsqueda vino del índice diario: fecha del índice (para ofrecer "buscar también en vivo").
  const [indexInfo, setIndexInfo] = useState<{ generatedAt: string | null; count: number } | null>(null);
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
  const runSearch = async (live: boolean) => {
    setIsScanning(true);
    try {
      const searchKw = searchTerm.trim() || (profile?.primary_profession || profile?.headline || '');
      const searchRes = await api.searchJobs({
        keywords: searchKw,
        remote_only: modalityFilter === 'Remoto',
        search_scope: regionFilter === 'user_region' ? 'chile' : 'all',
        region: selectedRegion || undefined,
        commune: selectedCommune || undefined,
        live
      });

      setIndexInfo(
        !Array.isArray(searchRes) && searchRes?.from_index
          ? { generatedAt: searchRes.index_generated_at || null, count: searchRes.index_count || 0 }
          : null
      );
      const found = Array.isArray(searchRes) ? searchRes : (searchRes?.jobs || []);
      const failed = Array.isArray(searchRes) ? [] : (searchRes?.sources_failed || []);
      setSourcesFailed(failed);
      setLastSearch({ term: normalizeText(searchTerm.trim()), ids: new Set(found.map((j) => j.id)) });

      if (found.length > 0) {
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

  const handleScan = () => runSearch(false);
  const handleScanLive = () => runSearch(true);

  // Toggle tracking
  const handleToggleTrack = async (job: JobPosting) => {
    const isTracked = job.status && job.status !== 'discovered';
    await addOrUpdateJob({
      ...job,
      status: isTracked ? 'discovered' : 'applied_no_response',
      tracked_at: isTracked ? undefined : new Date().toISOString()
    });
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
      const evaluation = await api.evaluateJob(job, profile, preferences ?? undefined);
      setSelectedEvaluation(evaluation);
      const updatedJob: JobPosting = { ...job, fit_score: evaluation.overall_score };
      await addOrUpdateJob(updatedJob);
      setSelectedJobForDetail(updatedJob);
      toast.success(`Compatibilidad evaluada: ${evaluation.overall_score}%`);
    } catch (e: any) {
      if (isAINotConnectedError(e)) {
        toast.info('Para evaluar compatibilidad con IA, activa la IA gratuita o conecta tu clave en Ajustes.');
        onOpenSettings?.();
      } else {
        toast.error('Error al evaluar: ' + getHumanErrorMessage(e));
      }
    } finally {
      setIsLoadingEvaluation(false);
    }
  };

  // "Ordenar ofertas con IA": una sola consulta para las ofertas visibles aún sin puntaje.
  const hasCv = Boolean(profile && profile.name?.trim().toLowerCase() !== 'candidato' && (profile.experiences?.length || profile.technical_skills?.length || profile.headline));
  const handleBatchRank = async () => {
    if (!hasCv || !profile) {
      toast.info('Para ordenar ofertas con IA, primero sube tu CV en Mi perfil.');
      return;
    }
    if (!hasActiveKey) {
      toast.info('Activa la IA gratuita o conecta tu clave en Ajustes para ordenar ofertas con IA.');
      onOpenSettings?.();
      return;
    }
    const pending = filteredJobs.filter((j) => j.fit_score === undefined || j.fit_score === null);
    const batch = (pending.length ? pending : filteredJobs).slice(0, 15);
    if (batch.length === 0) {
      toast.info('Primero busca ofertas para poder ordenarlas.');
      return;
    }
    setIsBatchRanking(true);
    try {
      const { results } = await api.rankJobs(batch, profile, preferences);
      const scores = new Map(results.map((r) => [r.job_id, r.fit_score]));
      const current = useAppStore.getState().jobs;
      await setJobs(current.map((j) => (scores.has(j.id) ? { ...j, fit_score: scores.get(j.id) } : j)));
      setSortBy('fit_desc');
      toast.success(`${results.length} ofertas ordenadas por compatibilidad`, pending.length > 15 ? 'Vuelve a pulsar para ordenar las siguientes.' : undefined);
    } catch (e: any) {
      if (isAINotConnectedError(e)) {
        toast.info('Para ordenar con IA, activa la IA gratuita o conecta tu clave en Ajustes.');
        onOpenSettings?.();
      } else {
        toast.error('Error al ordenar: ' + getHumanErrorMessage(e));
      }
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

  const handleResetFilters = () => {
    setSelectedRegion(''); setSelectedCommune(''); setMinSalary(undefined);
    setSelectedSource('all'); setModalityFilter('all'); setRegionFilter('all');
  };

  // Filter and sort jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (j.in_radar === false) return false;
      const term = searchTerm.trim();
      const fromLastSearch = lastSearch.ids.has(j.id) && lastSearch.term === normalizeText(term);
      if (term && !fromLastSearch) {
        const haystack = [j.title, j.company, j.description, j.location, ...(j.tags || [])].join(' ');
        if (!matchesQuery(haystack, term)) return false;
      }
      if (modalityFilter === 'Remoto' && !j.is_remote) return false;
      if (modalityFilter === 'Presencial' && j.is_remote) return false;
      if (regionFilter === 'user_region' && userRegion && !normalizeText(j.location || '').includes(normalizeText(userRegion)) && !j.is_user_region) return false;
      if (selectedRegion && !normalizeText(j.location || '').includes(normalizeText(selectedRegion)) && j.region !== selectedRegion) return false;
      if (selectedSource !== 'all' && j.source?.toLowerCase() !== selectedSource.toLowerCase()) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'fit_desc') return (b.fit_score ?? -1) - (a.fit_score ?? -1);
      if (sortBy === 'recent') return new Date(b.posted_at || b.discovered_at).getTime() - new Date(a.posted_at || a.discovered_at).getTime();
      return 0;
    });
  }, [jobs, searchTerm, lastSearch, modalityFilter, regionFilter, selectedRegion, selectedSource, sortBy, userRegion]);

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
          onResetFilters={handleResetFilters}
        />
      )}

      {/* Resultados del índice diario (al instante) */}
      {indexInfo && !isScanning && (
        <IndexResultsBanner generatedAt={indexInfo.generatedAt} indexCount={indexInfo.count} onSearchLive={handleScanLive} />
      )}

      {/* Alerta de fuentes no disponibles */}
      <FailedSourcesBanner
        sourcesFailed={sourcesFailed}
        isScanning={isScanning}
        onRetry={handleScan}
        onDismiss={() => setSourcesFailed([])}
      />

      {/* Feed de resultados y paginación */}
      <JobResultsFeed
        jobs={paginatedJobs}
        isScanning={isScanning}
        userRegion={userRegion}
        onViewDetail={(j) => setSelectedJobForDetail(j)}
        onToggleTrack={handleToggleTrack}
        onDiscard={handleDiscard}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onScan={handleScan}
      />

      {/* Modales de Detalle, Evaluación y Portales */}
      <JobDetailModal
        job={selectedJobForDetail}
        evaluation={selectedEvaluation}
        isLoadingEvaluation={isLoadingEvaluation}
        hasActiveKey={hasActiveKey}
        onOpenSettings={onOpenSettings}
        onEvaluate={handleEvaluate}
        onOpenFullEvaluation={() => setIsFullEvaluationOpen(true)}
        onApply={onApply}
        onToggleTrack={handleToggleTrack}
        onClose={() => { setSelectedJobForDetail(null); setSelectedEvaluation(null); }}
      />
      <FitEvaluationModal
        isOpen={isFullEvaluationOpen}
        onClose={() => setIsFullEvaluationOpen(false)}
        evaluation={selectedEvaluation}
        job={selectedJobForDetail}
        onConnectAI={onOpenSettings}
      />
      <ImportUrlModal isOpen={isImportUrlOpen} onClose={() => setIsImportUrlOpen(false)} onImportSuccess={async () => {}} />
      <CompanyPortalsModal isOpen={isCompanyPortalsOpen} onClose={() => setIsCompanyPortalsOpen(false)} profile={profile} />
    </div>
  );
};
