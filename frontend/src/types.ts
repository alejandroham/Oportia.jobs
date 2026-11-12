export interface WorkExperience {
  id: string;
  company: string;
  role: string;
  start_date: string;
  end_date?: string;
  location?: string;
  is_remote: boolean;
  description: string;
  technologies: string[];
  bullet_achievements: string[];
}

export interface EducationItem {
  institution: string;
  degree: string;
  field_of_study: string;
  graduation_year?: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  role?: string;
  technologies: string[];
  url?: string;
  repository_url?: string;
}

export interface ResumeVersion {
  id: string;
  name: string;
  target_role: string;
  headline?: string;
  summary?: string;
  selected_skills: string[];
  template: 'modern' | 'classic_ats' | 'tech';
  created_at: string;
}

export interface CandidateProfile {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  headline?: string;
  summary?: string;
  years_of_experience: number;

  // Clasificación Profesional Dinámica
  primary_profession?: string;
  secondary_professions?: string[];
  equivalent_roles?: string[];
  related_roles?: string[];
  economic_sectors?: string[];
  seniority_level?: string;

  // Ubicación regional chilena
  region?: string;
  commune?: string;

  technical_skills: string[];
  soft_skills: string[];
  languages: Record<string, string>;
  experiences: WorkExperience[];
  education: EducationItem[];
  certifications: string[];
  projects?: ProjectItem[];
  versions?: ResumeVersion[];
  raw_cv_text?: string;
  updated_at?: string;
}

export interface CompanyDirectoryItem {
  id: string;
  name: string;
  country: string;
  industry: string;
  ats_platform?: string;
  careers_url?: string;
  website?: string;
  verified: boolean;
}

export interface RoleRecommendation {
  id: string;
  role_family: string;
  suggested_titles: string[];
  recommendation_type: 'direct' | 'transferable' | 'exploratory';
  reasoning: string;
  matching_skills: string[];
  identified_gaps: string[];
  seniority: string;
  approved_by_user?: boolean | null;
  created_at: string;
}

export interface GeneratedATSQuery {
  id: string;
  query_text: string;
  target_platform: string;
  role_family: string;
  category: string;
  approved: boolean;
}

export interface ProfileDNA {
  summary: string;
  seniority_level: string;
  core_strengths: string[];
  communication_tone: string;
}

export interface LearnedStarStory {
  id: string;
  title: string;
  situation_and_task: string;
  action: string;
  result_and_metrics: string;
  key_skills: string[];
  source: string;
  score?: number;
  created_at?: string;
}

export interface MemoryStats {
  cv_analyzed: boolean;
  total_applications_learned: number;
  total_star_answers_learned: number;
  maturity_percentage: number;
  last_consolidated_at?: string;
}

export interface UserPreferences {
  target_roles: string[];
  preferred_locations: string[];
  preferred_region?: string;
  preferred_communes?: string[];
  geographic_scope?: 'all' | 'regional';
  remote_only: boolean;
  min_salary_clp?: number;
  min_salary_usd?: number;
  preferred_technologies: string[];
  deal_breakers: string[];
  auto_learned_insights: string[];
  profile_dna?: ProfileDNA;
  learned_star_stories?: LearnedStarStory[];
  industry_insights?: string[];
  memory_stats?: MemoryStats;
  updated_at?: string;
}

export interface TrackingHistoryEvent {
  id: string;
  timestamp: string;
  event_type:
    | 'evaluation'
    | 'preparation'
    | 'applied'
    | 'contact_received'
    | 'interview'
    | 'interview_done'
    | 'technical_test'
    | 'final_stage'
    | 'offer'
    | 'rejected'
    | 'note'
    | 'saved'
    | 'responded';
  title: string;
  date?: string;
  notes?: string;
}

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  is_remote: boolean;
  salary_range?: string;
  description: string;
  url?: string;
  source: string;
  tags: string[];

  // Clasificación Geográfica Chilena
  region?: string | null;
  commune?: string | null;
  is_user_region?: boolean;
  modality?: 'Presencial' | 'Híbrido' | 'Remoto' | string;
  contract_type?: string | null;
  experience_required?: string | null;
  profession_category?: string | null;
  
  // Dates
  posted_at?: string;
  deadline?: string;
  discovered_at: string;
  tracked_at?: string;
  applied_date?: string;
  reminder_date?: string;

  // Pipeline & Status (6 Etapas Estructuradas)
  fit_score?: number;
  status:
    | 'discovered'
    // Etapa 2: Evaluación
    | 'eval_pending'
    | 'eval_approved'
    | 'eval_discarded'
    // Etapa 3: Preparación
    | 'preparing'
    | 'ready_to_send'
    // Etapa 4: Postulación
    | 'pending_send'
    | 'applied'
    // Etapa 5: Seguimiento / En Proceso
    | 'applied_no_response'
    | 'contact_received'
    | 'interview_scheduled'
    | 'interview_done'
    | 'in_evaluation'
    | 'final_stage'
    // Etapa 6: Decisión
    | 'offer'
    | 'rejected'
    // Compatibilidad legada
    | 'saved'
    | 'interviewing'
    | 'responded'
    | 'archived';
  in_radar?: boolean;

  // Channel & Associated Documents
  application_method?: 'url' | 'email';
  contact_email?: string;
  email_subject?: string;
  email_body?: string;
  tailored_cv_markdown?: string;
  tailored_cv_html?: string;
  tailored_cover_letter?: string;
  user_notes?: string;
  evaluation_notes?: string;
  application_proof?: string;

  // Historical Tracking Log (Bitácora de eventos del proceso)
  history?: TrackingHistoryEvent[];

  // Outcome details
  notes?: string;
  outcome?: string;
  outcome_notes?: string;
  outcome_success?: boolean;
  outcome_reason?: string;
  outcome_feedback?: string;
  outcome_date?: string;
  upskill_recommendations?: string[];
}

export interface OutcomeSubmission {
  job_id: string;
  status: 'applied' | 'interviewing' | 'offer' | 'rejected';
  was_successful: boolean;
  reason?: string;
  feedback_details?: string;
}

export interface StudyTopic {
  topic: string;
  description: string;
  suggested_resources: string;
  estimated_time: string;
}

export interface UpskillPlan {
  job_title: string;
  company: string;
  was_successful: boolean;
  strategy_adjustment: string;
  skill_gaps: string[];
  study_plan: StudyTopic[];
  recommended_certifications: string[];
  actionable_next_steps: string[];
}

export interface FitDimensionScore {
  dimension: string;
  score: number;
  reasoning: string;
}

export interface EvaluatorRoleScore {
  role_id: string; // "rrhh" | "hiring_manager" | "technical" | "ats" | "career_consultant"
  role_name: string;
  score: number;
  weight_percentage: number;
  justification: string;
  strengths: string[];
  gaps: string[];
  key_question: string;
  question_verdict: string;
}

export interface RequirementEvidenceItem {
  requirement: string;
  cv_evidence: string;
  status: 'cumplido' | 'parcial' | 'pendiente' | 'no_cumplido' | string;
  competency_status: 'demostrada' | 'declarada_sin_evidencia' | 'transferible' | 'no_identificada' | 'confirmada_ausente' | string;
  importance: 'excluyente' | 'deseable' | 'general' | string;
}

export interface PotentialFitProjection {
  potential_score: number;
  score_delta: number;
  target_competencies: string[];
  required_evidence: string[];
  estimated_effort: string;
  reasoning: string;
}

export interface DirectorSynthesis {
  summary: string;
  contradictions_detected: string[];
  critical_deal_breakers: string[];
  missing_evidence_vs_real_gaps: string;
  final_recommendation: string;
  suggested_actions: string[];
}

export interface FitEvaluation {
  job_id: string;
  overall_score: number;
  potential_fit_score?: number;
  potential_projection?: PotentialFitProjection;
  verdict: string;
  committee_evaluations?: EvaluatorRoleScore[];
  director_synthesis?: DirectorSynthesis;
  requirements_matrix?: RequirementEvidenceItem[];
  dimension_scores: FitDimensionScore[];
  strengths: string[];
  missing_skills: string[];
  deal_breakers_found: string[];
  recommendation_summary: string;
  evaluated_at?: string;
}

export interface ApplicationDraft {
  id: string;
  job_id: string;
  job_title: string;
  company: string;
  tailored_cv_markdown: string;
  tailored_cv_html?: string;
  cover_letter: string;
  ats_score: number;
  ats_feedback: string[];
  reviewer_critique?: string;
  created_at: string;
}

export interface ModelOption {
  id: string;
  name: string;
  tag: string;
  status: 'recommended' | 'active' | 'legacy';
  description: string;
}

export interface LLMSettings {
  provider: 'gemini' | 'openai' | 'claude';
  has_active_key: boolean;
  active_model_name: string;
  status_label: string;
  status_color: 'green' | 'yellow';
  has_gemini_key: boolean;
  has_openai_key: boolean;
  has_claude_key: boolean;
  gemini_model: string;
  openai_model: string;
  claude_model: string;
  available_models?: Record<'gemini' | 'openai' | 'claude', ModelOption[]>;
}

// Modelos del Coach IA (Desarrollo y Crecimiento Profesional)
export interface CompetencyDiagnosticItem {
  id: string;
  name: string;
  category: 'Técnica' | 'Gestión' | 'Metodológica' | 'Transversal' | string;
  declared_level: 'Básico' | 'Intermedio' | 'Avanzado' | 'Experto' | string;
  estimated_level: string;
  validation_status: 'en_aprendizaje' | 'completado' | 'validada';
  evidences: string[];
  source_job_gaps: string[];
  updated_at: string;
}

export interface LearningCourseResource {
  id: string;
  title: string;
  platform: string;
  url: string;
  competency: string;
  level: string;
  duration: string;
  language: string;
  cost: string;
  has_certificate: boolean;
  verified: boolean;
  relevance_score: number;
  description: string;
}

export interface LearningPathMilestone {
  step_number: number;
  title: string;
  objective: string;
  competencies_targeted: string[];
  resources: LearningCourseResource[];
  practical_activity: string;
  evaluation_challenge: string;
  status: 'pending' | 'in_progress' | 'completed';
  evidence_logged?: string | null;
}

export interface LearningPath {
  id: string;
  title: string;
  target_role: string;
  overview: string;
  estimated_weeks: number;
  milestones: LearningPathMilestone[];
  progress_percentage: number;
  created_at: string;
}

export interface TutorPracticeChallenge {
  id: string;
  competency: string;
  scenario_title: string;
  scenario_context: string;
  problem_statement: string;
  evaluation_rubric: string[];
  difficulty: string;
}

export interface TutorEvaluationResult {
  challenge_id: string;
  score: number;
  technical_correctness: string;
  feedback: string;
  strengths: string[];
  areas_for_improvement: string[];
  competency_validated: boolean;
  evidence_generated?: string | null;
}
