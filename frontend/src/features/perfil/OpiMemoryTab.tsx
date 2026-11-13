import React, { useState } from 'react';
import type { UserPreferences } from '../../types';
import { Brain, Trash2, RotateCcw, Sparkles, CheckCircle2, Shield, Info } from 'lucide-react';
import { useToast } from '../../components/Toast';

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
            <Brain className="w-4 h-4 text-[#20A88A]" />
            Lo que Opi sabe de ti
          </h2>
          <p className="text-xs text-gray-500">
            Conocimientos que el asistente ha deducido de tus búsquedas e interacciones. Tú tienes el control total.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowConfirmReset(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 text-xs font-semibold transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reiniciar memoria</span>
        </button>
      </div>

      {/* Síntesis de perfil cognitivo (DNA) si existe */}
      {dna && (
        <div className="p-5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/40 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-teal-900 dark:text-teal-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#20A88A]" />
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
          <CheckCircle2 className="w-3.5 h-3.5 text-[#20A88A]" />
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
                  <span className="w-1.5 h-1.5 rounded-full bg-[#20A88A] shrink-0" />
                  <span className="text-gray-800 dark:text-gray-200 leading-relaxed">
                    {insight}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleForgetInsight(idx)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0"
                  title="Olvidar este dato"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800 text-xs text-gray-400 space-y-1">
            <Info className="w-5 h-5 mx-auto text-gray-400" />
            <p>Opi aún no ha memorizado patrones adicionales sobre ti.</p>
          </div>
        )}
      </div>

      {/* Modal de confirmación para reiniciar memoria */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowConfirmReset(false)} className="fixed inset-0 bg-black/40 backdrop-blur-xs" />
          <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 z-10 space-y-4 shadow-2xl text-xs">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              ¿Reiniciar la memoria de Opi?
            </h3>
            <p className="text-gray-500 leading-relaxed">
              Esta acción borrará los insights aprendidos y el ADN profesional deducido. Tu currículum y preferencias guardadas se mantendrán intactos.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmReset(false)}
                className="px-3.5 py-2 rounded-xl text-gray-500 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleResetMemory}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition"
              >
                Sí, reiniciar memoria
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
