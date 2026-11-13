import React, { useState } from 'react';
import type { LearningPath } from '../../types';
import { Route, Sparkles, CheckCircle2, Circle, Clock, Loader2, ArrowRight } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../../components/Toast';

interface LearningPathsTabProps {
  learningPaths: LearningPath[];
  onPathsUpdated: () => void;
  targetRole: string;
}

export const LearningPathsTab: React.FC<LearningPathsTabProps> = ({
  learningPaths,
  onPathsUpdated,
  targetRole
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [roleInput, setRoleInput] = useState(targetRole || 'Desarrollador Fullstack');
  const toast = useToast();

  const handleGeneratePath = async () => {
    if (!roleInput.trim()) return;
    setIsGenerating(true);
    try {
      await api.generateLearningPath(roleInput.trim(), []);
      toast.success('Ruta de aprendizaje generada con IA');
      onPathsUpdated();
    } catch (e: any) {
      toast.error('Error al generar ruta: ' + (e?.message || e));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Generador de Ruta con IA */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4 text-[#20A88A]" />
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            Diseñar Ruta de Aprendizaje Personalizada
          </h2>
        </div>
        <p className="text-xs text-gray-500">
          La IA crea una secuencia lógica de hitos y proyectos prácticos para alcanzar tu cargo objetivo.
        </p>

        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <input
            type="text"
            value={roleInput}
            onChange={(e) => setRoleInput(e.target.value)}
            placeholder="Cargo objetivo (ej. Tech Lead, Product Manager, Data Engineer)..."
            className="flex-1 min-w-[220px] px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleGeneratePath}
            disabled={isGenerating || !roleInput.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#20A88A] hover:bg-[#18856d] text-white font-semibold shadow-xs transition disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generando ruta...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Crear ruta con IA</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Rutas existentes */}
      <div className="space-y-4">
        {learningPaths.length > 0 ? (
          learningPaths.map((path) => (
            <div
              key={path.id || path.title}
              className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-sm space-y-4 text-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 dark:border-zinc-800 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                    {path.title}
                  </h3>
                  <p className="text-gray-500">
                    Objetivo: <strong>{path.target_role}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {path.estimated_weeks && (
                    <span className="flex items-center gap-1 text-gray-500 bg-gray-50 dark:bg-zinc-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-zinc-700">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span>{path.estimated_weeks} semanas estimadas</span>
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-[#20A88A] font-bold border border-teal-200/60">
                    {path.progress_percentage || 0}% avance
                  </span>
                </div>
              </div>

              {path.overview && (
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {path.overview}
                </p>
              )}

              {/* Hitos secuenciales */}
              <div className="space-y-2.5 pt-1">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
                  Hitos de la Ruta ({path.milestones?.length || 0})
                </span>

                <div className="space-y-2">
                  {path.milestones?.map((milestone, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200/60 dark:border-zinc-700/60 flex items-start gap-3"
                    >
                      <div className="mt-0.5">
                        {milestone.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-300" />
                        )}
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900 dark:text-gray-100 text-xs">
                            Paso {milestone.step_number}: {milestone.title}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          {milestone.objective}
                        </p>
                        {milestone.practical_activity && (
                          <p className="text-xs text-teal-700 dark:text-teal-300 bg-teal-50/50 dark:bg-teal-950/30 p-2 rounded-lg border border-teal-100 dark:border-teal-900/40">
                            <strong>Actividad práctica:</strong> {milestone.practical_activity}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800 text-xs text-gray-400">
            Aún no has generado rutas de aprendizaje. Escribe tu rol objetivo arriba para crear una.
          </div>
        )}
      </div>
    </div>
  );
};
