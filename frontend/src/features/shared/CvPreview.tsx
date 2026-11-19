import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { CandidateProfile } from '../../types';
import { Printer, Layout, Palette, AlignLeft, AlignCenter, Minimize2, FileCheck2, FileWarning } from 'lucide-react';
import { MarkdownDocument } from './MarkdownDocument';
import { getProfileLinks } from '../../utils/profileKeywords';
import { safeExternalUrl } from '../../utils/jobSource';
import { printElement, buildDocumentTitle } from '../../utils/printDocument';
import { describePages, findFitScale, measurePrintHeight, pagesFor } from '../../utils/cvPages';
import { withProfileHeader } from '../../utils/cvHeader';
import { cleanText, formatEducation, formatPeriod } from '../../utils/cvFormat';
import { MAX_TRIM_LEVEL, TRIM_NOTES, trimMarkdown } from '../../utils/cvTrim';
import { MIN_FIT_SCALE } from '../../utils/cvPages';

export const formatExperiencePeriod = (startDate?: string, endDate?: string): string => {
  const start = (startDate || '').trim();
  const end = (endDate || '').trim();
  if (!start && !end) return '';
  if (start && end) {
    if (start.includes('–') || start.includes(' - ') || start.toLowerCase().includes(' a ')) {
      return start;
    }
    return `${start} – ${end}`;
  }
  if (start && !end) return start;
  return end;
};

interface CvPreviewProps {
  profile: CandidateProfile;
  tailoredMarkdown?: string;
  showControls?: boolean;
  className?: string;
  /** Empresa / cargo de la postulación, se usa para el nombre del PDF. */
  documentLabel?: string;
  /** Hojas que debería ocupar (según el largo elegido): se avisa si se pasa. */
  targetPages?: number;
  /** Informa cuántas hojas ocupa al imprimir (para la revisión ATS). */
  onPagesChange?: (pages: number | null) => void;
  /** Ajustar solo el CV adaptado a `targetPages`: achica la letra y, si no basta, recorta lo menos importante. */
  autoFit?: boolean;
}

export const CvPreview: React.FC<CvPreviewProps> = ({
  profile,
  tailoredMarkdown,
  showControls = true,
  className = '',
  documentLabel,
  targetPages,
  onPagesChange,
  autoFit = false
}) => {
  const printableRef = useRef<HTMLDivElement>(null);
  const [template, setTemplate] = useState<'modern' | 'minimalist' | 'executive'>('modern');
  const [paperTheme, setPaperTheme] = useState<'white' | 'warm' | 'cream'>('white');
  const [align, setAlign] = useState<'left' | 'center'>('left');
  const [viewSource, setViewSource] = useState<'profile' | 'tailored'>(tailoredMarkdown ? 'tailored' : 'profile');
  // Escala de "Ajustar a la hoja" (1 = tamaño normal) y hojas que ocupa al imprimir.
  const [scale, setScale] = useState(1);
  const [pages, setPages] = useState<number | null>(null);
  const [fitNote, setFitNote] = useState('');
  // Ajuste automático: nivel de recorte (0 = completo) y si la persona pidió ver el CV completo.
  const [trimLevel, setTrimLevel] = useState(0);
  const [showFull, setShowFull] = useState(false);
  const autoActive = autoFit && !showFull && viewSource === 'tailored' && Boolean(tailoredMarkdown) && targetPages !== undefined;
  const shownMarkdown = tailoredMarkdown ? trimMarkdown(withProfileHeader(tailoredMarkdown, profile), autoActive ? trimLevel : 0) : '';

  const measure = useCallback((s: number) => (printableRef.current ? measurePrintHeight(printableRef.current, s) : 0), []);

  // Cada vez que cambia el contenido, la plantilla o la escala, se vuelve a medir (en el próximo cuadro).
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const h = measure(scale);
      const p = h > 0 ? pagesFor(h) : null;
      setPages(p);
      onPagesChange?.(viewSource === 'tailored' ? p : null);
    });
    return () => cancelAnimationFrame(id);
  }, [measure, scale, template, viewSource, tailoredMarkdown, profile, trimLevel, showFull]);

  // Contenido nuevo: vuelve al tamaño normal.
  useEffect(() => {
    setScale(1);
    setFitNote('');
    setTrimLevel(0);
    setShowFull(false);
  }, [tailoredMarkdown, viewSource]);

  // Ajuste automático a las hojas elegidas: primero letra y espacios (hasta 82 %); si no basta, se recorta
  // de lo menos importante a lo más importante (ver utils/cvTrim.ts) y se vuelve a medir.
  useEffect(() => {
    if (!autoActive || !targetPages) return;
    const id = requestAnimationFrame(() => {
      const best = findFitScale(measure, targetPages);
      if (best !== null) {
        setScale(best);
        setFitNote(best < 1 ? `Letra y espacios al ${Math.round(best * 100)} % para que quepa.` : '');
      } else if (trimLevel < MAX_TRIM_LEVEL) {
        setTrimLevel((l) => l + 1);
      } else {
        setScale(MIN_FIT_SCALE);
        setFitNote(`No cabe en ${targetPages === 1 ? '1 hoja' : `${targetPages} hojas`} ni recortando. Elige menos experiencias en «Largo y experiencias del CV».`);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [autoActive, targetPages, trimLevel, template, shownMarkdown, measure]);

  const handleFit = () => {
    const target = targetPages ?? Math.max(1, Math.ceil((pages ?? 1) - 0.25));
    const best = findFitScale(measure, target);
    if (best === null) {
      setFitNote(`No cabe en ${target === 1 ? '1 hoja' : `${target} hojas`} ni con la letra mínima legible. Quita una experiencia o elige un CV más largo.`);
      return;
    }
    setScale(best);
    setFitNote(best === 1 ? 'Ya cabe sin achicar la letra.' : `Letra y espacios al ${Math.round(best * 100)} % para que quepa.`);
  };
  const overTarget = targetPages !== undefined && pages !== null && pages > targetPages + 0.01;

  // Cuando la IA termina de adaptar el CV, mostrar (e imprimir) la versión adaptada.
  useEffect(() => {
    if (tailoredMarkdown) setViewSource('tailored');
  }, [tailoredMarkdown]);

  const paperBg =
    paperTheme === 'warm'
      ? 'bg-[#FDFBF7] text-[#2C2825]'
      : paperTheme === 'cream'
      ? 'bg-[#FBF9F1] text-[#262420]'
      : 'bg-white text-zinc-900';

  const handlePrint = () => {
    void printElement(
      printableRef.current,
      buildDocumentTitle('CV', profile.name, viewSource === 'tailored' ? documentLabel : undefined)
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controles superiores (plegables / configurables) */}
      {showControls && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-ink-raised/60 rounded-2xl border border-gray-200/80 dark:border-ink-line/60 text-xs">
          {/* Switcher entre perfil base y versión adaptada */}
          {tailoredMarkdown && (
            <div className="flex items-center gap-1 bg-white dark:bg-ink-surface p-1 rounded-xl border border-gray-200 dark:border-ink-line">
              <button
                type="button"
                onClick={() => setViewSource('profile')}
                className={`px-3 py-1.5 min-h-[36px] rounded-lg font-semibold transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none ${
                  viewSource === 'profile' ? 'bg-brand-600 text-white shadow-xs' : 'text-ink-muted'
                }`}
              >
                CV Base
              </button>
              <button
                type="button"
                onClick={() => setViewSource('tailored')}
                className={`px-3 py-1.5 min-h-[36px] rounded-lg font-semibold transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none ${
                  viewSource === 'tailored' ? 'bg-brand-600 text-white shadow-xs' : 'text-ink-muted'
                }`}
              >
                CV Adaptado
              </button>
            </div>
          )}

          {/* Selector de plantilla */}
          <div className="flex items-center gap-1.5">
            <Layout className="w-3.5 h-3.5 text-ink-muted" />
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value as any)}
              aria-label="Plantilla de currículum"
              className="bg-white dark:bg-ink-surface border border-gray-200 dark:border-ink-line rounded-lg px-2.5 py-1.5 min-h-[36px] text-xs text-ink dark:text-gray-200 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
            >
              <option value="modern">Moderna</option>
              <option value="minimalist">Minimalista</option>
              <option value="executive">Ejecutiva</option>
            </select>
          </div>

          {/* Selector de papel */}
          <div className="flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-ink-muted" />
            <select
              value={paperTheme}
              onChange={(e) => setPaperTheme(e.target.value as any)}
              aria-label="Tono del papel"
              className="bg-white dark:bg-ink-surface border border-gray-200 dark:border-ink-line rounded-lg px-2.5 py-1.5 min-h-[36px] text-xs text-ink dark:text-gray-200 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
            >
              <option value="white">Blanco puro</option>
              <option value="warm">Cálido suave</option>
              <option value="cream">Papel marfil</option>
            </select>
          </div>

          {/* Alineación */}
          <div className="flex items-center gap-1 bg-white dark:bg-ink-surface p-0.5 rounded-lg border border-gray-200 dark:border-ink-line">
            <button
              type="button"
              onClick={() => setAlign('left')}
              aria-label="Alinear cabecera a la izquierda"
              className={`p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md cursor-pointer transition focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none ${align === 'left' ? 'bg-gray-200 dark:bg-ink-hover text-ink dark:text-white' : 'text-ink-muted'}`}
              title="Alinear a la izquierda"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setAlign('center')}
              aria-label="Centrar cabecera"
              className={`p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md cursor-pointer transition focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none ${align === 'center' ? 'bg-gray-200 dark:bg-ink-hover text-ink dark:text-white' : 'text-ink-muted'}`}
              title="Centrar cabecera"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Botón Imprimir / PDF */}
          <button
            type="button"
            onClick={handlePrint}
            aria-label="Descargar o imprimir currículum en formato PDF"
            className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium shadow-xs transition cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir / Guardar PDF</span>
          </button>
        </div>
      )}

      {/* Medidor de hojas y "Ajustar a la hoja" */}
      {showControls && pages !== null && (
        <div className="flex flex-wrap items-center gap-2 text-xs" aria-live="polite">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold border ${
              overTarget
                ? 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-500/10 dark:text-amber-100 dark:border-amber-400/30'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-400/30'
            }`}
          >
            {overTarget ? <FileWarning className="w-3.5 h-3.5" aria-hidden="true" /> : <FileCheck2 className="w-3.5 h-3.5" aria-hidden="true" />}
            {describePages(pages)}
            {overTarget && ` (pediste ${targetPages === 1 ? '1 hoja' : `${targetPages} hojas`})`}
          </span>
          <button
            type="button"
            onClick={handleFit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg border border-gray-200 dark:border-ink-line bg-white dark:bg-ink-surface font-semibold text-ink dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-ink-raised cursor-pointer"
          >
            <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" /> Ajustar a la hoja
          </button>
          {scale < 1 && (
            <button type="button" onClick={() => { setScale(1); setFitNote(''); }} className="underline text-ink-muted hover:text-ink dark:hover:text-white cursor-pointer">
              Tamaño normal
            </button>
          )}
          {fitNote && <span className="text-ink-muted dark:text-ink-200">{fitNote}</span>}
          {autoActive && trimLevel > 0 && (
            <div role="status" className="basis-full p-2.5 rounded-lg bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-400/30 text-sky-900 dark:text-sky-100">
              <p className="font-semibold">
                Para que quepa en {targetPages === 1 ? '1 hoja' : `${targetPages} hojas`}, Oportia acortó el CV (sin quitar cargos ni estudios):
              </p>
              <ul className="list-disc pl-5 mt-1">
                {Array.from({ length: trimLevel }, (_, i) => i + 1).map((l) => <li key={l}>{TRIM_NOTES[l]}</li>)}
              </ul>
              <button type="button" onClick={() => { setShowFull(true); setScale(1); setFitNote(''); }} className="mt-1 underline font-semibold cursor-pointer">
                Ver el CV completo
              </button>
            </div>
          )}
          {autoFit && showFull && viewSource === 'tailored' && (
            <button type="button" onClick={() => { setShowFull(false); setTrimLevel(0); }} className="underline text-ink-muted hover:text-ink dark:hover:text-white cursor-pointer">
              Volver a ajustar a {targetPages === 1 ? '1 hoja' : `${targetPages} hojas`}
            </button>
          )}
        </div>
      )}

      {/* Contenedor Hoja A4 */}
      <div
        id="cv-printable-area"
        ref={printableRef}
        lang="es"
        className={`printable-cv cv-doc cv-tpl-${template} ${align === 'center' ? 'cv-align-center' : ''} mx-auto max-w-[800px] shadow-lg rounded-2xl border border-gray-200/80 p-8 sm:p-12 transition-all ${paperBg} print:shadow-none print:border-none print:p-0 print:m-0`}
      >
        <div data-cv-scale style={scale < 1 ? ({ zoom: scale } as React.CSSProperties) : undefined}>
        {viewSource === 'tailored' && tailoredMarkdown ? (
          <MarkdownDocument markdown={shownMarkdown} justify />
        ) : (
          <div className="space-y-6">
            {/* Cabecera */}
            <div className={`space-y-2 border-b border-gray-200/80 pb-6 ${align === 'center' ? 'text-center' : 'text-left'}`}>
              <h1 className="cv-h1 text-2xl sm:text-3xl font-bold tracking-tight text-gray-950">
                {profile.name || 'Tu Nombre'}
              </h1>
              <p className="text-sm sm:text-base font-semibold text-brand-700">
                {profile.headline || profile.primary_profession || 'Profesional'}
              </p>
              {(profile.secondary_professions?.length ?? 0) > 0 && (
                <p className="text-xs text-gray-600">También: {profile.secondary_professions!.join(' · ')}</p>
              )}

              {/* Fila de contacto */}
              <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 ${align === 'center' ? 'justify-center' : 'justify-start'}`}>
                {profile.email && <span>{profile.email}</span>}
                {profile.phone && <span>• {profile.phone}</span>}
                {(profile.commune || profile.region || profile.location) && (
                  <span>• {profile.commune ? `${profile.commune}, ` : ''}{profile.region || profile.location || 'Chile'}</span>
                )}
                {getProfileLinks(profile).map((l) =>
                  safeExternalUrl(l.url) ? (
                    <span key={l.url}>
                      • <a href={safeExternalUrl(l.url) as string} target="_blank" rel="noreferrer" className="hover:underline">
                        {l.label === 'Sitio web' || l.label === 'Otro' ? l.url.replace(/^https?:\/\//, '').replace(/\/$/, '') : l.label}
                      </a>
                    </span>
                  ) : null
                )}
              </div>
            </div>

            {/* Resumen */}
            {profile.summary && (
              <div className="space-y-2">
                <h2 className="cv-h2 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-1">
                  Perfil profesional
                </h2>
                <p className="formal-justify text-xs sm:text-sm text-gray-700 leading-relaxed">
                  {profile.summary}
                </p>
              </div>
            )}

            {/* Habilidades Técnicas y Blandas */}
            {((profile.technical_skills && profile.technical_skills.length > 0) || (profile.soft_skills && profile.soft_skills.length > 0)) && (
              <div className="space-y-2">
                <h2 className="cv-h2 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-1">
                  Competencias
                </h2>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {profile.technical_skills?.map((skill, i) => (
                    <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-800 rounded-md font-medium border border-gray-200">
                      {skill}
                    </span>
                  ))}
                  {profile.soft_skills?.map((skill, i) => (
                    <span key={i} className="px-2 py-0.5 text-xs bg-teal-50 text-teal-800 rounded-md font-medium border border-teal-200">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Experiencia Laboral */}
            {profile.experiences && profile.experiences.length > 0 && (
              <div className="space-y-4">
                <h2 className="cv-h2 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-1">
                  Experiencia laboral
                </h2>
                <div className="space-y-4">
                  {profile.experiences.map((exp) => (
                    <div key={exp.id || exp.role} className="space-y-1.5">
                      {/* Formato ATS: cargo — empresa, y en la línea siguiente fecha | ciudad */}
                      <h3 className="cv-h3 font-bold text-sm text-gray-900">
                        {exp.role} — {exp.company}
                      </h3>
                      {(formatPeriod(exp) || exp.location || exp.is_remote) && (
                        <p className="text-xs text-gray-600 font-medium">
                          {[formatPeriod(exp), exp.location || (exp.is_remote ? 'Remoto' : '')].filter(Boolean).join(' | ')}
                        </p>
                      )}
                      {exp.description && (
                        <p className="formal-justify text-xs text-gray-700 leading-relaxed">
                          {cleanText(exp.description)}
                        </p>
                      )}
                      {exp.bullet_achievements && exp.bullet_achievements.length > 0 && (
                        <ul className="formal-justify list-disc pl-5 text-xs text-gray-700 space-y-1">
                          {exp.bullet_achievements.map((bullet, i) => (
                            <li key={i}>{cleanText(bullet.replace(/^[*\-●•+]\s*/, ''))}</li>
                          ))}
                        </ul>
                      )}
                      {exp.technologies?.length > 0 && (
                        <p className="text-xs text-gray-700">Tecnologías: {exp.technologies.slice(0, 10).join(', ')}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Educación */}
            {profile.education && profile.education.length > 0 && (
              <div className="space-y-3">
                <h2 className="cv-h2 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-1">
                  Educación
                </h2>
                <div className="space-y-2">
                  {profile.education.map((edu, idx) => (
                    <p key={idx} className="text-xs text-gray-900">{formatEducation(edu)}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Certificaciones y cursos */}
            {profile.certifications && profile.certifications.length > 0 && (
              <div className="space-y-1.5">
                <h2 className="cv-h2 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-1">
                  Certificaciones y cursos
                </h2>
                <ul className="list-disc pl-5 text-xs text-gray-700 space-y-0.5">
                  {profile.certifications.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Idiomas */}
            {profile.languages && Object.keys(profile.languages).length > 0 && (
              <div className="space-y-1.5">
                <h2 className="cv-h2 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-1">
                  Idiomas
                </h2>
                <div className="flex flex-wrap gap-3 text-xs text-gray-700">
                  {Object.entries(profile.languages).map(([lang, level]) => (
                    <span key={lang}>
                      <strong className="font-medium text-gray-900">{lang}:</strong> {level}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
