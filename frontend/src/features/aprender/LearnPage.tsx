import React, { useState, useEffect } from 'react';
import type { CandidateProfile, JobPosting, LLMSettings, CompetencyDiagnosticItem, LearningCourseResource, LearningPath } from '../../types';
import { GapsTab } from './GapsTab';
import { CoursesTab } from './CoursesTab';
import { LearningPathsTab } from './LearningPathsTab';
import { PracticeTab } from './PracticeTab';
import { Target, BookOpen, Route, Dumbbell } from 'lucide-react';
import { api } from '../../api';

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

  // Diagnostic state
  const [competencies, setCompetencies] = useState<CompetencyDiagnosticItem[]>([]);
  const [isLoadingDiagnostic, setIsLoadingDiagnostic] = useState(false);

  // Courses state
  const [courses, setCourses] = useState<LearningCourseResource[]>([]);
  const [courseQuery, setCourseQuery] = useState('');
  const [costFilter, setCostFilter] = useState('all');
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);

  // Learning paths state
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);

  const loadDiagnostic = async () => {
    setIsLoadingDiagnostic(true);
    try {
      const data = await api.getCoachDiagnostic();
      setCompetencies(data || []);
    } catch (e) {
      console.warn('Error al cargar competencias:', e);
    } finally {
      setIsLoadingDiagnostic(false);
    }
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
      const data = await api.getLearningPaths();
      setLearningPaths(data || []);
    } catch (e) {
      console.warn('Error al cargar rutas:', e);
    }
  };

  useEffect(() => {
    loadDiagnostic();
    loadCourses();
    loadPaths();
  }, []);

  const handleSearchCourseForGap = (competencyName: string) => {
    setCourseQuery(competencyName);
    setActiveTab('courses');
    loadCourses(competencyName);
  };

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

        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('gaps')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition ${
              activeTab === 'gaps' ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Mis brechas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('courses')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition ${
              activeTab === 'courses' ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Cursos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('paths')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition ${
              activeTab === 'paths' ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            <span>Mi ruta</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('practice')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition ${
              activeTab === 'practice' ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500 hover:text-gray-800'
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
            competencies={competencies}
            isLoading={isLoadingDiagnostic}
            onSearchCourse={handleSearchCourseForGap}
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
