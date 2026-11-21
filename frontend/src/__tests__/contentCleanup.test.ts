import { describe, it, expect } from 'vitest';
import { plural, formatChatTime, CV_ACCEPT } from '../utils/format';
import { typicalInterviewQuestions } from '../utils/interviewQuestions';
import { APP_VERSION } from '../utils/appVersion';
import pkg from '../../package.json';
import footerSrc from '../components/Footer.tsx?raw';
import settingsSrc from '../components/SettingsView.tsx?raw';
import step1Src from '../components/onboarding/OnboardingStep1CV.tsx?raw';
import editorSrc from '../features/perfil/CvEditor.tsx?raw';

/** 1.6.12: contenido y deuda técnica (DT-34, DT-35, DT-36, DT-37). */
describe('versión en un solo lugar (DT-37)', () => {
  it('sale de package.json y no está escrita a mano', () => {
    expect(APP_VERSION).toBe(pkg.version);
    expect(footerSrc).not.toMatch(/v1\.\d+\.\d+/);
    expect(settingsSrc).not.toMatch(/Versión 1\.\d+\.\d+/);
  });
});

describe('textos (DT-35)', () => {
  it('singular y plural', () => {
    expect(plural(1, 'oferta disponible', 'ofertas disponibles')).toBe('1 oferta disponible');
    expect(plural(1250, 'oferta', 'ofertas')).toBe('1.250 ofertas');
  });

  it('hora del chat en formato chileno, también en mensajes antiguos', () => {
    expect(formatChatTime('9:05 PM')).toBe('21:05');
    expect(formatChatTime('09:05 a. m.')).toBe('09:05');
    expect(formatChatTime('14:30')).toBe('14:30');
    expect(formatChatTime('2026-11-20T21:05:00')).toMatch(/^\d{2}:\d{2}$/);
  });

  it('la guía y Mi perfil aceptan los mismos formatos de CV', () => {
    expect(CV_ACCEPT).toContain('.txt');
    expect(step1Src).toMatch(/accept=\{CV_ACCEPT\}/);
    expect(editorSrc).toMatch(/accept=\{CV_ACCEPT\}/);
    expect(editorSrc).not.toMatch(/window\.confirm/);
  });
});

describe('preguntas tipo por área (DT-36)', () => {
  it('una oferta de salud recibe preguntas de salud, no de "habilidades técnicas"', () => {
    const { area, questions } = typicalInterviewQuestions({ title: 'TENS Urgencia', company: 'Clínica Ficticia', description: 'Atención de pacientes' });
    expect(area).toBe('Salud');
    expect(questions[0]).toBe('¿Por qué te interesa el cargo de TENS Urgencia en Clínica Ficticia?');
    expect(questions.join(' ')).toMatch(/paciente/);
    expect(questions.join(' ')).not.toMatch(/habilidades técnicas/);
  });

  it('bodega y un cargo sin área reconocida', () => {
    expect(typicalInterviewQuestions({ title: 'Operador de bodega', company: '', description: '' }).area).toBe('Logística y bodega');
    const other = typicalInterviewQuestions({ title: 'Cargo X', company: 'Empresa no indicada', description: '' });
    expect(other.area).toBeNull();
    expect(other.questions[0]).toBe('¿Por qué te interesa el cargo de Cargo X?');
    expect(other.questions).toHaveLength(3);
  });
});
