import React from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import type { EducationItem } from '../../types';

/** Educación y títulos: uno o más (técnico, profesional, posgrado, diplomado…). */
const inputCls =
  'w-full min-h-[40px] p-2 rounded-xl border border-gray-200 dark:border-ink-line bg-gray-50 dark:bg-ink-raised text-gray-900 dark:text-gray-100 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none';

export const CvEducationSection: React.FC<{
  education: EducationItem[];
  onChange: (e: EducationItem[]) => void;
  /** Mover con las flechas: deja el CV en orden manual. */
  onReorder?: (e: EducationItem[]) => void;
}> = ({ education, onChange, onReorder }) => {
  const items = education || [];
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    (onReorder ?? onChange)(next);
  };
  const update = (i: number, patch: Partial<EducationItem>) =>
    onChange(items.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  return (
    <div className="space-y-3 text-xs">
      {items.length === 0 && (
        <p className="text-gray-600 dark:text-ink-200">
          Agrega tus títulos: técnico, profesional, magíster, diplomados u otros estudios.
        </p>
      )}
      {items.map((ed, i) => (
        <fieldset key={i} className="p-3 rounded-xl border border-gray-200 dark:border-ink-line space-y-2">
          <legend className="px-1 font-semibold text-gray-700 dark:text-ink-200">
            Título {i + 1}
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Subir título ${i + 1}`} className="ml-2 p-1.5 rounded-md text-ink-muted hover:text-ink disabled:opacity-30 cursor-pointer align-middle">
              <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`Bajar título ${i + 1}`} className="p-1.5 rounded-md text-ink-muted hover:text-ink disabled:opacity-30 cursor-pointer align-middle">
              <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="block text-gray-600 dark:text-ink-200 font-medium">Título o grado</span>
              <input
                className={inputCls}
                value={ed.degree || ''}
                placeholder="Ej. Técnico de Nivel Superior, Ingeniería, Diplomado"
                onChange={(e) => update(i, { degree: e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="block text-gray-600 dark:text-ink-200 font-medium">Especialidad o carrera</span>
              <input
                className={inputCls}
                value={ed.field_of_study || ''}
                placeholder="Ej. Enfermería, Informática, Gestión"
                onChange={(e) => update(i, { field_of_study: e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="block text-gray-600 dark:text-ink-200 font-medium">Institución</span>
              <input
                className={inputCls}
                value={ed.institution || ''}
                placeholder="Ej. Universidad, Instituto Profesional, CFT"
                onChange={(e) => update(i, { institution: e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="block text-gray-600 dark:text-ink-200 font-medium">Año de egreso</span>
              <input
                className={inputCls}
                value={ed.graduation_year || ''}
                placeholder="Ej. 2019 o En curso"
                onChange={(e) => update(i, { graduation_year: e.target.value })}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="inline-flex items-center gap-1 min-h-[36px] px-2 rounded-lg text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-semibold cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Quitar título
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { institution: '', degree: '', field_of_study: '', graduation_year: '' }])}
        className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl border border-dashed border-brand-400 text-brand-700 dark:text-brand-300 font-semibold hover:bg-brand-50 dark:hover:bg-brand-950/40 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Agregar título o estudio
      </button>
    </div>
  );
};
