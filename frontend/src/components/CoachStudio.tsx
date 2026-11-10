import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Compass,
  BookOpen,
  Award,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  ExternalLink,
  ChevronRight,
  Target,
  Send,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Brain,
  ShieldCheck,
  Plus,
  Play
} from 'lucide-react';
import type {
  CandidateProfile,
  JobPosting,
  CompetencyDiagnosticItem,
  LearningCourseResource,
  LearningPath,
  TutorPracticeChallenge,
  TutorEvaluationResult,
  LLMSettings
} from '../types';
import { api } from '../api';
import { useToast } from './Toast';

interface CoachStudioProps {
  profile: CandidateProfile | null;
  jobs: JobPosting[];
  llmSettings?: LLMSettings | null;
  onOpenSettings?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const CoachStudio: React.FC<CoachStudioProps> = ({
  profile,
  jobs,
  llmSettings,
  onOpenSettings,
  onNavigateToTab
}) => {
  const toast = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'diagnostic' | 'courses' | 'paths' | 'tutor' | 'interviews'>('diagnostic');

  // Diagnostic state
  const [competencies, setCompetencies] = useState<CompetencyDiagnosticItem[]>([]);
  const [isLoadingDiagnostic, setIsLoadingDiagnostic] = useState(false);
  const [selectedCompForEdit, setSelectedCompForEdit] = useState<CompetencyDiagnosticItem | null>(null);
  const [editLevel, setEditLevel] = useState<string>('Intermedio');
  const [newEvidenceText, setNewEvidenceText] = useState<string>('');

  // Course search state
  const [courses, setCourses] = useState<LearningCourseResource[]>([]);
  const [courseQuery, setCourseQuery] = useState('');
  const [selectedCompFilter, setSelectedCompFilter] = useState('');
  const [costFilter, setCostFilter] = useState<string>('all');
  const [isSearchingCourses, setIsSearchingCourses] = useState(false);

  // Learning Paths state
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [targetRoleForPath, setTargetRoleForPath] = useState(profile?.headline || 'Especialista TI');
  const [isGeneratingPath, setIsGeneratingPath] = useState(false);
  const [selectedMilestoneEvidence, setSelectedMilestoneEvidence] = useState<{ pathId: string; stepNumber: number } | null>(null);
  const [milestoneEvidenceInput, setMilestoneEvidenceInput] = useState('');

  // Tutor state
  const [selectedTutorComp, setSelectedTutorComp] = useState<string>('');
  const [tutorChallenge, setTutorChallenge] = useState<TutorPracticeChallenge | null>(null);
  const [candidateSolution, setCandidateSolution] = useState<string>('');
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);
  const [isEvaluatingSolution, setIsEvaluatingSolution] = useState(false);
  const [tutorResult, setTutorResult] = useState<TutorEvaluationResult | null>(null);

  // Interview simulation state
  const [selectedJobIdForInterview, setSelectedJobIdForInterview] = useState<string>('');
  const [interviewerRole, setInterviewerRole] = useState<'all' | 'rrhh' | 'hiring_manager' | 'technical'>('all');
  const [interviewPrepData, setInterviewPrepData] = useState<any>(null);
  const [isLoadingInterviewPrep, setIsLoadingInterviewPrep] = useState(false);

  // Load initial diagnostic & courses
  useEffect(() => {
    loadDiagnostic();
    loadCourses();
    loadPaths();
  }, []);

  const loadDiagnostic = async () => {
    setIsLoadingDiagnostic(true);
    try {
      const data = await api.getCoachDiagnostic();
      setCompetencies(data);
      if (data.length > 0 && !selectedTutorComp) {
        setSelectedTutorComp(data[0].name);
      }
    } catch (e: any) {
      console.warn('Error cargando diagnóstico de competencias:', e);
    } finally {
      setIsLoadingDiagnostic(false);
    }
  };

  const loadCourses = async () => {
    setIsSearchingCourses(true);
    try {
      const data = await api.searchCoachCourses({
        query: courseQuery,
        competency: selectedCompFilter,
        cost: costFilter === 'all' ? undefined : costFilter
      });
      setCourses(data);
    } catch (e: any) {
      console.warn('Error cargando cursos verificados:', e);
    } finally {
      setIsSearchingCourses(false);
    }
  };

  const loadPaths = async () => {
    try {
      const data = await api.getLearningPaths();
      setLearningPaths(data);
    } catch (e: any) {
      console.warn('Error cargando rutas de aprendizaje:', e);
    }
  };

  const handleUpdateCompetency = async () => {
    if (!selectedCompForEdit) return;
    try {
      const updated = await api.updateCoachCompetency(selectedCompForEdit.id, {
        declared_level: editLevel,
        evidence: newEvidenceText.trim() ? newEvidenceText.trim() : undefined
      });
      setCompetencies(competencies.map(c => c.id === updated.id ? updated : c));
      setSelectedCompForEdit(null);
      setNewEvidenceText('');
      toast.success('Competencia y evidencia actualizadas');
    } catch (e: any) {
      toast.error('Error actualizando competencia: ' + (e?.message || e));
    }
  };

  const handleGeneratePath = async () => {
    setIsGeneratingPath(true);
    try {
      const gaps = competencies
        .filter(c => c.validation_status === 'en_aprendizaje')
        .map(c => c.name);
      const newPath = await api.generateLearningPath(targetRoleForPath, gaps);
      setLearningPaths([newPath, ...learningPaths]);
      toast.success('Ruta de aprendizaje generada exitosamente');
    } catch (e: any) {
      toast.error('Error generando ruta: ' + (e?.message || e));
    } finally {
      setIsGeneratingPath(false);
    }
  };

  const handleCompleteMilestone = async (pathId: string, stepNumber: number) => {
    try {
      const updated = await api.updateMilestoneStatus(pathId, stepNumber, 'completed', milestoneEvidenceInput);
      setLearningPaths(learningPaths.map(p => p.id === updated.id ? updated : p));
      setSelectedMilestoneEvidence(null);
      setMilestoneEvidenceInput('');
      toast.success('¡Hito completado con éxito!');
      loadDiagnostic();
    } catch (e: any) {
      toast.error('Error actualizando hito: ' + (e?.message || e));
    }
  };

  const handleGenerateChallenge = async () => {
    if (!selectedTutorComp) return;
    setIsGeneratingChallenge(true);
    setTutorResult(null);
    setCandidateSolution('');
    try {
      const challenge = await api.generateTutorChallenge(selectedTutorComp);
      setTutorChallenge(challenge);
      toast.success(`Desafío generado para ${selectedTutorComp}`);
    } catch (e: any) {
      toast.error('Error generando desafío: ' + (e?.message || e));
    } finally {
      setIsGeneratingChallenge(false);
    }
  };

  const handleEvaluateSolution = async () => {
    if (!tutorChallenge || !candidateSolution.trim()) {
      toast.error('Por favor escribe tu propuesta técnica antes de evaluar.');
      return;
    }
    setIsEvaluatingSolution(true);
    try {
      const result = await api.evaluateTutorSolution(tutorChallenge, candidateSolution);
      setTutorResult(result);
      if (result.competency_validated) {
        toast.success(`¡Excelente! Competencia '${tutorChallenge.competency}' validada con ${result.score}/100.`);
        loadDiagnostic();
      } else {
        toast.info(`Evaluación completada: ${result.score}/100. Revisa el feedback para mejorar.`);
      }
    } catch (e: any) {
      toast.error('Error evaluando propuesta: ' + (e?.message || e));
    } finally {
      setIsEvaluatingSolution(false);
    }
  };

  const handleGenerateInterviewPrep = async () => {
    if (!selectedJobIdForInterview) {
      toast.error('Selecciona una vacante para preparar la entrevista.');
      return;
    }
    setIsLoadingInterviewPrep(true);
    try {
      const data = await api.getTargetedInterviewPrep(selectedJobIdForInterview, interviewerRole);
      setInterviewPrepData(data);
      toast.success('Simulación y preguntas generadas.');
    } catch (e: any) {
      toast.error('Error generando preparación: ' + (e?.message || e));
    } finally {
      setIsLoadingInterviewPrep(false);
    }
  };

  // Metrics
  const validatedCount = competencies.filter(c => c.validation_status === 'validada').length;
  const learningCount = competencies.filter(c => c.validation_status === 'en_aprendizaje').length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fade-in text-gray-900 dark:text-white">
      
      {/* Header Banner */}
      <div className="apple-glass apple-card p-6 rounded-3xl border border-black/10 dark:border-white/10 space-y-4 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <span className="p-2 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
                <GraduationCap className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Coach IA: Desarrollo y Crecimiento Profesional
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
              Convierte las brechas detectadas por el Comité en rutas de estudio oficiales, 
              ejercicios prácticos con el Tutor y competencias validadas para tus próximas postulaciones.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="px-3.5 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <span className="block text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {validatedCount}
              </span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Validadas</span>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
              <span className="block text-lg font-bold text-amber-600 dark:text-amber-400">
                {learningCount}
              </span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">En Aprendizaje</span>
            </div>
          </div>
        </div>

        {/* Sub-navigation tabs (Apple Cupertino Segmented Control) */}
        <div className="flex items-center space-x-1 bg-gray-100 dark:bg-zinc-800/80 p-1.5 rounded-2xl text-xs font-medium overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('diagnostic')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl transition whitespace-nowrap ${
              activeSubTab === 'diagnostic'
                ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm font-semibold'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Diagnóstico de Competencias ({competencies.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('courses')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl transition whitespace-nowrap ${
              activeSubTab === 'courses'
                ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm font-semibold'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Cursos Verificados</span>
          </button>

          <button
            onClick={() => setActiveSubTab('paths')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl transition whitespace-nowrap ${
              activeSubTab === 'paths'
                ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm font-semibold'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Rutas de Aprendizaje ({learningPaths.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('tutor')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl transition whitespace-nowrap ${
              activeSubTab === 'tutor'
                ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm font-semibold'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Tutor y Casos Prácticos</span>
          </button>

          <button
            onClick={() => setActiveSubTab('interviews')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl transition whitespace-nowrap ${
              activeSubTab === 'interviews'
                ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm font-semibold'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Simulador de Entrevistas</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: DIAGNÓSTICO DE COMPETENCIAS */}
      {activeSubTab === 'diagnostic' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Matriz Viva de Competencias y Evidencias
              </h3>
              <p className="text-xs text-gray-500">
                Nivel declarado por ti vs. estimación por IA y respaldo de proyectos o certificaciones.
              </p>
            </div>
            <button
              onClick={loadDiagnostic}
              disabled={isLoadingDiagnostic}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {isLoadingDiagnostic ? 'Sincronizando...' : 'Recargar Diagnóstico'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {competencies.map((comp) => {
              const isValidated = comp.validation_status === 'validada';
              const isLearning = comp.validation_status === 'en_aprendizaje';
              return (
                <div
                  key={comp.id}
                  className="apple-glass apple-card p-4 rounded-2xl border border-black/5 dark:border-white/5 space-y-3 flex flex-col justify-between hover:border-blue-500/20 transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-xs text-gray-900 dark:text-white">
                        {comp.name}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        isValidated
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : isLearning
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                      }`}>
                        {isValidated ? 'Validada' : isLearning ? 'En Aprendizaje' : 'Completado'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] text-gray-500">
                      <span>Nivel: <strong className="text-gray-700 dark:text-gray-300">{comp.declared_level}</strong></span>
                      <span>•</span>
                      <span>Tipo: {comp.category}</span>
                    </div>

                    {/* Evidences list */}
                    {comp.evidences && comp.evidences.length > 0 ? (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-medium">Evidencias:</span>
                        <ul className="text-[11px] text-gray-600 dark:text-gray-300 space-y-0.5">
                          {comp.evidences.map((ev, i) => (
                            <li key={i} className="line-clamp-2">✓ {ev}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 italic">Sin evidencias adjuntas aún</p>
                    )}

                    {/* Source gaps */}
                    {comp.source_job_gaps && comp.source_job_gaps.length > 0 && (
                      <div className="p-2 rounded-xl bg-amber-500/5 border border-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300">
                        Brecha detectada en: {comp.source_job_gaps.join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setSelectedCompForEdit(comp);
                        setEditLevel(comp.declared_level);
                      }}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      Editar / Agregar Evidencia
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTutorComp(comp.name);
                        setActiveSubTab('tutor');
                      }}
                      className="text-[11px] text-gray-500 hover:text-gray-900 dark:hover:text-white"
                      title="Probar tus conocimientos ante el Tutor"
                    >
                      Practicar ➔
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modal to edit competency / add evidence */}
          {selectedCompForEdit && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in text-xs">
              <div className="apple-glass apple-card max-w-md w-full p-6 space-y-4 bg-white/95 dark:bg-zinc-900/95 shadow-2xl rounded-2xl border border-black/10 dark:border-white/10">
                <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                    Actualizar: {selectedCompForEdit.name}
                  </h3>
                  <button onClick={() => setSelectedCompForEdit(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="space-y-2">
                  <label className="font-medium text-gray-700 dark:text-gray-300">Nivel Declarado:</label>
                  <select
                    value={editLevel}
                    onChange={(e) => setEditLevel(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs"
                  >
                    <option value="Básico">Básico</option>
                    <option value="Intermedio">Intermedio</option>
                    <option value="Avanzado">Avanzado</option>
                    <option value="Experto">Experto</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="font-medium text-gray-700 dark:text-gray-300">
                    Registrar Nueva Evidencia (Proyecto, rol o certificación):
                  </label>
                  <textarea
                    rows={3}
                    value={newEvidenceText}
                    onChange={(e) => setNewEvidenceText(e.target.value)}
                    placeholder="Ej. Implementé políticas de acceso condicional y MFA en CloudSolutions para 150 usuarios..."
                    className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    onClick={() => setSelectedCompForEdit(null)}
                    className="px-3.5 py-2 rounded-xl text-xs bg-gray-100 dark:bg-zinc-800"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleUpdateCompetency}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: BUSCADOR DE CURSOS VERIFICADOS */}
      {activeSubTab === 'courses' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                value={courseQuery}
                onChange={(e) => setCourseQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadCourses()}
                placeholder="Buscar por tecnología (ej. Microsoft Entra ID, Azure, Ciberseguridad, Docker)..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs"
              />
            </div>
            <select
              value={costFilter}
              onChange={(e) => setCostFilter(e.target.value)}
              className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs"
            >
              <option value="all">Todos los costos</option>
              <option value="Gratuito">Solo Gratuitos</option>
              <option value="Suscripción">Certificados / Suscripción</option>
            </select>
            <button
              onClick={loadCourses}
              disabled={isSearchingCourses}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
            >
              {isSearchingCourses ? 'Buscando...' : 'Buscar Cursos'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {courses.map((course) => (
              <div
                key={course.id || course.title}
                className="apple-glass apple-card p-4 rounded-2xl border border-black/5 dark:border-white/5 space-y-2 flex flex-col justify-between hover:border-blue-500/30 transition"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {course.platform}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                      course.cost.toLowerCase().includes('gratuito')
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                    }`}>
                      {course.cost}
                    </span>
                  </div>

                  <h4 className="font-semibold text-xs text-gray-900 dark:text-white">
                    {course.title}
                  </h4>

                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {course.description}
                  </p>

                  <div className="flex items-center space-x-2 text-[10px] text-gray-400 pt-1">
                    <span>Duración: {course.duration}</span>
                    <span>•</span>
                    <span>Idioma: {course.language}</span>
                    {course.has_certificate && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Certificado disponible</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-medium">Enlace Oficial Verificado</span>
                  <a
                    href={course.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                  >
                    <span>Ir al curso oficial</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: RUTAS DE APRENDIZAJE */}
      {activeSubTab === 'paths' && (
        <div className="space-y-6">
          {/* Header Action: Generate Path */}
          <div className="apple-glass apple-card p-4 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h3 className="font-bold text-xs text-gray-900 dark:text-white">
                Generador de Rutas Secuenciadas por Hitos
              </h3>
              <p className="text-[11px] text-gray-500">
                Organiza el estudio en etapas lógicas con actividades prácticas y evaluaciones demostrables.
              </p>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <input
                type="text"
                value={targetRoleForPath}
                onChange={(e) => setTargetRoleForPath(e.target.value)}
                placeholder="Cargo objetivo (ej. Jefe de TI)"
                className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs w-full sm:w-48"
              />
              <button
                onClick={handleGeneratePath}
                disabled={isGeneratingPath}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold whitespace-nowrap shadow-xs"
              >
                {isGeneratingPath ? 'Diseñando...' : 'Generar Ruta'}
              </button>
            </div>
          </div>

          {/* Paths display */}
          <div className="space-y-6">
            {learningPaths.map((path) => (
              <div
                key={path.id}
                className="apple-glass apple-card p-5 rounded-3xl border border-black/10 dark:border-white/10 space-y-4 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 dark:border-white/5 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                      {path.title}
                    </h3>
                    <p className="text-xs text-gray-500">{path.overview}</p>
                  </div>
                  <div className="flex items-center space-x-2 self-end sm:self-auto">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      {path.progress_percentage}% completado
                    </span>
                  </div>
                </div>

                {/* Milestones timeline */}
                <div className="space-y-3">
                  {path.milestones.map((m) => (
                    <div
                      key={m.step_number}
                      className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            m.status === 'completed'
                              ? 'bg-emerald-500 text-white'
                              : m.status === 'in_progress'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-gray-300'
                          }`}>
                            {m.status === 'completed' ? '✓' : m.step_number}
                          </span>
                          <h4 className="font-semibold text-xs text-gray-900 dark:text-white">
                            {m.title}
                          </h4>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          m.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : m.status === 'in_progress'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'bg-gray-200 dark:bg-zinc-700 text-gray-500'
                        }`}>
                          {m.status === 'completed' ? 'Completado' : m.status === 'in_progress' ? 'En Progreso' : 'Pendiente'}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 dark:text-gray-300 pl-8">
                        {m.objective}
                      </p>

                      <div className="pl-8 space-y-1.5 text-xs">
                        <div className="p-2 rounded-xl bg-white/60 dark:bg-zinc-900/40 border border-black/5 dark:border-white/5">
                          <strong className="text-gray-700 dark:text-gray-300">Actividad Práctica:</strong> {m.practical_activity}
                        </div>
                        <div className="p-2 rounded-xl bg-white/60 dark:bg-zinc-900/40 border border-black/5 dark:border-white/5">
                          <strong className="text-gray-700 dark:text-gray-300">Desafío Evaluativo:</strong> {m.evaluation_challenge}
                        </div>

                        {/* Associated course link */}
                        {m.resources && m.resources.length > 0 && (
                          <div className="pt-1 flex items-center space-x-2">
                            <span className="text-[10px] text-gray-400">Recurso Oficial:</span>
                            <a
                              href={m.resources[0].url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
                            >
                              <span>{m.resources[0].title} ({m.resources[0].platform})</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        )}

                        {m.evidence_logged && (
                          <div className="p-2 rounded-xl bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 text-[11px]">
                            ✓ Evidencia registrada: {m.evidence_logged}
                          </div>
                        )}
                      </div>

                      {m.status !== 'completed' && (
                        <div className="pl-8 pt-1">
                          <button
                            onClick={() => setSelectedMilestoneEvidence({ pathId: path.id, stepNumber: m.step_number })}
                            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                          >
                            + Marcar como Completado & Registrar Evidencia
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Modal to log milestone evidence */}
          {selectedMilestoneEvidence && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in text-xs">
              <div className="apple-glass apple-card max-w-md w-full p-6 space-y-4 bg-white/95 dark:bg-zinc-900/95 shadow-2xl rounded-2xl border border-black/10 dark:border-white/10">
                <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                    Registrar Acreditación del Hito
                  </h3>
                  <button onClick={() => setSelectedMilestoneEvidence(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="space-y-2">
                  <label className="font-medium text-gray-700 dark:text-gray-300">
                    Evidencia de Aprendizaje (Certificado, enlace a repositorio o descripción del proyecto):
                  </label>
                  <textarea
                    rows={3}
                    value={milestoneEvidenceInput}
                    onChange={(e) => setMilestoneEvidenceInput(e.target.value)}
                    placeholder="Ej. Completé el módulo oficial de Microsoft Learn y aprobé la prueba técnica de evaluación..."
                    className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    onClick={() => setSelectedMilestoneEvidence(null)}
                    className="px-3.5 py-2 rounded-xl text-xs bg-gray-100 dark:bg-zinc-800"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleCompleteMilestone(selectedMilestoneEvidence.pathId, selectedMilestoneEvidence.stepNumber)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Confirmar Acreditación
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: TUTOR Y CASOS PRÁCTICOS */}
      {activeSubTab === 'tutor' && (
        <div className="space-y-6">
          <div className="apple-glass apple-card p-5 rounded-3xl border border-black/10 dark:border-white/10 space-y-4 shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                Tutor Personal: Resolución de Desafíos y Casos de Estudio
              </h3>
              <p className="text-xs text-gray-500">
                El Tutor plantea situaciones laborales complejas y evalúa tus respuestas técnicas con fundamentación rigurosa.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <select
                value={selectedTutorComp}
                onChange={(e) => setSelectedTutorComp(e.target.value)}
                className="w-full sm:w-72 p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-medium"
              >
                {competencies.map(c => (
                  <option key={c.id} value={c.name}>{c.name} ({c.validation_status})</option>
                ))}
              </select>

              <button
                onClick={handleGenerateChallenge}
                disabled={isGeneratingChallenge}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs whitespace-nowrap"
              >
                {isGeneratingChallenge ? 'Generando Caso...' : 'Plantear Nuevo Caso Laboral'}
              </button>
            </div>
          </div>

          {/* Active Challenge Display */}
          {tutorChallenge && (
            <div className="apple-glass apple-card p-6 rounded-3xl border border-blue-500/20 dark:border-blue-500/30 space-y-4 shadow-sm animate-fade-in">
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                    {tutorChallenge.scenario_title}
                  </h4>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  Nivel: {tutorChallenge.difficulty}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 text-xs text-blue-950 dark:text-blue-100 leading-relaxed space-y-2">
                <p><strong>Contexto de la empresa:</strong> {tutorChallenge.scenario_context}</p>
                <p className="font-semibold text-blue-800 dark:text-blue-200">
                  Desafío: {tutorChallenge.problem_statement}
                </p>
              </div>

              {/* Rubric */}
              <div className="space-y-1 text-xs">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Criterios de Evaluación:</span>
                <ul className="list-disc list-inside text-gray-500 dark:text-gray-400 space-y-0.5">
                  {tutorChallenge.evaluation_rubric.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>

              {/* Candidate input */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Tu Propuesta Técnica o Estrategia de Solución:
                </label>
                <textarea
                  rows={6}
                  value={candidateSolution}
                  onChange={(e) => setCandidateSolution(e.target.value)}
                  placeholder="Explica paso a paso la arquitectura, herramientas, controles de riesgo y decisiones que tomarías..."
                  className="w-full p-3.5 rounded-2xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs leading-relaxed"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleEvaluateSolution}
                  disabled={isEvaluatingSolution || !candidateSolution.trim()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                >
                  {isEvaluatingSolution ? 'Evaluando con Tutor IA...' : 'Enviar Propuesta al Tutor'}
                </button>
              </div>

              {/* Tutor Evaluation Result */}
              {tutorResult && (
                <div className={`p-5 rounded-2xl border space-y-3 animate-fade-in text-xs ${
                  tutorResult.competency_validated
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500/30'
                    : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-500/30'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">
                      {tutorResult.competency_validated ? '¡Competencia Validada!' : 'Evaluación Completada'}
                    </span>
                    <span className={`text-xl font-bold ${tutorResult.competency_validated ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {tutorResult.score}/100
                    </span>
                  </div>

                  <p className="leading-relaxed">{tutorResult.feedback}</p>

                  <div className="space-y-1">
                    <strong className="block text-gray-700 dark:text-gray-300">Corrección Técnica:</strong>
                    <p className="text-gray-600 dark:text-gray-400">{tutorResult.technical_correctness}</p>
                  </div>

                  {tutorResult.evidence_generated && (
                    <div className="p-3 rounded-xl bg-white/70 dark:bg-zinc-900/60 font-semibold text-emerald-700 dark:text-emerald-300">
                      ✓ {tutorResult.evidence_generated}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 5: SIMULADOR DE ENTREVISTAS POR ROL */}
      {activeSubTab === 'interviews' && (
        <div className="space-y-6">
          <div className="apple-glass apple-card p-5 rounded-3xl border border-black/10 dark:border-white/10 space-y-4 shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                Simulador de Entrevistas Especializado por Rol
              </h3>
              <p className="text-xs text-gray-500">
                Prepara rondas específicas anticipando preguntas difíciles basadas en las brechas detectadas por el Comité.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-gray-500 block mb-1">Vacante Objetivo:</label>
                <select
                  value={selectedJobIdForInterview}
                  onChange={(e) => setSelectedJobIdForInterview(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-medium"
                >
                  <option value="">Selecciona una vacante...</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>{j.title} en {j.company}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-gray-500 block mb-1">Tipo de Entrevistador:</label>
                <select
                  value={interviewerRole}
                  onChange={(e: any) => setInterviewerRole(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-medium"
                >
                  <option value="all">Todas las perspectivas</option>
                  <option value="rrhh">Recursos Humanos (Ajuste cultural, trayectoria)</option>
                  <option value="hiring_manager">Jefe Contratante (Autonomía, resolución, liderazgo)</option>
                  <option value="technical">Líder Técnico (Arquitectura, herramientas, stack)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleGenerateInterviewPrep}
                disabled={isLoadingInterviewPrep || !selectedJobIdForInterview}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
              >
                {isLoadingInterviewPrep ? 'Generando Simulacro...' : 'Generar Simulacro de Entrevista'}
              </button>
            </div>
          </div>

          {/* Interview Kit Result */}
          {interviewPrepData && (
            <div className="apple-glass apple-card p-6 rounded-3xl border border-black/10 dark:border-white/10 space-y-5 animate-fade-in text-xs">
              <div className="border-b border-black/5 dark:border-white/5 pb-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Foco del Entrevistador
                </span>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                  {interviewPrepData.interviewer_perspective}
                </p>
              </div>

              {/* Anticipated Hard Questions */}
              {interviewPrepData.anticipated_hard_questions && (
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                    Preguntas Difíciles Anticipadas (Basadas en Brechas del CV)
                  </h4>
                  <div className="space-y-2.5">
                    {interviewPrepData.anticipated_hard_questions.map((q: any, i: number) => (
                      <div key={i} className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/50 space-y-1.5">
                        <p className="font-bold text-xs text-rose-900 dark:text-rose-200">
                          {q.question}
                        </p>
                        <p className="text-[11px] text-gray-600 dark:text-gray-300">
                          <strong>Por qué la harán:</strong> {q.reason}
                        </p>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                          <strong>Enfoque STAR sugerido:</strong> {q.suggested_star_approach}
                        </p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-300">
                          <strong>Error a evitar:</strong> {q.pitfall_to_avoid}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Questions to ask */}
              {interviewPrepData.questions_to_ask_interviewer && (
                <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
                  <h4 className="font-bold text-xs text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Preguntas Estratégicas para hacerle al Entrevistador al Cierre
                  </h4>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                    {interviewPrepData.questions_to_ask_interviewer.map((qa: string, i: number) => (
                      <li key={i}>{qa}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};