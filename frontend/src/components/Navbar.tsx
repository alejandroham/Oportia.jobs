import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Radar, Settings as SettingsIcon, Briefcase, User, Info, GraduationCap } from 'lucide-react';
import type { LLMSettings } from '../types';

export interface NavbarProps {
  llmSettings?: LLMSettings | null;
  // Optional legacy props kept for backwards compatibility
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  darkMode?: boolean;
  setDarkMode?: (val: boolean) => void;
  openSettings?: () => void;
  openPrivacyModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ llmSettings }) => {
  const navigate = useNavigate();

  // 5 semantic task-oriented tabs
  const tabs = [
    { path: '/', label: 'Inicio', shortLabel: 'Inicio', icon: Info, end: true },
    { path: '/empleos', label: 'Buscar empleo', shortLabel: 'Empleos', icon: Radar, end: false },
    { path: '/postulaciones', label: 'Mis postulaciones', shortLabel: 'Postulaciones', icon: Briefcase, end: false },
    { path: '/aprender', label: 'Aprender', shortLabel: 'Aprender', icon: GraduationCap, end: false },
    { path: '/perfil', label: 'Mi perfil', shortLabel: 'Perfil', icon: User, end: false }
  ];

  const hasKey = Boolean(llmSettings?.has_active_key);
  const statusLabel = hasKey ? 'IA conectada' : 'IA no conectada';
  const dotColor = hasKey ? 'bg-emerald-500' : 'bg-gray-400';

  return (
    <>
      <header className="no-print sticky top-0 z-40 w-full apple-glass transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand / Logo */}
          <Link
            to="/"
            className="flex items-center space-x-2 text-left hover:opacity-90 transition group focus:outline-none shrink-0"
            title="Ir a Inicio"
          >
            {/* Light Mode Logo */}
            <img
              src="/oportia-logo.svg"
              alt="Oportia Jobs IA"
              className="h-8 sm:h-9 w-auto object-contain dark:hidden group-hover:scale-[1.02] transition"
            />
            {/* Dark Mode Logo */}
            <img
              src="/oportia-logo-dark.svg"
              alt="Oportia Jobs IA"
              className="h-8 sm:h-9 w-auto object-contain hidden dark:block group-hover:scale-[1.02] transition"
            />
          </Link>

          {/* Clean Apple Segmented Navigation without icons (Desktop / Tablet) */}
          <nav
            aria-label="Navegación principal"
            className="hidden md:flex items-center bg-gray-200/50 dark:bg-zinc-800/60 p-1 rounded-full border border-black/5 dark:border-white/5 space-x-1"
          >
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                end={tab.end}
                className={({ isActive }) =>
                  `px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm font-semibold'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-2">
            
            {/* Simplified AI Status Dot (navigates to /ajustes) */}
            <button
              type="button"
              onClick={() => navigate('/ajustes')}
              className="flex items-center space-x-2 min-h-[38px] sm:min-h-[40px] px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-medium bg-gray-100/90 dark:bg-zinc-800/90 hover:bg-gray-200 dark:hover:bg-zinc-700 text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/6 dark:border-white/8 transition shadow-xs cursor-pointer active:scale-95"
              title="Configuración de Inteligencia Artificial (Ajustes)"
            >
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor} ${!hasKey ? 'opacity-70' : ''}`} />
              <span className="font-medium truncate">{statusLabel}</span>
            </button>

            {/* Direct Settings Gear Icon Button */}
            <Link
              to="/ajustes"
              className="min-h-[38px] min-w-[38px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-black/5 dark:border-white/5 transition shrink-0 cursor-pointer active:scale-95"
              title="Ajustes de la aplicación y privacidad"
              aria-label="Ajustes"
            >
              <SettingsIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </Link>
          </div>

        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Apple iOS Cupertino Tab Bar — >= 48px touch target, >= 11px text) */}
      <nav
        aria-label="Navegación móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 apple-glass border-t border-black/8 dark:border-white/8 px-1 pt-1 flex items-center justify-around shadow-2xl"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
      >
        {tabs.map((tab) => {
          const IconComp = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.end}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 px-1 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-[#86868B] dark:text-[#A1A1A6] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <IconComp className={`w-4 h-4 mb-0.5 ${isActive ? 'stroke-[2.5px] scale-110' : 'stroke-2'}`} />
                  <span className="text-[11px] font-medium tracking-tight leading-none">{tab.shortLabel}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </>
  );
};
