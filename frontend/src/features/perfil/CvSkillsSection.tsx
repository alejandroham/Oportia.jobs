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
        <label htmlFor="technical-skills-input" className="block text-ink-muted dark:text-gray-400 font-semibold mb-1">
          Habilidades Técnicas (separadas por coma)
        </label>
        <input
          id="technical-skills-input"
          type="text"
          value={technicalSkills?.join(', ') || ''}
          onChange={(e) =>
            onChangeTechnical(
              e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
            )
          }
          placeholder="Python, React, SQL, TypeScript..."
          className="w-full min-h-[44px] p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-ink dark:text-gray-100 placeholder-ink-muted focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
        />
      </div>

      <div>
        <label htmlFor="soft-skills-input" className="block text-ink-muted dark:text-gray-400 font-semibold mb-1">
          Habilidades Blandas (separadas por coma)
        </label>
        <input
          id="soft-skills-input"
          type="text"
          value={softSkills?.join(', ') || ''}
          onChange={(e) =>
            onChangeSoft(
              e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
            )
          }
          placeholder="Liderazgo, Comunicación asertiva, Negociación..."
          className="w-full min-h-[44px] p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-ink dark:text-gray-100 placeholder-ink-muted focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
        />
      </div>
    </div>
  );
};
