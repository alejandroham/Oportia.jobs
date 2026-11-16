import React, { useState } from 'react';
import type { WorkExperience } from '../../types';
import { Plus, Trash2, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from 'lucide-react';
import { TagInput } from '../../components/ui/TagInput';

interface CvExperienceSectionProps {
  experiences: WorkExperience[];
  onChange: (experiences: WorkExperience[]) => void;
}

const inputCls =
  'w-full min-h-[40px] p-2 rounded-xl border border-gray-200 dark:border-ink-line bg-white dark:bg-ink-raised text-gray-900 dark:text-gray-100 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none';

const isCurrent = (end?: string) => /^(actual|presente|a la fecha|hoy|current|present)$/i.test((end || '').trim());

/**
 * Experiencia laboral editable: cargo, empresa, fechas, ubicación, modalidad, funciones,
 * logros y herramientas. Cada experiencia se abre y se cierra; se pueden reordenar.
 */
export const CvExperienceSection: React.FC<CvExperienceSectionProps> = ({ experiences, onChange }) => {
  const items = experiences || [];
  const [openId, setOpenId] = useState<string | null>(null);

  const update = (i: number, patch: Partial<WorkExperience>) => onChange(items.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

  const handleAdd = () => {
    const newExp: WorkExperience = {
      id: 'exp_' + Date.now(),
      company: '',
      role: '',
      start_date: '',
      end_date: '',
      location: '',
      is_remote: false,
      description: '',
      technologies: [],
      bullet_achievements: []
    };
    onChange([newExp, ...items]);
    setOpenId(newExp.id);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3 text-xs">
      <button
        type="button"
        onClick={handleAdd}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl border border-dashed border-brand-400 text-brand-700 dark:text-brand-300 font-semibold hover:bg-brand-50 dark:hover:bg-brand-950/40 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
      >
        <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Agregar experiencia
      </button>

      {items.length === 0 && <p className="text-gray-600 dark:text-ink-200">Agrega tus trabajos, del más reciente al más antiguo.</p>}

      {items.map((exp, idx) => {
        const id = exp.id || `exp_${idx}`;
        const open = openId === id;
        const title = [exp.role || 'Cargo sin nombre', exp.company].filter(Boolean).join(' en ');
        const period = [exp.start_date, exp.end_date].filter(Boolean).join(' – ');
        return (
          <div key={id} className="rounded-xl bg-gray-50 dark:bg-ink-raised/60 border border-gray-200/70 dark:border-ink-line/60">
            <div className="flex items-center gap-1 p-2">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : id)}
                aria-expanded={open}
                className="flex-1 flex items-center justify-between gap-2 min-h-[40px] px-1.5 text-left cursor-pointer"
              >
                <span>
                  <span className="block font-bold text-gray-900 dark:text-gray-100">{title}</span>
                  {period && <span className="block text-gray-600 dark:text-ink-200">{period}</span>}
                </span>
                {open ? <ChevronUp className="w-4 h-4 shrink-0" aria-hidden="true" /> : <ChevronDown className="w-4 h-4 shrink-0" aria-hidden="true" />}
                <span className="sr-only">{open ? 'Cerrar' : 'Editar'} experiencia</span>
              </button>
              <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} aria-label={`Subir ${title}`} className="p-2 min-h-[40px] rounded-lg text-ink-muted hover:text-ink disabled:opacity-30 cursor-pointer">
                <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => move(idx, 1)} disabled={idx === items.length - 1} aria-label={`Bajar ${title}`} className="p-2 min-h-[40px] rounded-lg text-ink-muted hover:text-ink disabled:opacity-30 cursor-pointer">
                <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== idx))}
                aria-label={`Eliminar experiencia ${title}`}
                className="p-2 min-h-[40px] rounded-lg text-ink-muted hover:text-rose-600 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            {open && (
              <div className="p-3 pt-0 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="block font-medium text-gray-700 dark:text-ink-200">Cargo</span>
                    <input className={inputCls} value={exp.role} placeholder="Ej. Supervisor de obra" onChange={(e) => update(idx, { role: e.target.value })} />
                  </label>
                  <label className="space-y-1">
                    <span className="block font-medium text-gray-700 dark:text-ink-200">Empresa o institución</span>
                    <input className={inputCls} value={exp.company} placeholder="Ej. Constructora Los Andes" onChange={(e) => update(idx, { company: e.target.value })} />
                  </label>
                  <label className="space-y-1">
                    <span className="block font-medium text-gray-700 dark:text-ink-200">Desde</span>
                    <input className={inputCls} value={exp.start_date} placeholder="Ej. Marzo 2021" onChange={(e) => update(idx, { start_date: e.target.value })} />
                  </label>
                  <div className="space-y-1">
                    <label className="block font-medium text-gray-700 dark:text-ink-200" htmlFor={`${id}-end`}>Hasta</label>
                    <input
                      id={`${id}-end`}
                      className={inputCls}
                      value={isCurrent(exp.end_date) ? '' : exp.end_date || ''}
                      disabled={isCurrent(exp.end_date)}
                      placeholder={isCurrent(exp.end_date) ? 'Trabajo actual' : 'Ej. Diciembre 2023'}
                      onChange={(e) => update(idx, { end_date: e.target.value })}
                    />
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" className="accent-brand-600" checked={isCurrent(exp.end_date)} onChange={(e) => update(idx, { end_date: e.target.checked ? 'Actual' : '' })} />
                      Trabajo aquí actualmente
                    </label>
                  </div>
                  <label className="space-y-1">
                    <span className="block font-medium text-gray-700 dark:text-ink-200">Ubicación</span>
                    <input className={inputCls} value={exp.location || ''} placeholder="Ej. Concepción" onChange={(e) => update(idx, { location: e.target.value })} />
                  </label>
                  <label className="flex items-center gap-1.5 self-end min-h-[40px] cursor-pointer">
                    <input type="checkbox" className="accent-brand-600" checked={exp.is_remote} onChange={(e) => update(idx, { is_remote: e.target.checked })} />
                    Trabajo remoto
                  </label>
                </div>
                <label className="block space-y-1">
                  <span className="block font-medium text-gray-700 dark:text-ink-200">Funciones y responsabilidades</span>
                  <textarea
                    className={inputCls}
                    rows={3}
                    value={exp.description}
                    placeholder="Qué hacías: equipos a cargo, tareas principales, herramientas…"
                    onChange={(e) => update(idx, { description: e.target.value })}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="block font-medium text-gray-700 dark:text-ink-200">Logros (uno por línea)</span>
                  <textarea
                    className={inputCls}
                    rows={3}
                    value={(exp.bullet_achievements || []).join('\n')}
                    placeholder="Ej. Entregué la obra 2 semanas antes del plazo"
                    onChange={(e) => update(idx, { bullet_achievements: e.target.value.split('\n') })}
                    onBlur={(e) => update(idx, { bullet_achievements: e.target.value.split('\n').map((l) => l.trim()).filter(Boolean) })}
                  />
                </label>
                <TagInput
                  label="Herramientas y técnicas usadas"
                  values={exp.technologies || []}
                  onChange={(technologies) => update(idx, { technologies })}
                  placeholder="Ej. AutoCAD, MS Project, BIM"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
