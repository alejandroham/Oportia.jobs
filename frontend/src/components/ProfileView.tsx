import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Target, Star, Brain } from 'lucide-react';
import type { CandidateProfile, UserPreferences, LLMSettings } from '../types';
import { ProfileStudio } from './ProfileStudio';
import { PreferencesCenter } from './PreferencesCenter';

export interface ProfileViewProps {
  profile: CandidateProfile;
  onProfileUpdated: (p: CandidateProfile) => void;
  preferences: UserPreferences;
  onPreferencesUpdated: (p: UserPreferences) => void;
  llmSettings?: LLMSettings | null;
  onOpenSettings?: () => void;
}

type ProfileTab = 'cv' | 'busqueda' | 'logros' | 'opi';

const TABS: { id: ProfileTab; label: string; icon: React.FC<{ className?: string }>; description: string }[] = [
  {
    id: 'cv',
    label: 'Mi CV',
    icon: FileText,
    description: 'Tu información profesional, experiencia, estudios y habilidades'
  },
  {
    id: 'busqueda',
    label: 'Qué busco',
    icon: Target,
    description: 'Cargos deseados, salario esperado, modalidades y regiones en Chile'
  },
  {
    id: 'logros',
    label: 'Mis logros',
    icon: Star,
    description: 'Casos de éxito e historias de impacto con metodología STAR'
  },
  {
    id: 'opi',
    label: 'Lo que Opi sabe de ti',
    icon: Brain,
    description: 'ADN profesional deducido, tono, madurez y reglas de afinidad aprendidas'
  }
];

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  onProfileUpdated,
  preferences,
  onPreferencesUpdated,
  llmSettings,
  onOpenSettings
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTabParam = searchParams.get('tab') as ProfileTab | null;
  const activeTab: ProfileTab =
    currentTabParam && ['cv', 'busqueda', 'logros', 'opi'].includes(currentTabParam)
      ? currentTabParam
      : 'cv';

  const handleTabChange = (tabId: ProfileTab) => {
    setSearchParams({ tab: tabId }, { replace: true });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-fade-in text-xs">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 dark:border-white/5 pb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center space-x-2">
            <span>Mi Perfil Profesional</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Gestiona tu CV, define tus criterios de empleo, organiza tus logros y revisa el modelo que Opi aprende de ti.
          </p>
        </div>
      </div>

      {/* Segmented Sub-Navigation (Cupertino Style) */}
      <nav
        aria-label="Subsecciones del perfil"
        className="flex items-center overflow-x-auto no-scrollbar bg-gray-200/60 dark:bg-zinc-800/60 p-1.5 rounded-2xl border border-black/5 dark:border-white/5 space-x-1"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title={tab.description}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Subtab Contents */}
      <div className="pt-2">
        {activeTab === 'cv' && (
          <div className="animate-fade-in">
            <ProfileStudio profile={profile} onProfileUpdated={onProfileUpdated} />
          </div>
        )}

        {activeTab === 'busqueda' && (
          <div className="animate-fade-in">
            <PreferencesCenter
              preferences={preferences}
              onPreferencesUpdated={onPreferencesUpdated}
              initialTab="radar_rules"
              hideSubNav={true}
              hideHeader={false}
              llmSettings={llmSettings}
              onOpenSettings={onOpenSettings}
            />
          </div>
        )}

        {activeTab === 'logros' && (
          <div className="animate-fade-in">
            <PreferencesCenter
              preferences={preferences}
              onPreferencesUpdated={onPreferencesUpdated}
              initialTab="library"
              hideSubNav={true}
              hideHeader={false}
              llmSettings={llmSettings}
              onOpenSettings={onOpenSettings}
            />
          </div>
        )}

        {activeTab === 'opi' && (
          <div className="animate-fade-in">
            <PreferencesCenter
              preferences={preferences}
              onPreferencesUpdated={onPreferencesUpdated}
              initialTab="dna"
              hideSubNav={true}
              hideHeader={false}
              llmSettings={llmSettings}
              onOpenSettings={onOpenSettings}
            />
          </div>
        )}
      </div>
    </div>
  );
};
