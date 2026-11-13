import React, { useState } from 'react';
import type { CandidateProfile } from '../../types';
import { Printer, Download, Layout, Palette, AlignLeft, AlignCenter } from 'lucide-react';

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
}

export const CvPreview: React.FC<CvPreviewProps> = ({
  profile,
  tailoredMarkdown,
  showControls = true,
  className = ''
}) => {
  const [template, setTemplate] = useState<'modern' | 'minimalist' | 'executive'>('modern');
  const [paperTheme, setPaperTheme] = useState<'white' | 'warm' | 'cream'>('white');
  const [align, setAlign] = useState<'left' | 'center'>('left');
  const [viewSource, setViewSource] = useState<'profile' | 'tailored'>(tailoredMarkdown ? 'tailored' : 'profile');

  const paperBg =
    paperTheme === 'warm'
      ? 'bg-[#FDFBF7] text-[#2C2825]'
      : paperTheme === 'cream'
      ? 'bg-[#FBF9F1] text-[#262420]'
      : 'bg-white text-zinc-900';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controles superiores (plegables / configurables) */}
      {showControls && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-zinc-800/60 rounded-2xl border border-gray-200/80 dark:border-zinc-700/60 text-xs">
          {/* Switcher entre perfil base y versión adaptada */}
          {tailoredMarkdown && (
            <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded-xl border border-gray-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => setViewSource('profile')}
                className={`px-3 py-1.5 min-h-[36px] rounded-lg font-semibold transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none ${
                  viewSource === 'profile' ? 'bg-brand text-white shadow-xs' : 'text-ink-muted'
                }`}
              >
                CV Base
              </button>
              <button
                type="button"
                onClick={() => setViewSource('tailored')}
                className={`px-3 py-1.5 min-h-[36px] rounded-lg font-semibold transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none ${
                  viewSource === 'tailored' ? 'bg-brand text-white shadow-xs' : 'text-ink-muted'
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
              className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 min-h-[36px] text-xs text-ink dark:text-gray-200 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
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
              className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 min-h-[36px] text-xs text-ink dark:text-gray-200 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
            >
              <option value="white">Blanco puro</option>
              <option value="warm">Cálido suave</option>
              <option value="cream">Papel marfil</option>
            </select>
          </div>

          {/* Alineación */}
          <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-0.5 rounded-lg border border-gray-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setAlign('left')}
              aria-label="Alinear cabecera a la izquierda"
              className={`p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md cursor-pointer transition focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none ${align === 'left' ? 'bg-gray-200 dark:bg-zinc-700 text-ink dark:text-white' : 'text-ink-muted'}`}
              title="Alinear a la izquierda"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setAlign('center')}
              aria-label="Centrar cabecera"
              className={`p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md cursor-pointer transition focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none ${align === 'center' ? 'bg-gray-200 dark:bg-zinc-700 text-ink dark:text-white' : 'text-ink-muted'}`}
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
            className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl bg-brand hover:bg-brand-600 text-white font-medium shadow-xs transition cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir / Guardar PDF</span>
          </button>
        </div>
      )}

      {/* Contenedor Hoja A4 */}
      <div
        id="cv-printable-area"
        className={`mx-auto max-w-[800px] shadow-lg rounded-2xl border border-gray-200/80 p-8 sm:p-12 transition-all ${paperBg} print:shadow-none print:border-none print:p-0 print:m-0`}
      >
        {viewSource === 'tailored' && tailoredMarkdown ? (
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed">
            {tailoredMarkdown}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cabecera */}
            <div className={`space-y-2 border-b border-gray-200/80 pb-6 ${align === 'center' ? 'text-center' : 'text-left'}`}>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-950">
                {profile.name || 'Tu Nombre'}
              </h1>
              <p className="text-sm sm:text-base font-semibold text-[#20A88A]">
                {profile.headline || profile.primary_profession || 'Profesional'}
              </p>

              {/* Fila de contacto */}
              <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 ${align === 'center' ? 'justify-center' : 'justify-start'}`}>
                {profile.email && <span>{profile.email}</span>}
                {profile.phone && <span>• {profile.phone}</span>}
                {(profile.commune || profile.region || profile.location) && (
                  <span>• {profile.commune ? `${profile.commune}, ` : ''}{profile.region || profile.location || 'Chile'}</span>
                )}
                {profile.linkedin_url && (
                  <span>• <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="hover:underline">LinkedIn</a></span>
                )}
              </div>
            </div>

            {/* Resumen */}
            {profile.summary && (
              <div className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-1">
                  Resumen Profesional
                </h2>
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                  {profile.summary}
                </p>
              </div>
            )}

            {/* Habilidades Técnicas y Blandas */}
            {((profile.technical_skills && profile.technical_skills.length > 0) || (profile.soft_skills && profile.soft_skills.length > 0)) && (
              <div className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-1">
                  Habilidades y Competencias
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
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-1">
                  Experiencia Laboral
                </h2>
                <div className="space-y-4">
                  {profile.experiences.map((exp) => (
                    <div key={exp.id || exp.role} className="space-y-1.5">
                      <div className="flex flex-wrap justify-between items-baseline gap-2">
                        <div className="font-bold text-sm text-gray-900">
                          {exp.role} <span className="font-semibold text-gray-600">· {exp.company}</span>
                        </div>
                        <span className="text-xs text-gray-500 font-medium">
                          {formatExperiencePeriod(exp.start_date, exp.end_date)}
                        </span>
                      </div>
                      {exp.description && (
                        <p className="text-xs text-gray-700 leading-relaxed">
                          {exp.description}
                        </p>
                      )}
                      {exp.bullet_achievements && exp.bullet_achievements.length > 0 && (
                        <ul className="list-disc list-inside text-xs text-gray-700 space-y-1 pl-1">
                          {exp.bullet_achievements.map((bullet, i) => (
                            <li key={i}>{bullet.replace(/^[*\-●•+]\s*/, '')}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Educación */}
            {profile.education && profile.education.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-1">
                  Educación
                </h2>
                <div className="space-y-2">
                  {profile.education.map((edu, idx) => (
                    <div key={idx} className="flex flex-wrap justify-between items-baseline gap-2 text-xs">
                      <span className="font-semibold text-gray-900">
                        {edu.degree} en {edu.field_of_study} — <span className="font-normal text-gray-600">{edu.institution}</span>
                      </span>
                      {edu.graduation_year && <span className="text-gray-500">{edu.graduation_year}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Idiomas */}
            {profile.languages && Object.keys(profile.languages).length > 0 && (
              <div className="space-y-1.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-1">
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
  );
};
