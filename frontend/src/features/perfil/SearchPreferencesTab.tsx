import React, { useEffect, useState } from 'react';
import type { UserPreferences } from '../../types';
import { SearchPreferencesForm } from '../shared/SearchPreferencesForm';
import { Save, Sparkles } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { SuggestedRolesPanel } from './SuggestedRolesPanel';
import { useCareerInsights } from '../../state/useCareerInsights';
import { useAppStore } from '../../state/useAppStore';
import { normalizeText } from '../../utils/searchText';
import { hasCvLoaded } from '../../utils/profileState';

interface SearchPreferencesTabProps {
  preferences: UserPreferences;
  onPreferencesUpdated: (updated: UserPreferences) => void;
}

export const SearchPreferencesTab: React.FC<SearchPreferencesTabProps> = ({
  preferences,
  onPreferencesUpdated
}) => {
  const [formData, setFormData] = useState<UserPreferences>(preferences);
  const toast = useToast();
  const { run, isRunning } = useCareerInsights();
  const profile = useAppStore((st) => st.profile);
  const hasCv = hasCvLoaded(profile);
  // Si Opi o la IA actualizan lo que buscas, refrescar el formulario.
  useEffect(() => {
    setFormData(preferences);
  }, [preferences.updated_at, preferences]);

  const toggleRole = (title: string) => {
    // Parte de lo último guardado (no de una copia local que pudo quedar atrás): dos clics seguidos no se pisan.
    const latest = useAppStore.getState().preferences;
    const base = latest ? { ...formData, target_roles: latest.target_roles || [], suggested_roles: latest.suggested_roles ?? formData.suggested_roles } : formData;
    const has = base.target_roles.some((r) => normalizeText(r) === normalizeText(title));
    const target_roles = has ? base.target_roles.filter((r) => normalizeText(r) !== normalizeText(title)) : [...base.target_roles, title];
    const next = { ...base, target_roles, updated_at: new Date().toISOString() };
    setFormData(next);
    onPreferencesUpdated(next);
    toast.success(has ? `Quitado de lo que buscas: ${title}` : `Agregado a lo que buscas: ${title}`);
  };

  const handleSave = () => {
    onPreferencesUpdated({ ...formData, updated_at: new Date().toISOString() });
    toast.success('Preferencias de búsqueda guardadas en tu navegador');
  };

  return (
    <div className="space-y-6">
      {/* Cabecera descriptiva */}
      <div className="p-4 rounded-2xl bg-white dark:bg-ink-surface border border-gray-200/80 dark:border-ink-border shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-700 dark:text-brand-300" />
            Criterios Explícitos de Búsqueda
          </h2>
          <p className="text-xs text-gray-500">
            Define los roles que buscas, tu región o comuna en Chile, condiciones salariales y deal-breakers.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs transition"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Guardar preferencias</span>
        </button>
      </div>

      <SuggestedRolesPanel
        roles={formData.suggested_roles || []}
        targetRoles={formData.target_roles || []}
        onToggle={toggleRole}
        onRefresh={() => run(undefined, { addDirect: 0 })}
        isRefreshing={isRunning}
        hasCv={hasCv}
      />

      {/* Formulario modular compartido */}
      <div className="p-6 rounded-2xl bg-white dark:bg-ink-surface border border-gray-200/80 dark:border-ink-border shadow-sm">
        <SearchPreferencesForm
          preferences={formData}
          onChange={setFormData}
        />
      </div>
    </div>
  );
};
