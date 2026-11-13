import React, { useState } from 'react';
import type { CandidateProfile, TutorPracticeChallenge, TutorEvaluationResult } from '../../types';
import { InterviewSimulator } from '../shared/InterviewSimulator';
import { Sparkles, Terminal, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../../components/Toast';

interface PracticeTabProps {
  profile: CandidateProfile | null;
}

export const PracticeTab: React.FC<PracticeTabProps> = ({ profile }) => {
  const [activeMode, setActiveMode] = useState<'interview' | 'case'>('interview');
  const [competencyInput, setCompetencyInput] = useState('Resolución de problemas en producción');
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);
  const [challenge, setChallenge] = useState<TutorPracticeChallenge | null>(null);
  const [solution, setSolution] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<TutorEvaluationResult | null>(null);
  const toast = useToast();

  const handleGenerateChallenge = async () => {
    if (!competencyInput.trim()) return;
    setIsGeneratingChallenge(true);
    setEvaluationResult(null);
    setSolution('');
    try {
      const res = await api.generateTutorChallenge(competencyInput.trim(), 'Intermedio', profile || undefined);
      setChallenge(res);
      toast.success('Desafío práctico generado con éxito');
    } catch (e: any) {
      toast.error('Error al generar caso: ' + (e?.message || e));
    } finally {
      setIsGeneratingChallenge(false);
    }
  };

  const handleEvaluateSolution = async () => {
    if (!challenge || !solution.trim()) return;
    setIsEvaluating(true);
    try {
      const res = await api.evaluateTutorSolution(challenge, solution.trim(), profile || undefined);
      setEvaluationResult(res);
      toast.success('Solución evaluada por el Tutor IA');
    } catch (e: any) {
      toast.error('Error al evaluar solución: ' + (e?.message || e));
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Switcher de modalidad: Entrevista vs Caso Práctico */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#20A88A]" />
            Entrenamiento Activo y Práctica
          </h2>
          <p className="text-xs text-gray-500">
            Simula respuestas conductuales STAR o resuelve desafíos técnicos con retroalimentación inmediata.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveMode('interview')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeMode === 'interview' ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500'
            }`}
          >
            Simulador de Entrevista
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('case')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeMode === 'case' ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500'
            }`}
          >
            Casos Prácticos & Tutor
          </button>
        </div>
      </div>

      {/* Vista según modo */}
      {activeMode === 'interview' ? (
        <InterviewSimulator profile={profile || undefined} />
      ) : (
        /* Caso Práctico */
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-sm space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#20A88A]" />
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                Generador de Casos y Retos de Estudio
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={competencyInput}
                onChange={(e) => setCompetencyInput(e.target.value)}
                placeholder="Competencia a entrenar (ej. Docker, Negociación, SQL)..."
                className="flex-1 min-w-[240px] px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleGenerateChallenge}
                disabled={isGeneratingChallenge || !competencyInput.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#20A88A] hover:bg-[#18856d] text-white font-semibold shadow-xs transition disabled:opacity-50"
              >
                {isGeneratingChallenge ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generando reto...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Crear reto práctico</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {challenge && (
            <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-sm space-y-4 text-xs animate-fade-in">
              <div className="space-y-1">
                <span className="text-xs uppercase font-bold text-[#20A88A] tracking-wider">
                  Caso Asignado ({challenge.difficulty || 'Intermedio'})
                </span>
                <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100">
                  {challenge.scenario_title}
                </h4>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200/60 dark:border-zinc-700/60 space-y-2 leading-relaxed">
                <p className="text-gray-800 dark:text-gray-200 font-medium">
                  {challenge.scenario_context}
                </p>
                <p className="text-gray-700 dark:text-gray-300 font-semibold border-t border-gray-200/50 pt-2">
                  Desafío: {challenge.problem_statement}
                </p>
              </div>

              {/* Área de respuesta del candidato */}
              {!evaluationResult ? (
                <div className="space-y-3">
                  <textarea
                    rows={5}
                    value={solution}
                    onChange={(e) => setSolution(e.target.value)}
                    placeholder="Escribe tu propuesta de solución técnica o metodológica detallando los pasos que ejecutarías..."
                    className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-[#20A88A]/30 leading-relaxed"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleEvaluateSolution}
                      disabled={isEvaluating || !solution.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#20A88A] hover:bg-[#18856d] text-white font-semibold shadow-xs transition disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isEvaluating ? 'Evaluando...' : 'Enviar solución al Tutor'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Reporte de evaluación del tutor */
                <div className="space-y-3 pt-2">
                  <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 flex items-center justify-between">
                    <div>
                      <span className="text-lg font-bold text-[#20A88A]">{evaluationResult.score}/100</span>
                      <p className="text-teal-900 dark:text-teal-200 text-xs font-semibold">{evaluationResult.technical_correctness}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEvaluationResult(null)}
                      className="text-xs text-gray-500 hover:text-gray-900 font-medium"
                    >
                      Intentar otra vez
                    </button>
                  </div>

                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {evaluationResult.feedback}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
