import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Globe,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  Upload,
  FileText,
  Briefcase,
  DollarSign,
  Trash2,
  Mail,
  Send,
  Eye,
  Columns,
  List,
  Calendar,
  Clock,
  BookmarkPlus,
  BookmarkCheck,
  Building2,
  Cpu,
  Target,
  RefreshCw,
  Play,
  X,
  MoreHorizontal,
  ThumbsUp,
  ThumbsDown,
  Plus,
  Check,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Filter
} from 'lucide-react';
import type {
  JobPosting,
  FitEvaluation,
  CandidateProfile,
  RoleRecommendation,
  GeneratedATSQuery,
  CompanyDirectoryItem
} from '../types';
import { api } from '../api';
import { formatDisplayDate, getOfferExpirationBadge } from '../utils/dateUtils';
import { CHILE_REGIONS, detectJobRegionAndCommune, getGeographicBadge } from '../utils/chileRegions';
import { useToast } from './Toast';

interface JobRadarProps {
  jobs: JobPosting[];
  profile?: CandidateProfile | null;
  onRefresh: () => void;
  onApply: (job: JobPosting) => void;
  onNavigateToTracker?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const JobRadar: React.FC<JobRadarProps> = ({
  jobs,
  profile,
  onRefresh,
  onApply,
  onNavigateToTracker,
  onNavigateToTab
}) => {
  const toast = useToast();

  // Geographic & Regional Configuration: Obtained dynamically from CV, no default Biobío bias
  const userRegion = profile?.region || '';
  const userCommune = profile?.commune || '';

  // CV Verification: Fit score calculation strictly requires an analyzed CV
  const hasAnalyzedCV = Boolean(
    profile &&
    profile.name &&
    profile.name.trim() !== '' &&
    profile.name.trim().toLowerCase() !== 'candidato' &&
    ((profile.experiences && profile.experiences.length > 0) ||
     (profile.technical_skills && profile.technical_skills.length > 0) ||
     (profile.headline && profile.headline.trim() !== '') ||
     (profile.primary_profession && profile.primary_profession.trim() !== ''))
  );

  const [showNoCVModal, setShowNoCVModal] = useState<boolean>(false);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [searchScope, setSearchScope] = useState<'global' | 'chile' | 'all'>(() => {
    return (localStorage.getItem('job_radar_scope') as 'global' | 'chile' | 'all') || 'chile';
  });
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedCommune, setSelectedCommune] = useState<string>('all');
  const [geographicScopeFilter, setGeographicScopeFilter] = useState<'all' | 'regional_only'>('all');
  const [modalityFilter, setModalityFilter] = useState<'all' | 'Presencial' | 'Híbrido' | 'Remoto'>('all');
  const [contractTypeFilter, setContractTypeFilter] = useState<'all' | 'Contrata' | 'Planta' | 'Honorarios' | 'Indefinido'>('all');
  const [sortBy, setSortBy] = useState<'fit_desc' | 'compatibility' | 'recent' | 'salary'>('fit_desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid3' | 'grid2' | 'list'>(() => {
    return (localStorage.getItem('job_radar_view_mode') as 'grid3' | 'grid2' | 'list') || 'grid3';
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(() => {
    return Number(localStorage.getItem('job_radar_page_size')) || 12;
  });

  // Action states
  const [isScraping, setIsScraping] = useState(false);
  const [isBatchRanking, setIsBatchRanking] = useState(false);
  const [evaluatingJobId, setEvaluatingJobId] = useState<string | null>(null);
  const [trackingJobId, setTrackingJobId] = useState<string | null>(null);
  const [activeMenuJobId, setActiveMenuJobId] = useState<string | null>(null);

  // Modals & Panels
  const [selectedEvaluation, setSelectedEvaluation] = useState<FitEvaluation | null>(null);
  const [selectedJobForDetail, setSelectedJobForDetail] = useState<JobPosting | null>(null);
  const [showStrategyDrawer, setShowStrategyDrawer] = useState(false);
  const [strategyTab, setStrategyTab] = useState<'roles' | 'companies'>('roles');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Import URL Form
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // ATS & Companies Data
  const [roleRecs, setRoleRecs] = useState<RoleRecommendation[]>([]);
  const [atsQueries, setAtsQueries] = useState<GeneratedATSQuery[]>([]);
  const [companies, setCompanies] = useState<CompanyDirectoryItem[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [isExecutingATSQuery, setIsExecutingATSQuery] = useState<string | null>(null);
  const [selectedCompanyCountry, setSelectedCompanyCountry] = useState<string>('all');
  const [selectedCompanyIndustry, setSelectedCompanyIndustry] = useState<string>('all');
  const [companySearch, setCompanySearch] = useState('');

  // Close card menu on outside click
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuJobId(null);
      }
    };
    if (activeMenuJobId) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [activeMenuJobId]);

  const loadATSData = async () => {
    try {
      const [recs, queries, comps] = await Promise.all([
        api.getRoleRecommendations(),
        api.getATSQueries(),
        api.getCompanies()
      ]);
      setRoleRecs(recs);
      setAtsQueries(queries);
      setCompanies(comps);
    } catch (e) {
      console.warn('Error cargando estrategia ATS:', e);
    }
  };

  useEffect(() => {
    loadATSData();
  }, []);

  const handleRefreshRecommendations = async () => {
    if (!hasAnalyzedCV) {
      setShowNoCVModal(true);
      return;
    }
    setIsLoadingRecs(true);
    try {
      const recs = await api.getRoleRecommendations(true);
      setRoleRecs(recs);
      const queries = await api.getATSQueries();
      setAtsQueries(queries);
      toast.success('Estrategia de roles recalculada según tu CV');
    } catch (e: any) {
      toast.error('Error recalculando roles: ' + (e?.message || e));
    } finally {
      setIsLoadingRecs(false);
    }
  };

  const handleToggleRecStatus = async (recId: string, currentStatus?: boolean | null) => {
    try {
      const next = currentStatus === true ? false : true;
      const updated = await api.updateRoleRecStatus(recId, next);
      setRoleRecs(prev => prev.map(r => r.id === recId ? updated : r));
      const queries = await api.getATSQueries();
      setAtsQueries(queries);
      toast.info(next ? 'Rol activado para búsquedas' : 'Rol descartado');
    } catch (e: any) {
      toast.error('Error actualizando rol: ' + (e?.message || e));
    }
  };

  const handleRunATSQuery = async (queryText: string) => {
    setIsExecutingATSQuery(queryText);
    try {
      const res = await api.scrapeCustomATSQuery(queryText);
      toast.success(res.message || 'Búsqueda ATS ejecutada');
      onRefresh();
    } catch (e: any) {
      toast.error('Error ejecutando consulta ATS: ' + (e?.message || e));
    } finally {
      setIsExecutingATSQuery(null);
    }
  };

  const handleSetViewMode = (mode: 'grid3' | 'grid2' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('job_radar_view_mode', mode);
  };

  const getJobContactEmail = (job: JobPosting): string | null => {
    if (job.contact_email && job.contact_email.trim()) {
      return job.contact_email.trim();
    }
    if (job.description) {
      const match = job.description.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (match) return match[0];
    }
    return null;
  };

  const formatSource = (src: string): string => {
    const map: Record<string, string> = {
      getonbrd: 'Get on Board',
      linkedin_chile: 'LinkedIn CL',
      computrabajo: 'CompuTrabajo',
      chiletrabajos: 'ChileTrabajos',
      laborum: 'Laborum',
      empleospublicos: 'Empleos Públicos CL',
      ats_greenhouse: 'Greenhouse',
      ats_lever: 'Lever',
      ats_ashby: 'Ashby',
      ats_workday: 'Workday',
      ats_smartrecruiters: 'SmartRecruiters',
      ats_direct: 'ATS Corporativo',
      remotive: 'Remotive',
      arbeitnow: 'Arbeitnow',
      remoteok: 'RemoteOK',
      linkedin: 'LinkedIn',
      url_import: 'Importado'
    };
    return map[src] || src;
  };

  const isTracked = (job: JobPosting): boolean => {
    return Boolean(job.tracked_at || (job.status && job.status !== 'discovered'));
  };

  const handleTrackJob = async (job: JobPosting) => {
    if (isTracked(job)) {
      if (onNavigateToTracker) {
        onNavigateToTracker();
      }
      return;
    }
    setTrackingJobId(job.id);
    try {
      await api.trackJob(job.id);
      toast.success('Guardada en Seguimiento', job.title);
      onRefresh();
    } catch (e: any) {
      toast.error('Error al guardar en Seguimiento: ' + (e?.message || e));
    } finally {
      setTrackingJobId(null);
    }
  };

  const handleScrape = async () => {
    setIsScraping(true);
    try {
      const searchKw = searchTerm.trim() || (profile?.primary_profession || (profile?.target_roles?.[0] || ''));
      await api.scrapeJobs(searchKw, remoteOnly, searchScope);
      toast.success('Búsqueda completada con éxito');
      onRefresh();
    } catch (e: any) {
      toast.error('Error al escanear empleos: ' + (e?.message || e));
    } finally {
      setIsScraping(false);
    }
  };

  const handleBatchRank = async () => {
    if (!hasAnalyzedCV) {
      setShowNoCVModal(true);
      return;
    }
    setIsBatchRanking(true);
    try {
      const res = await api.batchRank();
      setSortBy('fit_desc');
      toast.success(res?.message || 'Oportunidades clasificadas con IA (mayor porcentaje primero)');
      onRefresh();
    } catch (e: any) {
      toast.error('Error al clasificar: ' + (e?.message || e));
    } finally {
      setIsBatchRanking(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl) return;
    setIsImporting(true);
    try {
      await api.importJobUrl(importUrl);
      setImportUrl('');
      setShowImportModal(false);
      toast.success('Oferta importada correctamente');
      onRefresh();
    } catch (err: any) {
      toast.error('Error importando oferta: ' + (err?.message || err));
    } finally {
      setIsImporting(false);
    }
  };

  const handleEvaluate = async (job: JobPosting) => {
    if (!hasAnalyzedCV) {
      setShowNoCVModal(true);
      return;
    }
    setEvaluatingJobId(job.id);
    try {
      const evaluation = await api.evaluateJob(job.id);
      setSelectedEvaluation(evaluation);
      setSortBy('fit_desc');
      toast.success(`Ajuste evaluado: ${evaluation.overall_score}% (${evaluation.verdict})`);
      onRefresh();
    } catch (e: any) {
      toast.error('Error evaluando ajuste: ' + (e?.message || e));
    } finally {
      setEvaluatingJobId(null);
    }
  };

  const handleFeedback = async (jobId: string, action: 'like' | 'dislike') => {
    try {
      setActiveMenuJobId(null);
      if (action === 'like') {
        await api.sendFeedback(jobId, action);
        toast.success('Interés guardado. La IA priorizará vacantes afines.');
      } else {
        await api.sendFeedback(jobId, action);
        await api.deleteJob(jobId, 'radar');
        toast.info('Oferta descartada del radar');
        onRefresh();
      }
    } catch (e: any) {
      toast.error('Error registrando feedback: ' + (e?.message || e));
    }
  };

  const handleOneClickApply = async (job: JobPosting) => {
    const email = getJobContactEmail(job);
    const candidateName = profile?.name || 'Candidato';
    const candidateEmail = profile?.email || '';
    const candidatePhone = profile?.phone || '';

    if (email) {
      const subject = encodeURIComponent(`Postulación: ${job.title} - ${candidateName}`);
      const body = encodeURIComponent(
        `Estimado equipo de selección de ${job.company},\n\n` +
        `Me pongo en contacto para presentar formalmente mi candidatura a la posición de ${job.title}.\n\n` +
        `Cuento con sólida experiencia en las responsabilidades del puesto y motivación para integrarme a sus desafíos.\n\n` +
        `Quedo a su disposición para coordinar una entrevista y conversar en profundidad.\n\n` +
        `Atentamente,\n` +
        `${candidateName}\n` +
        `${candidateEmail ? `Email: ${candidateEmail}\n` : ''}` +
        `${candidatePhone ? `Teléfono: ${candidatePhone}\n` : ''}`
      );
      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    } else if (job.url) {
      window.open(job.url, '_blank', 'noopener,noreferrer');
    }

    try {
      await api.trackJob(job.id);
      toast.success('Portal abierto y oferta añadida a Seguimiento');
      onRefresh();
    } catch (e) {
      console.error('Error registrando en seguimiento:', e);
    }
  };

  const handleDeleteFromRadar = async (jobId: string) => {
    setActiveMenuJobId(null);
    try {
      await api.deleteJob(jobId, 'radar');
      toast.info('Oferta eliminada del radar');
      onRefresh();
    } catch (e: any) {
      toast.error('Error eliminando empleo: ' + (e?.message || e));
    }
  };

  const handleClearAllRadar = async () => {
    try {
      await api.clearAllJobs();
      setShowClearConfirm(false);
      toast.success('Radar vaciado con éxito');
      onRefresh();
    } catch (e: any) {
      toast.error('Error limpiando radar: ' + (e?.message || e));
    }
  };

  // Filter & Prioritize jobs (Section 3, 4, 5)
  const radarJobs = jobs.filter(j => j.in_radar !== false);
  const filteredJobs = React.useMemo(() => {
    const result = radarJobs.filter(j => {
      // 1. Text Search (title, company, description, tags)
      const term = searchTerm.toLowerCase().trim();
      const matchesTerm =
        !term ||
        j.title.toLowerCase().includes(term) ||
        j.company.toLowerCase().includes(term) ||
        (j.description && j.description.toLowerCase().includes(term)) ||
        (j.tags && j.tags.some(t => t.toLowerCase().includes(term)));
      if (!matchesTerm) return false;

      // 2. Modality Filter
      if (remoteOnly && !j.is_remote) return false;
      if (modalityFilter !== 'all') {
        const mod = (j.modality || (j.is_remote ? 'Remoto' : 'Presencial')).toLowerCase();
        if (modalityFilter === 'Remoto' && !j.is_remote && !mod.includes('remoto')) return false;
        if (modalityFilter === 'Presencial' && j.is_remote) return false;
        if (modalityFilter === 'Híbrido' && !mod.includes('híbrido') && !mod.includes('hibrido')) return false;
      }

      // 3. Geographic & Regional Filters
      const geo = getGeographicBadge(j.location, userRegion);

      // Exclusive region filter
      if (geographicScopeFilter === 'regional_only' && geo.type !== 'user_region') {
        return false;
      }

      // Region selector
      if (selectedRegion !== 'all') {
        if (!geo.detectedRegion || geo.detectedRegion !== selectedRegion) {
          return false;
        }
      }

      // Commune selector
      if (selectedCommune !== 'all') {
        if (!geo.detectedCommune || geo.detectedCommune !== selectedCommune) {
          return false;
        }
      }

      // 4. Contract Type filter
      if (contractTypeFilter !== 'all') {
        const cType = (j.contract_type || '').toLowerCase();
        if (!cType.includes(contractTypeFilter.toLowerCase())) return false;
      }

      return true;
    });

    // 5. Ranking and Prioritization (Section 4 Rules)
    result.sort((a, b) => {
      // 1. Pure Fit Score (Mayor % primero → Menor % al final)
      if (sortBy === 'fit_desc') {
        const scoreA = (a.fit_score !== undefined && a.fit_score !== null) ? a.fit_score : -1;
        const scoreB = (b.fit_score !== undefined && b.fit_score !== null) ? b.fit_score : -1;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        return (b.posted_at || b.discovered_at).localeCompare(a.posted_at || a.discovered_at);
      }

      if (sortBy === 'recent') {
        const dateA = a.posted_at || a.discovered_at;
        const dateB = b.posted_at || b.discovered_at;
        return dateB.localeCompare(dateA);
      }

      if (sortBy === 'salary') {
        const extractNum = (s?: string) => {
          if (!s) return 0;
          const clean = s.replace(/[^0-9]/g, '');
          return Number(clean) || 0;
        };
        return extractNum(b.salary_range) - extractNum(a.salary_range);
      }

      // Default: Professional Compatibility with Regional Proximity Priority
      const hasFitA = a.fit_score !== undefined && a.fit_score !== null;
      const hasFitB = b.fit_score !== undefined && b.fit_score !== null;

      // Evaluated jobs always rank above unevaluated jobs
      if (hasFitA && !hasFitB) return -1;
      if (!hasFitA && hasFitB) return 1;

      const baseFitA = a.fit_score ?? -1;
      const baseFitB = b.fit_score ?? -1;

      // If both evaluated, fit score is the dominant ranking factor.
      // If fit scores differ by more than 5 points, higher fit strictly wins.
      if (hasFitA && hasFitB && Math.abs(baseFitB - baseFitA) > 5) {
        return baseFitB - baseFitA;
      }

      const geoA = getGeographicBadge(a.location, userRegion);
      const geoB = getGeographicBadge(b.location, userRegion);

      // Regional bonus (+14 for user region, +4 for remote in Chile)
      const boostA = geoA.type === 'user_region' ? 14 : (geoA.type === 'remote' ? 4 : 0);
      const boostB = geoB.type === 'user_region' ? 14 : (geoB.type === 'remote' ? 4 : 0);

      const totalScoreA = (baseFitA >= 0 ? baseFitA : 50) + boostA;
      const totalScoreB = (baseFitB >= 0 ? baseFitB : 50) + boostB;

      if (totalScoreB !== totalScoreA) {
        return totalScoreB - totalScoreA;
      }

      return (b.posted_at || b.discovered_at).localeCompare(a.posted_at || a.discovered_at);
    });

    return result;
  }, [
    radarJobs,
    searchTerm,
    remoteOnly,
    modalityFilter,
    geographicScopeFilter,
    selectedRegion,
    selectedCommune,
    contractTypeFilter,
    sortBy,
    userRegion
  ]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredJobs.length);
  const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

  // Reset to first page when search criteria or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, remoteOnly, searchScope, pageSize, selectedRegion, selectedCommune, modalityFilter, contractTypeFilter, geographicScopeFilter, sortBy]);

  // Guard against out-of-bounds page index
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  return (
    <div className="space-y-6">

      {/* Hero Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Radar de Empleo
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse mr-1.5" />
              En vivo
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Explora ofertas recomendadas, portales chilenos y ATS corporativos analizados para tu perfil.
          </p>
        </div>

        {/* Action Pills (Cupertino 44px Touch Targets) */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* Strategy Drawer Trigger */}
          <button
            onClick={() => setShowStrategyDrawer(true)}
            className="flex items-center space-x-2 min-h-[44px] px-4 py-2.5 rounded-2xl text-xs font-semibold bg-white dark:bg-zinc-800 text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/6 dark:border-white/8 hover:bg-gray-50 dark:hover:bg-zinc-700/80 transition shadow-2xs cursor-pointer active:scale-95"
            title="Estrategia de roles sugeridos y directorio de empresas"
          >
            <SlidersHorizontal className="w-4 h-4 text-blue-500" />
            <span>Estrategia & ATS</span>
            {roleRecs.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 font-bold">
                {roleRecs.length}
              </span>
            )}
          </button>

          {/* AI Batch Rank */}
          <button
            onClick={handleBatchRank}
            disabled={isBatchRanking || filteredJobs.length === 0}
            className="flex items-center space-x-2 min-h-[44px] px-4 py-2.5 rounded-2xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white transition disabled:opacity-50 shadow-xs cursor-pointer active:scale-95"
            title="Evaluar ajuste de compatibilidad en lote con Inteligencia Artificial (ordena de mayor a menor porcentaje)"
          >
            <Sparkles className={`w-4 h-4 ${isBatchRanking ? 'animate-spin' : ''}`} />
            <span>{isBatchRanking ? 'Evaluando...' : '⚡ Evaluar Fit IA (Mayor a Menor)'}</span>
          </button>

          {/* Import URL Button */}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center space-x-1.5 min-h-[44px] px-4 py-2.5 rounded-2xl text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-gray-100 dark:hover:bg-zinc-800 border border-black/6 dark:border-white/8 transition cursor-pointer active:scale-95"
            title="Importar una oferta específica mediante su enlace"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Importar URL</span>
          </button>

          {/* Clear Radar Option */}
          {filteredJobs.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-zinc-800 transition cursor-pointer active:scale-95"
              title="Vaciar ofertas del radar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Copilot vs. Bots Info Banner */}
      <div className="apple-glass apple-card p-3.5 rounded-2xl border border-blue-500/20 bg-blue-50/60 dark:bg-blue-950/20 text-xs flex items-start justify-between gap-3 shadow-2xs">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-gray-900 dark:text-white text-xs">
                Copiloto de Empleabilidad Soberano (Control Humano 100%)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">
                Anti-Bloqueo & Ley 21.719
              </span>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
              <strong>¿Cómo postulas?</strong> NexusJob AI rastrea y evalúa las vacantes clasificándolas por <strong>Fit Score (mayor % primero)</strong> y genera tu CV adaptado y carta de presentación a la medida. <strong>No postula automáticamente a ciegas</strong> para evitar que tu cuenta sea bloqueada por los portales, permitir la autenticación con ClaveÚnica (Empleos Públicos) y garantizar que tú valides tus antecedentes bajo la Ley N° 21.719. Tú revisas tus materiales y postulas en 1 clic en el enlace oficial.
            </p>
          </div>
        </div>
      </div>

      {/* Regional Priority Banner (Section 3 & 4) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-purple-50/80 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-purple-950/30 border border-blue-200/60 dark:border-blue-800/40 text-xs shadow-2xs">
        <div className="flex items-center space-x-2 text-blue-900 dark:text-blue-200">
          <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>
            {userRegion ? (
              <>
                Prioridad regional activa: <strong className="font-bold text-blue-700 dark:text-blue-300">{userRegion}</strong> {userCommune && `(${userCommune})`} • Cobertura: <strong>Chile Completo</strong>
              </>
            ) : (
              <>
                Cobertura activa: <strong className="font-bold text-blue-700 dark:text-blue-300">Chile Completo (Nacional)</strong> • Sin sesgo regional predefinido (se deduce de tu CV)
              </>
            )}
          </span>
        </div>
        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="px-2.5 py-1 rounded-lg bg-white/90 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-700 font-semibold text-[11px] hover:bg-white transition flex items-center space-x-1"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>{showAdvancedFilters ? 'Ocultar filtros' : 'Filtros avanzados & Región'}</span>
          </button>
        </div>
      </div>

      {/* Invitation banner to upload CV if not analyzed */}
      {!hasAnalyzedCV && (
        <div className="apple-glass apple-card p-4 rounded-2xl border border-amber-300/80 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fade-in">
          <div className="flex items-start space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <FileText className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="font-bold text-xs text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
                <span>Modo Búsqueda Libre en Radar</span>
                <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                  CV Requerido para Fit
                </span>
              </h4>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                Puedes buscar y explorar vacantes libremente por cargo o palabras clave. Para calcular tu <strong>Fit Score de compatibilidad (100% a 0%)</strong>, detectar tu región y deducir tu estrategia de búsqueda sin sesgos, primero debes cargar tu currículum.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab ? onNavigateToTab('profile') : null}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition shrink-0 flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Cargar mi CV en Perfil</span>
          </button>
        </div>
      )}

      {/* Apple-grade Search & Filters Bar */}
      <div className="apple-glass apple-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5">
          {/* Main search field */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por profesión, cargo, especialidad o empresa (ej: TENS, Arquitecto, Abogado, Profesor, TI)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-gray-50/80 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Primary Scan Button (Cupertino 44px Touch Target) */}
          <button
            onClick={handleScrape}
            disabled={isScraping}
            className="flex items-center justify-center space-x-2 min-h-[44px] px-6 py-2.5 rounded-2xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition disabled:opacity-50 shrink-0 cursor-pointer active:scale-95"
          >
            <Globe className={`w-4 h-4 ${isScraping ? 'animate-spin' : ''}`} />
            <span>{isScraping ? 'Rastreando portales...' : 'Escanear Radar'}</span>
          </button>
        </div>

        {/* Filter Pill Controls */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs text-gray-600 dark:text-gray-400">
          {/* Scope Segmented Control */}
          <div className="flex items-center space-x-1 bg-gray-100 dark:bg-zinc-800/80 p-0.5 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setSearchScope('chile');
                localStorage.setItem('job_radar_scope', 'chile');
              }}
              className={`flex-1 sm:flex-none px-3 py-1 rounded-lg text-xs font-medium transition text-center ${
                searchScope === 'chile'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              🇨🇱 Chile (Nacional + Regional)
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchScope('all');
                localStorage.setItem('job_radar_scope', 'all');
              }}
              className={`flex-1 sm:flex-none px-3 py-1 rounded-lg text-xs font-medium transition text-center ${
                searchScope === 'all'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              🌐 Todos (+ Globales)
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchScope('global');
                localStorage.setItem('job_radar_scope', 'global');
              }}
              className={`flex-1 sm:flex-none px-3 py-1 rounded-lg text-xs font-medium transition text-center ${
                searchScope === 'global'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              🌍 Solo Internacional
            </button>
          </div>

          <div className="flex items-center space-x-4">
            {/* Remote checkbox */}
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(e) => setRemoteOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
              />
              <span className="text-xs">Solo 100% Remoto</span>
            </label>

            {/* View layout modes */}
            <div className="hidden sm:flex items-center space-x-1 bg-gray-100 dark:bg-zinc-800/80 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => handleSetViewMode('grid3')}
                className={`p-1 rounded-lg transition ${
                  viewMode === 'grid3'
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
                title="3 columnas"
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleSetViewMode('grid2')}
                className={`p-1 rounded-lg transition ${
                  viewMode === 'grid2'
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
                title="2 columnas"
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleSetViewMode('list')}
                className={`p-1 rounded-lg transition ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
                title="Lista"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Section 5 Advanced Geographic & Multi-Profession Filters */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-black/5 dark:border-white/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 animate-fade-in text-xs">
            {/* Region selector */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Región de Chile
              </label>
              <select
                value={selectedRegion}
                onChange={(e) => {
                  setSelectedRegion(e.target.value);
                  setSelectedCommune('all');
                }}
                className="w-full text-xs px-2.5 py-1.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">🇨🇱 Todas las regiones</option>
                {CHILE_REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.shortName}
                  </option>
                ))}
              </select>
            </div>

            {/* Commune selector */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Comuna
              </label>
              <select
                value={selectedCommune}
                onChange={(e) => setSelectedCommune(e.target.value)}
                disabled={selectedRegion === 'all'}
                className="w-full text-xs px-2.5 py-1.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-gray-800 dark:text-gray-200 disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">📍 Todas las comunas</option>
                {selectedRegion !== 'all' &&
                  (CHILE_REGIONS.find((r) => r.id === selectedRegion)?.communes || []).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
              </select>
            </div>

            {/* Geographic Scope */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Alcance Geográfico
              </label>
              <select
                value={geographicScopeFilter}
                onChange={(e) => setGeographicScopeFilter(e.target.value as any)}
                className="w-full text-xs px-2.5 py-1.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">🇨🇱 Nacional (prioridad mi región)</option>
                <option value="regional_only">📍 Solo mi región ({userRegion.replace('Región del ', '').replace('Región de ', '')})</option>
              </select>
            </div>

            {/* Modality Filter */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Modalidad
              </label>
              <select
                value={modalityFilter}
                onChange={(e) => setModalityFilter(e.target.value as any)}
                className="w-full text-xs px-2.5 py-1.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">🏢 Todas las modalidades</option>
                <option value="Presencial">Presencial</option>
                <option value="Híbrido">Híbrido</option>
                <option value="Remoto">100% Remoto</option>
              </select>
            </div>

            {/* Sort by */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Ordenar por
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full text-xs px-2.5 py-1.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="fit_desc">🎯 Mayor Fit Score IA (Mayor % primero → Menor % al final)</option>
                <option value="compatibility">✨ Compatibilidad CV + Prioridad Regional</option>
                <option value="recent">🕒 Más recientes</option>
                <option value="salary">💰 Mayor remuneración</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between px-1 text-xs text-gray-500">
        <span>
          Mostrando{' '}
          <strong className="text-gray-900 dark:text-white">
            {filteredJobs.length === 0 ? 0 : startIndex + 1} - {endIndex}
          </strong>{' '}
          de <strong className="text-gray-900 dark:text-white">{filteredJobs.length}</strong> oportunidades
        </span>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Limpiar búsqueda
          </button>
        )}
      </div>

      {/* Main Job Feed */}
      {filteredJobs.length === 0 ? (
        <div className="apple-glass apple-card p-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Sin vacantes en el radar todavía
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Haz clic en <strong>"Escanear Radar"</strong> para rastrear portales chilenos y bolsas de empleo globales, o importa el enlace de una oferta.
          </p>
        </div>
      ) : (
        <>
          <div
            className={
              viewMode === 'grid3'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : viewMode === 'grid2'
                ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                : 'space-y-3'
            }
          >
            {paginatedJobs.map((job) => {
            const hasFit = job.fit_score !== null && job.fit_score !== undefined;
            const score = job.fit_score || 0;
            const isTopFit = score >= 85;
            const isGoodFit = score >= 70 && score < 85;
            const contactEmail = getJobContactEmail(job);
            const tracked = isTracked(job);
            const expirationBadge = getOfferExpirationBadge(job.deadline);
            const isMenuOpen = activeMenuJobId === job.id;
            const geoBadge = getGeographicBadge(job.location, userRegion);

            return (
              <div
                key={job.id}
                className={`apple-glass apple-card hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-all duration-200 group flex flex-col justify-between p-5 space-y-3 relative ${
                  geoBadge.type === 'user_region' ? 'ring-1 ring-blue-500/20 dark:ring-blue-400/20' : ''
                }`}
              >
                {/* Content Top */}
                <div className="space-y-2 flex-1">
                  
                  {/* Meta Row: Company + Location and Fit Score Pill */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 pr-1 space-y-1">
                      <span className="font-semibold text-xs text-gray-900 dark:text-white block truncate">
                        {job.company}
                      </span>
                      <div className="flex items-center space-x-1.5 text-[11px] text-gray-500 dark:text-gray-400 flex-wrap gap-y-1">
                        {/* Geographic Priority Badge */}
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${geoBadge.badgeClass}`}>
                          {geoBadge.label}
                        </span>
                        {job.modality && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400">
                            {job.modality}
                          </span>
                        )}
                        {job.contract_type && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/50">
                            {job.contract_type}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Match Score Badge (Clickable for 5D Diagnostic) */}
                    {hasFit ? (
                      <button
                        onClick={() => handleEvaluate(job)}
                        className={`shrink-0 px-2.5 py-0.5 rounded-full flex items-center space-x-1 text-[11px] font-semibold transition ${
                          isTopFit
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                            : isGoodFit
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                        }`}
                        title="Ver diagnóstico dimensional de compatibilidad con tu CV"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{score}% Match</span>
                      </button>
                    ) : !hasAnalyzedCV ? (
                      <button
                        onClick={() => setShowNoCVModal(true)}
                        className="shrink-0 text-[10px] px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 hover:bg-amber-100 transition flex items-center space-x-1"
                        title="Carga tu CV para calcular tu porcentaje de ajuste con IA"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                        <span>Cargar CV para Fit</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEvaluate(job)}
                        disabled={evaluatingJobId === job.id}
                        className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition flex items-center space-x-1"
                        title="Calcular ajuste con IA"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-blue-500" />
                        <span>{evaluatingJobId === job.id ? '...' : 'Evaluar'}</span>
                      </button>
                    )}
                  </div>

                  {/* Job Title (Click opens details) */}
                  <h3
                    onClick={() => setSelectedJobForDetail(job)}
                    className="font-semibold text-sm text-gray-900 dark:text-white tracking-tight line-clamp-2 cursor-pointer group-hover:text-blue-600 dark:group-hover:text-blue-400 transition"
                    title="Ver detalles completos de la oferta"
                  >
                    {job.title}
                  </h3>

                  {/* Salary & Expiration pills (compact) */}
                  <div className="flex items-center space-x-2 text-[10px] text-gray-500 flex-wrap gap-y-1">
                    {job.salary_range && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
                        <DollarSign className="w-2.5 h-2.5 mr-0.5" />
                        {job.salary_range}
                      </span>
                    )}

                    <span className="text-gray-400">
                      {formatDisplayDate(job.posted_at)}
                    </span>

                    {expirationBadge.label && (
                      <span className={`px-1.5 py-0.2 rounded-md font-medium ${expirationBadge.badgeClass}`}>
                        {expirationBadge.label}
                      </span>
                    )}
                  </div>

                  {/* Clean 2-line description clamp */}
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 pt-0.5">
                    {job.description}
                  </p>

                  {/* Max 3 clean tags */}
                  {job.tags && job.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {job.tags.slice(0, 3).map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100/70 dark:bg-zinc-800/60 text-gray-600 dark:text-gray-400 truncate max-w-[100px]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Apple HIG Clean Action Bar: 1 Dominant Action, 1 Secondary, 1 Overflow Menu */}
                <div className="border-t border-black/5 dark:border-white/5 pt-3 flex items-center justify-between gap-2 mt-auto">
                  
                  {/* Left: Secondary Action (+ Seguimiento / En Seguimiento) — Cupertino 44px Touch Target */}
                  <button
                    onClick={() => handleTrackJob(job)}
                    disabled={trackingJobId === job.id}
                    className={`flex items-center space-x-1.5 min-h-[44px] px-3.5 py-2 rounded-2xl text-xs font-medium transition cursor-pointer active:scale-95 ${
                      tracked
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40'
                        : 'border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
                    }`}
                    title={tracked ? 'Oferta guardada. Haz clic para ir al Seguimiento.' : 'Guardar en Seguimiento'}
                  >
                    {tracked ? (
                      <>
                        <BookmarkCheck className="w-4 h-4 text-blue-600" />
                        <span>Guardada</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-4 h-4 text-gray-400" />
                        <span>Guardar</span>
                      </>
                    )}
                  </button>

                  {/* Right Actions: Primary Action + Overflow Context Menu */}
                  <div className="flex items-center space-x-1.5">
                    
                    {/* Primary Action Button (Apple Blue — Cupertino 44px Touch Target) */}
                    <button
                      onClick={() => handleOneClickApply(job)}
                      className="flex items-center space-x-1.5 min-h-[44px] px-4 py-2 rounded-2xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer active:scale-95"
                      title={contactEmail ? `Enviar correo a ${contactEmail}` : 'Abrir portal de postulación'}
                    >
                      {contactEmail ? (
                        <>
                          <Mail className="w-3.5 h-3.5" />
                          <span>Email</span>
                        </>
                      ) : (
                        <>
                          <span>Postular</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>

                    {/* Secondary Overflow Menu (•••) */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenuJobId(isMenuOpen ? null : job.id)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition cursor-pointer active:scale-95"
                        title="Más opciones"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <div
                          ref={menuRef}
                          className="absolute right-0 bottom-full mb-1 z-30 w-44 apple-glass border border-black/10 dark:border-white/10 rounded-2xl shadow-xl p-1.5 space-y-0.5 text-xs bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl animate-fade-in"
                        >
                          <button
                            onClick={() => {
                              setActiveMenuJobId(null);
                              onApply(job);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center space-x-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-gray-800 dark:text-gray-200 hover:text-blue-600 transition"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-500" />
                            <span>Adaptar CV con IA</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveMenuJobId(null);
                              setSelectedJobForDetail(job);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-800 dark:text-gray-200 transition"
                          >
                            <Eye className="w-3.5 h-3.5 text-gray-400" />
                            <span>Ver Detalle</span>
                          </button>

                          <button
                            onClick={() => handleFeedback(job.id, 'like')}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center space-x-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-gray-800 dark:text-gray-200 hover:text-emerald-600 transition"
                          >
                            <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Me interesa (Like)</span>
                          </button>

                          <button
                            onClick={() => handleFeedback(job.id, 'dislike')}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center space-x-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-gray-800 dark:text-gray-200 hover:text-rose-600 transition"
                          >
                            <ThumbsDown className="w-3.5 h-3.5 text-rose-400" />
                            <span>Descartar oferta</span>
                          </button>

                          <div className="border-t border-black/5 dark:border-white/5 my-1" />

                          <button
                            onClick={() => handleDeleteFromRadar(job.id)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center space-x-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar del radar</span>
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                </div>

              </div>
            );
          })}
        </div>

        {/* Apple-styled Pagination Controls */}
        <div className="apple-glass apple-card p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Page Size Selector */}
          <div className="flex items-center space-x-2 text-gray-500">
            <span className="font-medium">Ofertas por página:</span>
            <div className="inline-flex items-center bg-gray-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-black/5 dark:border-white/5">
              {[6, 12, 24].map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    setPageSize(size);
                    localStorage.setItem('job_radar_page_size', String(size));
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    pageSize === size
                      ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Page Navigation */}
          {totalPages > 1 && (
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => {
                  setCurrentPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 280, behavior: 'smooth' });
                }}
                disabled={currentPage === 1}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl font-medium border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Anterior</span>
              </button>

              <div className="flex items-center space-x-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    return p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1;
                  })
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    return (
                      <React.Fragment key={p}>
                        {prev && p - prev > 1 && (
                          <span className="text-gray-400 px-1 font-bold">...</span>
                        )}
                        <button
                          onClick={() => {
                            setCurrentPage(p);
                            window.scrollTo({ top: 280, behavior: 'smooth' });
                          }}
                          className={`w-7 h-7 rounded-xl font-semibold flex items-center justify-center transition ${
                            currentPage === p
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                onClick={() => {
                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 280, behavior: 'smooth' });
                }}
                disabled={currentPage === totalPages}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl font-medium border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </>
    )}

      {/* STRATEGY & ATS SLIDE-OVER DRAWER (Progressive Disclosure) */}
      {showStrategyDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="apple-glass bg-white/95 dark:bg-zinc-900/95 w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-black/10 dark:border-white/10 overflow-hidden">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-500" />
                  <span>Estrategia de Búsqueda & Directorio ATS</span>
                </h2>
                <p className="text-xs text-gray-500">
                  Herramientas avanzadas generadas por el agente a partir de tu perfil
                </p>
              </div>
              <button
                onClick={() => setShowStrategyDrawer(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Segmented Tab Bar inside Drawer */}
            <div className="px-5 pt-3">
              <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl text-xs space-x-1">
                <button
                  onClick={() => setStrategyTab('roles')}
                  className={`flex-1 py-1.5 rounded-lg font-semibold transition ${
                    strategyTab === 'roles'
                      ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  🎯 Familias de Roles ({roleRecs.length})
                </button>
                <button
                  onClick={() => setStrategyTab('companies')}
                  className={`flex-1 py-1.5 rounded-lg font-semibold transition ${
                    strategyTab === 'companies'
                      ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  🏢 Directorio Empresas ({companies.length})
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              
              {/* TAB 1: ROLES & ATS DORKS */}
              {strategyTab === 'roles' && (
                <div className="space-y-4">
                  {!hasAnalyzedCV || roleRecs.length === 0 ? (
                    <div className="p-8 text-center space-y-3 apple-glass apple-card rounded-2xl border border-black/5 dark:border-white/5">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                        <SlidersHorizontal className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                        Estrategia Personalizada No Generada Aún
                      </h3>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                        Para que Nexus deduzca tus familias de roles equivalentes, sinónimos ATS y consultas optimizadas para portales a partir de tu perfil real (sin datos genéricos predefinidos), primero debes cargar tu currículum en <strong>Perfil & CV</strong>.
                      </p>
                      <button
                        onClick={() => {
                          setShowStrategyDrawer(false);
                          if (onNavigateToTab) onNavigateToTab('profile');
                        }}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition inline-flex items-center space-x-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Cargar mi CV para Generar Estrategia</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-gray-600 dark:text-gray-300 text-xs">
                          Roles inferidos con Inteligencia Artificial a partir de la evidencia demostrable en tu CV:
                        </p>
                        <button
                          onClick={handleRefreshRecommendations}
                          disabled={isLoadingRecs}
                          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 hover:bg-blue-100 transition shrink-0"
                        >
                          <RefreshCw className={`w-3 h-3 ${isLoadingRecs ? 'animate-spin' : ''}`} />
                          <span>{isLoadingRecs ? 'Analizando...' : 'Recalcular'}</span>
                        </button>
                      </div>

                      {/* Role Cards */}
                      <div className="space-y-2.5">
                        {roleRecs.map((rec) => {
                          const isApproved = rec.approved_by_user !== false;
                          const typeBadge = {
                            direct: { label: 'Coincidencia Directa', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                            transferable: { label: 'Habilidad Transferible', class: 'bg-blue-50 text-blue-700 border-blue-200' },
                            exploratory: { label: 'Exploratoria', class: 'bg-purple-50 text-purple-700 border-purple-200' }
                          }[rec.recommendation_type] || { label: rec.recommendation_type, class: 'bg-gray-100 text-gray-700 border-gray-200' };

                          return (
                            <div
                              key={rec.id}
                              className={`p-3.5 rounded-xl border transition ${
                                isApproved
                                  ? 'bg-white dark:bg-zinc-800/80 border-blue-200 dark:border-blue-900 shadow-2xs'
                                  : 'bg-gray-50/50 dark:bg-zinc-900/40 border-gray-200 opacity-60'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${typeBadge.class}`}>
                                  {typeBadge.label}
                                </span>
                                <span className="text-[10px] text-gray-400 font-medium">{rec.seniority}</span>
                              </div>

                              <h4 className="font-bold text-gray-900 dark:text-white text-xs mt-1.5">
                                {rec.role_family}
                              </h4>

                              <div className="flex flex-wrap gap-1 mt-1">
                                {rec.suggested_titles.map((t, idx) => (
                                  <span key={idx} className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300">
                                    {t}
                                  </span>
                                ))}
                              </div>

                              <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-snug pt-1.5">
                                {rec.reasoning}
                              </p>

                              <div className="pt-2 mt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px]">
                                <span className="text-gray-500">
                                  {isApproved ? '✓ Incluida en búsquedas' : '✗ Descartada'}
                                </span>
                                <button
                                  onClick={() => handleToggleRecStatus(rec.id, rec.approved_by_user)}
                                  className={`px-2 py-0.5 rounded-lg font-semibold transition ${
                                    isApproved ? 'text-rose-600 hover:bg-rose-50' : 'text-blue-600 hover:bg-blue-50'
                                  }`}
                                >
                                  {isApproved ? 'Descartar' : 'Activar'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* ATS Dorks Section */}
                      <div className="pt-3 border-t border-black/5 dark:border-white/5 space-y-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                          Consultas Booleanas ATS Generadas (Google / DuckDuckGo Dorks)
                        </span>

                        <div className="space-y-2">
                          {atsQueries.map((q) => (
                            <div
                              key={q.id}
                              className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-black/5 flex items-center justify-between gap-2"
                            >
                              <div className="space-y-0.5 overflow-hidden">
                                <div className="flex items-center space-x-1.5">
                                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                    {q.target_platform}
                                  </span>
                                  <span className="text-[10px] text-gray-400">• {q.role_family}</span>
                                </div>
                                <p className="font-mono text-[10px] text-gray-600 dark:text-gray-300 truncate" title={q.query_text}>
                                  {q.query_text}
                                </p>
                              </div>

                              <button
                                onClick={() => handleRunATSQuery(q.query_text)}
                                disabled={isExecutingATSQuery === q.query_text}
                                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[10px] flex items-center space-x-1 shrink-0 transition disabled:opacity-50"
                              >
                                <Play className="w-2.5 h-2.5" />
                                <span>{isExecutingATSQuery === q.query_text ? 'Buscando...' : 'Buscar'}</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 2: COMPANIES DIRECTORY */}
              {strategyTab === 'companies' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Filtrar empresa..."
                      value={companySearch}
                      onChange={(e) => setCompanySearch(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/5"
                    />

                    <select
                      value={selectedCompanyCountry}
                      onChange={(e) => setSelectedCompanyCountry(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/5"
                    >
                      <option value="all">Todos los Países</option>
                      <option value="Chile">🇨🇱 Chile</option>
                      <option value="Internacional">🌍 Internacional</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    {companies
                      .filter(c => {
                        const matchSearch = !companySearch || c.name.toLowerCase().includes(companySearch.toLowerCase());
                        const matchCountry = selectedCompanyCountry === 'all' || c.country.toLowerCase() === selectedCompanyCountry.toLowerCase();
                        const matchIndustry = selectedCompanyIndustry === 'all' || c.industry.toLowerCase().includes(selectedCompanyIndustry.toLowerCase());
                        return matchSearch && matchCountry && matchIndustry;
                      })
                      .map((comp) => (
                        <div
                          key={comp.id}
                          className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-black/5 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-gray-900 dark:text-white block">{comp.name}</span>
                            <div className="flex items-center space-x-1.5 text-[10px] text-gray-500">
                              <span>{comp.country === 'Chile' ? '🇨🇱 Chile' : '🌍 Global'}</span>
                              <span>•</span>
                              <span className="text-purple-600 dark:text-purple-400 font-medium">{comp.ats_platform || 'ATS Directo'}</span>
                            </div>
                          </div>

                          {comp.careers_url && (
                            <a
                              href={comp.careers_url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-zinc-700 transition"
                            >
                              <span>Portal</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* MANUAL IMPORT URL MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="apple-glass apple-card max-w-md w-full p-5 sm:p-6 space-y-4 bg-white/95 dark:bg-zinc-900/95 shadow-2xl rounded-t-3xl sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Importar Oferta por URL</h3>
              <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Pega el enlace de una vacante encontrada en LinkedIn, Computrabajo, Get on Board u otro portal para analizarla con IA.
            </p>
            <form onSubmit={handleImport} className="space-y-3">
              <input
                type="url"
                required
                placeholder="https://..."
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isImporting}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50"
                >
                  {isImporting ? 'Analizando...' : 'Importar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLEAR CONFIRM MODAL */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="apple-glass apple-card max-w-sm w-full p-5 sm:p-6 space-y-4 bg-white/95 dark:bg-zinc-900/95 shadow-2xl text-center rounded-t-3xl sm:rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">¿Vaciar ofertas del radar?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Las ofertas guardadas en tu módulo de Seguimiento permanecerán seguras.
              </p>
            </div>
            <div className="flex justify-center space-x-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearAllRadar}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition"
              >
                Sí, vaciar radar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL JOB DETAIL MODAL */}
      {selectedJobForDetail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="apple-glass apple-card max-w-3xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl bg-white/95 dark:bg-zinc-900/95 rounded-t-3xl sm:rounded-3xl">
            
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-black/5 dark:border-white/5 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                    {formatSource(selectedJobForDetail.source)}
                  </span>
                  {selectedJobForDetail.is_remote && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                      🌍 Remoto
                    </span>
                  )}
                  {(() => {
                    const b = getOfferExpirationBadge(selectedJobForDetail.deadline);
                    return b.label ? (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${b.badgeClass}`}>
                        {b.label}
                      </span>
                    ) : null;
                  })()}
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                  {selectedJobForDetail.title}
                </h2>
                <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400 flex-wrap">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedJobForDetail.company}</span>
                  <span>•</span>
                  <span>{selectedJobForDetail.location}</span>
                  {selectedJobForDetail.salary_range && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {selectedJobForDetail.salary_range}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedJobForDetail(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-gray-700 dark:text-gray-300">
              
              {/* Description */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Descripción del Puesto</span>
                <div className="p-4 rounded-xl bg-gray-50/50 dark:bg-zinc-800/40 border border-black/5 dark:border-white/5 whitespace-pre-line leading-relaxed text-xs">
                  {selectedJobForDetail.description}
                </div>
              </div>

              {/* Tags */}
              {selectedJobForDetail.tags && selectedJobForDetail.tags.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Tecnologías Requeridas</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedJobForDetail.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-gray-50 dark:bg-zinc-900/80 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedJobForDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-800 transition"
              >
                Cerrar
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleTrackJob(selectedJobForDetail)}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    isTracked(selectedJobForDetail)
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      : 'border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 text-gray-800 dark:text-white'
                  }`}
                >
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  <span>{isTracked(selectedJobForDetail) ? 'En Seguimiento' : '+ Seguimiento'}</span>
                </button>

                <button
                  onClick={() => {
                    const j = selectedJobForDetail;
                    setSelectedJobForDetail(null);
                    onApply(j);
                  }}
                  className="flex items-center space-x-1 px-3.5 py-2 rounded-xl text-xs font-semibold border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-800 dark:text-white transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Adaptar CV</span>
                </button>

                <button
                  onClick={() => {
                    const j = selectedJobForDetail;
                    handleOneClickApply(j);
                  }}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Postular Ahora</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 5D FIT EVALUATION MODAL */}
      {selectedEvaluation && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="apple-glass apple-card max-w-xl w-full max-h-[92vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 bg-white/95 dark:bg-zinc-900/95 shadow-2xl rounded-t-3xl sm:rounded-3xl">
            
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Diagnóstico de Ajuste (5 Dimensiones)
                </h3>
                <p className="text-xs text-gray-500">Evaluación imparcial de compatibilidad con tu perfil</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {selectedEvaluation.overall_score}%
                </span>
                <p className="text-[11px] font-medium text-gray-500">{selectedEvaluation.verdict}</p>
              </div>
            </div>

            {/* Deal Breakers */}
            {selectedEvaluation.deal_breakers_found.length > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 space-y-1">
                <div className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Condición Excluyente Detectada:</span>
                </div>
                <ul className="list-disc list-inside text-xs text-rose-700 dark:text-rose-300">
                  {selectedEvaluation.deal_breakers_found.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Dimension Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Desglose Dimensional</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {selectedEvaluation.dimension_scores.map((dim, i) => (
                  <div key={i} className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 space-y-1">
                    <div className="flex justify-between items-center text-xs font-medium">
                      <span className="text-gray-800 dark:text-gray-200">{dim.dimension}</span>
                      <span className="text-blue-600 dark:text-blue-400 font-bold">{dim.score}%</span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">{dim.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Strategy */}
            <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 space-y-1">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Recomendación Estratégica:</span>
              <p className="text-xs text-blue-900 dark:text-blue-200">{selectedEvaluation.recommended_action}</p>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setSelectedEvaluation(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NO CV MODAL (Invitation to upload CV for Fit Score) */}
      {showNoCVModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in text-xs">
          <div className="apple-glass apple-card max-w-md w-full p-6 space-y-4 bg-white/95 dark:bg-zinc-900/95 shadow-2xl rounded-2xl border border-black/10 dark:border-white/10">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Se requiere Currículum Vitae
                </h3>
              </div>
              <button
                onClick={() => setShowNoCVModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Para evaluar el <strong>Fit Score</strong> de una vacante y ordenarla de mayor a menor porcentaje, la IA necesita conocer tus antecedentes laborales, formación académica y competencias reales.
            </p>

            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Carga tu documento (PDF, Word) en la pestaña <strong>"Perfil & CV"</strong>. NexusJob procesará tu CV de forma 100% local (Zero-Knowledge, Ley N° 21.719) y activará el motor de compatibilidad sin sesgos.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-black/5 dark:border-white/5">
              <button
                onClick={() => setShowNoCVModal(false)}
                className="px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 font-medium"
              >
                Seguir buscando sin Fit Score
              </button>
              <button
                onClick={() => {
                  setShowNoCVModal(false);
                  if (onNavigateToTab) onNavigateToTab('profile');
                }}
                className="px-4 py-1.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition flex items-center space-x-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Ir a Cargar mi CV</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
