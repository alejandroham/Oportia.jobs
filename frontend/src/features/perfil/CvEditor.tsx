import React, { useEffect, useState } from 'react';
import type { CandidateProfile } from '../../types';
import { CvExperienceSection } from './CvExperienceSection';
import { CvOrderBar } from './CvOrderBar';
import { CHILE_REGIONS } from '../../utils/chileRegions';

const EMAIL_OK = /^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$/;
// Chile (+56 9 1234 5678, 9 1234 5678, fijo +56 2 2345 6789) u otro país con +código.
const PHONE_OK = /^\+?[\d\s().-]{8,20}$/;
import { isOutOfOrder, sortEducation, sortExperiences, withChronologicalOrder } from '../../utils/cvOrder';
import { CvSkillsSection } from './CvSkillsSection';
import { CvPreviewModal } from './CvPreviewModal';
import { CvEducationSection } from './CvEducationSection';
import { CvLinksSection } from './CvLinksSection';
import { CvLanguagesSection } from './CvLanguagesSection';
import { TagInput } from '../../components/ui/TagInput';
import { getProfileLinks, suggestKeywords, withDetectedKeywords } from '../../utils/profileKeywords';
import { Upload, Eye, CheckCircle2, Circle, ChevronDown, ChevronUp, Save, Loader2, Mail, Sparkles, AlertTriangle } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../../components/Toast';
import { useAppStore } from '../../state/useAppStore';
import { getAIStatus } from '../../utils/aiStatus';
import { Dialog } from '../../components/ui/Dialog';
import { SharedAICard } from '../../components/settings/SharedAICard';
import { useNavigate } from 'react-router-dom';
import { useCareerInsights } from '../../state/useCareerInsights';

interface CvEditorProps {
  profile: CandidateProfile;
  onProfileUpdated: (updated: CandidateProfile) => void;
}

export const CvEditor: React.FC<CvEditorProps> = ({ profile, onProfileUpdated }) => {
  const withLinks = (p: CandidateProfile): CandidateProfile => ({ ...p, links: getProfileLinks(p) });
  const [formData, setFormData] = useState<CandidateProfile>(() => withLinks(profile));
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    personal: true, summary: false, experience: false, education: false, certifications: false, skills: false
  });
  // Si el perfil cambia desde fuera (por ejemplo, Opi agrega una habilidad desde el chat), refrescar.
  useEffect(() => {
    setFormData(withLinks(profile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.updated_at]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const settings = useAppStore((st) => st.settings);
  const aiReady = Boolean(settings.has_active_key) && getAIStatus(settings).ready;
  // Activar la IA ANTES de analizar el CV: archivo en espera mientras la persona decide.
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<{ method?: 'ia' | 'reglas'; note?: string | null } | null>(null);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const rawCvText = formData.raw_cv_text || profile.raw_cv_text || '';
  const careerInsights = useCareerInsights();

  const toggleSection = (sec: string) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Volver al orden automático: experiencia y educación de lo más reciente a lo más antiguo.
  const sortByDate = () => {
    const sorted = withChronologicalOrder({ ...formData, cv_order: 'fecha' });
    setFormData(sorted);
    if (isOutOfOrder(formData) || formData.cv_order === 'manual') toast.info('Ordené tu experiencia y tus estudios por fecha. Recuerda guardar.');
  };

  const handleSave = () => {
    const links = (formData.links || []).filter((l) => l.url.trim());
    onProfileUpdated({
      ...formData,
      links,
      // Compatibilidad: el primer enlace de LinkedIn también queda en linkedin_url.
      linkedin_url: links.find((l) => l.label === 'LinkedIn')?.url,
      education: (formData.education || []).filter((e) => e.degree || e.field_of_study || e.institution),
      updated_at: new Date().toISOString()
    });
    toast.success('Perfil y CV guardados en tu navegador');
  };

  const applyAnalysis = (res: { profile: CandidateProfile; method?: 'ia' | 'reglas'; note?: string | null }, keepFrom?: CandidateProfile) => {
    // Palabras clave de tu área que aparecen en el CV se agregan solas (se pueden quitar).
    let updated = withDetectedKeywords(res.profile);
    if (keepFrom) {
      // Al reanalizar se conservan tus enlaces y tus palabras clave.
      const kw = Array.from(new Set([...(keepFrom.keywords || []), ...(updated.keywords || [])]));
      updated = { ...updated, keywords: kw, links: getProfileLinks(keepFrom).length ? getProfileLinks(keepFrom) : updated.links };
    }
    updated = { ...updated, updated_at: new Date().toISOString() };
    setFormData(withLinks(updated));
    onProfileUpdated(updated);
    setAnalysis({ method: res.method, note: res.note });
    setOpenSections((prev) => ({ ...prev, experience: true, education: true, certifications: true }));
    if (res.method === 'ia') {
      toast.success(`Encontré ${updated.experiences?.length || 0} experiencias, ${updated.education?.length || 0} títulos y ${updated.certifications?.length || 0} cursos. Revísalos y guarda.`, 'CV analizado con IA');
      // Con la experiencia ya ordenada: cargos afines para «Qué busco» y logros STAR para «Mis logros».
      void careerInsights.run(updated);
    } else {
      toast.info(res.note || 'Analizamos tu CV sin IA (lectura básica). Revisa tus datos.', 'CV analizado sin IA');
    }
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const res = await api.uploadCV(file);
      if (res.profile) applyAnalysis(res);
    } catch (err: any) {
      toast.error('Error al subir CV: ' + (err?.message || err));
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!aiReady) {
      setPendingFile(file); // primero, activar la IA
      return;
    }
    await uploadFile(file);
  };

  const handleReanalyze = async () => {
    if (!rawCvText) return;
    if (!aiReady) {
      setPendingFile(null);
      setIsAiGateForReanalyze(true);
      return;
    }
    if (!window.confirm('La IA volverá a leer tu CV y reemplazará tu experiencia, títulos, cursos y habilidades. Se conservan tus palabras clave y tus enlaces. ¿Continuar?')) return;
    setIsReanalyzing(true);
    try {
      const res = await api.reanalyzeCV(rawCvText);
      applyAnalysis(res, formData);
    } catch (err: any) {
      toast.error('No se pudo reanalizar: ' + (err?.message || err));
    } finally {
      setIsReanalyzing(false);
    }
  };
  const [isAiGateForReanalyze, setIsAiGateForReanalyze] = useState(false);

  // Verificadores de completitud por bloque
  const isPersonalComplete = Boolean(formData.name && (formData.email || formData.phone));
  const isSummaryComplete = Boolean(formData.headline && formData.summary);
  const isExperienceComplete = Boolean(formData.experiences && formData.experiences.length > 0);
  const isEducationComplete = Boolean(formData.education && formData.education.length > 0);
  const isSkillsComplete = Boolean(formData.technical_skills && formData.technical_skills.length >= 3);

  return (
    <div className="space-y-6">
      {/* Barra superior de acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-ink-surface rounded-2xl border border-gray-200/80 dark:border-ink-border shadow-sm">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            Editor Modular de Currículum
          </h2>
          <p className="text-xs text-gray-500">
            Edita los datos que la IA utiliza para calcular afinidad y generar adaptaciones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Subir CV */}
          <label className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border border-gray-200 dark:border-ink-line bg-gray-50 dark:bg-ink-raised text-xs font-semibold text-ink dark:text-gray-300 hover:bg-gray-100 cursor-pointer transition">
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-brand-700 dark:text-brand-300" />}
            <span>{isUploading ? 'Procesando...' : 'Subir CV (PDF/Word)'}</span>
            <input type="file" accept=".pdf,.docx,.doc" onChange={handleFileUpload} className="hidden" />
          </label>

          {/* Reanalizar con IA (el CV ya cargado) */}
          {rawCvText && (
            <button
              type="button"
              onClick={handleReanalyze}
              disabled={isReanalyzing}
              title="La IA vuelve a leer tu CV y ordena experiencia, títulos y cursos"
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border border-brand-300 dark:border-brand-700/60 text-xs font-semibold text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-950/40 cursor-pointer disabled:opacity-60"
            >
              {isReanalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{isReanalyzing ? 'Analizando…' : 'Reanalizar con IA'}</span>
            </button>
          )}

          {/* Ver CV */}
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-700 border border-brand-200 dark:border-brand-800/60 text-xs font-semibold hover:bg-brand-100 transition dark:text-brand-300"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Ver mi CV</span>
          </button>

          {/* Guardar */}
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Guardar cambios</span>
          </button>
        </div>
      </div>

      {/* Resultado del análisis del CV */}
      {analysis && (
        <div
          role="status"
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-2xl border text-xs ${
            analysis.method === 'ia'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-500/10 dark:border-emerald-400/30 dark:text-emerald-100'
              : 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-500/10 dark:border-amber-400/30 dark:text-amber-100'
          }`}
        >
          <p className="flex items-start gap-2">
            {analysis.method === 'ia' ? <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" /> : <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />}
            <span>
              {analysis.method === 'ia'
                ? 'La IA analizó tu CV. Revisa cada sección (experiencia, títulos y cursos), corrige lo necesario y pulsa «Guardar cambios».'
                : analysis.note || 'Analizamos tu CV sin IA. Revisa cada sección.'}
            </span>
          </p>
          {analysis.method !== 'ia' && rawCvText && (
            <button type="button" onClick={handleReanalyze} className="shrink-0 min-h-[40px] px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer">
              Reanalizar con IA
            </button>
          )}
        </div>
      )}

      {/* Bloques de edición colapsables */}
      <div className="space-y-3">
        {/* BLOQUE 1: Datos Personales */}
        <div className="rounded-2xl border border-gray-200/80 dark:border-ink-border bg-white dark:bg-ink-surface overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection('personal')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/50 dark:hover:bg-ink-raised/40 transition"
          >
            <div className="flex items-center gap-2.5">
              {isPersonalComplete ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <Circle className="w-4 h-4 text-gray-300" />
              )}
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                1. Datos personales, contacto y enlaces
              </span>
            </div>
            {openSections.personal ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {openSections.personal && (
            <div className="p-4 pt-0 border-t border-gray-100 dark:border-ink-border grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-fade-in">
              <div>
                <label className="block text-gray-600 dark:text-ink-200 font-medium mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 rounded-xl border border-gray-200 dark:border-ink-line bg-gray-50 dark:bg-ink-raised text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-ink-200 font-medium mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  aria-invalid={Boolean(formData.email && !EMAIL_OK.test(formData.email))}
                  className="w-full p-2 rounded-xl border border-gray-200 dark:border-ink-line bg-gray-50 dark:bg-ink-raised text-gray-900 dark:text-gray-100"
                />
                {formData.email && !EMAIL_OK.test(formData.email) && (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Revisa el correo: por ejemplo nombre@correo.cl.</p>
                )}
              </div>
              <div>
                <label className="block text-gray-600 dark:text-ink-200 font-medium mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+56 9 1234 5678"
                  aria-invalid={Boolean(formData.phone && !PHONE_OK.test(formData.phone))}
                  className="w-full p-2 rounded-xl border border-gray-200 dark:border-ink-line bg-gray-50 dark:bg-ink-raised text-gray-900 dark:text-gray-100"
                />
                {formData.phone && !PHONE_OK.test(formData.phone) && (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Revisa el número: por ejemplo +56 9 1234 5678.</p>
                )}
              </div>
              <div>
                <label htmlFor="cv-region" className="block text-gray-600 dark:text-ink-200 font-medium mb-1">Región</label>
                <select
                  id="cv-region"
                  value={formData.region || ''}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value || undefined, commune: undefined })}
                  className="w-full p-2 rounded-xl border border-gray-200 dark:border-ink-line bg-gray-50 dark:bg-ink-raised text-gray-900 dark:text-gray-100"
                >
                  <option value="">Elige tu región</option>
                  {CHILE_REGIONS.map((r) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="cv-commune" className="block text-gray-600 dark:text-ink-200 font-medium mb-1">Comuna de residencia</label>
                <select
                  id="cv-commune"
                  value={formData.commune || ''}
                  disabled={!formData.region}
                  onChange={(e) => setFormData({ ...formData, commune: e.target.value || undefined })}
                  className="w-full p-2 rounded-xl border border-gray-200 dark:border-ink-line bg-gray-50 dark:bg-ink-raised text-gray-900 dark:text-gray-100 disabled:opacity-60"
                >
                  <option value="">{formData.region ? 'Elige tu comuna' : 'Primero elige la región'}</option>
                  {(CHILE_REGIONS.find((r) => r.name === formData.region)?.communes || []).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <CvLinksSection links={formData.links || []} onChange={(links) => setFormData({ ...formData, links })} />
            </div>
          )}
        </div>

        {/* BLOQUE 2: Titular y Resumen */}
        <div className="rounded-2xl border border-gray-200/80 dark:border-ink-border bg-white dark:bg-ink-surface overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection('summary')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/50 dark:hover:bg-ink-raised/40 transition"
          >
            <div className="flex items-center gap-2.5">
              {isSummaryComplete ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <Circle className="w-4 h-4 text-gray-300" />
              )}
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                2. Profesión, titular y resumen
              </span>
            </div>
            {openSections.summary ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {openSections.summary && (
            <div className="p-4 pt-0 border-t border-gray-100 dark:border-ink-border space-y-3 text-xs animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-ink-200 font-medium mb-1">Titular Profesional / Cargo Actual</label>
                  <input
                    type="text"
                    value={formData.headline || formData.primary_profession || ''}
                    onChange={(e) => setFormData({ ...formData, headline: e.target.value, primary_profession: e.target.value })}
                    placeholder="Ej. Técnico en Enfermería, Jefe de Obra, Ingeniero Comercial"
                    className="w-full p-2 rounded-xl border border-gray-200 dark:border-ink-line bg-gray-50 dark:bg-ink-raised text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-ink-200 font-medium mb-1">Años de Experiencia Total</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.years_of_experience || 0}
                    onChange={(e) => setFormData({ ...formData, years_of_experience: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-gray-200 dark:border-ink-line bg-gray-50 dark:bg-ink-raised text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <TagInput
                label="Otras profesiones u oficios (opcional)"
                values={formData.secondary_professions || []}
                onChange={(secondary_professions) => setFormData({ ...formData, secondary_professions })}
                placeholder="Ej. Técnico en Administración, Guardia de seguridad"
                helpText="Si tienes más de una profesión, Oportia también buscará ofertas para ellas."
              />

              <div>
                <label className="block text-gray-600 dark:text-ink-200 font-medium mb-1">Resumen Ejecutivo</label>
                <textarea
                  rows={3}
                  value={formData.summary || ''}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Síntesis de tu trayectoria, fortalezas técnicas y valor que aportas..."
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-ink-line bg-gray-50 dark:bg-ink-raised text-gray-900 dark:text-gray-100 resize-none leading-relaxed"
                />
              </div>
            </div>
          )}
        </div>

        {/* BLOQUE 3: Experiencias Laborales */}
        <div className="rounded-2xl border border-gray-200/80 dark:border-ink-border bg-white dark:bg-ink-surface overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection('experience')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/50 dark:hover:bg-ink-raised/40 transition"
          >
            <div className="flex items-center gap-2.5">
              {isExperienceComplete ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <Circle className="w-4 h-4 text-gray-300" />
              )}
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                3. Experiencia Laboral ({formData.experiences?.length || 0})
              </span>
            </div>
            {openSections.experience ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {openSections.experience && (
            <div className="p-4 pt-0 border-t border-gray-100 dark:border-ink-border animate-fade-in">
              <div className="space-y-3">
                <CvOrderBar
                  manual={formData.cv_order === 'manual'}
                  outOfOrder={sortExperiences(formData.experiences || []).some((e, i) => e !== (formData.experiences || [])[i])}
                  onSortByDate={sortByDate}
                />
                <CvExperienceSection
                  experiences={formData.experiences || []}
                  onChange={(experiences) => setFormData({ ...formData, experiences })}
                  onReorder={(experiences) => setFormData({ ...formData, experiences, cv_order: 'manual' })}
                />
              </div>
            </div>
          )}
        </div>

        {/* BLOQUE 4: Educación y títulos */}
        <EditorSection
          id="education"
          title={`4. Educación y títulos (${formData.education?.length || 0})`}
          complete={isEducationComplete}
          open={openSections.education}
          onToggle={() => toggleSection('education')}
        >
          <div className="space-y-3">
            {(formData.education?.length ?? 0) > 1 && (
              <CvOrderBar
                manual={formData.cv_order === 'manual'}
                outOfOrder={sortEducation(formData.education || []).some((e, i) => e !== (formData.education || [])[i])}
                onSortByDate={sortByDate}
              />
            )}
            <CvEducationSection
              education={formData.education || []}
              onChange={(education) => setFormData({ ...formData, education })}
              onReorder={(education) => setFormData({ ...formData, education, cv_order: 'manual' })}
            />
          </div>
        </EditorSection>

        {/* BLOQUE 5: Certificaciones y cursos */}
        <EditorSection
          id="certifications"
          title={`5. Certificaciones y cursos (${formData.certifications?.length || 0})`}
          complete={(formData.certifications?.length || 0) > 0}
          open={openSections.certifications}
          onToggle={() => toggleSection('certifications')}
        >
          <TagInput
            label="Certificaciones, cursos y capacitaciones"
            values={formData.certifications || []}
            onChange={(certifications) => setFormData({ ...formData, certifications })}
            placeholder="Ej. Curso IAAS, Licencia clase D, Certificación ITIL, Curso SENCE de Excel"
          />
        </EditorSection>

        {/* BLOQUE 6: Habilidades, idiomas y palabras clave */}
        <div className="rounded-2xl border border-gray-200/80 dark:border-ink-border bg-white dark:bg-ink-surface overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection('skills')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/50 dark:hover:bg-ink-raised/40 transition"
          >
            <div className="flex items-center gap-2.5">
              {isSkillsComplete ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <Circle className="w-4 h-4 text-gray-300" />
              )}
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                6. Habilidades, idiomas y palabras clave ({formData.technical_skills?.length || 0})
              </span>
            </div>
            {openSections.skills ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {openSections.skills && (
            <div className="p-4 pt-0 border-t border-gray-100 dark:border-ink-border animate-fade-in">
              <CvSkillsSection
                technicalSkills={formData.technical_skills || []}
                softSkills={formData.soft_skills || []}
                onChangeTechnical={(technical_skills) => setFormData({ ...formData, technical_skills })}
                onChangeSoft={(soft_skills) => setFormData({ ...formData, soft_skills })}
              />
              <div className="mt-4 space-y-4">
                <CvLanguagesSection languages={formData.languages || {}} onChange={(languages) => setFormData({ ...formData, languages })} />
                <TagInput
                  label="Tecnologías y palabras clave"
                  values={formData.keywords || []}
                  onChange={(keywords) => setFormData({ ...formData, keywords })}
                  placeholder="Términos con los que te buscarían para un cargo (ej. Soporte TI, Curaciones, SAP)"
                  suggestions={suggestKeywords(formData)}
                  suggestionsLabel="Sugeridas para tu área"
                  helpText="Se usan para buscar y ordenar ofertas según tu perfil."
                />
                {(formData.keywords || []).length > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      const value = (formData.keywords || []).join(', ');
                      try {
                        await navigator.clipboard.writeText(value);
                        toast.success('Pégalas en el secreto NOTIFY_KEYWORDS de GitHub para que el correo diario traiga solo ofertas de tu perfil.', 'Palabras clave copiadas');
                      } catch {
                        toast.info(value, 'Copia estas palabras clave para el aviso por correo');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl border border-gray-300 dark:border-ink-line text-xs font-semibold text-ink dark:text-white hover:bg-gray-50 dark:hover:bg-ink-hover cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" aria-hidden="true" /> Copiar para el aviso por correo
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Activar la IA antes de analizar el CV */}
      <Dialog
        isOpen={Boolean(pendingFile) || isAiGateForReanalyze}
        onClose={() => {
          setPendingFile(null);
          setIsAiGateForReanalyze(false);
        }}
        title="Activa la IA para analizar tu CV"
        description="Con IA, Oportia separa bien tu experiencia laboral, tus títulos y tus cursos. Sin IA, la lectura es básica y puede clasificar mal."
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <SharedAICard />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => navigate('/ajustes')}
              className="min-h-[44px] px-3 rounded-xl text-ink-muted hover:text-ink dark:hover:text-white font-semibold cursor-pointer"
            >
              Usar mi propia clave (Ajustes)
            </button>
            <div className="flex flex-wrap gap-2">
              {pendingFile && (
                <button
                  type="button"
                  onClick={() => {
                    const f = pendingFile;
                    setPendingFile(null);
                    uploadFile(f);
                  }}
                  className="min-h-[44px] px-3 rounded-xl border border-gray-300 dark:border-ink-line font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-ink-hover"
                >
                  Subir sin IA (lectura básica)
                </button>
              )}
              <button
                type="button"
                disabled={!aiReady}
                onClick={() => {
                  const f = pendingFile;
                  setPendingFile(null);
                  setIsAiGateForReanalyze(false);
                  if (f) uploadFile(f);
                  else handleReanalyze();
                }}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> Analizar con IA
              </button>
            </div>
          </div>
          {!aiReady && <p className="text-ink-muted dark:text-ink-200">Activa la IA gratuita arriba (o usa tu clave) para habilitar «Analizar con IA».</p>}
        </div>
      </Dialog>

      {/* Modal Vista Previa de CV */}
      <CvPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        profile={formData}
      />
    </div>
  );
};

/** Bloque plegable del editor. */
const EditorSection: React.FC<{
  id: string;
  title: string;
  complete: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ id, title, complete, open, onToggle, children }) => (
  <div className="rounded-2xl border border-gray-200/80 dark:border-ink-border bg-white dark:bg-ink-surface overflow-hidden shadow-xs">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={`cv-section-${id}`}
      className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/50 dark:hover:bg-ink-raised/40 transition"
    >
      <div className="flex items-center gap-2.5">
        {complete ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-gray-300" />}
        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{title}</span>
      </div>
      {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
    </button>
    {open && (
      <div id={`cv-section-${id}`} className="p-4 pt-0 border-t border-gray-100 dark:border-ink-border animate-fade-in">
        <div className="pt-4">{children}</div>
      </div>
    )}
  </div>
);
