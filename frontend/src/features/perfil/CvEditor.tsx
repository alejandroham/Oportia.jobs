import React, { useEffect, useState } from 'react';
import type { CandidateProfile } from '../../types';
import { CvExperienceSection } from './CvExperienceSection';
import { CvSkillsSection } from './CvSkillsSection';
import { CvPreviewModal } from './CvPreviewModal';
import { CvEducationSection } from './CvEducationSection';
import { CvLinksSection } from './CvLinksSection';
import { CvLanguagesSection } from './CvLanguagesSection';
import { TagInput } from '../../components/ui/TagInput';
import { getProfileLinks, suggestKeywords } from '../../utils/profileKeywords';
import { Upload, Eye, CheckCircle2, Circle, ChevronDown, ChevronUp, Save, Loader2 } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../../components/Toast';

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

  const toggleSection = (sec: string) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await api.uploadCV(file);
      if (res.profile) {
        setFormData(withLinks(res.profile));
        onProfileUpdated(res.profile);
        toast.success('CV procesado y perfil actualizado exitosamente');
      }
    } catch (err: any) {
      toast.error('Error al subir CV: ' + (err?.message || err));
    } finally {
      setIsUploading(false);
    }
  };

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
                  className="w-full p-2 rounded-xl border border-gray-200 dark:border-ink-line bg-gray-50 dark:bg-ink-raised text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-ink-200 font-medium mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+56 9 1234 5678"
                  className="w-full p-2 rounded-xl border border-gray-200 dark:border-ink-line bg-gray-50 dark:bg-ink-raised text-gray-900 dark:text-gray-100"
                />
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
              <CvExperienceSection
                experiences={formData.experiences || []}
                onChange={(experiences) => setFormData({ ...formData, experiences })}
              />
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
          <CvEducationSection education={formData.education || []} onChange={(education) => setFormData({ ...formData, education })} />
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
              </div>
            </div>
          )}
        </div>
      </div>

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
