import React, { useState } from 'react';
import { Briefcase, MapPin } from 'lucide-react';
import { CHILE_REGIONS } from '../../utils/chileRegions';

export interface OnboardingStep2PreferencesProps {
  targetRoles: string[];
  setTargetRoles: (roles: string[]) => void;
  preferredRegion: string;
  setPreferredRegion: (reg: string) => void;
  isRemoteOnly: boolean;
  setIsRemoteOnly: (rem: boolean) => void;
}

export const OnboardingStep2Preferences: React.FC<OnboardingStep2PreferencesProps> = ({
  targetRoles,
  setTargetRoles,
  preferredRegion,
  setPreferredRegion,
  isRemoteOnly,
  setIsRemoteOnly
}) => {
  const [newRoleInput, setNewRoleInput] = useState('');

  const handleAddRole = () => {
    const trimmed = newRoleInput.trim();
    if (trimmed && !targetRoles.includes(trimmed)) {
      setTargetRoles([...targetRoles, trimmed]);
      setNewRoleInput('');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in text-xs">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">
          ¿Qué estás buscando?
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Cuéntanos tus preferencias para calibrar el radar y mostrarte vacantes compatibles.
        </p>
      </div>

      {/* Roles / Cargos */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-blue-500" />
          Cargo(s) o roles objetivo
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newRoleInput}
            onChange={(e) => setNewRoleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddRole();
              }
            }}
            placeholder="Ej. Desarrollador Frontend, Enfermero TENS..."
            className="flex-1 text-xs px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white"
          />
          <button
            type="button"
            onClick={handleAddRole}
            className="px-3.5 py-2 bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Agregar
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {targetRoles.map((r, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/50 flex items-center gap-1.5 font-medium"
            >
              {r}
              <button
                type="button"
                onClick={() => setTargetRoles(targetRoles.filter((_, idx) => idx !== i))}
                className="hover:text-red-500 font-bold cursor-pointer"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Región y Modo Remoto */}
      <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-rose-500" />
          Región de residencia en Chile
        </label>
        <select
          value={preferredRegion}
          onChange={(e) => setPreferredRegion(e.target.value)}
          disabled={isRemoteOnly}
          className="w-full text-xs p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white disabled:opacity-50"
        >
          {CHILE_REGIONS.map((r) => (
            <option key={r.id} value={r.name}>{r.name}</option>
          ))}
        </select>

        <label className="flex items-center space-x-2 pt-1 cursor-pointer">
          <input
            type="checkbox"
            checked={isRemoteOnly}
            onChange={(e) => setIsRemoteOnly(e.target.checked)}
            className="rounded text-blue-600 w-4 h-4 cursor-pointer"
          />
          <span className="text-xs text-gray-700 dark:text-gray-300">
            Solo buscar ofertas 100% remotas (sin importar la región)
          </span>
        </label>
      </div>
    </div>
  );
};
