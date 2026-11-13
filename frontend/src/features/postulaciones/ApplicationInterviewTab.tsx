import React, { useState } from 'react';
import type { JobPosting, CandidateProfile } from '../../types';
import { InterviewSimulator } from '../shared/InterviewSimulator';
import { HelpCircle, DollarSign, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';

interface ApplicationInterviewTabProps {
  job: JobPosting;
  profile: CandidateProfile | null;
}

export const ApplicationInterviewTab: React.FC<ApplicationInterviewTabProps> = ({
  job,
  profile
}) => {
  const [showTips, setShowTips] = useState(false);

  const anticipatedQuestions = [
    `¿Por qué te interesa el puesto de ${job.title} en ${job.company}?`,
    `¿Qué experiencia previa tienes en las responsabilidades clave de esta vacante?`,
    `Cuéntame sobre algún proyecto desafiante en el que hayas aplicado tus principales habilidades técnicas.`
  ];

  const questionsToAsk = [
    '¿Cuáles son los principales desafíos de este equipo durante los primeros 6 meses?',
    '¿Cómo miden el éxito en esta posición?',
    '¿Qué oportunidades de crecimiento y desarrollo ofrecen dentro de la empresa?'
  ];

  return (
    <div className="space-y-6">
      {/* Simulador STAR interactivo vinculado al cargo */}
      <InterviewSimulator
        jobContext={{ title: job.title, company: job.company }}
        job={job}
        profile={profile || undefined}
        initialQuestion={anticipatedQuestions[0]}
      />

      {/* Preguntas anticipadas de la empresa */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-sm space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-[#20A88A]" />
          Preguntas probables para {job.title}
        </h4>

        <div className="space-y-2">
          {anticipatedQuestions.map((q, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200/60 dark:border-zinc-700/60 text-xs text-gray-800 dark:text-gray-200 font-medium"
            >
              {idx + 1}. {q}
            </div>
          ))}
        </div>
      </div>

      {/* Consejos de negociación y preguntas para hacer */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-[#20A88A]" />
            Estrategia de Entrevista y Preguntas para el Reclutador
          </h4>
          <button
            type="button"
            onClick={() => setShowTips(!showTips)}
            className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1"
          >
            <span>{showTips ? 'Plegar' : 'Ver consejos'}</span>
            {showTips ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showTips && (
          <div className="space-y-4 pt-2 text-xs leading-relaxed animate-fade-in">
            {/* Preguntas para el entrevistador */}
            <div className="space-y-2">
              <span className="font-semibold text-gray-700 dark:text-gray-300 block">
                Preguntas inteligentes que puedes hacer al final:
              </span>
              <ul className="space-y-1 pl-2">
                {questionsToAsk.map((item, i) => (
                  <li key={i} className="text-gray-600 dark:text-gray-400 flex items-start gap-2">
                    <span className="text-[#20A88A]">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Negociación salarial */}
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 space-y-1">
              <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                Negociación Salarial (Chile):
              </span>
              <p className="text-amber-900 dark:text-amber-200">
                Siempre habla en términos de <strong>renta líquida mensual</strong> (lo que recibes en tu cuenta tras descuentos previsionales y de salud). Si te preguntan tu pretensión antes de conocer los beneficios completos, ofrece un rango basado en tu perfil.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
