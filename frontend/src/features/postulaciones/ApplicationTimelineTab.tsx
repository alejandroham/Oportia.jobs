import React, { useState } from 'react';
import type { JobPosting, TrackingHistoryEvent } from '../../types';
import { Calendar, Plus, Clock, FileText } from 'lucide-react';
import { useToast } from '../../components/Toast';

interface ApplicationTimelineTabProps {
  job: JobPosting;
  onAddHistoryEvent: (event: TrackingHistoryEvent) => Promise<void>;
}

export const ApplicationTimelineTab: React.FC<ApplicationTimelineTabProps> = ({
  job,
  onAddHistoryEvent
}) => {
  const [noteText, setNoteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const history = job.history || [];

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNote = noteText.trim();
    if (!cleanNote) return;

    setIsSubmitting(true);
    try {
      const newEvent: TrackingHistoryEvent = {
        id: 'evt_' + Date.now(),
        timestamp: new Date().toISOString(),
        event_type: 'note',
        title: cleanNote,
        date: new Date().toISOString().substring(0, 10),
        notes: cleanNote
      };
      await onAddHistoryEvent(newEvent);
      setNoteText('');
      toast.success('Nota agregada a la bitácora');
    } catch (e: any) {
      toast.error('Error al agregar nota: ' + (e?.message || e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      return new Date(isoStr).toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-5">
      {/* Formulario para agregar una nota */}
      <form onSubmit={handleAddNote} className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-sm space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-[#20A88A]" />
          Nueva nota de seguimiento
        </label>
        <textarea
          rows={2}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Ej. Llamó Camila de RRHH para agendar entrevista técnica el martes 15 a las 11:00..."
          className="w-full text-xs p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#20A88A]/30 resize-none leading-relaxed"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !noteText.trim()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#20A88A] hover:bg-[#18856d] text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Guardar nota</span>
          </button>
        </div>
      </form>

      {/* Bitácora cronológica */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#20A88A]" />
          Historial de eventos
        </h4>

        {history.length > 0 ? (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-zinc-800">
            {history.map((evt, idx) => (
              <div key={evt.id || idx} className="relative space-y-1">
                <span className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-[#20A88A] border-2 border-white dark:border-zinc-900 shadow-xs" />
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {evt.title}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDate(evt.timestamp || evt.date)}
                  </span>
                </div>
                {evt.notes && evt.notes !== evt.title && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {evt.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800 text-xs text-gray-400">
            Aún no hay eventos ni notas registradas para esta postulación.
          </div>
        )}
      </div>
    </div>
  );
};
