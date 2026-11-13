import React, { useState } from 'react';
import type { JobPosting, CandidateProfile, ApplicationDraft, TrackingHistoryEvent } from '../../types';
import { ApplicationDocumentsTab } from './ApplicationDocumentsTab';
import { ApplicationInterviewTab } from './ApplicationInterviewTab';
import { ApplicationTimelineTab } from './ApplicationTimelineTab';
import { ArrowLeft, ExternalLink, Trash2, Building2, MapPin, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../../components/Toast';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';

interface ApplicationDetailProps {
  job: JobPosting;
  application?: ApplicationDraft | null;
  profile: CandidateProfile | null;
  onBackToList?: () => void;
  onUpdateJob: (updated: JobPosting) => Promise<void>;
  onDeleteJob: (jobId: string) => Promise<void>;
  onAdaptCv: () => Promise<void>;
  isAdapting: boolean;
}

export const ApplicationDetail: React.FC<ApplicationDetailProps> = ({
  job,
  application,
  profile,
  onBackToList,
  onUpdateJob,
  onDeleteJob,
  onAdaptCv,
  isAdapting
}) => {
  const [activeTab, setActiveTab] = useState<'docs' | 'interview' | 'timeline'>('docs');
  const [showOutcomeDialog, setShowOutcomeDialog] = useState(false);
  const [outcomeReason, setOutcomeReason] = useState('');
  const [outcomeFeedback, setOutcomeFeedback] = useState('');
  const toast = useToast();

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === 'rejected') {
      setShowOutcomeDialog(true);
      return;
    }

    const updatedJob: JobPosting = {
      ...job,
      status: newStatus as any,
      applied_date: newStatus === 'applied' && !job.applied_date ? new Date().toISOString() : job.applied_date
    };

    const eventTitles: Record<string, string> = {
      applied: 'Candidatura enviada formalmente',
      contact_received: 'Contacto recibido por el reclutador',
      interview_scheduled: 'Entrevista agendada',
      offer: '🎉 ¡Oferta de empleo recibida!',
      ready_to_send: 'Documentación lista para enviar'
    };

    if (eventTitles[newStatus]) {
      const historyEvent: TrackingHistoryEvent = {
        id: 'evt_' + Date.now(),
        timestamp: new Date().toISOString(),
        event_type: newStatus === 'offer' ? 'offer' : 'note',
        title: eventTitles[newStatus],
        date: new Date().toISOString().substring(0, 10)
      };
      updatedJob.history = [historyEvent, ...(job.history || [])];
    }

    await onUpdateJob(updatedJob);
    toast.success('Estado actualizado');
  };

  const handleSaveOutcome = async (wasSuccessful: boolean) => {
    try {
      await api.submitOutcome({
        job_id: job.id,
        status: wasSuccessful ? 'offer' : 'rejected',
        was_successful: wasSuccessful,
        reason: outcomeReason,
        feedback_details: outcomeFeedback
      });

      const updatedJob: JobPosting = {
        ...job,
        status: wasSuccessful ? 'offer' : 'rejected',
        outcome_success: wasSuccessful,
        outcome_reason: outcomeReason,
        outcome_feedback: outcomeFeedback,
        outcome_date: new Date().toISOString()
      };
      await onUpdateJob(updatedJob);
      setShowOutcomeDialog(false);
      toast.info('Resultado registrado en el historial de aprendizaje');
    } catch (e: any) {
      toast.error('Error al guardar desenlace: ' + (e?.message || e));
    }
  };

  const handleAddHistoryEvent = async (event: TrackingHistoryEvent) => {
    const updatedJob: JobPosting = {
      ...job,
      history: [event, ...(job.history || [])]
    };
    await onUpdateJob(updatedJob);
  };

  return (
    <div className="space-y-5">
      {/* Barra superior: Volver (móvil), Título, Enlace y Eliminar */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-sm space-y-4">
        {onBackToList && (
          <button
            type="button"
            onClick={onBackToList}
            className="lg:hidden inline-flex items-center gap-1.5 min-h-[44px] text-xs font-semibold text-ink-muted hover:text-ink dark:hover:text-white cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la lista de postulaciones</span>
          </button>
        )}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-ink-muted">
              <Building2 className="w-3.5 h-3.5" />
              <span className="font-semibold text-ink dark:text-gray-300">{job.company}</span>
              <span>•</span>
              <span>{job.location || 'Chile'}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-ink dark:text-gray-100 leading-snug">
              {job.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {job.url && (
              <a
                href={job.url}
                target="_blank"
                rel="noreferrer"
                aria-label="Abrir oferta original"
                className="p-2 min-h-[44px] rounded-xl border border-gray-200 dark:border-zinc-700 text-ink-muted hover:text-ink dark:hover:text-white text-xs flex items-center gap-1 transition focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
                title="Abrir oferta original"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Oferta</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                if (window.confirm('¿Seguro que deseas eliminar esta postulación?')) {
                  onDeleteJob(job.id);
                }
              }}
              aria-label="Quitar postulación"
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-ink-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500/40 focus-visible:outline-none"
              title="Quitar postulación"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Selector de estado directo en 1 clic */}
        <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-500">Estado:</span>
            <select
              value={job.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 font-semibold text-gray-900 dark:text-gray-100 focus:outline-none"
            >
              <optgroup label="Etapa inicial">
                <option value="applied_no_response">Guardada / Por preparar</option>
                <option value="ready_to_send">Documentos listos para enviar</option>
              </optgroup>
              <optgroup label="En proceso">
                <option value="applied">Postulación enviada</option>
                <option value="contact_received">Contacto de reclutador recibido</option>
                <option value="interview_scheduled">Entrevista agendada</option>
                <option value="interview_done">Entrevista realizada</option>
                <option value="final_stage">Etapa final</option>
              </optgroup>
              <optgroup label="Desenlace">
                <option value="offer">🎉 Oferta recibida</option>
                <option value="rejected">❌ Proceso finalizado / Descartada</option>
              </optgroup>
            </select>
          </div>

          {job.applied_date && (
            <span className="text-xs text-gray-400">
              Enviada el: {new Date(job.applied_date).toLocaleDateString('es-CL')}
            </span>
          )}
        </div>
      </div>

      {/* Navegación por 3 pestañas */}
      <div className="flex border-b border-gray-200 dark:border-zinc-800 gap-4 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('docs')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'docs' ? 'border-[#20A88A] text-[#20A88A]' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          1. Documentos (CV y Carta)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('interview')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'interview' ? 'border-[#20A88A] text-[#20A88A]' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          2. Preparar entrevista
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'timeline' ? 'border-[#20A88A] text-[#20A88A]' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          3. Historial y notas
        </button>
      </div>

      {/* Contenido de la pestaña activa */}
      {activeTab === 'docs' && (
        <ApplicationDocumentsTab
          job={job}
          application={application}
          profile={profile}
          onAdaptCv={onAdaptCv}
          isAdapting={isAdapting}
        />
      )}

      {activeTab === 'interview' && (
        <ApplicationInterviewTab
          job={job}
          profile={profile}
        />
      )}

      {activeTab === 'timeline' && (
        <ApplicationTimelineTab
          job={job}
          onAddHistoryEvent={handleAddHistoryEvent}
        />
      )}

      {/* Modal de retroalimentación al cerrar proceso */}
      <Dialog
        isOpen={showOutcomeDialog}
        onClose={() => setShowOutcomeDialog(false)}
        title="Registrar resultado del proceso"
        description="Registrar si te dieron feedback ayuda a Opi a sugerir mejoras en tus postulaciones futuras:"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="outcome-feedback" className="block text-xs font-semibold text-ink dark:text-gray-200">
              Motivo o comentario (opcional):
            </label>
            <textarea
              id="outcome-feedback"
              rows={3}
              value={outcomeFeedback}
              onChange={(e) => setOutcomeFeedback(e.target.value)}
              placeholder="Ej. Buscaban alguien con más experiencia en Kubernetes, o el proceso se pausó..."
              className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-ink dark:text-white resize-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setShowOutcomeDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              onClick={() => handleSaveOutcome(false)}
            >
              Guardar como cerrada
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
