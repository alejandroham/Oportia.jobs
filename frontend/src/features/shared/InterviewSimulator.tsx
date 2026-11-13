import React, { useState } from 'react';
import { api } from '../../api';
import { useToast } from '../../components/Toast';
import { Mic, MicOff, Send, Sparkles, RotateCcw, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import type { JobPosting, CandidateProfile } from '../../types';

interface InterviewSimulatorProps {
  jobContext?: { title: string; company?: string };
  job?: JobPosting;
  profile?: CandidateProfile;
  initialQuestion?: string;
  onAnswerEvaluated?: (result: any) => void;
  className?: string;
}

export const InterviewSimulator: React.FC<InterviewSimulatorProps> = ({
  jobContext,
  job,
  profile,
  initialQuestion,
  onAnswerEvaluated,
  className = ''
}) => {
  const toast = useToast();
  const defaultQuestion =
    initialQuestion ||
    (jobContext
      ? `Cuéntame sobre una ocasión en la que tuviste que resolver un desafío complejo relevante para el rol de ${jobContext.title}.`
      : 'Cuéntame sobre una situación laboral desafiante, qué tarea tenías asignada, qué acciones tomaste y cuál fue el resultado cuantificable.');

  const [question, setQuestion] = useState<string>(defaultQuestion);
  const [answer, setAnswer] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);

  // Reconocimiento de voz simple si está disponible
  const handleToggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.info('Reconocimiento de voz no soportado por tu navegador. Puedes escribir tu respuesta.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-CL';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setAnswer(prev => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  const handleEvaluate = async () => {
    if (!answer.trim() || answer.trim().length < 15) {
      toast.info('Por favor escribe una respuesta más detallada para evaluarla.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.evaluateInterviewAnswer(
        question,
        answer,
        jobContext?.company,
        job,
        profile
      );
      setEvaluationResult(res);
      if (onAnswerEvaluated) onAnswerEvaluated(res);
      toast.success('Respuesta evaluada con éxito');
    } catch (e: any) {
      toast.error('Error al evaluar respuesta: ' + (e?.message || e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setAnswer('');
    setEvaluationResult(null);
  };

  return (
    <div className={`p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-sm space-y-4 ${className}`}>
      {/* Cabecera del simulador */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-[#20A88A]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Simulador de Entrevistas STAR
            </h3>
            {jobContext?.company && (
              <p className="text-xs text-gray-500">
                Contexto: {jobContext.title} en {jobContext.company}
              </p>
            )}
          </div>
        </div>

        {/* Guía metodológica rápida */}
        <div className="hidden sm:flex items-center gap-1 text-xs font-semibold text-gray-500">
          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">S: Situación</span>
          <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">T: Tarea</span>
          <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700">A: Acción</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">R: Resultado</span>
        </div>
      </div>

      {/* Pregunta a responder */}
      <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200/60 dark:border-zinc-700/60">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-[#20A88A]" />
          Pregunta de la entrevista:
        </label>
        <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">
          "{question}"
        </p>
      </div>

      {/* Área de respuesta o Resultados */}
      {!evaluationResult ? (
        <div className="space-y-3">
          <div className="relative">
            <textarea
              rows={4}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Describe la Situación inicial, la Tarea o desafío que enfrentaste, las Acciones concretas que lideraste y los Resultados medibles que obtuviste..."
              className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#20A88A]/30 resize-none leading-relaxed"
            />
            {isRecording && (
              <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full text-xs font-medium border border-rose-200 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                Grabando audio...
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                isRecording
                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                  : 'bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
              }`}
            >
              {isRecording ? <MicOff className="w-3.5 h-3.5 text-rose-600" /> : <Mic className="w-3.5 h-3.5 text-gray-500" />}
              <span>{isRecording ? 'Detener voz' : 'Dictar por voz'}</span>
            </button>

            <button
              type="button"
              onClick={handleEvaluate}
              disabled={isSubmitting || !answer.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#20A88A] hover:bg-[#18856d] text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Evaluando...' : 'Evaluar mi respuesta'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Reporte de evaluación */
        <div className="space-y-4 pt-1 animate-fade-in">
          <div className="flex items-center justify-between p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800/40">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-[#20A88A]">
                {evaluationResult.score ?? evaluationResult.star_score ?? 85}%
              </span>
              <span className="text-xs font-medium text-teal-900 dark:text-teal-200">
                Puntaje de impacto STAR
              </span>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Practicar otra vez</span>
            </button>
          </div>

          {evaluationResult.feedback && (
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
              {evaluationResult.feedback}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {evaluationResult.strengths && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 space-y-1">
                <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Fortalezas destacadas:
                </span>
                <p className="text-emerald-900 dark:text-emerald-200 leading-relaxed">
                  {Array.isArray(evaluationResult.strengths) ? evaluationResult.strengths.join(', ') : evaluationResult.strengths}
                </p>
              </div>
            )}
            {evaluationResult.areas_for_improvement && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 space-y-1">
                <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Oportunidad de mejora:
                </span>
                <p className="text-amber-900 dark:text-amber-200 leading-relaxed">
                  {Array.isArray(evaluationResult.areas_for_improvement) ? evaluationResult.areas_for_improvement.join(', ') : evaluationResult.areas_for_improvement}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
