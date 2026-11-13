import React, { useState } from 'react';
import type { UserPreferences } from '../../types';
import { CHILE_REGIONS } from '../../utils/chileRegions';
import { MapPin, Briefcase, DollarSign, Ban, Plus, X } from 'lucide-react';

interface SearchPreferencesFormProps {
  preferences: UserPreferences;
  onChange: (updated: UserPreferences) => void;
  className?: string;
}

export const SearchPreferencesForm: React.FC<SearchPreferencesFormProps> = ({
  preferences,
  onChange,
  className = ''
}) => {
  const [newRole, setNewRole] = useState('');
  const [newDealBreaker, setNewDealBreaker] = useState('');

  const selectedRegion = preferences.preferred_region || '';
  const currentRegionObj = CHILE_REGIONS.find((r) => r.name === selectedRegion);
  const communes = currentRegionObj ? currentRegionObj.communes : [];

  const handleAddRole = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newRole.trim();
    if (!trimmed) return;
    if (!preferences.target_roles.includes(trimmed)) {
      onChange({
        ...preferences,
        target_roles: [...preferences.target_roles, trimmed]
      });
    }
    setNewRole('');
  };

  const handleRemoveRole = (roleToRemove: string) => {
    onChange({
      ...preferences,
      target_roles: preferences.target_roles.filter((r) => r !== roleToRemove)
    });
  };

  const handleAddDealBreaker = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newDealBreaker.trim();
    if (!trimmed) return;
    if (!preferences.deal_breakers.includes(trimmed)) {
      onChange({
        ...preferences,
        deal_breakers: [...preferences.deal_breakers, trimmed]
      });
    }
    setNewDealBreaker('');
  };

  const handleRemoveDealBreaker = (item: string) => {
    onChange({
      ...preferences,
      deal_breakers: preferences.deal_breakers.filter((d) => d !== item)
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Cargos deseados */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-[#20A88A]" />
          Cargos u ocupaciones que buscas
        </label>
        <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/80">
          {preferences.target_roles.map((role) => (
            <span
              key={role}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-zinc-900 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-zinc-700 shadow-xs"
            >
              {role}
              <button
                type="button"
                onClick={() => handleRemoveRole(role)}
                className="hover:text-red-500 focus:outline-none"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {preferences.target_roles.length === 0 && (
            <span className="text-xs text-gray-400 py-0.5">Sin cargos definidos aún</span>
          )}
        </div>
        <form onSubmit={handleAddRole} className="flex gap-2">
          <input
            type="text"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            placeholder="Ej. Desarrollador Fullstack, Analista de Datos..."
            className="flex-1 text-xs px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#20A88A]/40"
          />
          <button
            type="submit"
            className="px-3 py-2 rounded-xl bg-[#20A88A] hover:bg-[#18856d] text-white text-xs font-semibold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar
          </button>
        </form>
      </div>

      {/* Región y Comuna (Chile) */}
      <div className="space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#20A88A]" />
          Ubicación geográfica preferida (Chile)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Región</label>
            <select
              value={preferences.preferred_region || ''}
              onChange={(e) => {
                const reg = e.target.value;
                const regObj = CHILE_REGIONS.find((r) => r.name === reg);
                const firstCommune = regObj?.communes?.[0] || '';
                onChange({
                  ...preferences,
                  preferred_region: reg || undefined,
                  preferred_communes: firstCommune ? [firstCommune] : []
                });
              }}
              className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 focus:outline-none"
            >
              <option value="">(Sin sesgo regional / Cobertura Nacional)</option>
              {CHILE_REGIONS.map((r) => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Comuna</label>
            <select
              value={preferences.preferred_communes?.[0] || ''}
              disabled={!preferences.preferred_region}
              onChange={(e) => {
                const comm = e.target.value;
                onChange({
                  ...preferences,
                  preferred_communes: comm ? [comm] : []
                });
              }}
              className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 focus:outline-none"
            >
              <option value="">(Todas las comunas de la región)</option>
              {communes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Modalidad y Salario */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Modalidad remota */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/60 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">Solo Remoto</span>
            <span className="text-[11px] text-gray-500">Filtrar exclusivamente ofertas 100% remotas</span>
          </div>
          <button
            type="button"
            onClick={() => onChange({ ...preferences, remote_only: !preferences.remote_only })}
            className={`w-11 h-6 rounded-full transition-colors flex items-center p-0.5 ${
              preferences.remote_only ? 'bg-[#20A88A] justify-end' : 'bg-gray-300 dark:bg-zinc-600 justify-start'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
          </button>
        </div>

        {/* Salario mínimo CLP */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/60 space-y-1">
          <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-[#20A88A]" />
            Pretensión de renta líquida (CLP)
          </label>
          <input
            type="number"
            step="100000"
            min="0"
            value={preferences.min_salary_clp || ''}
            onChange={(e) =>
              onChange({
                ...preferences,
                min_salary_clp: e.target.value ? Number(e.target.value) : undefined
              })
            }
            placeholder="Ej. 1.200.000"
            className="w-full text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 focus:outline-none"
          />
        </div>
      </div>

      {/* Condiciones que descartas (deal-breakers) */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
          <Ban className="w-3.5 h-3.5 text-rose-500" />
          Condiciones que descartas estrictamente
        </label>
        <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/80">
          {preferences.deal_breakers.map((db) => (
            <span
              key={db}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 shadow-xs"
            >
              {db}
              <button
                type="button"
                onClick={() => handleRemoveDealBreaker(db)}
                className="hover:text-red-700 focus:outline-none"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {preferences.deal_breakers.length === 0 && (
            <span className="text-xs text-gray-400 py-0.5">Sin condiciones de descarte</span>
          )}
        </div>
        <form onSubmit={handleAddDealBreaker} className="flex gap-2">
          <input
            type="text"
            value={newDealBreaker}
            onChange={(e) => setNewDealBreaker(e.target.value)}
            placeholder="Ej. Turnos rotativos, Presencial fuera de Santiago, Sin contrato..."
            className="flex-1 text-xs px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
          />
          <button
            type="submit"
            className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Descartar
          </button>
        </form>
      </div>
    </div>
  );
};
