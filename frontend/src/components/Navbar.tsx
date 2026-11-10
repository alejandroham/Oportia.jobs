import React from 'react';
import { Radar, Settings as SettingsIcon, Sun, Moon, Briefcase, User, Brain, Shield, Info, Sparkles, GraduationCap } from 'lucide-react';
import type { LLMSettings } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  openSettings: () => void;
  openPrivacyModal: () => void;
  llmSettings: LLMSettings;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  openSettings,
  openPrivacyModal,
  llmSettings
}) => {
  // Clean, spacious Apple navigation
  const tabs = [
    { id: 'welcome', label: 'Conoce NexusJob', shortLabel: 'Inicio', icon: Info },
    { id: 'radar', label: 'Radar de Empleo', shortLabel: 'Radar', icon: Radar },
    { id: 'tracker', label: 'Mis Postulaciones', shortLabel: 'Postulaciones', icon: Briefcase },
    { id: 'coach', label: 'Coach IA', shortLabel: 'Coach', icon: GraduationCap },
    { id: 'profile', label: 'Perfil & CV', shortLabel: 'Perfil', icon: User },
    { id: 'preferences', label: 'Memoria IA', shortLabel: 'Memoria', icon: Brain },
  ];

  const hasKey = Boolean(llmSettings?.has_active_key);
  const statusLabel = hasKey
    ? (llmSettings?.status_label || (llmSettings?.active_model_name ? `${llmSettings.provider.toUpperCase()} (${llmSettings.active_model_name})` : llmSettings?.provider?.toUpperCase() || 'IA Conectada'))
    : 'Modo Offline';
  const dotColor = hasKey ? 'bg-emerald-500' : 'bg-yellow-400';

  return (
    <>
      <header className="no-print sticky top-0 z-40 w-full apple-glass transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand / Logo */}
          <button
            onClick={() => setActiveTab('welcome')}
            className="flex items-center space-x-2 text-left hover:opacity-90 transition group focus:outline-none shrink-0"
            title="Ir a Inicio & Conoce Nexus.Job AI"
          >
            {/* Light Mode Logo */}
            <img
              src="/nexusjob-logo.png"
              alt="Nexus.Job"
              className="h-7 sm:h-8 w-auto object-contain dark:hidden group-hover:scale-[1.02] transition"
            />
            {/* Dark Mode Logo */}
            <img
              src="/nexusjob-logo-dark.png"
              alt="Nexus.Job"
              className="h-7 sm:h-8 w-auto object-contain hidden dark:block group-hover:scale-[1.02] transition"
            />
            <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 shrink-0">
              AI
            </span>
          </button>

          {/* Clean Apple Segmented Navigation without icons (Desktop / Tablet Landscape) */}
          <nav className="hidden md:flex items-center bg-gray-200/50 dark:bg-zinc-800/60 p-1 rounded-full border border-black/5 dark:border-white/5 space-x-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            
            {/* Active LLM Pill Indicator (Cupertino Ergonomic) */}
            <button
              onClick={openSettings}
              className="flex items-center space-x-1.5 sm:space-x-2 min-h-[38px] sm:min-h-[40px] px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium bg-gray-100/90 dark:bg-zinc-800/90 hover:bg-gray-200 dark:hover:bg-zinc-700 text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/6 dark:border-white/8 transition shadow-xs max-w-[130px] sm:max-w-none cursor-pointer active:scale-95"
              title="Configuración del Motor de Inteligencia Artificial (LLM)"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor} ${!hasKey ? 'animate-pulse' : ''}`}></span>
              <span className="font-medium truncate">{statusLabel}</span>
              <SettingsIcon className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-0.5" />
            </button>

            {/* Privacy & Session Sovereign Storage Button */}
            <button
              onClick={openPrivacyModal}
              className="flex items-center space-x-1 sm:space-x-1.5 min-h-[38px] sm:min-h-[40px] px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium bg-blue-50/90 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 transition shadow-xs cursor-pointer active:scale-95"
              title="Gestión de Privacidad, Respaldo y Cierre de Sesión"
            >
              <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="hidden sm:inline font-medium">Datos & Salir</span>
            </button>

            {/* Dark / Light Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="min-h-[38px] min-w-[38px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition shrink-0 cursor-pointer active:scale-95"
              title="Cambiar tema claro / oscuro"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Apple iOS Cupertino Tab Bar — 48px Touch Targets) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 apple-glass border-t border-black/8 dark:border-white/8 px-2 pt-1 pb-2 flex items-center justify-around shadow-2xl">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComp = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 px-1 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                  : 'text-[#86868B] dark:text-[#A1A1A6] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
              }`}
            >
              <IconComp className={`w-4 h-4 mb-0.5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="text-[10px] tracking-tight">{tab.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
