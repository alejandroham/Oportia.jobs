import React, { useState } from 'react';
import type { UserPreferences } from '../../types';
import { SearchPreferencesForm } from '../shared/SearchPreferencesForm';
import { Save, Sparkles } from 'lucide-react';
import { useToast } from '../../components/Toast';

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

  const handleSave = () => {
    onPreferencesUpdated({ ...formData, updated_at: new Date().toISOString() });
    toast.success('Preferencias de búsqueda guardadas en tu navegador');
  };

  return (
    <div className="space-y-6">
      {/* Cabecera descriptiva */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#20A88A]" />
            Criterios Explícitos de Búsqueda
          </h2>
          <p className="text-xs text-gray-500">
            Define los roles que buscas, tu región o comuna en Chile, condiciones salariales y deal-breakers.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#20A88A] hover:bg-[#18856d] text-white text-xs font-semibold shadow-xs transition"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Guardar preferencias</span>
        </button>
      </div>

      {/* Formulario modular compartido */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-sm">
        <SearchPreferencesForm
          preferences={formData}
          onChange={setFormData}
        />
      </div>
    </div>
  );
};
