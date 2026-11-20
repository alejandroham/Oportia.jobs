import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { parseLegalMarkdown, safeHref, slugify } from '../features/legal/LegalDocument';
import { LegalPage } from '../features/legal/LegalPage';
import privacyMd from '../../../PRIVACY.md?raw';
import termsMd from '../../../TERMINOS.md?raw';
import step1Src from '../components/onboarding/OnboardingStep1CV.tsx?raw';
import landingSrc from '../components/landing/LandingPage.tsx?raw';
import aiPanelSrc from '../components/settings/SettingsAIPanel.tsx?raw';
import footerSrc from '../components/Footer.tsx?raw';
import privacyPanelSrc from '../components/settings/SettingsPrivacyPanel.tsx?raw';
import feedbackSrc from '../components/feedback/FeedbackDialog.tsx?raw';

describe('Documentos legales en la app (DT-08)', () => {
  it('las anclas calzan con las de GitHub', () => {
    expect(slugify('9. Opiniones y contacto voluntario')).toBe('9-opiniones-y-contacto-voluntario');
    const ids = parseLegalMarkdown(privacyMd).flatMap((b) => ('id' in b ? [b.id] : []));
    expect(ids).toContain('9-opiniones-y-contacto-voluntario');
    expect(ids).toContain('8-canales-de-contacto-y-dudas-sobre-privacidad');
  });

  it('lee la tabla de derechos ARCO de la política', () => {
    const table = parseLegalMarkdown(privacyMd).find((b) => b.type === 'table');
    expect(table && table.type === 'table' && table.rows.length).toBe(5);
  });

  it('solo permite enlaces seguros y lleva los documentos a su ruta', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('http://inseguro.cl')).toBeNull();
    expect(safeHref('https://github.com/x')).toBe('https://github.com/x');
    expect(safeHref('PRIVACY.md#8-canales')).toBe('/privacidad#8-canales');
    expect(safeHref('TERMINOS.md')).toBe('/terminos');
  });

  it('/privacidad y /terminos muestran su documento con enlace al otro', () => {
    const { unmount } = render(<MemoryRouter><LegalPage kind="privacidad" /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Política de Privacidad/);
    expect(screen.getByRole('link', { name: 'Términos de uso' })).toHaveAttribute('href', '/terminos');
    unmount();
    render(<MemoryRouter><LegalPage kind="terminos" /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Términos de uso/);
    expect(termsMd).toMatch(/no envía postulaciones por ti/);
  });

  it('hay enlace a la política en el pie, Ajustes > Privacidad, la guía (antes de subir el CV) y Opinión', () => {
    expect(footerSrc).toMatch(/to="\/privacidad"/);
    expect(footerSrc).toMatch(/to="\/terminos"/);
    expect(privacyPanelSrc).toMatch(/to="\/privacidad"/);
    expect(step1Src).toMatch(/href="\/privacidad"/);
    expect(feedbackSrc).toMatch(/to="\/privacidad#9-opiniones-y-contacto-voluntario"/);
    expect(feedbackSrc).not.toMatch(/github\.com\/alejandroham\/Oportia\.jobs\/blob\/main\/PRIVACY\.md/);
  });
});

describe('Textos honestos (DT-09 y DT-10)', () => {
  it('ningún texto dice que el CV se procesa en el navegador', () => {
    expect(step1Src).not.toMatch(/en tu navegador sin inventar/);
    expect(step1Src).toMatch(/Leemos tu CV en nuestro servidor/);
    expect(landingSrc).not.toMatch(/se quedan contigo, en tu navegador/);
    expect(footerSrc).not.toMatch(/100% Local-First/);
  });

  it('el texto de las claves dice cuándo viajan', () => {
    expect(aiPanelSrc).toMatch(/solo viaja cuando usas la IA/);
    expect(aiPanelSrc).not.toMatch(/exclusivamente en tu navegador/);
  });
});
