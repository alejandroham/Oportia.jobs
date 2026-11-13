import React, { useState } from 'react';
import type { CandidateProfile, WorkExperience, EducationItem } from '../../types';
import { CvPreview } from '../shared/CvPreview';
import { Upload, Eye, CheckCircle2, Circle, ChevronDown, ChevronUp, Plus, Trash2, Save, Loader2, X } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../../components/Toast';

interface CvEditorProps {
  profile: CandidateProfile;
  onProfileUpdated: (updated: CandidateProfile) => void;
}

export const CvEditor: React.FC<CvEditorProps> = ({ profile, onProfileUpdated }) => {
  const [formData, setFormData] = useState<CandidateProfile>(profile);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    personal: true,
    summary: false,
    experience: false,
    education: false,
    skills: false
  });
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const toast = useToast();

  const toggleSection = (sec: string) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const handleSave = () => {
    onProfileUpdated({ ...formData, updated_at: new Date().toISOString() });
    toast.success('Perfil y CV guardados en tu navegador');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await api.uploadCV(file);
      if (res.profile) {
        setFormData(res.profile);
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
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-sm">
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
          <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 cursor-pointer transition">
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-[#20A88A]" />}
            <span>{isUploading ? 'Procesando...' : 'Subir PDF / Word'}</span>
            <input type="file" accept=".pdf,.docx,.doc" onChange={handleFileUpload} className="hidden" />
          </label>

          {/* Ver CV */}
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-[#20A88A] border border-teal-200 dark:border-teal-800/60 text-xs font-semibold hover:bg-teal-100 transition"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Ver mi CV</span>
          </button>

          {/* Guardar */}
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#20A88A] hover:bg-[#18856d] text-white text-xs font-semibold shadow-xs transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Guardar</span>
          </button>
        </div>
      </div>

      {/* Bloques de edición colapsables */}
      <div className="space-y-3">
        {/* BLOQUE 1: Datos Personales */}
        <div className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection('personal')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 transition"
          >
            <div className="flex items-center gap-2.5">
              {isPersonalComplete ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <Circle className="w-4 h-4 text-gray-300" />
              )}
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                1. Datos Personales y Contacto
              </span>
            </div>
            {openSections.personal ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {openSections.personal && (
            <div className="p-4 pt-0 border-t border-gray-100 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-fade-in">
              <div>
                <label className="block text-gray-600 dark:text-gray-400 font-medium mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-400 font-medium mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-400 font-medium mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+56 9 1234 5678"
                  className="w-full p-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-400 font-medium mb-1">Perfil de LinkedIn (URL)</label>
                <input
                  type="url"
                  value={formData.linkedin_url || ''}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full p-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          )}
        </div>

        {/* BLOQUE 2: Titular y Resumen */}
        <div className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection('summary')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 transition"
          >
            <div className="flex items-center gap-2.5">
              {isSummaryComplete ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <Circle className="w-4 h-4 text-gray-300" />
              )}
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                2. Titular y Resumen Profesional
              </span>
            </div>
            {openSections.summary ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {openSections.summary && (
            <div className="p-4 pt-0 border-t border-gray-100 dark:border-zinc-800 space-y-3 text-xs animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 font-medium mb-1">Titular Profesional / Cargo Actual</label>
                  <input
                    type="text"
                    value={formData.headline || formData.primary_profession || ''}
                    onChange={(e) => setFormData({ ...formData, headline: e.target.value, primary_profession: e.target.value })}
                    placeholder="Ej. Ingeniero de Software Fullstack"
                    className="w-full p-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 font-medium mb-1">Años de Experiencia Total</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.years_of_experience || 0}
                    onChange={(e) => setFormData({ ...formData, years_of_experience: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-600 dark:text-gray-400 font-medium mb-1">Resumen Ejecutivo</label>
                <textarea
                  rows={3}
                  value={formData.summary || ''}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Síntesis de tu trayectoria, fortalezas técnicas y valor que aportas..."
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 resize-none leading-relaxed"
                />
              </div>
            </div>
          )}
        </div>

        {/* BLOQUE 3: Experiencias Laborales */}
        <div className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection('experience')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 transition"
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
            <div className="p-4 pt-0 border-t border-gray-100 dark:border-zinc-800 space-y-4 text-xs animate-fade-in">
              {formData.experiences?.map((exp, idx) => (
                <div key={exp.id || idx} className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200/70 dark:border-zinc-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 dark:text-gray-100 text-xs">
                      {exp.role} en {exp.company}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = formData.experiences.filter((_, i) => i !== idx);
                        setFormData({ ...formData, experiences: next });
                      }}
                      className="text-gray-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {exp.description}
                  </p>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  const newExp: WorkExperience = {
                    id: 'exp_' + Date.now(),
                    company: 'Nueva Empresa',
                    role: 'Cargo',
                    start_date: '2023',
                    is_remote: false,
                    description: '',
                    technologies: [],
                    bullet_achievements: []
                  };
                  setFormData({ ...formData, experiences: [newExp, ...(formData.experiences || [])] });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-xs font-semibold hover:bg-gray-50"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar experiencia
              </button>
            </div>
          )}
        </div>

        {/* BLOQUE 4: Habilidades Técnicas y Blandas */}
        <div className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection('skills')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 transition"
          >
            <div className="flex items-center gap-2.5">
              {isSkillsComplete ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <Circle className="w-4 h-4 text-gray-300" />
              )}
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                4. Habilidades y Competencias ({formData.technical_skills?.length || 0})
              </span>
            </div>
            {openSections.skills ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {openSections.skills && (
            <div className="p-4 pt-0 border-t border-gray-100 dark:border-zinc-800 space-y-3 text-xs animate-fade-in">
              <div>
                <label className="block text-gray-600 dark:text-gray-400 font-medium mb-1">
                  Habilidades Técnicas (separadas por coma)
                </label>
                <input
                  type="text"
                  value={formData.technical_skills?.join(', ') || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      technical_skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                    })
                  }
                  placeholder="Python, React, SQL, TypeScript..."
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-gray-600 dark:text-gray-400 font-medium mb-1">
                  Habilidades Blandas (separadas por coma)
                </label>
                <input
                  type="text"
                  value={formData.soft_skills?.join(', ') || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      soft_skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                    })
                  }
                  placeholder="Liderazgo, Comunicación asertiva, Negociación..."
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Vista Previa de CV */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div onClick={() => setIsPreviewOpen(false)} className="fixed inset-0 bg-black/50 backdrop-blur-xs" />
          <div className="relative w-full max-w-4xl rounded-3xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl p-6 z-10 space-y-4 max-h-[92vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Vista Previa de tu Currículum Vitae
              </h3>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <CvPreview profile={formData} showControls={true} />
          </div>
        </div>
      )}
    </div>
  );
};
