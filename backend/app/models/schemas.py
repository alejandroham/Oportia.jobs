from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import uuid
from datetime import datetime

class WorkExperience(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    company: str
    role: str
    start_date: str
    end_date: Optional[str] = "Present"
    location: Optional[str] = None
    is_remote: bool = False
    description: str
    technologies: List[str] = []
    bullet_achievements: List[str] = []

class EducationItem(BaseModel):
    institution: str
    degree: str
    field_of_study: str
    graduation_year: Optional[str] = None

class CandidateProfile(BaseModel):
    name: str = "Candidato"
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = "Chile"
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    headline: Optional[str] = "Profesional"
    summary: Optional[str] = ""
    years_of_experience: float = 0.0

    # Clasificación Profesional Dinámica (Universal para cualquier área)
    primary_profession: Optional[str] = None
    secondary_professions: List[str] = []
    equivalent_roles: List[str] = []   # Sinónimos y denominaciones usadas en portales de empleo
    related_roles: List[str] = []      # Oportunidades por transferencia de habilidades
    economic_sectors: List[str] = []   # Sectores: Salud, Construcción, Educación, Administración, TI, etc.
    seniority_level: Optional[str] = None

    # Ubicación geográfica chilena (obtenida dinámicamente del CV)
    region: Optional[str] = None
    commune: Optional[str] = None

    technical_skills: List[str] = []
    soft_skills: List[str] = []
    languages: Dict[str, str] = {} # e.g. {"Español": "Nativo", "Inglés": "C1 Avanzado"}
    experiences: List[WorkExperience] = []
    education: List[EducationItem] = []
    certifications: List[str] = []
    projects: List[Dict[str, Any]] = []
    versions: List[Dict[str, Any]] = []
    raw_cv_text: Optional[str] = None
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class ProfileDNA(BaseModel):
    summary: str = "Profesional con sólida trayectoria y competencias demostrables."
    seniority_level: str = "Profesional"
    core_strengths: List[str] = [
        "Desempeño riguroso y especializado en su área",
        "Capacidad de adaptación y resolución de problemas",
        "Trabajo colaborativo y comunicación efectiva"
    ]
    communication_tone: str = "Profesional, claro y orientado a resultados"

class LearnedStarStory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = "Optimización de rendimiento y arquitectura"
    situation_and_task: str = ""
    action: str = ""
    result_and_metrics: str = ""
    key_skills: List[str] = []
    source: str = "cv" # "cv", "interview_simulation", "user_added"
    score: Optional[int] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class MemoryStats(BaseModel):
    cv_analyzed: bool = False
    total_applications_learned: int = 0
    total_star_answers_learned: int = 0
    maturity_percentage: int = 0
    last_consolidated_at: Optional[str] = None

class UserPreferences(BaseModel):
    target_roles: List[str] = [] # Dinámico: poblado automáticamente a partir del CV del usuario
    preferred_locations: List[str] = ["Chile"]
    preferred_region: Optional[str] = None # Obtenida dinámicamente del CV o seleccionada por el usuario
    preferred_communes: List[str] = []
    geographic_scope: str = "all" # "all" (cobertura nacional con prioridad regional) | "regional" (solo mi región)
    remote_only: bool = False     # False por defecto para no excluir ofertas presenciales/híbridas locales
    min_salary_clp: Optional[int] = None
    min_salary_usd: Optional[int] = None
    preferred_technologies: List[str] = []
    deal_breakers: List[str] = [
        "Disponibilidad 24/7 sin compensación",
        "Empresas con esquemas dudosos o sin contrato formal"
    ]
    auto_learned_insights: List[str] = []
    
    # Cognitive Agentic Memory
    profile_dna: Optional[ProfileDNA] = Field(default_factory=ProfileDNA)
    learned_star_stories: List[LearnedStarStory] = []
    industry_insights: List[str] = []
    memory_stats: Optional[MemoryStats] = Field(default_factory=MemoryStats)

    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class TrackingHistoryEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    event_type: str = "note" # "evaluation", "preparation", "applied", "contact_received", "interview", "technical_test", "final_stage", "offer", "rejected", "note"
    title: str
    date: Optional[str] = None
    notes: Optional[str] = None

class JobPosting(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    company: str
    location: str = "Chile"
    is_remote: bool = False
    salary_range: Optional[str] = None
    description: str
    url: Optional[str] = None
    source: str = "direct" # "remoteok", "arbeitnow", "remotive", "freehire", "linkedin", "manual", "getonbrd", "chiletrabajos", "computrabajo", "laborum", "empleospublicos"
    tags: List[str] = []

    # Clasificación Geográfica Chilena
    region: Optional[str] = None       # e.g. "Región del Biobío"
    commune: Optional[str] = None      # e.g. "Concepción"
    is_user_region: bool = False       # Flag prioritario: coincide con la región de residencia del usuario
    modality: Optional[str] = "Presencial" # "Presencial" | "Híbrido" | "Remoto"
    contract_type: Optional[str] = None # "Contrata", "Planta", "Honorarios", "Indefinido", "Plazo Fijo"
    experience_required: Optional[str] = None
    profession_category: Optional[str] = None

    # Dates
    posted_at: Optional[str] = None          # Fecha de publicación
    deadline: Optional[str] = None           # Fecha de término / vencimiento
    discovered_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    tracked_at: Optional[str] = None         # Fecha de incorporación al Seguimiento
    applied_date: Optional[str] = None       # Fecha en que se envió la postulación (confirmada)
    reminder_date: Optional[str] = None      # Fecha de recordatorio / seguimiento

    # Status & Pipeline (6 Etapas estructuradas)
    fit_score: Optional[int] = None
    # Etapa 1 Radar: "discovered"
    # Etapa 2 Evaluación: "eval_pending" | "eval_approved" | "eval_discarded" (legacy: "saved")
    # Etapa 3 Preparación: "preparing" | "ready_to_send"
    # Etapa 4 Postulación: "pending_send" | "applied"
    # Etapa 5 Seguimiento (En Proceso): "applied_no_response" | "contact_received" | "interview_scheduled" | "interview_done" | "in_evaluation" | "final_stage" (legacy: "interviewing", "responded")
    # Etapa 6 Decisión: "offer" (Exitoso) | "rejected" (No Exitoso)
    status: str = "discovered"
    in_radar: bool = True

    # Application details & Associated documents
    application_method: Optional[str] = None # "url" | "email"
    contact_email: Optional[str] = None
    email_subject: Optional[str] = None
    email_body: Optional[str] = None
    tailored_cv_markdown: Optional[str] = None
    tailored_cv_html: Optional[str] = None
    tailored_cover_letter: Optional[str] = None
    user_notes: Optional[str] = None
    evaluation_notes: Optional[str] = None   # Observaciones, brechas y prioridades
    application_proof: Optional[str] = None  # Número de confirmación, ID de postulación o comprobante

    # Historical Tracking Log (Cronología / Bitácora de eventos del proceso)
    history: List[TrackingHistoryEvent] = []

    # Outcome & Analytics
    outcome: Optional[str] = None
    outcome_notes: Optional[str] = None
    outcome_success: Optional[bool] = None
    outcome_reason: Optional[str] = None
    outcome_feedback: Optional[str] = None
    outcome_date: Optional[str] = None
    upskill_recommendations: List[str] = []

class OutcomeSubmission(BaseModel):
    job_id: str
    status: str # "applied", "interviewing", "offer", "rejected"
    was_successful: bool
    reason: Optional[str] = None
    feedback_details: Optional[str] = None

class StudyTopic(BaseModel):
    topic: str
    description: str
    suggested_resources: str
    estimated_time: str

class UpskillPlan(BaseModel):
    job_title: str
    company: str
    was_successful: bool
    strategy_adjustment: str
    skill_gaps: List[str] = []
    study_plan: List[StudyTopic] = []
    recommended_certifications: List[str] = []
    actionable_next_steps: List[str] = []

class FitDimensionScore(BaseModel):
    dimension: str # "Technical Skills", "Experience & Seniority", "Culture & Work Style", "Remote Flexibility", "Career Alignment"
    score: int # 0-100
    reasoning: str

# Modelos del Comité de Evaluación IA (Nexus.Job)
class EvaluatorRoleScore(BaseModel):
    role_id: str # "rrhh", "hiring_manager", "technical", "ats", "career_consultant"
    role_name: str # "Reclutador RR. HH.", "Jefe Contratante", "Evaluador Técnico", "Especialista ATS", "Consultor Estratégico"
    score: int # 0-100
    weight_percentage: int # 25, 25, 25, 15, 10
    justification: str
    strengths: List[str] = []
    gaps: List[str] = []
    key_question: str
    question_verdict: str

class RequirementEvidenceItem(BaseModel):
    requirement: str
    cv_evidence: str
    status: str = "cumplido" # "cumplido", "parcial", "pendiente", "no_cumplido"
    competency_status: str = "demostrada" # "demostrada", "declarada_sin_evidencia", "transferible", "no_identificada", "confirmada_ausente"
    importance: str = "general" # "excluyente", "deseable", "general"

class PotentialFitProjection(BaseModel):
    potential_score: int # 0-100
    score_delta: int = 0 # ej: +9
    target_competencies: List[str] = []
    required_evidence: List[str] = []
    estimated_effort: str = "1 a 3 semanas"
    reasoning: str = ""

class DirectorSynthesis(BaseModel):
    summary: str
    contradictions_detected: List[str] = []
    critical_deal_breakers: List[str] = []
    missing_evidence_vs_real_gaps: str = ""
    final_recommendation: str # "Postulación prioritaria", "Recomendable postular", "Revisar brechas y adaptar CV", "Evaluar si conviene invertir tiempo", "En principio, no priorizar"
    suggested_actions: List[str] = []

class FitEvaluation(BaseModel):
    job_id: str
    overall_score: int # 0-100 (Fit Score Ponderado: RRHH 25% + HM 25% + Tech 25% + ATS 15% + Estratégico 10%)
    potential_fit_score: Optional[int] = None # Proyección condicionada si se acreditan brechas
    potential_projection: Optional[PotentialFitProjection] = None
    verdict: str # "Postulación prioritaria", "Recomendable postular", "Revisar brechas y adaptar CV", "Evaluar si conviene invertir tiempo", "En principio, no priorizar"
    committee_evaluations: List[EvaluatorRoleScore] = []
    director_synthesis: Optional[DirectorSynthesis] = None
    requirements_matrix: List[RequirementEvidenceItem] = []
    dimension_scores: List[FitDimensionScore] = [] # Compatibilidad retroactiva
    strengths: List[str] = []
    missing_skills: List[str] = []
    deal_breakers_found: List[str] = []
    recommendation_summary: str
    evaluated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class CompanyDirectoryItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    country: str # "Chile" | "Internacional" | "EE.UU." | etc.
    industry: str # "Tecnología", "Banca & Fintech", "Minería & Energía", etc.
    ats_platform: Optional[str] = None # "Workday", "Greenhouse", "Lever", "Ashby", "SmartRecruiters", "SuccessFactors", etc.
    careers_url: Optional[str] = None
    website: Optional[str] = None
    verified: bool = True

class RoleRecommendation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role_family: str # e.g. "Liderazgo TI", "Cloud e Infraestructura", "Desarrollo Full Stack", etc.
    suggested_titles: List[str] # ["IT Manager", "Jefe de TI", "Líder Técnico"]
    recommendation_type: str = "direct" # "direct" (coincidencia directa), "transferable" (transferencia de habilidades), "exploratory" (exploratoria)
    reasoning: str # Fundamento basado en evidencia del CV
    matching_skills: List[str] = []
    identified_gaps: List[str] = []
    seniority: str = "Senior / Lead"
    approved_by_user: Optional[bool] = None # None=pendiente, True=aprobada, False=descartada
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class GeneratedATSQuery(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    query_text: str # e.g. site:myworkdayjobs.com ("IT Manager" OR "Jefe de TI") Chile
    target_platform: str # "Workday", "Greenhouse", "Lever", "Ashby", "Chile General", "Global Remote"
    role_family: str
    category: str # "direct", "exploratory", "nacional", "internacional"
    approved: bool = True

class ApplicationDraft(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    job_title: str
    company: str
    tailored_cv_markdown: str
    tailored_cv_html: Optional[str] = None
    cover_letter: str
    ats_score: int = 85
    ats_feedback: List[str] = []
    reviewer_critique: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class FeedbackAction(BaseModel):
    job_id: str
    action: str # "like", "dislike", "apply", "reject"
    notes: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class LLMConfig(BaseModel):
    provider: str = "gemini" # "gemini", "openai", "claude"
    api_key: Optional[str] = None
    model_name: Optional[str] = None

# Modelos del Coach IA (Desarrollo y Crecimiento Profesional)
class CompetencyDiagnosticItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str = "Técnica" # "Técnica", "Gestión", "Metodológica", "Transversal"
    declared_level: str = "Intermedio" # "Básico", "Intermedio", "Avanzado", "Experto"
    estimated_level: str = "Intermedio"
    validation_status: str = "en_aprendizaje" # "en_aprendizaje", "completado", "validada"
    evidences: List[str] = []
    source_job_gaps: List[str] = []
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class LearningCourseResource(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    platform: str # "Microsoft Learn", "Google Skillshop", "AWS Skill Builder", "Cisco Networking Academy", "Coursera", "edX", "SENCE", "YouTube", "Documentación Oficial"
    url: str
    competency: str
    level: str = "Intermedio" # "Básico", "Intermedio", "Avanzado"
    duration: str = "4 a 6 horas"
    language: str = "Español"
    cost: str = "Gratuito" # "Gratuito", "Pagado", "Suscripción", "No confirmado"
    has_certificate: bool = True
    verified: bool = True
    relevance_score: int = 90
    description: str = ""

class LearningPathMilestone(BaseModel):
    step_number: int
    title: str
    objective: str
    competencies_targeted: List[str] = []
    resources: List[LearningCourseResource] = []
    practical_activity: str
    evaluation_challenge: str
    status: str = "pending" # "pending", "in_progress", "completed"
    evidence_logged: Optional[str] = None

class LearningPath(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    target_role: str
    overview: str
    estimated_weeks: int = 3
    milestones: List[LearningPathMilestone] = []
    progress_percentage: int = 0
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class TutorPracticeChallenge(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    competency: str
    scenario_title: str
    scenario_context: str
    problem_statement: str
    evaluation_rubric: List[str] = []
    difficulty: str = "Intermedio"

class TutorEvaluationResult(BaseModel):
    challenge_id: str
    score: int # 0-100
    technical_correctness: str
    feedback: str
    strengths: List[str] = []
    areas_for_improvement: List[str] = []
    competency_validated: bool = False
    evidence_generated: Optional[str] = None
