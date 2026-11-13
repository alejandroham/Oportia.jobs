import React, { useState, useMemo } from 'react';
import type { JobPosting, ApplicationDraft, CandidateProfile } from '../../types';
import { useAppStore } from '../../state/useAppStore';
import { ApplicationList } from './ApplicationList';
import { ApplicationDetail } from './ApplicationDetail';
import { EmptyState } from '../../components/common/EmptyState';
import { Briefcase, Plus, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, isAINotConnectedError, getHumanErrorMessage } from '../../api';
import { useToast } from '../../components/Toast';

interface ApplicationsPageProps {
  jobs: JobPosting[];
  applications: ApplicationDraft[];
  profile: CandidateProfile | null;
  onRefresh?: () => Promise<void>;
  onApply: (job: JobPosting) => Promise<void>;
}

type StatusFilter = 'all' | 'saved' | 'applied' | 'interview' | 'offer' | 'closed';

export const ApplicationsPage: React.FC<ApplicationsPageProps> = ({
  jobs,
  applications,
  profile,
  onApply
}) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { addOrUpdateJob, removeJob, addOrUpdateApplication, preferences } = useAppStore();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isAdapting, setIsAdapting] = useState(false);

  // Consideramos postulaciones a todas las ofertas que no están solo en estado 'discovered'
  const trackedJobs = useMemo(() => {
    return jobs.filter((j) => j.status && j.status !== 'discovered');
  }, [jobs]);

  // Filtrado por estado
  const filteredJobs = useMemo(() => {
    return trackedJobs.filter((j) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'saved') {
        return j.status === 'applied_no_response' || j.status === 'ready_to_send' || j.status === 'saved';
      }
      if (statusFilter === 'applied') {
        return j.status === 'applied' || j.status === 'pending_send';
      }
      if (statusFilter === 'interview') {
        return (
          j.status === 'interview_scheduled' ||
          j.status === 'interview_done' ||
          j.status === 'final_stage' ||
          j.status === 'contact_received' ||
          j.status === 'interviewing'
        );
      }
      if (statusFilter === 'offer') {
        return j.status === 'offer';
      }
      if (statusFilter === 'closed') {
        return j.status === 'rejected' || j.status === 'archived';
      }
      return true;
    });
  }, [trackedJobs, statusFilter]);

  // Si no hay seleccionado y hay elementos, seleccionar el primero en desktop
  const activeJob = useMemo(() => {
    if (selectedJobId) {
      return trackedJobs.find((j) => j.id === selectedJobId) || null;
    }
    return filteredJobs[0] || null;
  }, [selectedJobId, trackedJobs, filteredJobs]);

  const activeApplication = useMemo(() => {
    if (!activeJob) return null;
    return applications.find((a) => a.job_id === activeJob.id) || null;
  }, [activeJob, applications]);

  // Adaptar CV con IA para la postulación activa
  const handleAdaptCv = async () => {
    if (!activeJob) return;
    if (!profile) {
      toast.error('Primero sube tu CV en Mi perfil para adaptar la postulación.');
      return;
    }
    setIsAdapting(true);
    try {
      const draft = await api.applyJob(activeJob, profile, preferences);
      await addOrUpdateApplication(draft);
      const updatedJob: JobPosting = {
        ...activeJob,
        tailored_cv_markdown: draft.tailored_cv_markdown,
        tailored_cover_letter: draft.cover_letter
      };
      await addOrUpdateJob(updatedJob);
      toast.success('CV y carta adaptados con IA');
    } catch (e: any) {
      if (isAINotConnectedError(e)) {
        toast.info('Para adaptar tu CV con IA, conecta tu clave en Ajustes.');
      } else {
        toast.error('Error al adaptar documentos: ' + getHumanErrorMessage(e));
      }
    } finally {
      setIsAdapting(false);
    }
  };

  const handleUpdateJob = async (updated: JobPosting) => {
    await addOrUpdateJob(updated);
  };

  const handleDeleteJob = async (jobId: string) => {
    await removeJob(jobId);
    if (selectedJobId === jobId) {
      setSelectedJobId(null);
    }
    toast.info('Postulación eliminada del seguimiento');
  };

  if (trackedJobs.length === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Mis postulaciones
          </h1>
          <p className="text-xs text-gray-500">
            Gestiona tus procesos de selección, documentos adaptados y preparación de entrevistas.
          </p>
        </div>

        <EmptyState
          icon={Briefcase}
          title="Aún no guardas postulaciones"
          description="Explora las ofertas disponibles en el radar, guarda las que te interesen o postula con un CV adaptado."
          actionLabel="Buscar empleo"
          onAction={() => navigate('/empleos')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera y Filtros de estado por pastillas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Mis postulaciones
          </h1>
          <p className="text-xs text-gray-500">
            {trackedJobs.length} procesos activos · Haz clic para ver documentos y preparar entrevistas
          </p>
        </div>

        {/* Pastillas de filtro */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-2 min-h-[38px] rounded-xl transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none ${
              statusFilter === 'all' ? 'bg-white dark:bg-zinc-900 text-ink dark:text-white shadow-xs font-bold' : 'text-ink-muted hover:text-ink dark:hover:text-white'
            }`}
          >
            Todas ({trackedJobs.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('saved')}
            className={`px-3 py-2 min-h-[38px] rounded-xl transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none ${
              statusFilter === 'saved' ? 'bg-white dark:bg-zinc-900 text-ink dark:text-white shadow-xs font-bold' : 'text-ink-muted hover:text-ink dark:hover:text-white'
            }`}
          >
            Guardadas
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('applied')}
            className={`px-3 py-2 min-h-[38px] rounded-xl transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none ${
              statusFilter === 'applied' ? 'bg-white dark:bg-zinc-900 text-ink dark:text-white shadow-xs font-bold' : 'text-ink-muted hover:text-ink dark:hover:text-white'
            }`}
          >
            Postuladas
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('interview')}
            className={`px-3 py-2 min-h-[38px] rounded-xl transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none ${
              statusFilter === 'interview' ? 'bg-white dark:bg-zinc-900 text-ink dark:text-white shadow-xs font-bold' : 'text-ink-muted hover:text-ink dark:hover:text-white'
            }`}
          >
            En entrevista
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('offer')}
            className={`px-3 py-2 min-h-[38px] rounded-xl transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none ${
              statusFilter === 'offer' ? 'bg-white dark:bg-zinc-900 text-ink dark:text-white shadow-xs font-bold' : 'text-ink-muted hover:text-ink dark:hover:text-white'
            }`}
          >
            Oferta
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('closed')}
            className={`px-3 py-2 min-h-[38px] rounded-xl transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none ${
              statusFilter === 'closed' ? 'bg-white dark:bg-zinc-900 text-ink dark:text-white shadow-xs font-bold' : 'text-ink-muted hover:text-ink dark:hover:text-white'
            }`}
          >
            Cerradas
          </button>
        </div>
      </div>

      {/* Disposición Master-Detail (2 columnas en desktop, vista alterna en móvil) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda: Lista de postulaciones */}
        <div className={`lg:col-span-5 ${selectedJobId ? 'hidden lg:block' : 'block'}`}>
          <ApplicationList
            jobs={filteredJobs}
            selectedJobId={activeJob?.id || null}
            onSelectJob={(j) => setSelectedJobId(j.id)}
          />
        </div>

        {/* Columna Derecha: Detalle de la postulación activa */}
        <div className={`lg:col-span-7 ${selectedJobId ? 'block' : 'hidden lg:block'}`}>
          {activeJob ? (
            <ApplicationDetail
              job={activeJob}
              application={activeApplication}
              profile={profile}
              onBackToList={() => setSelectedJobId(null)}
              onUpdateJob={handleUpdateJob}
              onDeleteJob={handleDeleteJob}
              onAdaptCv={handleAdaptCv}
              isAdapting={isAdapting}
            />
          ) : (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 text-xs text-gray-400">
              Selecciona una postulación del listado para ver sus documentos y bitácora.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
