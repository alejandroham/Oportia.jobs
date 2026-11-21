import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../state/useAppStore';
import type { CandidateProfile, JobPosting, LLMSettings, LearningCourseResource, LearningPath, GapAnalysis, GapItem } from '../../types';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { GapsTab } from './GapsTab';
import { CoursesTab } from './CoursesTab';
import { LearningPathsTab } from './LearningPathsTab';
import { PracticeTab } from './PracticeTab';
import { Target, BookOpen, Route, Dumbbell } from 'lucide-react';
import { api } from '../../api';
import { hasCvLoaded } from '../../utils/profileState';

interface LearnPageProps {
  profile: CandidateProfile | null;
  jobs?: JobPosting[];
  llmSettings?: LLMSettings | null;
  onOpenSettings?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

type LearnTabKey = 'gaps' | 'courses' | 'paths' | 'practice';

export const LearnPage: React.FC<LearnPageProps> = ({ profile }) => {
  const [activeTab, setActiveTab] = useState<LearnTabKey>('gaps');

  const navigate = useNavigate();
  const toast = useToast();
  // Brechas reales (requisitos de tus ofertas vs. tu CV)
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null);
  const [isLoadingDiagnostic, setIsLoadingDiagnostic] = useState(false);
  const hasCv = hasCvLoaded(profile);

  // Courses state
  const [courses, setCourses] = useState<LearningCourseResource[]>([]);
  const [courseQuery, setCourseQuery] = useState('');
  const [costFilter, setCostFilter] = useState('all');
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);

  // Learning paths state
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);

  const loadDiagnostic = async (useAi = true) => {
    const { profile: p, jobs, preferences } = useAppStore.getState();
    if (!p || !hasCv) return;
    // Ofertas guardadas, en proceso o evaluadas (las más recientes primero).
    const relevant = jobs
      .filter((j) => (j.status && j.status !== 'discovered') || j.fit_score !== undefined)
      .sort((a, b) => (b.tracked_at || b.discovered_at || '').localeCompare(a.tracked_at || a.discovered_at || ''))
      .slice(0, 8);
    if (!relevant.length) {
      setGapAnalysis({ items: [], method: 'reglas', jobs_analyzed: 0 });
      return;
    }
    setIsLoadingDiagnostic(true);
    try {
      setGapAnalysis(await api.analyzeGaps(p, relevant, preferences, useAi));
    } catch (e) {
      console.warn('Error al analizar brechas:', e);
      toast.error('No se pudieron analizar tus brechas. Intenta de nuevo en un momento.');
    } finally {
      setIsLoadingDiagnostic(false);
    }
  };

  // "Ya lo terminé": el curso pasa a tus certificaciones y el requisito queda como cumplido.
  const handleCourseCompleted = async (gap: GapItem, courseTitle: string) => {
    const { profile: p, setProfile } = useAppStore.getState();
    if (!p) return;
    const certs = p.certifications || [];
    if (!certs.some((c) => c.toLowerCase() === courseTitle.toLowerCase())) {
      await setProfile({ ...p, certifications: [...certs, courseTitle], updated_at: new Date().toISOString() });
    }
    setGapAnalysis((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((g) =>
              g.requirement === gap.requirement ? { ...g, status: 'cumple', evidence: `Certificación: ${courseTitle}` } : g
            )
          }
        : prev
    );
    toast.success('¡Bien hecho!', `«${courseTitle}» quedó en tus certificaciones.`);
  };

  const loadCourses = async (overrideQuery?: string) => {
    setIsLoadingCourses(true);
    try {
      const q = overrideQuery !== undefined ? overrideQuery : courseQuery;
      const data = await api.searchCoachCourses({
        query: q,
        cost: costFilter === 'all' ? undefined : costFilter
      });
      setCourses(data || []);
    } catch (e) {
      console.warn('Error al cargar cursos:', e);
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const loadPaths = async () => {
    try {
      // Rutas guardadas en el navegador + (solo en instalación local) las del servidor.
      const local = useAppStore.getState().coachData.learningPaths || [];
      const remote = (await api.getLearningPaths().catch(() => [])) || [];
      const byId = new Map<string, LearningPath>();
      [...remote, ...local].forEach((p) => byId.set(p.id || p.title, p));
      setLearningPaths([...byId.values()]);
    } catch (e) {
      console.warn('Error al cargar rutas:', e);
    }
  };

  useEffect(() => {
    loadDiagnostic();
    // Cursos iniciales según tu profesión (antes mostraba el catálogo de informática a todos).
    const initial = profile?.primary_profession || profile?.headline || '';
    if (initial) setCourseQuery(initial);
    loadCourses(initial || undefined);
    loadPaths();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      {/* Cabecera y 4 Sub-pestañas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Aprender
          </h1>
          <p className="text-xs text-gray-500">
            Cierra brechas formativas, explora cursos verificados y practica entrevistas de alto impacto.
          </p>
        </div>

        <div role="tablist" aria-label="Secciones de Aprender" className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-gray-100 dark:bg-ink-raised text-xs font-semibold">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'gaps'}
            onClick={() => setActiveTab('gaps')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none ${
              activeTab === 'gaps' ? 'bg-white dark:bg-ink-surface text-ink dark:text-white shadow-xs font-bold' : 'text-ink-muted hover:text-ink dark:hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Mis brechas</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'courses'}
            onClick={() => setActiveTab('courses')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none ${
              activeTab === 'courses' ? 'bg-white dark:bg-ink-surface text-ink dark:text-white shadow-xs font-bold' : 'text-ink-muted hover:text-ink dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Cursos</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'paths'}
            onClick={() => setActiveTab('paths')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none ${
              activeTab === 'paths' ? 'bg-white dark:bg-ink-surface text-ink dark:text-white shadow-xs font-bold' : 'text-ink-muted hover:text-ink dark:hover:text-white'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            <span>Mi ruta</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'practice'}
            onClick={() => setActiveTab('practice')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none ${
              activeTab === 'practice' ? 'bg-white dark:bg-ink-surface text-ink dark:text-white shadow-xs font-bold' : 'text-ink-muted hover:text-ink dark:hover:text-white'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>Practicar</span>
          </button>
        </div>
      </div>

      {/* Contenido activo */}
      <div className="animate-fade-in">
        {activeTab === 'gaps' && (
          <GapsTab
            analysis={gapAnalysis}
            isLoading={isLoadingDiagnostic}
            hasCv={hasCv}
            onRefresh={() => loadDiagnostic(true)}
            onCourseCompleted={handleCourseCompleted}
            onGoToProfile={() => navigate('/perfil')}
            onGoToJobs={() => navigate('/empleos')}
          />
        )}

        {activeTab === 'courses' && (
          <CoursesTab
            courses={courses}
            isLoading={isLoadingCourses}
            searchQuery={courseQuery}
            onSearchChange={setCourseQuery}
            costFilter={costFilter}
            onCostFilterChange={setCostFilter}
            onSearch={() => loadCourses()}
          />
        )}

        {activeTab === 'paths' && (
          <LearningPathsTab
            learningPaths={learningPaths}
            onPathsUpdated={loadPaths}
            targetRole={profile?.primary_profession || profile?.headline || ''}
          />
        )}

        {activeTab === 'practice' && (
          <PracticeTab profile={profile} />
        )}
      </div>
    </div>
  );
};
