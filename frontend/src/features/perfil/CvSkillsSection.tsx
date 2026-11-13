import React from 'react';

interface CvSkillsSectionProps {
  technicalSkills: string[];
  softSkills: string[];
  onChangeTechnical: (skills: string[]) => void;
  onChangeSoft: (skills: string[]) => void;
}

export const CvSkillsSection: React.FC<CvSkillsSectionProps> = ({
  technicalSkills,
  softSkills,
  onChangeTechnical,
  onChangeSoft
}) => {
  return (
    <div className="space-y-3 text-xs">
      <div>
        <label className="block text-gray-600 dark:text-gray-400 font-medium mb-1">
          Habilidades Técnicas (separadas por coma)
        </label>
        <input
          type="text"
          value={technicalSkills?.join(', ') || ''}
          onChange={(e) =>
            onChangeTechnical(
              e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
            )
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
          value={softSkills?.join(', ') || ''}
          onChange={(e) =>
            onChangeSoft(
              e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
            )
          }
          placeholder="Liderazgo, Comunicación asertiva, Negociación..."
          className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
        />
      </div>
    </div>
  );
};
