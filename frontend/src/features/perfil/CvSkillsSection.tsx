import React from 'react';
import { TagInput } from '../../components/ui/TagInput';

interface CvSkillsSectionProps {
  technicalSkills: string[];
  softSkills: string[];
  onChangeTechnical: (skills: string[]) => void;
  onChangeSoft: (skills: string[]) => void;
}

/** Habilidades como etiquetas (antes, el campo "separado por coma" borraba la coma al escribir). */
export const CvSkillsSection: React.FC<CvSkillsSectionProps> = ({ technicalSkills, softSkills, onChangeTechnical, onChangeSoft }) => (
  <div className="space-y-4">
    <TagInput
      label="Habilidades técnicas"
      values={technicalSkills}
      onChange={onChangeTechnical}
      placeholder="Escribe una habilidad y presiona Enter (ej. Excel, Primeros auxilios, Redes)"
    />
    <TagInput
      label="Habilidades blandas"
      values={softSkills}
      onChange={onChangeSoft}
      placeholder="Ej. Liderazgo, Comunicación, Trabajo en equipo"
    />
  </div>
);
