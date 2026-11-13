import { describe, it, expect } from 'vitest';
import { computeNextStep } from '../utils/nextStep';
import type { CandidateProfile, UserPreferences, JobPosting, ApplicationDraft } from '../types';

describe('Cálculo de Siguiente Paso Sugerido (nextStep.ts)', () => {
  it('sugiere subir currículum cuando el usuario no tiene perfil cargado', () => {
    const step = computeNextStep({
      profile: null,
      preferences: null,
      jobs: [],
      applications: []
    });

    expect(step.title).toBe('Sube tu currículum');
    expect(step.cta).toBe('Subir mi CV');
    expect(step.route).toBe('/perfil?tab=cv');
    expect(step.iconName).toBe('FileText');
  });

  it('sugiere subir currículum si el perfil tiene nombre por defecto y sin habilidades', () => {
    const step = computeNextStep({
      profile: { name: 'Candidato', technical_skills: [], experiences: [] },
      preferences: null,
      jobs: [],
      applications: []
    });

    expect(step.title).toBe('Sube tu currículum');
  });

  it('sugiere definir preferencias cuando ya tiene CV pero no cargos objetivo', () => {
    const profile = {
      name: 'María González',
      headline: 'Enfermera Clínica',
      technical_skills: ['RCP', 'Urgencias'],
      experiences: []
    };

    const step = computeNextStep({
      profile,
      preferences: { target_roles: [] },
      jobs: [],
      applications: []
    });

    expect(step.title).toBe('Define qué estás buscando');
    expect(step.cta).toBe('Definir qué busco');
    expect(step.route).toBe('/perfil?tab=busqueda');
    expect(step.iconName).toBe('Target');
  });

  it('sugiere buscar ofertas cuando ya definió preferencias pero no tiene empleos en radar', () => {
    const profile = {
      name: 'Felipe Morales',
      headline: 'Arquitecto',
      technical_skills: ['BIM', 'Revit'],
      experiences: []
    };
    const preferences = {
      target_roles: ['Arquitecto BIM']
    };

    const step = computeNextStep({
      profile,
      preferences,
      jobs: [],
      applications: []
    });

    expect(step.title).toBe('Busca tus primeras ofertas');
    expect(step.cta).toBe('Buscar empleos');
    expect(step.route).toBe('/empleos');
    expect(step.iconName).toBe('Compass');
  });

  it('sugiere revisar ofertas y postular cuando hay ofertas pero ninguna postulación iniciada', () => {
    const profile = {
      name: 'Camila Rojas',
      headline: 'Desarrolladora Full Stack',
      technical_skills: ['Python', 'FastAPI'],
      experiences: []
    };
    const preferences = {
      target_roles: ['Python Developer']
    };
    const jobs: Partial<JobPosting>[] = [
      { id: 'job-1', title: 'Python Backend Dev', company: 'Tech Inc', location: 'Remoto', description: 'Vacante' }
    ];

    const step = computeNextStep({
      profile,
      preferences,
      jobs,
      applications: []
    });

    expect(step.title).toBe('Revisa tus ofertas y postula');
    expect(step.cta).toBe('Revisar ofertas recomendadas');
    expect(step.route).toBe('/empleos');
    expect(step.description).toContain('1 ofertas disponibles');
  });

  it('sugiere monitorear postulaciones cuando ya hay postulaciones creadas', () => {
    const profile = {
      name: 'Valentina Silva',
      headline: 'Abogada',
      technical_skills: ['Litigación', 'Derecho Laboral'],
      experiences: []
    };
    const preferences = {
      target_roles: ['Abogada Laboral']
    };
    const jobs: Partial<JobPosting>[] = [
      { id: 'job-1', title: 'Abogada Junior', company: 'Estudio Jurídico', location: 'Santiago', description: 'Vacante' }
    ];
    const applications: Partial<ApplicationDraft>[] = [
      { id: 'app-1', job_id: 'job-1', tailored_cv_markdown: 'CV', cover_letter: 'Carta', ats_score: 90 }
    ];

    const step = computeNextStep({
      profile,
      preferences,
      jobs,
      applications
    });

    expect(step.title).toBe('Monitorea tus postulaciones');
    expect(step.cta).toBe('Ver mis postulaciones');
    expect(step.route).toBe('/postulaciones');
    expect(step.iconName).toBe('Briefcase');
  });

  it('prioriza preparar entrevista si un empleo está en etapa de entrevista', () => {
    const profile = {
      name: 'Alex Dev',
      headline: 'Senior Engineer',
      technical_skills: ['Python'],
      experiences: []
    };
    const preferences = {
      target_roles: ['Lead Engineer']
    };
    const jobs: Partial<JobPosting>[] = [
      {
        id: 'job-1',
        title: 'Lead Cloud Engineer',
        company: 'CloudGlobal',
        location: 'Remoto',
        description: 'Vacante',
        status: 'interview_scheduled'
      }
    ];

    const step = computeNextStep({
      profile,
      preferences,
      jobs,
      applications: []
    });

    expect(step.title).toBe('Prepara tu próxima entrevista');
    expect(step.cta).toBe('Preparar entrevista');
    expect(step.route).toBe('/postulaciones');
    expect(step.iconName).toBe('TrendingUp');
    expect(step.description).toContain('CloudGlobal');
  });
});
