import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { CandidateProfile, UserPreferences, LLMSettings } from '../../types';
import { CvEditor } from './CvEditor';
import { SearchPreferencesTab } from './SearchPreferencesTab';
import { AchievementsTab } from './AchievementsTab';
import { OpiMemoryTab } from './OpiMemoryTab';
import { FileText, Target, Award, Brain } from 'lucide-react';

interface ProfilePageProps {
  profile: CandidateProfile;
  onProfileUpdated: (p: CandidateProfile) => void;
  preferences: UserPreferences;
  onPreferencesUpdated: (prefs: UserPreferences) => void;
  llmSettings?: LLMSettings | null;
  onOpenSettings?: () => void;
}

type TabKey = 'cv' | 'busqueda' | 'logros' | 'memoria';

export const ProfilePage: React.FC<ProfilePageProps> = ({
  profile,
  onProfileUpdated,
  preferences,
  onPreferencesUpdated
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryTab = searchParams.get('tab') as TabKey | null;

  const [activeTab, setActiveTab] = useState<TabKey>(
    queryTab && ['cv', 'busqueda', 'logros', 'memoria'].includes(queryTab) ? queryTab : 'cv'
  );

  useEffect(() => {
    if (queryTab && ['cv', 'busqueda', 'logros', 'memoria'].includes(queryTab)) {
      setActiveTab(queryTab);
    }
  }, [queryTab]);

  const handleTabChange = (newTab: TabKey) => {
    setActiveTab(newTab);
    setSearchParams(newTab === 'cv' ? {} : { tab: newTab });
  };

  return (
    <div className="space-y-6">
      {/* Cabecera y Barra de Sub-Navegación en 4 Secciones */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Mi perfil
          </h1>
          <p className="text-xs text-gray-500">
            Tu currículum, preferencias de empleo, logros STAR y la memoria inteligente de Opi.
          </p>
        </div>

        {/* 4 pestañas accesibles */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => handleTabChange('cv')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition ${
              activeTab === 'cv'
                ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Mi CV</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('busqueda')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition ${
              activeTab === 'busqueda'
                ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Qué busco</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('logros')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition ${
              activeTab === 'logros'
                ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Mis logros</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('memoria')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition ${
              activeTab === 'memoria'
                ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Lo que Opi sabe de mí</span>
          </button>
        </div>
      </div>

      {/* Contenido según pestaña */}
      <div className="animate-fade-in">
        {activeTab === 'cv' && (
          <CvEditor
            profile={profile}
            onProfileUpdated={onProfileUpdated}
          />
        )}

        {activeTab === 'busqueda' && (
          <SearchPreferencesTab
            preferences={preferences}
            onPreferencesUpdated={onPreferencesUpdated}
          />
        )}

        {activeTab === 'logros' && (
          <AchievementsTab
            preferences={preferences}
            onPreferencesUpdated={onPreferencesUpdated}
          />
        )}

        {activeTab === 'memoria' && (
          <OpiMemoryTab
            preferences={preferences}
            onPreferencesUpdated={onPreferencesUpdated}
          />
        )}
      </div>
    </div>
  );
};
