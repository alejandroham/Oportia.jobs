import type { CandidateProfile, UserPreferences, JobPosting, ApplicationDraft, LLMSettings } from '../types';

export interface NextStepAction {
  title: string;
  description: string;
  cta: string;
  route: string;
  iconName: 'TrendingUp' | 'FileText' | 'Target' | 'Compass' | 'Briefcase';
}

export function computeNextStep(params: {
  profile?: Partial<CandidateProfile> | null;
  preferences?: Partial<UserPreferences> | null;
  jobs?: Partial<JobPosting>[];
  applications?: Partial<ApplicationDraft>[];
  llmSettings?: Partial<LLMSettings> | null;
}): NextStepAction {
  const { profile, preferences, jobs = [], applications = [] } = params;

  const hasCV = Boolean(
    profile?.name &&
    profile.name.trim().toLowerCase() !== 'candidato' &&
    ((profile.technical_skills?.length || 0) > 0 || (profile.experiences?.length || 0) > 0)
  );
  const hasPrefs = Boolean(preferences?.target_roles && preferences.target_roles.length > 0);
  const hasJobs = jobs.length > 0;
  const hasApplications = applications.length > 0;
  const interviewJob = jobs.find(j => j.status === 'interview_scheduled' || j.status === 'interview_done');

  if (interviewJob) {
    return {
      title: 'Prepara tu próxima entrevista',
      description: `Tienes una postulación activa en etapa de entrevista para ${interviewJob.title} en ${interviewJob.company}. Practica preguntas con Opi.`,
      cta: 'Preparar entrevista',
      route: '/postulaciones',
      iconName: 'TrendingUp'
    };
  }

  if (!hasCV) {
    return {
      title: 'Sube tu currículum',
      description: 'Extrae tu experiencia y habilidades para que Oportia calibre las ofertas a tu medida sin inventar datos.',
      cta: 'Subir mi CV',
      route: '/perfil?tab=cv',
      iconName: 'FileText'
    };
  }

  if (!hasPrefs) {
    return {
      title: 'Define qué estás buscando',
      description: 'Configura tus cargos objetivo, región y modalidad preferida para filtrar oportunidades exactas.',
      cta: 'Definir qué busco',
      route: '/perfil?tab=busqueda',
      iconName: 'Target'
    };
  }

  if (!hasJobs) {
    return {
      title: 'Busca tus primeras ofertas',
      description: 'Explora ofertas laborales activas en portales chilenos y remotos con tu perfil.',
      cta: 'Buscar empleos',
      route: '/empleos',
      iconName: 'Compass'
    };
  }

  if (!hasApplications) {
    return {
      title: 'Revisa tus ofertas y postula',
      description: `Tienes ${jobs.length} ofertas disponibles en tu radar. Elige una y genera tu CV adaptado.`,
      cta: 'Revisar ofertas recomendadas',
      route: '/empleos',
      iconName: 'Compass'
    };
  }

  return {
    title: 'Monitorea tus postulaciones',
    description: `Tienes ${applications.length} postulaciones registradas. Revisa el estado de tus procesos.`,
    cta: 'Ver mis postulaciones',
    route: '/postulaciones',
    iconName: 'Briefcase'
  };
}
