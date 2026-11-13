import React from 'react';
import type { WorkExperience } from '../../types';
import { Plus, Trash2 } from 'lucide-react';

interface CvExperienceSectionProps {
  experiences: WorkExperience[];
  onChange: (experiences: WorkExperience[]) => void;
}

export const CvExperienceSection: React.FC<CvExperienceSectionProps> = ({
  experiences,
  onChange
}) => {
  const handleAdd = () => {
    const newExp: WorkExperience = {
      id: 'exp_' + Date.now(),
      company: 'Empresa',
      role: 'Cargo',
      start_date: '2023',
      is_remote: false,
      description: '',
      technologies: [],
      bullet_achievements: []
    };
    onChange([newExp, ...(experiences || [])]);
  };

  const handleRemove = (index: number) => {
    onChange(experiences.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3 text-xs">
      {experiences?.map((exp, idx) => (
        <div
          key={exp.id || idx}
          className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200/70 dark:border-zinc-700/60 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-900 dark:text-gray-100 text-xs">
              {exp.role} en {exp.company}
            </span>
            <button
              type="button"
              onClick={() => handleRemove(idx)}
              className="text-gray-400 hover:text-rose-600 transition"
              title="Eliminar experiencia"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          {exp.description && (
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {exp.description}
            </p>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={handleAdd}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-zinc-800 transition"
      >
        <Plus className="w-3.5 h-3.5" /> Agregar experiencia
      </button>
    </div>
  );
};
