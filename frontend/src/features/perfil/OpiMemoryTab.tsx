import React, { useState } from 'react';
import type { UserPreferences } from '../../types';
import { Brain, Trash2, RotateCcw, Sparkles, CheckCircle2, Shield, Info } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';

interface OpiMemoryTabProps {
  preferences: UserPreferences;
  onPreferencesUpdated: (updated: UserPreferences) => void;
}

export const OpiMemoryTab: React.FC<OpiMemoryTabProps> = ({
  preferences,
  onPreferencesUpdated
}) => {
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const toast = useToast();

  const insights = preferences.auto_learned_insights || [];
  const dna = preferences.profile_dna;

  const handleForgetInsight = (index: number) => {
    const next = insights.filter((_, i) => i !== index);
    onPreferencesUpdated({ ...preferences, auto_learned_insights: next });
    toast.info('Insight eliminado de la memoria de Opi');
  };

  const handleResetMemory = () => {
    onPreferencesUpdated({
      ...preferences,
      auto_learned_insights: [],
      profile_dna: undefined,
      industry_insights: []
    });
    setShowConfirmReset(false);
    toast.success('Memoria de Opi reiniciada a cero');
  };

  return (
    <div className="space-y-6">
      {/* Cabecera explicativa */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Brain className="w-4 h-4 text-brand" />
            Lo que Opi sabe de ti
          </h2>
          <p className="text-xs text-gray-500">
            Conocimientos que el asistente ha deducido de tus búsquedas e interacciones. Tú tienes el control total.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowConfirmReset(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[44px] rounded-xl border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 text-xs font-semibold transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reiniciar memoria</span>
        </button>
      </div>

      {/* Síntesis de perfil cognitivo (DNA) si existe */}
      {dna && (
        <div className="p-5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/40 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-teal-900 dark:text-teal-200 uppercase tracking-wider text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand" />
              Resumen de Personalidad Profesional
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-white dark:bg-zinc-900 text-teal-800 dark:text-teal-300 font-semibold border border-teal-200/50">
              Nivel: {dna.seniority_level || 'Profesional'}
            </span>
          </div>

          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {dna.summary}
          </p>

          {dna.core_strengths && dna.core_strengths.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {dna.core_strengths.map((str, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 text-teal-900 dark:text-teal-200 font-medium border border-teal-200/50"
                >
                  {str}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lista de insights aprendidos */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-brand" />
          Patrones e Insights Memorizados ({insights.length})
        </h3>

        {insights.length > 0 ? (
          <div className="space-y-2">
            {insights.map((insight, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-xs flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                  <span className="text-gray-800 dark:text-gray-200 leading-relaxed">
                    {insight}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleForgetInsight(idx)}
                  aria-label={`Olvidar aprendizaje: ${insight}`}
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-ink-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500/40 focus-visible:outline-none"
                  title="Olvidar este dato"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800 text-xs text-ink-muted space-y-1">
            <Info className="w-5 h-5 mx-auto text-ink-muted" />
            <p>Opi aún no ha memorizado patrones adicionales sobre ti.</p>
          </div>
        )}
      </div>

      {/* Modal de confirmación para reiniciar memoria */}
      <Dialog
        isOpen={showConfirmReset}
        onClose={() => setShowConfirmReset(false)}
        title="¿Reiniciar la memoria de Opi?"
        description="Esta acción borrará los insights aprendidos y el ADN profesional deducido. Tu currículum y preferencias guardadas se mantendrán intactos."
        maxWidth="sm"
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => setShowConfirmReset(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={handleResetMemory}
          >
            Reiniciar memoria
          </Button>
        </div>
      </Dialog>
    </div>
  );
};
