import React, { useState } from 'react';
import type { GapAnalysis, GapItem, LearningCourseResource } from '../../types';
import { Target, CheckCircle2, AlertTriangle, XCircle, BookOpen, ExternalLink, RefreshCw, GraduationCap } from 'lucide-react';
import { api, getHumanErrorMessage } from '../../api';
import { useToast } from '../../components/Toast';
import { OpiAvatar } from '../../components/ui/OpiAvatar';
import { safeExternalUrl } from '../../utils/jobSource';

/**
 * Mis brechas: cada requisito de tus ofertas guardadas/evaluadas comparado con tu CV.
 * ✅ cumples (con evidencia del CV) · 🟡 en parte o transferible · ❌ brecha, con cursos.
 */
interface GapsTabProps {
  analysis: GapAnalysis | null;
  isLoading: boolean;
  hasCv: boolean;
  onRefresh: () => void;
  /** Agrega el curso terminado a tus certificaciones. */
  onCourseCompleted: (gap: GapItem, courseTitle: string) => Promise<void>;
  onGoToProfile: () => void;
  onGoToJobs: () => void;
}

const STATUS = {
  brecha: {
    label: 'Brecha',
    icon: XCircle,
    cls: 'border-rose-200 dark:border-rose-400/30',
    badge: 'bg-rose-50 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200'
  },
  parcial: {
    label: 'En parte / transferible',
    icon: AlertTriangle,
    cls: 'border-amber-200 dark:border-amber-400/30',
    badge: 'bg-amber-50 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100'
  },
  cumple: {
    label: 'Cumples',
    icon: CheckCircle2,
    cls: 'border-emerald-200 dark:border-emerald-400/30',
    badge: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200'
  }
} as const;

const GapCard: React.FC<{ gap: GapItem; onCourseCompleted: GapsTabProps['onCourseCompleted'] }> = ({ gap, onCourseCompleted }) => {
  const toast = useToast();
  const [courses, setCourses] = useState<LearningCourseResource[] | null>(null);
  const [loading, setLoading] = useState(false);
  const st = STATUS[gap.status];
  const Icon = st.icon;

  const loadCourses = async () => {
    if (courses) {
      setCourses(null);
      return;
    }
    setLoading(true);
    try {
      setCourses(await api.searchCoachCourses({ competency: gap.course_query || gap.requirement }));
    } catch (e) {
      toast.error('No se pudieron cargar cursos: ' + getHumanErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <li className={`p-4 rounded-2xl bg-white dark:bg-ink-surface border ${st.cls} space-y-2.5 text-xs`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold text-sm text-ink dark:text-white">{gap.requirement}</span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${st.badge}`}>
          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
          {st.label}
        </span>
      </div>
      {gap.evidence && (
        <p className="text-gray-700 dark:text-gray-200">
          <span className="font-semibold">En tu CV: </span>
          {gap.evidence}
        </p>
      )}
      <p className="text-gray-600 dark:text-ink-200">
        Lo pide{gap.job_titles.length > 1 ? 'n' : ''}: {gap.job_titles.join(' · ')}
      </p>
      {gap.status !== 'cumple' && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={loadCourses}
            aria-expanded={Boolean(courses)}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
          >
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            {loading ? 'Buscando cursos…' : courses ? 'Ocultar cursos' : 'Ver cursos y capacitaciones'}
          </button>
          {courses && (
            <ul className="space-y-2">
              {courses.map((c) => {
                const url = safeExternalUrl(c.url);
                return (
                  <li key={c.id || c.url} className="p-3 rounded-xl bg-gray-50 dark:bg-ink-raised border border-gray-200 dark:border-ink-line space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-ink dark:text-white">{c.title}</span>
                      <span className="text-gray-600 dark:text-ink-200">
                        {c.platform}
                        {c.verified ? ` · ${c.cost} · ${c.duration}${c.has_certificate ? ' · con certificado' : ''}` : ''}
                      </span>
                    </div>
                    {c.description && <p className="text-gray-600 dark:text-ink-200">{c.description}</p>}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 min-h-[36px] px-2.5 rounded-lg border border-gray-300 dark:border-ink-line font-semibold text-ink dark:text-white hover:bg-white dark:hover:bg-ink-hover"
                        >
                          {c.verified ? 'Ir al curso' : 'Abrir búsqueda'} <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => onCourseCompleted(gap, c.verified ? c.title : `Curso de ${gap.requirement}`)}
                        className="inline-flex items-center gap-1 min-h-[36px] px-2.5 rounded-lg text-emerald-800 dark:text-emerald-200 font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-500/10 cursor-pointer"
                      >
                        <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" /> Ya lo terminé
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </li>
  );
};

export const GapsTab: React.FC<GapsTabProps> = ({ analysis, isLoading, hasCv, onRefresh, onCourseCompleted, onGoToProfile, onGoToJobs }) => {
  if (!hasCv) {
    return (
      <div className="p-8 rounded-2xl bg-white dark:bg-ink-surface border border-gray-200/80 dark:border-ink-border text-center space-y-3">
        <OpiAvatar expression="curioso" size={96} className="mx-auto" decorative />
        <p className="text-sm font-semibold text-ink dark:text-white">Primero sube tu CV</p>
        <p className="text-xs text-gray-600 dark:text-ink-200">Así puedo comparar tu experiencia real con lo que piden las ofertas.</p>
        <button type="button" onClick={onGoToProfile} className="min-h-[44px] px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold cursor-pointer">
          Ir a Mi perfil
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div role="status" className="p-8 rounded-2xl bg-white dark:bg-ink-surface border border-gray-200/80 dark:border-ink-border flex items-center gap-4">
        <OpiAvatar expression="pensando" size={72} decorative className="animate-pulse" />
        <p className="text-sm font-semibold text-ink dark:text-white">Comparando los requisitos de tus ofertas con tu CV…</p>
      </div>
    );
  }

  const items = analysis?.items || [];
  const count = (s: GapItem['status']) => items.filter((g) => g.status === s).length;

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-white dark:bg-ink-surface border border-gray-200/80 dark:border-ink-border space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-ink dark:text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-brand-700 dark:text-brand-300" aria-hidden="true" />
              Mis brechas frente a las ofertas
            </h2>
            <p className="text-xs text-gray-600 dark:text-ink-200 mt-0.5">
              {analysis?.jobs_analyzed
                ? `Comparé ${analysis.jobs_analyzed} oferta${analysis.jobs_analyzed > 1 ? 's' : ''} que guardaste o evaluaste con tu experiencia real${analysis.method === 'ia' ? ' (con IA)' : ' (con reglas, sin IA)'}.`
                : 'Compara los requisitos de las ofertas que guardas o evalúas con tu experiencia real.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl border border-gray-300 dark:border-ink-line text-xs font-semibold text-ink dark:text-white hover:bg-gray-50 dark:hover:bg-ink-hover cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Actualizar
          </button>
        </div>
        {items.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className={`px-2.5 py-1 rounded-full ${STATUS.brecha.badge}`}>{count('brecha')} brechas</span>
            <span className={`px-2.5 py-1 rounded-full ${STATUS.parcial.badge}`}>{count('parcial')} en parte</span>
            <span className={`px-2.5 py-1 rounded-full ${STATUS.cumple.badge}`}>{count('cumple')} cumples</span>
          </div>
        )}
        {analysis?.note && <p className="text-xs text-amber-900 dark:text-amber-100">{analysis.note}</p>}
      </div>

      {items.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-gray-300 dark:border-ink-line text-center space-y-3">
          <p className="text-xs text-gray-600 dark:text-ink-200">
            Guarda o evalúa algunas ofertas en Buscar empleo y vuelve aquí: te mostraré qué requisitos ya cumples y qué te conviene reforzar.
          </p>
          <button type="button" onClick={onGoToJobs} className="min-h-[44px] px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold cursor-pointer">
            Buscar ofertas
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((g) => (
            <GapCard key={`${g.status}-${g.requirement}`} gap={g} onCourseCompleted={onCourseCompleted} />
          ))}
        </ul>
      )}
    </div>
  );
};
